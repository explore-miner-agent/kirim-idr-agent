// Register Kirim on the ERC-8004 Identity Registry (Celo mainnet), tagged.
// Usage: KIRIM_KEY_FILE=... node scripts/register-8004.js [agentURI]
import fs from 'node:fs'
import { parseEventLogs } from 'viem'
import { ERC8004 } from '../src/config.js'
import { walletClient, loadAccount, publicClient, feeOptions } from '../src/wallet.js'

const abi = [
  { type: 'function', name: 'register', stateMutability: 'nonpayable', inputs: [{ name: 'agentURI', type: 'string' }], outputs: [{ name: 'agentId', type: 'uint256' }] },
  { type: 'function', name: 'setAgentURI', stateMutability: 'nonpayable', inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'newURI', type: 'string' }], outputs: [] },
  { type: 'event', name: 'Registered', inputs: [{ name: 'agentId', type: 'uint256', indexed: true }, { name: 'agentURI', type: 'string', indexed: false }, { name: 'owner', type: 'address', indexed: true }] },
]

const uri = process.argv[2] || 'https://raw.githubusercontent.com/explore-miner-agent/kirim-idr-agent/main/agent.json'
const account = loadAccount()
const wallet = walletClient(account)
const hash = await wallet.writeContract({ ...feeOptions(), address: ERC8004.identity, abi, functionName: 'register', args: [uri] })
const receipt = await publicClient.waitForTransactionReceipt({ hash })
const [ev] = parseEventLogs({ abi, logs: receipt.logs, eventName: 'Registered' })
const out = { agentId: ev?.args.agentId?.toString(), owner: account.address, uri, tx: hash, block: Number(receipt.blockNumber) }
console.log(JSON.stringify(out, null, 2))
fs.writeFileSync('docs/erc8004-registration.json', JSON.stringify(out, null, 2) + '\n')
