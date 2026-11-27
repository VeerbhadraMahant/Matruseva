-- Postnatal care (first 42 days): newborns, joint postnatal visits, birth-dose
-- vaccines, and an atomic record_delivery() RPC. Contract: docs/POSTNATAL.md.

create table public.newborns (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  birth_order smallint not null default 1 check (birth_order between 1 and 3),
  name text,
  sex text check (sex in ('female', 'male', 'ambiguous')),
  birth_date date not null,
  birth_weight_kg numeric(4,2) not null check (birth_weight_kg between 0.5 and 6.5),
  gestational_age_weeks smallint check (gestational_age_weeks between 20 and 44),
  nicu_admission boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, birth_order)
);
create index newborns_clinic_patient_idx on public.newborns (clinic_id, patient_id);

create table public.postnatal_visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  code text not null check (code in ('PNC_D3', 'PNC_D7', 'PNC_D14', 'PNC_D42')),
  due_from date not null,
  due_to date not null,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  mother_findings jsonb not null default '{}'::jsonb,
  baby_findings jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_id, code)
);
create index postnatal_visits_clinic_patient_idx on public.postnatal_visits (clinic_id, patient_id);
create index postnatal_visits_open_idx on public.postnatal_visits (clinic_id, due_from) where completed_at is null;

create table public.newborn_vaccinations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  newborn_id uuid not null references public.newborns (id) on delete cascade,
  vaccine text not null check (vaccine in ('HEPB0', 'OPV0', 'BCG')),
  given_on date,
  given_elsewhere boolean not null default false,
  batch_no text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (newborn_id, vaccine)
);
create index newborn_vaccinations_clinic_patient_idx on public.newborn_vaccinations (clinic_id, patient_id);
-- FK column used by the cascade from newborns.
create index newborn_vaccinations_newborn_idx on public.newborn_vaccinations (newborn_id);

create trigger set_clinic_id before insert on public.newborns
  for each row execute function private.set_clinic_id_from_patient();
create trigger set_clinic_id before insert on public.postnatal_visits
  for each row execute function private.set_clinic_id_from_patient();
create trigger set_clinic_id before insert on public.newborn_vaccinations
  for each row execute function private.set_clinic_id_from_patient();

create trigger set_updated_at before update on public.newborns
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.postnatal_visits
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.newborn_vaccinations
  for each row execute function private.set_updated_at();

alter table public.newborns enable row level security;
alter table public.newborns force row level security;
create policy newborns_select on public.newborns for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy newborns_insert on public.newborns for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy newborns_update on public.newborns for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy newborns_delete_doctor on public.newborns for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.postnatal_visits enable row level security;
alter table public.postnatal_visits force row level security;
create policy postnatal_visits_select on public.postnatal_visits for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy postnatal_visits_insert on public.postnatal_visits for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy postnatal_visits_update on public.postnatal_visits for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy postnatal_visits_delete_doctor on public.postnatal_visits for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.newborn_vaccinations enable row level security;
alter table public.newborn_vaccinations force row level security;
create policy newborn_vaccinations_select on public.newborn_vaccinations for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy newborn_vaccinations_insert on public.newborn_vaccinations for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy newborn_vaccinations_update on public.newborn_vaccinations for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy newborn_vaccinations_delete_doctor on public.newborn_vaccinations for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

-- SECURITY INVOKER: the caller's RLS applies to every statement. Because any
-- signed-in user can call this directly, it validates its own inputs:
-- closed_by is always auth.uid() and newborn birth_date is the delivery date.
-- p_delivery.notes is accepted but not stored, matching closePregnancy today
-- (patients has no closure-notes column).
create or replace function public.record_delivery(
  p_patient_id uuid,
  p_delivery jsonb,
  p_newborns jsonb,
  p_visits jsonb,
  p_vaccines jsonb
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pregnancy_status text;
  v_lmp date;
  v_delivery_date date := (p_delivery->>'delivery_date')::date;
  v_count int := jsonb_array_length(coalesce(p_newborns, '[]'::jsonb));
  v_first_weight numeric;
  v_vaccine_count int;
  v_inserted int;
begin
  if v_count < 1 or v_count > 3 then
    raise exception 'record_delivery: p_newborns must contain 1 to 3 babies (got %)', v_count;
  end if;

  select p.pregnancy_status, p.lmp into v_pregnancy_status, v_lmp
  from public.patients p
  where p.id = p_patient_id
  for update;

  if not found then
    raise exception 'record_delivery: patient % not found', p_patient_id;
  end if;
  if v_pregnancy_status <> 'active' then
    raise exception 'record_delivery: pregnancy is not active (status: %)', v_pregnancy_status;
  end if;

  if v_delivery_date is null then
    raise exception 'record_delivery: delivery_date is required';
  end if;
  if v_delivery_date > private.today_ist() then
    raise exception 'record_delivery: delivery_date cannot be in the future';
  end if;
  if v_lmp is not null and v_delivery_date < v_lmp then
    raise exception 'record_delivery: delivery_date cannot be before the LMP (%)', v_lmp;
  end if;
  if p_delivery->>'delivery_mode' is null then
    raise exception 'record_delivery: delivery_mode is required';
  end if;

  select n.birth_weight_kg into v_first_weight
  from jsonb_to_recordset(p_newborns) as n(birth_order smallint, birth_weight_kg numeric)
  order by n.birth_order
  limit 1;

  update public.patients
  set status = 'delivered',
      pregnancy_status = 'delivered',
      delivery_date = v_delivery_date,
      delivery_mode = p_delivery->>'delivery_mode',
      birth_weight_kg = v_first_weight,
      closed_at = now(),
      closed_by = auth.uid()
  where id = p_patient_id;

  update public.care_events
  set skipped_reason = 'Pregnancy closed / delivered'
  where patient_id = p_patient_id
    and completed_at is null
    and skipped_reason is null;

  insert into public.newborns (
    patient_id, birth_order, name, sex, birth_date, birth_weight_kg,
    gestational_age_weeks, nicu_admission
  )
  select
    p_patient_id, n.birth_order, n.name, n.sex, v_delivery_date, n.birth_weight_kg,
    n.gestational_age_weeks, coalesce(n.nicu_admission, false)
  from jsonb_to_recordset(p_newborns) as n(
    birth_order smallint,
    name text,
    sex text,
    birth_weight_kg numeric,
    gestational_age_weeks smallint,
    nicu_admission boolean
  );

  insert into public.postnatal_visits (patient_id, code, due_from, due_to)
  select p_patient_id, v.code, v.due_from, v.due_to
  from jsonb_to_recordset(coalesce(p_visits, '[]'::jsonb)) as v(
    code text,
    due_from date,
    due_to date
  );

  v_vaccine_count := jsonb_array_length(coalesce(p_vaccines, '[]'::jsonb));
  insert into public.newborn_vaccinations (patient_id, newborn_id, vaccine)
  select p_patient_id, nb.id, v.vaccine
  from jsonb_to_recordset(coalesce(p_vaccines, '[]'::jsonb)) as v(
    birth_order smallint,
    vaccine text
  )
  join public.newborns nb
    on nb.patient_id = p_patient_id and nb.birth_order = v.birth_order;
  get diagnostics v_inserted = row_count;

  if v_inserted <> v_vaccine_count then
    raise exception 'record_delivery: p_vaccines references an unknown birth_order';
  end if;
end;
$$;

revoke execute on function public.record_delivery(uuid, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.record_delivery(uuid, jsonb, jsonb, jsonb, jsonb) to authenticated;
