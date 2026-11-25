// The job: a client owes a freelancer (or supplier) an amount in rupiah. Kirim
// holds the client's USDT, buys exactly that many IDRX on Textile FX, pays the
// recipient, and writes a receipt. Every transaction carries the attribution tag.
import fs from 'node:fs'
import path from 'node:path'
import { CHAIN_ID, TOKENS, LIMITS } from './config.js'
import { walletClient, loadAccount, sendTagged, publicClient } from './wallet.js'
import { balanceOf, allowance, transferData, fmt, parse } from './erc20.js'
import * as textile from './textile.js'

const RECEIPTS = path.resolve(process.env.KIRIM_RECEIPTS_DIR || 'receipts')

function spentToday() {
  if (!fs.existsSync(RECEIPTS)) return 0n
  const day = new Date().toISOString().slice(0, 10)
  return fs
    .readdirSync(RECEIPTS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(RECEIPTS, f), 'utf8')))
    .filter((r) => r.createdAt?.startsWith(day) && r.status === 'paid')
    .reduce((a, r) => a + BigInt(r.usdtSpent || 0), 0n)
}

// Price an invoice: how many USDT does `idr` rupiah cost right now?
export async function quoteIdr(idr) {
  const buyAmount = parse(idr, TOKENS.IDRX.decimals)
  const p = await textile.preview({ sellToken: TOKENS.USDT.address, buyToken: TOKENS.IDRX.address, buyAmount })
  return {
    idr: fmt(buyAmount, 2),
    usdt: fmt(BigInt(p.takerPays ?? p.sellAmount), 6),
    feeUsdt: fmt(BigInt(p.feeAmount || 0), 6),
    idrPerUsdt: (Number(buyAmount) / 100 / (Number(p.takerPays ?? p.sellAmount) / 1e6)).toFixed(2),
    raw: p,
  }
}

export async function pay({ recipient, idr, memo = '', dryRun = false }) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) throw new Error('recipient must be a 0x address')
  const account = loadAccount()
  const wallet = walletClient(account)
  const buyAmount = parse(idr, TOKENS.IDRX.decimals)
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${recipient.slice(2, 8).toLowerCase()}`
  const receipt = { id, chainId: CHAIN_ID, recipient, idr: fmt(buyAmount, 2), memo, createdAt: new Date().toISOString(), txs: {} }

  const pv = await textile.preview({ sellToken: TOKENS.USDT.address, buyToken: TOKENS.IDRX.address, buyAmount })
  const previewPays = BigInt(pv.takerPays ?? pv.sellAmount)
  if (previewPays > LIMITS.maxUsdtPerPayout) throw new Error(`payout ${fmt(previewPays, 6)} USDT exceeds per-payout cap`)
  if (spentToday() + previewPays > LIMITS.maxUsdtPerDay) throw new Error('daily USDT cap reached')

  const usdtBal = await balanceOf(TOKENS.USDT.address, account.address)
  const idrxBal = await balanceOf(TOKENS.IDRX.address, account.address)
  receipt.previewUsdt = fmt(previewPays, 6)
  if (dryRun) return { ...receipt, status: 'dry-run', usdtBalance: fmt(usdtBal, 6), idrxBalance: fmt(idrxBal, 2) }

  // Convert only if the float of IDRX is short.
  if (idrxBal < buyAmount) {
    const need = buyAmount - idrxBal
    const q = await textile.requestFirm(account, { sellToken: TOKENS.USDT.address, buyToken: TOKENS.IDRX.address, buyAmount: need })
    if (q.noQuote) throw new Error(`no quote from Textile: ${JSON.stringify(q.noQuote)}`)
    const takerPays = BigInt(q.quote.takerPays)
    const maxPays = (previewPays * BigInt(10_000 + LIMITS.maxSlippageBps)) / 10_000n
    if (takerPays > maxPays) {
      await textile.cancel(q.rfqId, q.claimToken)
      throw new Error(`firm quote ${fmt(takerPays, 6)} USDT worse than preview+slippage ${fmt(maxPays, 6)}`)
    }
    if (usdtBal < takerPays) {
      await textile.cancel(q.rfqId, q.claimToken)
      throw new Error(`agent holds ${fmt(usdtBal, 6)} USDT, quote needs ${fmt(takerPays, 6)}`)
    }
    const reactor = q.quote.reactor || q.transactions.swap.to
    const have = await allowance(TOKENS.USDT.address, account.address, reactor)
    if (q.transactions.approval && have < takerPays) {
      const a = await sendTagged(wallet, { to: q.transactions.approval.to, data: q.transactions.approval.data })
      receipt.txs.approve = a.hash
    }
    if (Date.now() > Date.parse(q.quote.expiresAt)) {
      await textile.cancel(q.rfqId, q.claimToken)
      throw new Error('quote expired before broadcast; retry')
    }
    const s = await sendTagged(wallet, { to: q.transactions.swap.to, data: q.transactions.swap.data })
    receipt.txs.swap = s.hash
    receipt.rfqId = q.rfqId
    receipt.usdtSpent = takerPays.toString()
    receipt.textileRate = q.quote.rateRay
    await textile.report(q.rfqId, q.claimToken, s.hash).catch(() => {})
  } else {
    receipt.usdtSpent = '0'
  }

  const t = await sendTagged(wallet, { to: TOKENS.IDRX.address, data: transferData(recipient, buyAmount) })
  receipt.txs.payout = t.hash
  receipt.status = 'paid'
  receipt.block = Number(t.receipt.blockNumber)
  fs.mkdirSync(RECEIPTS, { recursive: true })
  fs.writeFileSync(path.join(RECEIPTS, `${id}.json`), JSON.stringify(receipt, null, 2))
  return receipt
}

export async function status() {
  const account = loadAccount()
  const [celo, usdt, idrx] = await Promise.all([
    publicClient.getBalance({ address: account.address }),
    balanceOf(TOKENS.USDT.address, account.address),
    balanceOf(TOKENS.IDRX.address, account.address),
  ])
  return { agent: account.address, CELO: fmt(celo, 18), USDT: fmt(usdt, 6), IDRX: fmt(idrx, 2) }
}
