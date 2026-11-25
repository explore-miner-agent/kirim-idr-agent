import { encodeFunctionData, erc20Abi } from 'viem'
import { publicClient } from './wallet.js'

export const balanceOf = (token, owner) =>
  publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'balanceOf', args: [owner] })

export const allowance = (token, owner, spender) =>
  publicClient.readContract({ address: token, abi: erc20Abi, functionName: 'allowance', args: [owner, spender] })

export const transferData = (to, amount) =>
  encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [to, amount] })

export function fmt(amount, decimals) {
  const neg = amount < 0n
  const a = neg ? -amount : amount
  const s = a.toString().padStart(decimals + 1, '0')
  const whole = s.slice(0, s.length - decimals)
  const frac = decimals ? '.' + s.slice(s.length - decimals) : ''
  return (neg ? '-' : '') + whole + frac.replace(/\.?0+$/, '')
}

export function parse(str, decimals) {
  const [w, f = ''] = String(str).split('.')
  if (f.length > decimals) throw new Error(`too many decimals in ${str}`)
  return BigInt(w + f.padEnd(decimals, '0'))
}
