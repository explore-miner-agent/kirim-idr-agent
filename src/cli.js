#!/usr/bin/env node
// Kirim CLI
//   node src/cli.js status
//   node src/cli.js quote <idr>
//   node src/cli.js pay <recipient0x> <idr> [memo] [--dry-run]
//   node src/cli.js verify <txHash>
import { verifyTx } from '@celo/attribution-tags'
import { quoteIdr, pay, status } from './payout.js'
import { publicClient } from './wallet.js'
import { ATTRIBUTION_CODES } from './config.js'

const [cmd, ...args] = process.argv.slice(2)
const out = (x) => console.log(JSON.stringify(x, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2))

if (cmd === 'status') out({ ...(await status()), attribution: ATTRIBUTION_CODES })
else if (cmd === 'quote') {
  const q = await quoteIdr(args[0] || '100000')
  delete q.raw
  out(q)
} else if (cmd === 'pay') {
  const dryRun = args.includes('--dry-run')
  const [recipient, idr, ...memo] = args.filter((a) => a !== '--dry-run')
  out(await pay({ recipient, idr, memo: memo.join(' '), dryRun }))
} else if (cmd === 'verify') {
  out(await verifyTx({ client: publicClient, hash: args[0] }))
} else {
  console.log('usage: status | quote <idr> | pay <recipient> <idr> [memo] [--dry-run] | verify <txHash>')
  process.exit(1)
}
