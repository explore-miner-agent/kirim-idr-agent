// Minimal HTTP front for Kirim: anyone can price a rupiah invoice; payouts need
// the operator token (KIRIM_API_TOKEN) so only the client who funded the agent
// can release money.
import http from 'node:http'
import fs from 'node:fs'
import { quoteIdr, pay, status } from './payout.js'

const PORT = Number(process.env.PORT || 8787)
const TOKEN = process.env.KIRIM_API_TOKEN
const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body, (k, v) => (typeof v === 'bigint' ? v.toString() : v)))
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x')
    try {
      if (url.pathname === '/.well-known/agent.json') return json(res, 200, JSON.parse(fs.readFileSync('agent.json', 'utf8')))
      if (url.pathname === '/status') return json(res, 200, await status())
      if (url.pathname === '/quote') {
        const q = await quoteIdr(url.searchParams.get('idr') || '100000')
        delete q.raw
        return json(res, 200, q)
      }
      if (url.pathname === '/pay' && req.method === 'POST') {
        if (!TOKEN || req.headers.authorization !== `Bearer ${TOKEN}`) return json(res, 401, { error: 'unauthorized' })
        let body = ''
        for await (const c of req) body += c
        const { recipient, idr, memo } = JSON.parse(body || '{}')
        return json(res, 200, await pay({ recipient, idr: String(idr), memo }))
      }
      json(res, 404, { error: 'not found', routes: ['/quote?idr=', '/status', 'POST /pay', '/.well-known/agent.json'] })
    } catch (e) {
      json(res, 500, { error: e.message })
    }
  })
  .listen(PORT, () => console.log(`kirim listening on :${PORT}`))
