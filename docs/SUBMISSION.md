# Submission draft — Kirim (Celo Agents Open for Business)

**Project:** Kirim — a rupiah payout agent on Celo
**Builder:** SerIgala
**Repo:** https://github.com/explore-miner-agent/kirim-idr-agent
**Tracks:** Stablecoin Corridors (Textile FX, USD₮ → IDRX). Optional second: Altana Smart Agentic Wallets (not built yet).
**Agent wallet:** `0xb27acB23a989C62560796BDaA9e63aAA0F7894E2`
**Attribution code:** `celo_4ebf8719a4f3` (derived from the repo slug)
**ERC-8004 agent ID:** 10133 on Celo Identity Registry `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`

## One-liner
An agent that pays Indonesian freelancers the exact rupiah on their invoice, in IDRX on Celo, funded in USD₮ and converted on Textile FX.

## The real job
Paying a named Indonesian freelancer/supplier an invoice denominated in rupiah, from a client who holds dollars. (Named user and recipient to be filled in: see STATUS.)

## How it works
Preview price → caps and slippage checks → firm exact-output RFQ on Textile (EIP-712 taker proof) → approve reactor → tagged swap → tagged IDRX transfer to the recipient → Textile /submit report → JSON receipt. Gas in USD₮ via Celo fee abstraction.

## Onchain evidence (fill in)
- ERC-8004 registration tx (tagged `celo_4ebf8719a4f3`, verified with `verifyTx`): [0x88fe91c7b9c706d84a52546d0805af359e7fadbe3c4493bb73434552a911ec9d](https://celoscan.io/tx/0x88fe91c7b9c706d84a52546d0805af359e7fadbe3c4493bb73434552a911ec9d), block 83742317, agent ID 10133
- Textile conversion tx (USD₮ → IDRX): …
- IDRX payout tx to recipient outside the team: …

## Where users and volume came from
Agent wallet funded by the builder (3 USDC bridged from Base via Relay: 2.85 USDC → 2.819 USD₮, 0.15 USDC → 2.12 CELO); the recipient is a real Indonesian payee outside the team. No sponsored gas, no arbitrage, no self-trading.

## Demo notes
1. `npm run status` shows balances and the attribution code.
2. `node src/cli.js quote 150000` prices Rp150.000 in USD₮ live from Textile.
3. `node src/cli.js pay <recipient> 20000 "invoice"` performs the swap and payout and prints tx hashes.
4. `node src/cli.js verify <tx>` decodes the ERC-8021 tag from the chain.
