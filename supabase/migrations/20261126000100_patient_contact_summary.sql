-- Additive migration: per-patient contact summary.
-- Replaces the app-side "fetch the newest 2000 contact_log rows" pattern in
-- app/(app)/calls/page.tsx, which silently dropped older contacts.

-- security_invoker so the querying user's RLS on public.contact_log applies
-- (same as latest_visits). Served by contact_log_patient_id_idx (patient_id, created_at desc).
-- attempts_30d: rows on or after the IST calendar date 30 days before today.
create or replace view public.patient_contact_summary
with (security_invoker = true) as
select distinct on (c.patient_id)
  c.patient_id,
  c.clinic_id,
  c.outcome  as last_outcome,
  c.channel  as last_channel,
  c.created_at as last_contact_at,
  (count(*) filter (
    where c.created_at >= (((now() at time zone 'Asia/Kolkata')::date - 30)::timestamp at time zone 'Asia/Kolkata')
  ) over (partition by c.patient_id))::int as attempts_30d
from public.contact_log c
order by c.patient_id, c.created_at desc, c.id desc;

grant select on public.patient_contact_summary to authenticated;
