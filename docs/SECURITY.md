# MatruSetu — Security notes

Current as of 4 Nov 2026. Verified against the code, not older docs.

## Authentication and fail-closed config
- `proxy.ts` -> `lib/supabase/middleware.ts` refreshes the Supabase session on each request (`getClaims()`, local JWT verification) and redirects signed-out users to `/login`.
- Public paths: `/`, `/login`, `/signup`, `/auth`, `/offline`, `/api/whatsapp`, `/listen/*`.
- If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, every path except `/`, `/offline`, `/api/whatsapp` and `/listen/*` returns 503. It never serves the app unauthenticated.

## Demo mode
- Opt-in only via server env `DEMO_MODE=1` (`lib/demo.ts`). The `matrusetu_demo` cookie is honoured only when `DEMO_MODE=1`; otherwise it is ignored.
- Earlier versions treated the cookie (or missing Supabase config) as a login bypass. That is no longer the case. Never set `DEMO_MODE` in production.
- With `DEMO_MODE=1` and no `LISTEN_LINK_SECRET`, listen links use a fixed demo-only secret.

## Data access
- RLS is enabled on all tables and scoped to the caller's clinic; doctor-only actions also check `private.is_doctor()`. Views use `security_invoker = true`, including `latest_visits`.
- The service-role client (`lib/supabase/admin.ts`, `server-only`) is used in: the WhatsApp bot/webhook (`lib/whatsappBot.ts`), the public listen page (`app/listen/[token]/page.tsx`), and staff invites (`app/(app)/settings/actions.ts`, which verifies the caller is a doctor first). It bypasses RLS, so these paths do their own scoping.

## WhatsApp webhook (`/api/whatsapp/webhook`)
- GET handshake needs `WHATSAPP_VERIFY_TOKEN` (constant-time compare, no default).
- POST needs `WHATSAPP_APP_SECRET` (503 if unset) and a valid `X-Hub-Signature-256` HMAC-SHA256 of the raw body (401 otherwise).
- The in-app simulator uses the authenticated `processBotReply` server action, not this route.

## Signed listen links
- `lib/listenLink.ts`: `base64url({p, l, e}) . base64url(HMAC-SHA256(LISTEN_LINK_SECRET))`, default TTL 14 days. Signed, not encrypted; contains patient id, language, expiry.
- It is a bearer capability: anyone with the URL can view that patient's counselling page until expiry. Share it only with the mother.
- `/listen/*` is served with `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: private, no-store` (`next.config.ts`).
- No secret -> link creation throws and verification returns null. Rotating the secret revokes all issued links; there is no per-link revocation.

## Dependencies and CI
- CI runs `npm audit --omit=dev --audit-level=high` and fails on high/critical advisories. At the time of writing `npm audit --omit=dev` reports 0 vulnerabilities.

## Known limits
- OCR runs in the browser; uploaded documents are stored in the clinic-scoped Supabase Storage bucket.
- Clinical flags and schedules are assistive and await Clinical Lead sign-off.
