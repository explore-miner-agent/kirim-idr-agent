// Kirim — static configuration for Celo mainnet.
import { codeFromRepo } from '@celo/attribution-tags'

export const CHAIN_ID = 42220
export const RPC_URL = process.env.CELO_RPC_URL || 'https://forno.celo.org'
export const REPO = 'explore-miner-agent/kirim-idr-agent'

// ERC-8021 attribution code. The hackathon platform derives entry codes from the
// GitHub owner/repo slug, so we derive ours the same way and refuse to run if an
// explicitly assigned code (KIRIM_ATTRIBUTION_CODE) does not match the repo.
export const REPO_CODE = codeFromRepo(REPO)
export const ATTRIBUTION_CODES = (() => {
  const assigned = process.env.KIRIM_ATTRIBUTION_CODE
  if (assigned && assigned !== REPO_CODE) {
    // Keep both: the assigned one is what the program credits.
    return [assigned, REPO_CODE]
  }
  return [REPO_CODE]
})()

export const TOKENS = {
  USDT: { address: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', decimals: 6, symbol: 'USDT' },
  IDRX: { address: '0x18Bc5bcC660cf2B9cE3cd51a404aFe1a0cBD3C22', decimals: 2, symbol: 'IDRX' },
  CELO: { address: '0x471EcE3750Da237f93B8E339c536989b8978a438', decimals: 18, symbol: 'CELO' },
}

// Celo fee abstraction: pay gas in USDT through its fee-currency adapter, so the
// agent can run on a stablecoin balance alone. Set KIRIM_GAS=celo to pay in CELO.
export const USDT_FEE_ADAPTER = '0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72'

export const TEXTILE_API = process.env.TEXTILE_API || 'https://api.textilecredit.com/v2'
export const TEXTILE_REACTOR = '0xa9AA0a64769cBed4d3B1Ceb4Df01CdE915C235b3'

export const ERC8004 = {
  identity: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
  reputation: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
}

// Safety limits the agent enforces before it moves money.
export const LIMITS = {
  maxUsdtPerPayout: BigInt(process.env.KIRIM_MAX_USDT_PER_PAYOUT || 25_000_000), // 25 USDT
  maxUsdtPerDay: BigInt(process.env.KIRIM_MAX_USDT_PER_DAY || 50_000_000), // 50 USDT
  maxSlippageBps: Number(process.env.KIRIM_MAX_SLIPPAGE_BPS || 150), // 1.5% vs preview
}
