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

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run db:validate` | Offline SQL syntax check for migrations |

## Status

Early build. See `supabase/migrations/` for the current schema and `lib/` for the pregnancy-dating and ANC-schedule logic.
