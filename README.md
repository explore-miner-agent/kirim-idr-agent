# Kirim — a rupiah payout agent on Celo

**Kirim** (Indonesian for *send*) pays Indonesian freelancers and small suppliers
the exact rupiah amount on their invoice, in **IDRX** on Celo mainnet. The client
funds the agent in **USD₮**. For each invoice the agent:

1. prices the rupiah amount live on **Textile FX** (`/v2/rfq/preview`),
2. checks its own limits (per-payout cap, daily cap, max slippage vs preview),
3. asks Textile makers for a **firm exact-output quote** (`buyAmount` = the invoice
   in IDRX), proving wallet control with an EIP-712 `TakerControl` signature,
4. approves the Textile reactor if needed and broadcasts the swap,
5. transfers the IDRX to the recipient's wallet,
6. reports the swap to Textile and writes a JSON receipt (`receipts/`).

Every transaction carries this repo's **ERC-8021 attribution tag**
(`celo_4ebf8719a4f3` = `codeFromRepo("explore-miner-agent/kirim-idr-agent")`),
attached once where the wallet client is built (`withAttribution`), so no call
site can forget it. Gas is paid in USD₮ through Celo fee abstraction, so the
agent runs on a stablecoin balance alone.

Built for Celo **Agents Open for Business** (Stablecoin Corridors track, USD₮ → IDRX)
by **SerIgala**.

## Why

A designer in Yogyakarta invoices a foreign client *Rp 1.500.000*. The client
thinks in dollars, the designer needs rupiah, and the usual route (PayPal or a
wire, then a local bank) eats days and 3–6%. With Kirim the invoice stays in
rupiah: the client tops up USD₮ once, and the agent pays every invoice in IDRX at
a firm on-chain rate, with a receipt both sides can check on Celoscan. IDRX is
redeemable 1:1 to rupiah in Indonesian bank accounts.

## Agent identity

| | |
|---|---|
| Agent wallet | `0xb27acB23a989C62560796BDaA9e63aAA0F7894E2` |
| ERC-8004 Identity Registry (Celo) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Registration file | [`agent.json`](agent.json) |
| Attribution code | `celo_4ebf8719a4f3` |
| ERC-8004 agent ID | **10133** ([registration tx](https://celoscan.io/tx/0x88fe91c7b9c706d84a52546d0805af359e7fadbe3c4493bb73434552a911ec9d)) |

Registration details: [`docs/erc8004-registration.json`](docs/erc8004-registration.json).

## Run it

```bash
npm install
export KIRIM_KEY_FILE=/path/to/agent.key   # never commit it
npm run status                     # balances + attribution codes
node src/cli.js quote 150000       # what does Rp150.000 cost in USD₮ right now?
node src/cli.js pay 0xRecipient 150000 "invoice #12" --dry-run
node src/cli.js pay 0xRecipient 150000 "invoice #12"
node src/cli.js verify 0xTxHash    # decode the attribution tag from a sent tx
npm run register                   # ERC-8004 registration (tagged)
KIRIM_API_TOKEN=... npm run serve  # GET /quote?idr=, GET /status, POST /pay
```

Config (env): `KIRIM_MAX_USDT_PER_PAYOUT` (default 25 USD₮),
`KIRIM_MAX_USDT_PER_DAY` (50), `KIRIM_MAX_SLIPPAGE_BPS` (150),
`KIRIM_GAS=celo` to pay gas in CELO instead of USD₮,
`KIRIM_ATTRIBUTION_CODE` to add a code issued by the hackathon.

## Contracts and tokens (Celo mainnet)

- USD₮ `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` (fee adapter `0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72`)
- IDRX `0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22` (2 decimals)
- Textile LimitOrderReactor `0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3`
- ERC-8004 Identity `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`, Reputation `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63`

## Notes

- Textile's mainnet RFQ floor is about $1 of notional, so the smallest payout is
  roughly Rp18.400.
- Kirim never touches a card, bank login or the recipient's keys; it only holds
  the USD₮ float the client sends it, inside the caps above.
- All code in this repo was written from 26 Nov 2026, during the hackathon.

MIT licence.
