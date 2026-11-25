import test from 'node:test'
import assert from 'node:assert'
import { fmt, parse } from '../src/erc20.js'
import { codeFromRepo, toDataSuffix, fromDataSuffix } from '@celo/attribution-tags'
import { REPO, REPO_CODE } from '../src/config.js'

test('amount helpers', () => {
  assert.equal(parse('150000', 2), 15000000n)
  assert.equal(fmt(15000000n, 2), '150000')
  assert.equal(fmt(1837835n, 6), '1.837835')
  assert.equal(parse('0.5', 6), 500000n)
})

test('attribution code matches repo', () => {
  assert.equal(REPO_CODE, codeFromRepo(REPO))
  const s = toDataSuffix(REPO_CODE)
  assert.deepEqual(fromDataSuffix('0xa9059cbb' + s.slice(2)).codes, [REPO_CODE])
})
