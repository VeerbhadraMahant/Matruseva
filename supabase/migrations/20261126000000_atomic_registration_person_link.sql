-- Atomic registration + stable person link.
-- 1) patients.person_id groups pregnancies (one patients row each) of the same mother.
-- 2) create_patient_with_schedule inserts the patient and its care_events in one
--    transaction so registration can no longer half-succeed.

alter table public.patients
  add column if not exists person_id uuid not null default gen_random_uuid();

comment on column public.patients.person_id is
  'One patients row = one pregnancy. person_id groups the pregnancies of the same mother within a clinic (same phone last 10 digits + same name).';

-- Backfill: same clinic + same phone (last 10 digits) + same lower(trim(name))
-- share the person_id of the earliest-created row. Rows without a phone stay alone.
with grouped as (
  select
    id,
    first_value(person_id) over (
      partition by clinic_id,
                   right(regexp_replace(phone, '\D', '', 'g'), 10),
                   lower(trim(name))
      order by created_at, id
    ) as first_person_id
  from public.patients
  where nullif(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), '') is not null
)
update public.patients p
set person_id = g.first_person_id
from grouped g
where p.id = g.id
  and p.person_id <> g.first_person_id;

create index if not exists patients_person_idx
  on public.patients (clinic_id, person_id);

-- SECURITY INVOKER: the caller's RLS applies to both inserts.
create or replace function public.create_patient_with_schedule(
  p_patient jsonb,
  p_care_events jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_clinic_id uuid := (p_patient->>'clinic_id')::uuid;
  v_phone_norm text := right(regexp_replace(coalesce(p_patient->>'phone', ''), '\D', '', 'g'), 10);
  v_person_id uuid;
  v_patient_id uuid;
begin
  if v_phone_norm <> '' then
    select p.person_id into v_person_id
    from public.patients p
    where p.clinic_id = v_clinic_id
      and right(regexp_replace(coalesce(p.phone, ''), '\D', '', 'g'), 10) = v_phone_norm
      and lower(trim(p.name)) = lower(trim(p_patient->>'name'))
    order by p.created_at desc
    limit 1;
  end if;

  insert into public.patients (
    clinic_id, name, clinic_patient_no, phone, alt_phone, age, address,
    gravida, para, blood_group, rh_negative, lmp, edd, edd_source,
    created_by, obstetric_questionnaire, person_id
  ) values (
    v_clinic_id,
    p_patient->>'name',
    p_patient->>'clinic_patient_no',
    p_patient->>'phone',
    p_patient->>'alt_phone',
    (p_patient->>'age')::int,
    p_patient->>'address',
    (p_patient->>'gravida')::int,
    (p_patient->>'para')::int,
    p_patient->>'blood_group',
    coalesce((p_patient->>'rh_negative')::boolean, false),
    (p_patient->>'lmp')::date,
    (p_patient->>'edd')::date,
    coalesce(p_patient->>'edd_source', 'lmp'),
    (p_patient->>'created_by')::uuid,
    nullif(p_patient->'obstetric_questionnaire', 'null'::jsonb),
    coalesce(v_person_id, gen_random_uuid())
  )
  returning id into v_patient_id;

  insert into public.care_events (
    clinic_id, patient_id, template_item_id, name, kind, due_from, due_to, skipped_reason
  )
  select
    e.clinic_id, v_patient_id, e.template_item_id, e.name, e.kind, e.due_from, e.due_to, e.skipped_reason
  from jsonb_to_recordset(coalesce(p_care_events, '[]'::jsonb)) as e(
    clinic_id uuid,
    template_item_id uuid,
    name text,
    kind text,
    due_from date,
    due_to date,
    skipped_reason text
  );

  return v_patient_id;
end;
$$;

revoke execute on function public.create_patient_with_schedule(jsonb, jsonb) from public, anon;
grant execute on function public.create_patient_with_schedule(jsonb, jsonb) to authenticated;
