# MatruSetu — Project Analysis Report

**Date**: 2 October 2026
**Analyst**: Senior full-stack review (Antigravity agent)
**Branch**: `main` at `fb9c363`

---

## 1. Sync Summary & Test Results

### 1.1 Git Sync

| Step | Result |
|---|---|
| Local state | Clean tree, on `main`, up-to-date with `origin/main` before fetch |
| Incoming commits | 2 (fast-forward, no conflicts) |

**Commits pulled:**
1. `d19389e` — `feat: Add Printable Mother's QR Health Pass, OPD Reception Scanner, and Offline Demo Mode`
2. `fb9c363` — `fix(ci): fix ESLint unescaped entities, unused imports, and hook dependencies in QR components`

### 1.2 Changes Introduced

**New files (4):**
- `app/(app)/scan/page.tsx` — Dedicated `/scan` reception QR scanner page
- `components/MotherHealthCard.tsx` — Printable Mother & Child QR Health Pass card + modal
- `components/QRScannerModal.tsx` — Camera QR scanner with image upload and manual ID fallback
- `lib/demo-data.ts` — 10-patient offline demo dataset

**Modified files (10):**
- `app/(app)/patients/[id]/page.tsx` — Added MotherHealthCardButton, demo mode data path
- `app/(app)/patients/page.tsx` — Added ScanQRCardButton to patients list header
- `app/(auth)/actions.ts` — Demo login via cookie (`matrusetu_demo=1`)
- `app/(auth)/login/page.tsx` — Pre-filled demo credentials
- `components/AppNav.tsx` — Added `/scan` nav entry with QR icon
- `lib/auth.ts` — Demo-mode bypass returning mock `Dr. Demo` user
- `lib/snapshot.ts` — Demo-mode bypass loading from `demo-data.ts` instead of Supabase
- `lib/supabase/middleware.ts` — Demo cookie bypass for auth checks

**New dependencies (3):**
- `html5-qrcode ^2.3.8` — Camera-based QR code reader
- `qrcode ^1.5.4` — QR code image generation
- `@types/qrcode ^1.5.6` — Types for the above

**No new migrations.** Schema unchanged.

### 1.3 Test Results

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass (0 warnings/errors) |
| `npm test` (Vitest) | ✅ 62 tests passed across 7 files |
| `npm run db:validate` | ✅ 4 migrations OK |

### 1.4 Integration Assessment of Pulled Changes

**FACT**: The QR/demo feature set integrates cleanly — typecheck, lint, and all tests pass. The demo mode is a coherent end-to-end bypass: cookie set at login → middleware skips auth → `getCurrentUser()` returns mock user → `getClinicSnapshot()` returns demo data → patient detail loads `getDemoPatientDetail()`.

**INFERENCE**: The demo mode was built specifically for hackathon evaluation — judges can interact with the full app without needing Supabase credentials. This is high-value for the demo.

**OPINION**: The QR Health Pass + Scanner is a well-executed, self-contained feature set (print card → scan at reception → zero-typing check-in). The demo data is carefully designed to showcase every risk state (on_track, at_risk, lost), clinical flag, and trimester. No loose ends found — all new code is wired into the UI.

---

## 2. Project Inventory

### 2.1 Routes & Pages

| Route | Purpose | Type |
|---|---|---|
| `/` | Marketing landing page | Server Component |
| `/login` | Email/password + Google OAuth login | Client Component |
| `/signup` | New clinic registration | Client Component |
| `/onboarding` | Clinic name + doctor name setup, triggers default ANC schedule creation | Client Component |
| `/auth/callback` | OAuth code exchange → redirect to `/today` | Route Handler |
| `/today` | Daily command center: stats, needs-attention queue, due-this-week, expected-today, clinical alerts, upcoming deliveries | Server Component |
| `/patients` | Full patient registry with trimester/risk/alert filtering, sorting, search | Server + Client |
| `/patients/new` | New patient registration with instant LMP → GA/EDD/trimester calculation | Client Component |
| `/patients/[id]` | Patient detail: demographics, pregnancy timeline, vitals charts, ANC schedule, visits, documents, contact log, QR health card | Server + Client |
| `/calls` | Follow-up call queue: prioritised outreach list with 1-tap call/WhatsApp, multi-lingual templates, contact logging, bot simulator | Server + Client |
| `/documents` | Document inbox: camera/file upload, OCR, filing to patient + care event | Server + Client |
| `/opd` | OPD register: capture physical register pages, OCR index, full-text search | Server Component |
| `/scan` | QR Health Pass scanner for reception desk check-in | Server Component |
| `/settings` | Doctor-only: clinic details, risk thresholds, staff management, ANC schedule template, FOGSI protocol sign-off, message templates | Server Component |
| `/offline` | PWA offline fallback page | Server Component |
| `/api/whatsapp/webhook` | WhatsApp Cloud API webhook (GET verify + POST incoming messages) | Route Handler |

### 2.2 Core Domain Logic (`lib/`)

| File | Purpose |
|---|---|
| `pregnancy.ts` | Naegele's rule EDD, gestational age (weeks+days), trimester classification, dateAtWeek |
| `schedule.ts` | ANC schedule generation from clinic template + patient facts (Rh-negative gating), late-booking auto-skip, LMP correction diff |
| `risk.ts` | Follow-up risk scoring (on_track / at_risk / lost) mirroring SQL view, using visit overdue days, critical events, no-answer streaks |
| `clinical.ts` | Clinical safety flags: BP (hypertension), Hb (anaemia), FHR, post-term, Rh-neg, age, grand multigravida |
| `clinicalProtocols.ts` | 12 FOGSI/MoHFW certified ANC milestone definitions with gestational-week windows |
| `snapshot.ts` | Server-side clinic worklist aggregator: 4 parallel Supabase queries, in-memory join, priority scoring |
| `whatsapp.ts` | Indian phone normalisation, tel/WhatsApp links, tri-lingual (en/hi/mr) template interpolation |
| `whatsappBot.ts` | 2-way WhatsApp bot: language detection, intent parsing (confirm/reschedule/info), Supabase contact_log writes |
| `ocr.ts` | Client-side OCR: image preprocessing (grayscale + threshold), Tesseract.js worker, PDF text extraction via pdfjs-dist |
| `today.ts` | IST timezone canonicalization via `Intl.DateTimeFormat` |
| `format.ts` | Date formatting (`en-IN`), relative days, G/P formatting |
| `auth.ts` | Request-scoped user/clinic resolution with demo bypass |
| `demo-data.ts` | 10-patient fabricated dataset for offline hackathon demo |

### 2.3 Database Schema

**Tables (9):** `clinics`, `profiles`, `patients`, `schedule_templates`, `schedule_template_items`, `care_events`, `visits`, `documents`, `contact_log`

**Views (2):**
- `care_event_status` — dynamic status (done/skipped/overdue/due/upcoming) computed from `private.today_ist()`
- `patient_followup_risk` — risk classification computed from visit overdue, critical events, contact streaks

**Functions (5):** `private.current_clinic_id()`, `private.is_doctor()`, `private.today_ist()`, `private.set_clinic_id_from_patient()` (trigger), `public.create_clinic_and_profile()` (onboarding RPC)

**RLS:** Enabled and forced on all tables. All policies scope to `private.current_clinic_id()`. Doctor-only operations (UPDATE clinic, DELETE patient, settings changes) additionally check `private.is_doctor()`. Storage bucket `documents` is scoped by clinic folder path.

**Indexes (17):** Including trigram GIN indexes on `patients.name` and `patients.phone` for fuzzy search, partial indexes on open care events and unfiled documents, and full-text GIN on `documents.search` tsvector.

### 2.4 CI Pipeline (`.github/workflows/ci.yml`)

Runs on push/PR to `main`: checkout → Node 22 → `npm ci` → lint → typecheck → vitest → db:validate → `npm audit` → production build. Playwright e2e excluded (needs live Supabase).

### 2.5 Test Coverage

| Suite | File | Tests | Coverage Area |
|---|---|---|---|
| `pregnancy.test.ts` | 7 tests | Naegele's rule, leap year, future LMP clamp, GA, trimesters |
| `schedule.test.ts` | 6 tests | Schedule generation, Rh condition, late-booking skip, diff logic |
| `risk.test.ts` | 9 tests | Lost/at_risk/on_track classification, thresholds, streaks |
| `clinical.test.ts` | 9 tests | BP/Hb/FHR flags, demographic flags, severity sorting |
| `whatsapp.test.ts` | 18 tests | Phone normalisation, template interpolation, multi-lingual |
| `whatsappBot.test.ts` | 10 tests | Language detection, intent parsing, bot reply |
| `today.test.ts` | 3 tests | IST midnight vs UTC midnight |
| **Total** | **62 tests** | |

**E2E:** 1 Playwright spec (`e2e/golden-path.spec.ts`) covering: signup → onboarding → patient registration → late-booking schedule → visit recording → document OCR & search → document filing → care event completion → risk engine → call queue contact logging.

---

## 3. Highest-Value Existing Parts

Ranked by direct contribution to the hackathon theme **"Patient Follow-up & Continuity of Care"**:

### Rank 1: Follow-Up Risk Engine + Call Queue
**Files:** `lib/risk.ts`, `lib/snapshot.ts` (L152–168), `app/(app)/calls/page.tsx`, `components/CallQueue.tsx`

**Why:** This is the project's core differentiator. The 3-tier risk scoring (on_track → at_risk → lost) computed both in SQL and TypeScript, combined with the prioritised call queue with 1-tap WhatsApp/tel links, is the most direct answer to "continuity of care" for a busy clinic. The priority algorithm (`followUpPriority`) that sorts lost > critical flags > most overdue > at-risk is operationally actionable. The swipeable mobile cards and quick-log contact outcomes make it usable on a clinic desk phone.

### Rank 2: ANC Schedule Generation with FOGSI Protocol Compliance
**Files:** `lib/schedule.ts`, `lib/clinicalProtocols.ts`, `components/PregnancyTimeline.tsx`

**Why:** Auto-generating a per-patient ANC schedule from a clinic-customisable template at registration — with late-booking auto-skip and LMP correction diff logic — solves the "which patient needs what test when" problem that drives follow-up. The visual pregnancy timeline with lane-packing for overlapping windows is an effective hackathon demo piece.

### Rank 3: Tri-lingual WhatsApp Bot + Message Templates
**Files:** `lib/whatsapp.ts`, `lib/whatsappBot.ts`, `components/WhatsAppBotSimulator.tsx`, `app/api/whatsapp/webhook/route.ts`

**Why:** Full English/Hindi/Marathi support with culturally appropriate honorifics (ताई, जी), intent parsing for Devanagari numerals (१, २, ३), and a realistic in-app bot simulator. This directly addresses real-world patient outreach in Indian clinics. The bot simulator is a killer demo feature — it lets judges see the 2-way conversation flow without needing a real WhatsApp Business API.

### Rank 4: Clinical Safety Flags + Vitals Trend Charts
**Files:** `lib/clinical.ts`, `components/VitalsTrendCharts.tsx`, `components/SplitScreenVisitWorkspace.tsx`

**Why:** Real-time vitals validation during visit recording (alerting on hypertension, anaemia, abnormal FHR as the doctor types) plus the partograph-style SVG trend charts (BP trajectory with pre-eclampsia detection, SFH McDonald's corridor with IUGR flagging, Hb response curve) elevate the app from "data entry" to "clinical decision support." Pure SVG rendering means no heavy chart library and fast loading on low-end devices.

### Rank 5: QR Health Pass + Reception Scanner *(new in this pull)*
**Files:** `components/MotherHealthCard.tsx`, `components/QRScannerModal.tsx`, `app/(app)/scan/page.tsx`

**Why:** Bridges the digital-physical gap for clinics where the mother carries a physical card. Print/share via WhatsApp + scan at reception is a real-world OPD workflow that judges can physically interact with during the demo.

### Rank 6: Demo Mode *(new in this pull)*
**Files:** `lib/demo-data.ts`, `lib/auth.ts` (L20–28), `lib/snapshot.ts` (L63–66)

**Why:** Allows instant access to a fully-loaded clinic without a Supabase backend. Critical for hackathon demos where WiFi is unreliable. The 10 synthetic patients cover every risk state and clinical scenario.

---

## 4. Weak, Redundant, or Low-Value Parts

### 4.1 No Patient Edit / LMP Correction UI
**FACT:** There is a `createPatient` server action (`app/(app)/patients/actions.ts`) and the `diffRegeneratedSchedule` logic exists in `lib/schedule.ts`, but there is NO action or UI to update patient demographics, correct LMP/EDD, or change patient status.

**OPINION:** This is a significant gap. In practice, LMP corrections from dating scans happen on nearly every first-trimester patient. The schedule diff engine was built for exactly this purpose but has no caller. A doctor who enters an incorrect phone number, LMP, or blood group currently has no way to fix it short of database access.

### 4.2 No Delivery Outcome Recording
**FACT:** The `patients.status` column supports `'delivered'` (`lib/supabase/enums.ts` L9), and the risk engine correctly short-circuits for non-active patients (`lib/risk.ts` L29: `if (input.patientStatus !== "active") return "on_track"`). But there is no UI or action to mark a patient as delivered, record delivery mode (NVD/LSCS), baby weight, or APGAR.

**OPINION:** Without this, the system has no lifecycle closure. Delivered patients remain "active" forever, accumulating overdue events and inflating the call queue. This directly undermines the follow-up value proposition.

### 4.3 OCR Accuracy Limitations
**FACT:** The OCR pipeline (`lib/ocr.ts`) runs English-only Tesseract.js (`createWorker("eng")`). It uses a custom light-threshold binarisation (pixel > 150 → white, otherwise preserve) that is designed for handwriting, but Tesseract's accuracy on Indian doctor handwriting is fundamentally limited. The app honestly discloses this in the UI.

**INFERENCE:** OCR text quality is low on real-world clinical papers, making full-text search unreliable. However, this is somewhat mitigated by the ability for staff to manually tag documents when filing them.

**OPINION:** This is an honest and acceptable trade-off for a hackathon. The preprocessing is reasonable (downscale + grayscale + threshold). The real value is in the capture-and-file workflow, not the OCR text quality.

### 4.4 Demo Mode Data Gaps
**FACT:** The demo mode returns empty arrays for `documents` in `getDemoPatientDetail()` (`lib/demo-data.ts` L372: `documents: []`). Several pages that rely on Supabase-specific features (settings page loading staff list, schedule template items, document uploads) will fail or show empty states in demo mode.

**INFERENCE:** Demo mode covers the Today dashboard, patient list, patient detail, and call queue well, but documents/OPD/settings sections will appear empty.

**OPINION:** For a hackathon demo, this is likely acceptable — the evaluator will focus on the dashboard and call queue. But if a judge clicks into documents or settings, it will look broken.

### 4.5 `design-system/tokens.css` is Redundant
**FACT:** `design-system/tokens.css` defines a standalone CSS token set, but `globals.css` only imports `design-system/tailwind.theme.css`. The actual component styling uses `var(--color-*)` variables from the Tailwind theme, not from `tokens.css`.

**INFERENCE:** `tokens.css` was likely an early design exploration file that was superseded by `tailwind.theme.css`. It is not imported anywhere and is dead code.

### 4.6 Vitals Limit of 5000 Rows in Snapshot
**FACT:** `lib/snapshot.ts` L88: `.limit(5000)` on the visits query. For a clinic with hundreds of patients and regular fortnightly visits over 9 months, this could truncate.

**INFERENCE:** With 200 patients × 20 visits each = 4000 rows, this is tight. A large clinic would hit this limit within a year.

**OPINION:** Fine for the hackathon. Would need a per-patient subquery approach in production.

### 4.7 QRScannerModal Uses `unknown` Type Extensively
**FACT:** `components/QRScannerModal.tsx` uses `scannerRef = useRef<unknown>(null)` (L52) and casts `html5QrCode` through `as` assertions (L104, L83, L127). This is because `html5-qrcode` is dynamically imported and its types aren't available statically.

**OPINION:** This is a pragmatic workaround for dynamic imports, not a quality issue. The type unsafety is contained within the component.

### 4.8 Missing Tests for New Code
**FACT:** The newly pulled `MotherHealthCard.tsx`, `QRScannerModal.tsx`, `demo-data.ts`, and `scan/page.tsx` have no corresponding unit or component tests. The demo data functions (`getDemoSnapshot`, `getDemoPatientDetail`) exercise existing tested logic (`pregnancy.ts`, `clinical.ts`) but have no direct tests themselves.

**OPINION:** Not critical for the hackathon, but the demo data functions are complex enough (date arithmetic, flag computation) that a unit test would catch regressions.

---

## 5. Top 4 Missing Features

### Feature 1: Patient Edit + LMP/EDD Correction with Schedule Regeneration

**One-line summary:** Allow doctors to edit patient demographics, correct LMP/EDD (from a dating scan), and automatically recalculate all open ANC milestones.

**Problem it solves and for whom:**
- **Doctor**: In Indian private practice, nearly every first-trimester patient gets an LMP correction from the dating scan. Without this, the entire ANC schedule (and risk calculations) drift from reality. The doctor currently has no way to fix a typo in phone, age, blood group, or Rh status without database access.
- **Staff**: Can't update a patient's phone number when the mother changes SIMs (common in India).

**Why it is missing now:**
- *Search performed*: `Select-String` for "editPatient", "updatePatient", "edit_patient", "correctLmp", "correctEdd" returned zero results across all source files.
- *What exists nearby*: The `diffRegeneratedSchedule()` function in `lib/schedule.ts` (L85–108) was clearly designed for exactly this use case — it preserves completed/skipped events and only updates open event windows. But no server action or UI calls it. The `patients` table supports `edd_source` (`'lmp' | 'scan' | 'manual'`) indicating scan-corrected EDD was anticipated.

**Files/tables that would change or be added:**
- **New/modify**: `app/(app)/patients/[id]/actions.ts` — add `updatePatient` server action calling `diffRegeneratedSchedule`
- **New/modify**: `app/(app)/patients/[id]/page.tsx` or new component — add edit form/modal
- **Existing table used**: `patients` (UPDATE), `care_events` (UPDATE windows, INSERT new items)
- **Existing lib used**: `lib/schedule.ts` (`generateSchedule`, `diffRegeneratedSchedule`)

**Rough effort:** **S** (Small) — the hardest part (schedule diff) is already built and tested. The server action is ~50 lines of Zod validation + Supabase update + schedule regeneration. UI is a modal form pre-filled with current values.

**Main technical risk:** Ensuring the schedule diff correctly handles edge cases where an LMP correction moves a "due" event back to "upcoming" or an "upcoming" event into "overdue." The existing unit tests cover this, but real-world data may surprise.

**Demo impact:** **High** — A live demo where the doctor corrects LMP from a dating scan and all schedule dates shift in real time is a powerful "continuity of care" moment. It shows the system adapts to clinical reality rather than being rigid.

**Devil's advocate:** The edit form is boilerplate CRUD that doesn't showcase the hackathon theme. The visually exciting part (schedule regeneration) takes 2 seconds to see and may not register with a time-constrained judge. The risk of introducing an edit bug in the last days is non-trivial.

---

### Feature 2: Delivery Outcome Recording + Pregnancy Closure

**One-line summary:** Mark a pregnancy as delivered (or transferred/loss), record delivery outcome (mode, baby weight, complications), and close the ANC cycle.

**Problem it solves and for whom:**
- **Doctor**: Without this, delivered patients pile up as "active" with overdue events, polluting the dashboard and call queue. The risk engine can't distinguish "delivered safely at 39w" from "lost to follow-up at 39w."
- **Staff**: No way to stop calling a patient who has already delivered.
- **Hackathon theme**: "Continuity of care" implies a full lifecycle — registration through delivery. A system that can't record the outcome is incomplete.

**Why it is missing now:**
- *Search performed*: `Select-String` for "delivered", "postpartum", "discharge", "delivery_outcome" returned only the enum definition in `enums.ts`. No UI, action, or table column for delivery details.
- *What exists nearby*: `PatientStatus` enum includes `'delivered'` (`lib/supabase/enums.ts` L9). The risk engine already handles `patientStatus !== "active"` → `"on_track"` (`lib/risk.ts` L29). The `patients.status` column supports the transition. Only the UI, action, and optionally a `delivery_details` JSON column are missing.

**Files/tables that would change or be added:**
- **New/modify**: `app/(app)/patients/[id]/actions.ts` — add `closePregnancy` server action
- **New component**: `components/ClosePregnancyForm.tsx` — modal with status, delivery mode, date, baby weight, notes
- **Modify**: `app/(app)/patients/[id]/page.tsx` — add "Close pregnancy" button for active patients; show delivery summary for closed
- **Possible migration**: Add `delivery_date date`, `delivery_mode text`, `baby_weight numeric`, `delivery_notes text` columns to `patients` table (or store as JSONB). *Needs Clinical Lead review for which fields are medically necessary.*

**Rough effort:** **S–M** (Small to Medium) — the status transition and basic form are straightforward. A new migration is needed for delivery detail columns. The complexity is in deciding what clinical data to capture (mode, complications, APGAR) without overstepping into medical advice territory.

**Main technical risk:** A migration adds deployment complexity. If the delivery form captures clinical data (APGAR scores, complications), those thresholds need Clinical Lead sign-off. Privacy consideration: delivery outcome data is sensitive health data under the DPDP Act; ensure it's covered by the same RLS policies.

**Demo impact:** **High** — Closing a pregnancy and seeing it disappear from the active worklist/call queue completes the story arc judges expect. "Registration → tracking → follow-up → delivery → closure" is the full lifecycle.

**Devil's advocate:** Delivery recording is a write-once action that most patients hit only once. It's less useful during the 9-month tracking period that the hackathon theme focuses on. A simple status dropdown (without delivery details) would be faster and achieve 80% of the value.

---

### Feature 3: Clinic Analytics Dashboard (Today's OPD Summary + Weekly Compliance)

**One-line summary:** A lightweight analytics panel showing daily OPD volume, ANC schedule compliance rate, follow-up conversion metrics, and trimester distribution — all computed from existing data.

**Problem it solves and for whom:**
- **Doctor**: No current way to answer "how many patients am I managing?", "what percentage of my patients are up to date on their ANC schedule?", "how many patients did we lose to follow-up this month?" These are questions a practice owner asks daily.
- **Hackathon judges**: Aggregate metrics demonstrate the system's value at scale. Individual patient views don't convey "this tool manages hundreds of pregnancies."

**Why it is missing now:**
- *Search performed*: `Select-String` for "csv", "excel", "analytics", "statistics", "clinic.*summary" returned no meaningful results (only unrelated matches in auth action result types).
- *What exists nearby*: The `/today` page already computes stat tiles (active count, needs-follow-up count, overdue count, at-risk count, lost count, deliveries-in-30-days). But these are counts, not trends or rates. The `getClinicSnapshot()` function returns all the raw data needed.

**Files/tables that would change or be added:**
- **New**: `app/(app)/analytics/page.tsx` (or extend `/today`)
- **New component**: `components/ClinicAnalyticsSummary.tsx` — summary cards + one SVG chart
- **No new tables** — all data is computed from existing `patients`, `care_events`, `visits`, `contact_log`
- **Reuse**: `lib/snapshot.ts`, `lib/clinical.ts` for computed metrics

**Rough effort:** **S** (Small) — no new data model, no migrations, no new dependencies. Pure server-side computation from existing Supabase queries + a presentational component.

**Main technical risk:** Minimal. The only risk is over-engineering — a simple stat grid is more impactful than a complex chart that takes 2 days to build.

**Demo impact:** **Medium–High** — Provides the "zoom out" view that judges need to evaluate systemic impact. However, with only demo data (10 patients), the metrics may look thin.

**Devil's advocate:** With 10 demo patients, the analytics will be trivially small and unimpressive. The stat tiles on `/today` already give a numeric overview. Building a full analytics page for a hackathon may be over-investment for low visual payoff. The demo data would need expansion to make this worthwhile.

---

### Feature 4: Batch Contact Logging from Call Queue

**One-line summary:** Allow staff to select multiple patients in the call queue and log the same outcome (e.g., "no_answer") for all of them in one action, instead of logging each individually.

**Problem it solves and for whom:**
- **Staff**: When making 30+ calls in a morning session, the clinic assistant typically calls patients in sequence and many don't answer. Currently, each "no_answer" requires opening the contact log form, selecting the outcome, and submitting — for every patient. A batch "mark as no_answer" on selected patients would save 15+ minutes per morning session.
- **Hackathon theme**: Directly enables the daily follow-up workflow to scale from dozens to hundreds of patients.

**Why it is missing now:**
- *Search performed*: `Select-String` for "batch", "bulk", "mass", "mark.*all", "select.*multiple" returned zero results across all source files.
- *What exists nearby*: The `CallQueue` component (`components/CallQueue.tsx`) already has `quickLogContact()` action (`app/(app)/calls/actions.ts`) that takes `(patientId, channel, outcome, notes)` — the same function just needs to be called in a loop with a list of patient IDs.

**Files/tables that would change or be added:**
- **Modify**: `components/CallQueue.tsx` — add selection checkboxes, batch action bar
- **Modify or new**: `app/(app)/calls/actions.ts` — add `batchLogContact(patientIds: string[], channel, outcome, notes)` server action
- **No new tables** — uses existing `contact_log`

**Rough effort:** **S** (Small) — the server action is a loop over existing logic. The UI change is adding checkbox state and a floating action bar.

**Main technical risk:** Logging 30+ contacts in a single server action could hit Supabase's rate limits or the request timeout. Mitigation: use a single `INSERT INTO contact_log ... VALUES (...), (...), (...)` multi-row insert.

**Demo impact:** **Medium** — Demonstrates the app handles real operational scale. However, it's a UX convenience feature, not a visually dramatic demo moment.

**Devil's advocate:** This optimises an existing workflow rather than enabling a new one. The current per-patient logging works, just slower. For a hackathon, the time spent adding batch select UX could be better invested in a more visually impactful feature.

---

## 6. Recommendation & Build Order

### Ranked Priority

| Priority | Feature | Effort | Demo Impact | Reasoning |
|---|---|---|---|---|
| **1** | Patient Edit + LMP/EDD Correction | S | High | The schedule diff engine is already built and tested but has no caller. This is the highest-leverage feature: ~50 lines of server action + a modal form unlocks the entire LMP correction → schedule regeneration flow. |
| **2** | Delivery Outcome + Pregnancy Closure | S–M | High | Completes the patient lifecycle story. Without it, the system leaks — delivered patients clog the dashboard. A basic status-transition form takes the demo from "tracking tool" to "lifecycle management." |
| **3** | Clinic Analytics Dashboard | S | Medium–High | Provides the "birds-eye view" that judges need. But utility scales with patient count; with 10 demo patients the impact is limited. Consider adding to `/today` rather than a new page. |
| **4** | Batch Contact Logging | S | Medium | Nice operational UX, but hard to demo and not visually impactful. Build last or skip for the hackathon. |

### Dependency Order
- **Feature 1 → Feature 2**: Feature 1 (patient edit) introduces the `updatePatient` action infrastructure. Feature 2 (close pregnancy) extends it with a status transition. Building Feature 1 first means Feature 2 can reuse the modal/form pattern.
- **Feature 3** is independent.
- **Feature 4** is independent.

### Interaction with Known "Not Done" Items
- **Automated WhatsApp Business API bot**: Features 1 and 2 don't interact with this. Feature 4 (batch logging) would feed more data into `contact_log`, which the bot reads.
- **Hindi/Marathi template wording**: Already shipped in the pulled changes. The multilingual templates are complete.
- **Clinical Lead sign-off**: Feature 2 needs sign-off on what delivery outcome fields to capture (clinical data sensitivity). Feature 1 is safe — it only re-runs existing logic.

---

## 7. Open Questions for You

1. **Feature 1 (Patient Edit):** Should the edit form be a modal on the patient detail page, or a separate `/patients/[id]/edit` page? Modal is faster to build; page gives more space for the schedule-diff preview.

2. **Feature 2 (Delivery Closure):** How much delivery outcome data do you want to capture? Options:
   - **Minimal** (S effort): Just the status dropdown (delivered / transferred / loss / closed) + date. No clinical detail.
   - **Moderate** (M effort): Status + date + delivery mode (NVD/LSCS) + baby weight + brief notes. Needs a new migration.
   - **Full** (L effort): APGAR scores, complications, maternal/neonatal outcome — *needs Clinical Lead review*.

3. **Feature 3 (Analytics):** Should this be a new `/analytics` page or additional panels on `/today`? And should the demo data be expanded beyond 10 patients to make aggregate metrics more meaningful?

4. **Feature 4 (Batch Logging):** Is this worth building for the hackathon, or should it be deferred to post-demo?

5. **Demo data coverage:** Currently, demo mode doesn't cover documents, OPD register, or settings. Should we expand demo data to show these sections, or accept the gap for the hackathon?

---

> **I have not implemented anything.** Tell me which features you want to build (and your preferences from the open questions above), and I'll start implementing.
