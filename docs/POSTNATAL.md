# Postnatal care: mother and newborn, first 42 days

Scope: the period an OB-GYN practice still sees both mother and baby, from delivery to the 6-week check.
Out of scope: vaccines beyond the birth doses, growth charts, milestones, long-term paediatric care.

This file is the contract between the database, the domain logic, the server actions and the UI.
Change it first if a contract has to change.

## Clinical schedule

Postnatal visits (joint: mother and all babies seen together), windows counted from the delivery date (day 0):

| code | label | due_from | due_to |
|---|---|---|---|
| `PNC_D3` | Day 3 check | day 2 | day 4 |
| `PNC_D7` | Day 7 check | day 6 | day 9 |
| `PNC_D14` | Day 14 check | day 13 | day 17 |
| `PNC_D42` | 6-week check | day 40 | day 49 |

Visit status (`postnatalVisitStatuses` in `lib/postnatal.ts`, used for every status in the app, real and demo):
`done` when completed; otherwise `upcoming` before `due_from`, `due` inside the window, `overdue` after `due_to`.
An incomplete visit is instead `missed` when a LATER visit in schedule order is completed, or a later visit's
`due_from` is on or before today (the next check has started, so this one is no longer chased). Missed visits are not
overdue anywhere, never put a mother on the Today card and are never the "next visit". A missed visit can still be
recorded late; it then becomes `done`. `postnatalVisitStatus` (single visit, window rules only) is kept unchanged.

Recording rules (`recordPostnatalVisit`): a visit cannot be recorded before its `due_from` (the Record button is hidden
for upcoming visits). Re-saving a completed visit changes findings and notes only; `completed_at` and `completed_by`
keep their original values. Dates shown from `completed_at` (a timestamp) are the IST calendar day.

Birth-dose vaccines (India UIP), per baby, due from day 0:

| code | label | overdue after |
|---|---|---|
| `HEPB0` | Hepatitis B birth dose | day 1 |
| `OPV0` | OPV zero dose | day 15 |
| `BCG` | BCG | day 42 (UIP allows later; we stop tracking at 6 weeks) |

A vaccine counts as done when `given_on` is set or `given_elsewhere` is true.

## Database (migration `supabase/migrations/20261128000000_postnatal_care.sql`)

`public.newborns`
- `id uuid pk default gen_random_uuid()`, `clinic_id uuid not null` (filled by `private.set_clinic_id_from_patient`), `patient_id uuid not null references patients on delete cascade` (the mother)
- `birth_order smallint not null default 1 check (birth_order between 1 and 3)`, `unique (patient_id, birth_order)`
- `name text null` (often "Baby of ..." until named), `sex text null check (sex in ('female','male','ambiguous'))`
- `birth_date date not null`, `birth_weight_kg numeric(4,2) not null check (birth_weight_kg between 0.5 and 6.5)`
- `gestational_age_weeks smallint null check (between 20 and 44)`, `nicu_admission boolean not null default false`
- `created_at`, `updated_at` (with the existing `private.set_updated_at` trigger)

`public.postnatal_visits`
- `id`, `clinic_id`, `patient_id` (mother, cascade)
- `code text not null check (code in ('PNC_D3','PNC_D7','PNC_D14','PNC_D42'))`, `unique (patient_id, code)`
- `due_from date not null`, `due_to date not null`
- `completed_at timestamptz null`, `completed_by uuid null references profiles on delete set null`
- `mother_findings jsonb not null default '{}'`, `baby_findings jsonb not null default '{}'` (object keyed by newborn id)
- `notes text null`, `created_at`, `updated_at`

`public.newborn_vaccinations`
- `id`, `clinic_id`, `patient_id` (mother, cascade; drives the clinic trigger), `newborn_id uuid not null references newborns on delete cascade`
- `vaccine text not null check (vaccine in ('HEPB0','OPV0','BCG'))`, `unique (newborn_id, vaccine)`
- `given_on date null`, `given_elsewhere boolean not null default false`, `batch_no text null`, `recorded_by uuid null`, `created_at`, `updated_at`

RLS on all three, same as `care_events`: enabled and forced, `to authenticated`, select/insert/update where
`clinic_id = (select private.current_clinic_id())`, delete only when also `(select private.is_doctor())`.
Indexes: `(clinic_id, patient_id)` on each; `postnatal_visits (clinic_id, due_from) where completed_at is null`.

RPC `public.record_delivery(p_patient_id uuid, p_delivery jsonb, p_newborns jsonb, p_visits jsonb, p_vaccines jsonb) returns void`
- `security invoker`, `set search_path = ''`, plpgsql; grant execute to `authenticated` only (revoke from public, anon).
- Atomic: raise if the patient is not found or not active; update the patient exactly as `closePregnancy` does today
  (status, pregnancy_status, delivery_date, delivery_mode, `birth_weight_kg` = baby 1's weight, closed_at, closed_by);
  mark open `care_events` skipped with reason `Pregnancy closed / delivered`; insert newborns, visits, vaccines.
- `p_delivery`: `{ delivery_date, delivery_mode, closed_by, notes? }` (notes handled the way closePregnancy handles them today).
- `p_newborns`: `[{ birth_order, name, sex, birth_date, birth_weight_kg, gestational_age_weeks, nicu_admission }]`
- `p_visits`: `[{ code, due_from, due_to }]`; `p_vaccines`: `[{ birth_order, vaccine }]` (resolved to newborn ids inside the RPC).

## Domain module `lib/postnatal.ts` (pure, no I/O, unit tested)

```ts
export const POSTNATAL_VISITS: readonly { code: PostnatalVisitCode; day: number; fromDay: number; toDay: number }[];
export const BIRTH_VACCINES: readonly { code: BirthVaccineCode; overdueAfterDay: number }[];
export const DANGER_SIGNS = ["not_feeding", "convulsions", "fast_breathing", "chest_indrawing", "fever",
  "low_temperature", "lethargy", "jaundice_palms_soles", "cord_infection"] as const;
export const FEEDING = ["exclusive_breast", "mixed", "formula", "poor"] as const;
export const FP_METHODS = ["none", "lam", "condom", "pills", "iud", "injectable", "sterilisation"] as const;

export function buildPostnatalVisits(deliveryIso: string): { code; due_from: string; due_to: string }[];
export function postnatalVisitStatus(v: { due_from; due_to; completed_at }, todayIso: string): "done" | "due" | "overdue" | "upcoming";
export function birthVaccineStatus(v: { vaccine; given_on; given_elsewhere }, birthIso: string, todayIso: string): "given" | "due" | "overdue";
export function gestationalWeeksAtBirth(lmpIso: string, deliveryIso: string): number; // floor(days / 7)
export function dayOfLife(birthIso: string, todayIso: string): number;

export type NewbornFlag = "vlbw" | "lbw" | "very_preterm" | "preterm" | "nicu" | "danger_sign" | "poor_feeding" | "weight_not_regained";
export function newbornFlags(newborn, visitsWithFindings): NewbornFlag[];
export type MotherFlag = "high_bp" | "heavy_bleeding" | "fever" | "low_mood" | "wound_problem" | "breast_problem";
export function motherFlags(latestMotherFindings): MotherFlag[];
export const URGENT_FLAGS: ReadonlySet<NewbornFlag | MotherFlag>; // danger_sign, heavy_bleeding, high_bp

export const newbornInputSchema;   // zod: { name?, sex?, birth_weight_kg 0.5-6.5, nicu_admission }
export const motherFindingsSchema; // zod: bp_systolic 60-250?, bp_diastolic 30-160?, temperature_c 34-43?,
                                   // heavy_bleeding, wound_problem, breast_problem, low_mood, loss_of_interest (booleans), fp_method?
export const babyFindingsSchema;   // zod: weight_kg 0.5-8?, feeding?, danger_signs: DangerSign[]
```

Flag rules:
- `vlbw` weight < 1.5 kg, else `lbw` < 2.5 kg. `very_preterm` GA < 32 weeks, else `preterm` < 37. `nicu` if admitted.
- `danger_sign`: the latest completed visit has any danger sign for this baby. `poor_feeding`: latest feeding is `poor`.
- `weight_not_regained`: a completed `PNC_D14` or `PNC_D42` visit records a weight below birth weight.
- Mother (from the latest completed visit): `high_bp` systolic >= 140 or diastolic >= 90; `fever` temperature >= 38.0;
  `low_mood` if `low_mood` or `loss_of_interest` (the two-question depression screen); the rest map to their booleans.

## Server side

- `closePregnancy` in `app/(app)/patients/[id]/actions.ts` gains an optional `newborns: NewbornInput[]` (1-3).
  When absent it builds one baby from `birthWeightKg`, so existing callers keep working. It calls `record_delivery`.
- `app/(app)/patients/[id]/postnatal-actions.ts`: `recordPostnatalVisit`, `setBirthVaccine`, `updateNewborn` (name, sex).
- `lib/postnatalData.ts`: `getPatientPostnatal(patientId)` and `getClinicPostnatalDue()`; both have a demo-mode branch.
- Demo mode stores newborns, visits and vaccines in the demo store, like every other entity.

## UI

- Delivery modal: number of babies (1-3), per baby weight, sex, NICU. Gestational age is computed from LMP, not typed.
- Patient detail: a Postnatal panel for delivered patients (babies, risk flags, visit schedule, vaccine checklist,
  record-visit form, link to the handover summary).
- Today: a Postnatal card listing mothers with a visit due or overdue this week, pending birth doses, or urgent flags.
- `/patients/[id]/postnatal-summary`: printable A4 handover summary for the paediatrician.
  Missed visits show a "Missed" chip in the panel and are listed as "Not seen: ..." (not as pending) at handover.
