import fs from 'node:fs'
import { createPublicClient, createWalletClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { celo } from 'viem/chains'
import { withAttribution } from '@celo/attribution-tags'
import { RPC_URL, ATTRIBUTION_CODES, USDT_FEE_ADAPTER } from './config.js'

export const publicClient = createPublicClient({ chain: celo, transport: http(RPC_URL) })

// The agent key is read from a file path (KIRIM_KEY_FILE), never from the repo.
export function loadAccount() {
  const file = process.env.KIRIM_KEY_FILE
  if (!file) throw new Error('Set KIRIM_KEY_FILE to the path of the agent private key file')
  const pk = fs.readFileSync(file, 'utf8').trim()
  return privateKeyToAccount(pk)
}

export function agentAddress() {
  if (process.env.KIRIM_AGENT_ADDRESS) return process.env.KIRIM_AGENT_ADDRESS
  return loadAccount().address
}

// Every transaction this client sends carries the ERC-8021 attribution suffix.
export function walletClient(account = loadAccount()) {
  return createWalletClient({ account, chain: celo, transport: http(RPC_URL) }).extend(
    withAttribution(ATTRIBUTION_CODES),
  )
}

// Fee options: pay gas in USDT via the adapter unless KIRIM_GAS=celo.
export function feeOptions() {
  return process.env.KIRIM_GAS === 'celo' ? {} : { feeCurrency: USDT_FEE_ADAPTER }
}

export async function sendTagged(wallet, tx) {
  const hash = await wallet.sendTransaction({ ...feeOptions(), ...tx })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') throw new Error(`tx reverted: ${hash}`)
  return { hash, receipt }
}
