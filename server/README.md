AFRIQORA Monetization Server

Minimal Express server to persist monetization state for the AFRIQORA prototype.

Environment
- Create a `.env` file in this folder with:

```
ADMIN_KEY=some-secret-key
PORT=4000
```

Run

Install dependencies and start:

```bash
cd server
npm install
npm start
```

API
- GET /health — health check
- GET /monetization — returns current monetization state (requires `x-admin-key` header)
- POST /monetization/settings — update settings (admin only). Body: `{ creatorPct: number, platformPct: number, viewValue: number }`. `creatorPct + platformPct` must equal 100.
- POST /monetization/view — record a view. Body: `{ videoId, creatorId, viewerId }`. Returns `{ counted: true|false, creatorShare, platformShare }`.
 - GET /monetization/token — request a short-lived signed token for a view. Query params: `videoId`, `viewerId`. Returns `{ token: { videoId, viewerId, exp, nonce, sig } }`.
 - POST /monetization/view — record a view. Body: `{ videoId, creatorId, viewerId, token }`. The `token` must be the signed token previously requested and not expired; server will verify signature and nonce before counting.
- GET /creator/:id — get creator stats
- POST /creator/:id/withdraw — request a simulated withdrawal. Body: `{ amount }`.

Security & Notes
- Admin endpoints require `x-admin-key` header matching `ADMIN_KEY` in `.env`.
- This is a prototype: data is stored in `data.json` and not production hardened. For production, use a real database, authentication, TLS, and anti-fraud measures (rate-limiting, signature verification, server-side view heuristics).
