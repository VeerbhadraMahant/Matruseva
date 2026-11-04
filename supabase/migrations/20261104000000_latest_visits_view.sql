-- Additive migration: latest visit per patient.
-- Replaces the app-side "fetch up to 5000 visits, keep the newest per patient"
-- pattern in lib/snapshot.ts with a DB-side DISTINCT ON.

-- Supports DISTINCT ON (patient_id) ordered by newest visit first.
create index if not exists visits_patient_latest_idx
  on public.visits (patient_id, visit_date desc, created_at desc);

-- security_invoker so the querying user's RLS on public.visits applies
-- (same as care_event_status / patient_followup_risk).
create or replace view public.latest_visits
with (security_invoker = true) as
select distinct on (v.patient_id)
  v.id,
  v.patient_id,
  v.clinic_id,
  v.visit_date,
  v.ga_weeks,
  v.bp_sys,
  v.bp_dia,
  v.weight,
  v.hb,
  v.fhr,
  v.fundal_height,
  v.notes,
  v.next_visit_date,
  v.created_by,
  v.created_at
from public.visits v
order by v.patient_id, v.visit_date desc, v.created_at desc;

grant select on public.latest_visits to authenticated;
