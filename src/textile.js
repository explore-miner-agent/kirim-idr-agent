// Textile FX v2 RFQ client (keyless). A firm quote is bound to the taker wallet;
// the agent proves control with an EIP-712 TakerControl signature.
import { randomBytes } from 'node:crypto'
import { toHex } from 'viem'
import { CHAIN_ID, TEXTILE_API } from './config.js'

async function post(path, body, headers = {}) {
  const res = await fetch(`${TEXTILE_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(75_000),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, json }
}

// Indicative price. No wallet, no lock.
export async function preview({ sellToken, buyToken, sellAmount, buyAmount }) {
  const body = { chainId: CHAIN_ID, sellToken, buyToken }
  if (sellAmount != null) body.sellAmount = String(sellAmount)
  if (buyAmount != null) body.buyAmount = String(buyAmount)
  const { status, json } = await post('/rfq/preview', body)
  if (status !== 200) throw new Error(`textile preview ${status}: ${JSON.stringify(json)}`)
  return json.data
}

export async function signTakerControl(account) {
  const nonce = toHex(randomBytes(32))
  const issuedAt = Date.now()
  const signature = await account.signTypedData({
    domain: { name: 'Textile Taker Control', version: '1', chainId: CHAIN_ID },
    types: {
      TakerControl: [
        { name: 'taker', type: 'address' },
        { name: 'chainId', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'issuedAt', type: 'uint256' },
      ],
    },
    primaryType: 'TakerControl',
    message: { taker: account.address, chainId: BigInt(CHAIN_ID), nonce, issuedAt: BigInt(issuedAt) },
  })
  return { nonce, issuedAt, signature }
}

// Firm quote. Returns { rfqId, claimToken, quote, transactions } or { noQuote }.
export async function requestFirm(account, { sellToken, buyToken, sellAmount, buyAmount }) {
  const body = { chainId: CHAIN_ID, sellToken, buyToken, taker: account.address }
  if (sellAmount != null) body.sellAmount = String(sellAmount)
  if (buyAmount != null) body.buyAmount = String(buyAmount)
  let r = await post('/rfq/request', body)
  if (r.status === 401 && r.json?.error?.details?.reason?.startsWith('proof_of_control')) {
    r = await post('/rfq/request', { ...body, takerProof: await signTakerControl(account) })
  }
  if (r.status !== 200) throw new Error(`textile request ${r.status}: ${JSON.stringify(r.json)}`)
  const d = r.json.data
  if (d.status === 'no_quote') return { noQuote: d }
  return d
}

export async function report(rfqId, claimToken, txHash) {
  return post(`/rfq/${rfqId}/submit`, { txHash }, { 'X-Rfq-Claim': claimToken })
}

export async function cancel(rfqId, claimToken) {
  return post(`/rfq/${rfqId}/cancel`, {}, { 'X-Rfq-Claim': claimToken })
}

export async function status(rfqId, claimToken) {
  const res = await fetch(`${TEXTILE_API}/rfq/${rfqId}`, { headers: { 'X-Rfq-Claim': claimToken } })
  return res.json()
}
