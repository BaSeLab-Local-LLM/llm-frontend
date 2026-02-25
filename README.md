# Frontend (Vite + React)

This frontend is designed to call backend APIs via relative paths (`/api/...`) and
send auth cookies with `credentials: "same-origin"`.

## Deploy Frontend Only on Vercel

Use this directory (`submodules/frontend`) as the Vercel project root.

1. Import the repo in Vercel.
2. Set Root Directory to `submodules/frontend`.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Keep `vercel.json` rewrite so `/api/*` is proxied to your backend.

## Why Rewrite Is Required

Auth uses JWT + HttpOnly fingerprint cookie (`path=/api`), so requests should stay
same-origin from the browser perspective. The Vercel rewrite preserves current behavior
without changing frontend API code.

## Backend Settings For Vercel Frontend

- Set `ALLOWED_ORIGINS` to your Vercel/custom frontend domains.
- Use HTTPS in production and set `COOKIE_SECURE=true` (or `auto` with `DEBUG=false`).
- Ensure backend endpoint in `vercel.json` is publicly reachable by Vercel.

## Local Development

```bash
npm install
npm run dev
```
