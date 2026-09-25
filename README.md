# MatruSetu

Assistive pregnancy tracking and OPD digitisation for OB-GYN private practices in India — built for Health-a-thon 2026 (Koita Foundation / IIT Bombay), Maternal & Child Health track, "Patient Follow-up & Continuity of Care."

For a doctor and care team managing dozens to hundreds of active pregnancies, MatruSetu tracks each patient's week-by-week ANC schedule (scans, tests, injections), flags patients who are drifting out of follow-up, and turns photographed OPD case papers, WhatsApp reports and PDFs into one searchable patient timeline.

## Stack

- Next.js (App Router) + TypeScript, Tailwind v4
- Supabase (Postgres, Auth, Storage, RLS)
- Tesseract.js (in-browser OCR) + pdfjs-dist
- Vitest (unit) + Playwright (e2e)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's URL + keys
npm run dev
```

### Database

Migrations live in `supabase/migrations/`. Against a linked Supabase project:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### Demo data

`npm run db:seed` creates a demo clinic (`demo.doctor@matrusetu.test` / `DemoClinic123!`) with ~40 synthetic patients spread across trimesters and follow-up states (on track / at risk / lost). Safe to run against a shared project — it no-ops if that clinic already has patients rather than duplicating them. All data is fabricated.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (Serwist's service worker needs webpack, not Turbopack — see `next.config.ts`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run db:validate` | Offline SQL syntax check for migrations |
| `npm run db:seed` | Seed a demo clinic with synthetic patients |
| `npm run test:e2e` | Playwright golden-path test (needs a running dev server + live Supabase credentials — not run in CI, see `playwright.config.ts`) |

## Deployment

The app deploys to [Vercel](https://vercel.com) with no extra config — it auto-detects Next.js and runs `npm run build` (which already targets webpack, required by Serwist's PWA build; see `next.config.ts`).

1. Import the GitHub repo at vercel.com/new.
2. Set these environment variables in the Vercel project (Settings → Environment Variables), same values as `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — never prefix with `NEXT_PUBLIC_`)
   - `NEXT_PUBLIC_SITE_URL` — set to the deployed URL (e.g. `https://your-app.vercel.app`)
3. In the Supabase dashboard, under Authentication → URL Configuration, add the deployed URL to both **Site URL** and **Redirect URLs** — otherwise auth callbacks (email confirmation, Google OAuth, staff invite links) resolve to `localhost`.
4. If using Google sign-in, the Google Cloud OAuth client's authorized redirect URI must be your Supabase project's callback (`https://<project-ref>.supabase.co/auth/v1/callback`), not the app's own domain — this doesn't change when you deploy.

## Status

Built and verified end-to-end against a live Supabase project: auth/onboarding (email/password + Google OAuth, with real SMTP via Resend for confirmation emails), patient registration with auto-generated ANC schedules, the follow-up dashboard and call queue (WhatsApp/tel links, per-clinic message templates, contact logging), document capture with in-browser OCR and full-text search, the OPD register, doctor Settings (clinic details, thresholds, schedule template, staff invites, message templates), and PWA install/offline support. A Playwright test (`e2e/golden-path.spec.ts`) covers the full flow, and cross-clinic RLS isolation has been independently verified. Accessibility pass done: every custom color pair meets WCAG AA contrast, and interactive elements meet the 44px touch-target minimum.

Not yet done: an automated WhatsApp bot (reminders are currently a staff-initiated call queue with one-tap WhatsApp/tel links by design — a real WhatsApp Business API bot needs Meta Business verification, which is an external approval process, not an engineering task), Hindi/Marathi message-template wording (needs the Clinical Lead's review before shipping — the field only supports one language per template right now), and Clinical Lead sign-off on the default ANC schedule windows and follow-up-risk thresholds.

See `supabase/migrations/` for the schema and `lib/` for the pregnancy-dating, ANC-schedule, and follow-up-risk logic.
