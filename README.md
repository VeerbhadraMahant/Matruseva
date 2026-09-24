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

## Status

Core flows are built and verified end-to-end against a live Supabase project: auth/onboarding, patient registration with auto-generated ANC schedules, the follow-up dashboard and call queue (WhatsApp/tel links, contact logging), document capture with in-browser OCR and full-text search, the OPD register, doctor Settings (clinic details, thresholds, schedule template, staff invites), and PWA install/offline support.

Not yet built: per-clinic message-template editing wired into the call queue (the `clinics.message_templates` column exists but isn't used yet — `/calls` uses a fixed default message), Playwright e2e coverage, and real SMTP for staff email invites (see the `matrusetu-supabase-auth-autoconfirm` memory note — invites currently return a one-time link for the doctor to share manually).

See `supabase/migrations/` for the schema and `lib/` for the pregnancy-dating, ANC-schedule, and follow-up-risk logic.
