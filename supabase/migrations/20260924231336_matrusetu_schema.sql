-- MatruSetu core schema: clinics, staff, patients, ANC schedule, visits,
-- documents (OPD capture + OCR + full-text search), contact log.
-- Every clinical table is clinic-scoped and RLS is enabled + forced.

create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

-- =========================================================================
-- Tables
-- =========================================================================

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  phone text,
  message_templates jsonb not null default '{}'::jsonb,
  risk_at_risk_days int not null default 7,
  risk_lost_days int not null default 21,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('doctor', 'staff')),
  created_at timestamptz not null default now()
);
create index profiles_clinic_id_idx on public.profiles (clinic_id);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  clinic_patient_no text,
  name text not null,
  phone text,
  alt_phone text,
  age int,
  address text,
  gravida int,
  para int,
  blood_group text,
  rh_negative boolean not null default false,
  lmp date,
  edd date,
  edd_source text not null default 'lmp' check (edd_source in ('lmp', 'scan', 'manual')),
  risk_flags text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'delivered', 'transferred', 'loss', 'closed')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index patients_clinic_id_idx on public.patients (clinic_id);
create index patients_clinic_status_idx on public.patients (clinic_id, status);
create index patients_name_trgm_idx on public.patients using gin (name extensions.gin_trgm_ops);
create index patients_phone_trgm_idx on public.patients using gin (phone extensions.gin_trgm_ops);

create table public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  name text not null default 'Default ANC Schedule',
  is_default boolean not null default true,
  created_at timestamptz not null default now()
);
create index schedule_templates_clinic_id_idx on public.schedule_templates (clinic_id);

create table public.schedule_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.schedule_templates (id) on delete cascade,
  code text not null,
  name text not null,
  kind text not null check (kind in ('scan', 'test', 'injection', 'visit')),
  window_start_week numeric not null,
  window_end_week numeric not null,
  condition text,
  is_critical boolean not null default false,
  sort_order int not null default 0
);
create index schedule_template_items_template_id_idx on public.schedule_template_items (template_id);

create table public.care_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  template_item_id uuid references public.schedule_template_items (id) on delete set null,
  name text not null,
  kind text not null check (kind in ('scan', 'test', 'injection', 'visit')),
  due_from date not null,
  due_to date not null,
  completed_at timestamptz,
  skipped_reason text,
  document_id uuid,
  created_at timestamptz not null default now()
);
create index care_events_patient_id_idx on public.care_events (patient_id);
create index care_events_clinic_due_idx on public.care_events (clinic_id, due_to);
create index care_events_open_idx on public.care_events (clinic_id, due_to) where completed_at is null and skipped_reason is null;

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  visit_date date not null default current_date,
  ga_weeks numeric,
  bp_sys int,
  bp_dia int,
  weight numeric,
  hb numeric,
  fhr int,
  fundal_height numeric,
  notes text,
  next_visit_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index visits_patient_id_idx on public.visits (patient_id);
create index visits_clinic_next_visit_idx on public.visits (clinic_id, next_visit_date);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid references public.patients (id) on delete set null,
  doc_type text not null check (doc_type in ('report', 'scan', 'prescription', 'case_paper', 'register_page', 'other')),
  source text not null check (source in ('whatsapp', 'pdf', 'paper', 'camera')),
  doc_date date,
  storage_path text not null,
  ocr_text text,
  ocr_status text not null default 'pending' check (ocr_status in ('pending', 'done', 'failed', 'skipped')),
  care_event_id uuid references public.care_events (id) on delete set null,
  search tsvector generated always as (
    to_tsvector('simple', coalesce(ocr_text, '') || ' ' || coalesce(doc_type, '') || ' ' || coalesce(source, ''))
  ) stored,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index documents_clinic_id_idx on public.documents (clinic_id);
create index documents_patient_id_idx on public.documents (patient_id);
create index documents_inbox_idx on public.documents (clinic_id) where patient_id is null;
create index documents_search_idx on public.documents using gin (search);

alter table public.care_events
  add constraint care_events_document_id_fkey
  foreign key (document_id) references public.documents (id) on delete set null;

create table public.contact_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  reason text,
  channel text not null check (channel in ('call', 'whatsapp')),
  outcome text not null check (outcome in ('reached', 'no_answer', 'wrong_number', 'will_visit', 'refused')),
  notes text,
  follow_up_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_log_patient_id_idx on public.contact_log (patient_id, created_at desc);
create index contact_log_clinic_followup_idx on public.contact_log (clinic_id, follow_up_date);

-- =========================================================================
-- Helper functions (private schema, not exposed via API)
-- =========================================================================

create or replace function private.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select clinic_id from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'doctor'
  );
$$;

grant usage on schema private to authenticated, service_role;
grant execute on function private.current_clinic_id() to authenticated, service_role;
grant execute on function private.is_doctor() to authenticated, service_role;
revoke execute on function private.current_clinic_id() from anon, public;
revoke execute on function private.is_doctor() from anon, public;

-- Derive clinic_id from the referenced patient so every clinical row is
-- clinic-scoped without the client having to pass it explicitly.
create or replace function private.set_clinic_id_from_patient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.clinic_id is null and new.patient_id is not null then
    select clinic_id into new.clinic_id from public.patients where id = new.patient_id;
  end if;
  return new;
end;
$$;

create trigger set_clinic_id before insert on public.care_events
  for each row execute function private.set_clinic_id_from_patient();
create trigger set_clinic_id before insert on public.visits
  for each row execute function private.set_clinic_id_from_patient();
create trigger set_clinic_id before insert on public.contact_log
  for each row execute function private.set_clinic_id_from_patient();
create trigger set_clinic_id before insert on public.documents
  for each row execute function private.set_clinic_id_from_patient();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.patients
  for each row execute function private.set_updated_at();

-- Onboarding: creates the clinic + the first doctor profile + the default
-- ANC schedule template in one transaction. Runs as the signed-up user;
-- SECURITY DEFINER is required only because it inserts into clinics/profiles,
-- which have no direct insert policy for authenticated users (see RLS below).
create or replace function public.create_clinic_and_profile(
  clinic_name text,
  doctor_full_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_clinic_id uuid;
  new_template_id uuid;
begin
  if exists (select 1 from public.profiles where id = (select auth.uid())) then
    raise exception 'Profile already exists for this user';
  end if;

  insert into public.clinics (name) values (clinic_name)
    returning id into new_clinic_id;

  insert into public.profiles (id, clinic_id, full_name, role)
    values ((select auth.uid()), new_clinic_id, doctor_full_name, 'doctor');

  insert into public.schedule_templates (clinic_id, name, is_default)
    values (new_clinic_id, 'Default ANC Schedule', true)
    returning id into new_template_id;

  insert into public.schedule_template_items
    (template_id, code, name, kind, window_start_week, window_end_week, condition, is_critical, sort_order)
  values
    (new_template_id, 'booking', 'Booking visit + labs (CBC, blood group/Rh, TSH, HIV, HBsAg, VDRL, HCV, urine, RBS)', 'test', 6, 12, null, true, 10),
    (new_template_id, 'dating_scan', 'Dating / viability scan', 'scan', 6, 10, null, true, 20),
    (new_template_id, 'nt_scan', 'NT scan + double marker', 'scan', 11, 13.85, null, true, 30),
    (new_template_id, 'anomaly_scan', 'Anomaly scan (TIFFA)', 'scan', 18, 22, null, true, 40),
    (new_template_id, 'td_1', 'Td dose 1', 'injection', 16, 24, null, false, 50),
    (new_template_id, 'td_2', 'Td dose 2', 'injection', 20, 28, null, false, 60),
    (new_template_id, 'ogtt', 'OGTT', 'test', 24, 28, null, true, 70),
    (new_template_id, 'repeat_cbc', 'Repeat CBC', 'test', 28, 28, null, false, 80),
    (new_template_id, 'anti_d', 'Anti-D injection', 'injection', 28, 28, 'rh_negative', true, 90),
    (new_template_id, 'tdap', 'Tdap', 'injection', 27, 36, null, false, 100),
    (new_template_id, 'growth_scan_1', 'Growth scan + Doppler', 'scan', 28, 32, null, true, 110),
    (new_template_id, 'growth_scan_2', 'Growth scan + Doppler', 'scan', 34, 36, null, true, 120);

  return new_clinic_id;
end;
$$;

revoke execute on function public.create_clinic_and_profile(text, text) from anon, public;
grant execute on function public.create_clinic_and_profile(text, text) to authenticated;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.clinics enable row level security;
alter table public.clinics force row level security;
create policy clinics_select on public.clinics for select to authenticated
  using (id = (select private.current_clinic_id()));
create policy clinics_update on public.clinics for update to authenticated
  using (id = (select private.current_clinic_id()) and (select private.is_doctor()))
  with check (id = (select private.current_clinic_id()));

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
create policy profiles_select on public.profiles for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and clinic_id = (select private.current_clinic_id()));
create policy profiles_update_doctor on public.profiles for update to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy profiles_delete_doctor on public.profiles for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()) and id <> (select auth.uid()));

alter table public.patients enable row level security;
alter table public.patients force row level security;
create policy patients_select on public.patients for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy patients_insert on public.patients for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy patients_update on public.patients for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy patients_delete_doctor on public.patients for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.schedule_templates enable row level security;
alter table public.schedule_templates force row level security;
create policy schedule_templates_select on public.schedule_templates for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy schedule_templates_write_doctor on public.schedule_templates for all to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()))
  with check (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.schedule_template_items enable row level security;
alter table public.schedule_template_items force row level security;
create policy schedule_template_items_select on public.schedule_template_items for select to authenticated
  using (exists (
    select 1 from public.schedule_templates t
    where t.id = template_id and t.clinic_id = (select private.current_clinic_id())
  ));
create policy schedule_template_items_write_doctor on public.schedule_template_items for all to authenticated
  using (
    (select private.is_doctor()) and exists (
      select 1 from public.schedule_templates t
      where t.id = template_id and t.clinic_id = (select private.current_clinic_id())
    )
  )
  with check (
    (select private.is_doctor()) and exists (
      select 1 from public.schedule_templates t
      where t.id = template_id and t.clinic_id = (select private.current_clinic_id())
    )
  );

alter table public.care_events enable row level security;
alter table public.care_events force row level security;
create policy care_events_select on public.care_events for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy care_events_insert on public.care_events for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy care_events_update on public.care_events for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy care_events_delete_doctor on public.care_events for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.visits enable row level security;
alter table public.visits force row level security;
create policy visits_select on public.visits for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy visits_insert on public.visits for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy visits_update on public.visits for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy visits_delete_doctor on public.visits for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.documents enable row level security;
alter table public.documents force row level security;
create policy documents_select on public.documents for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy documents_insert on public.documents for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy documents_update on public.documents for update to authenticated
  using (clinic_id = (select private.current_clinic_id()))
  with check (clinic_id = (select private.current_clinic_id()));
create policy documents_delete_doctor on public.documents for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

alter table public.contact_log enable row level security;
alter table public.contact_log force row level security;
create policy contact_log_select on public.contact_log for select to authenticated
  using (clinic_id = (select private.current_clinic_id()));
create policy contact_log_insert on public.contact_log for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()));
create policy contact_log_delete_doctor on public.contact_log for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

-- =========================================================================
-- Views (security_invoker so the querying user's RLS applies, not the owner's)
-- =========================================================================

create view public.care_event_status
with (security_invoker = true) as
select
  ce.*,
  case
    when ce.completed_at is not null then 'done'
    when ce.skipped_reason is not null then 'skipped'
    when current_date > ce.due_to then 'overdue'
    when current_date >= ce.due_from then 'due'
    else 'upcoming'
  end as status
from public.care_events ce;

create view public.patient_followup_risk
with (security_invoker = true) as
select
  p.id as patient_id,
  p.clinic_id,
  p.status as patient_status,
  latest_visit.next_visit_date as next_visit_date,
  coalesce(recent_contacts.no_answer_streak, 0) as no_answer_streak,
  case
    when p.status <> 'active' then 'on_track'
    when latest_visit.next_visit_date is not null
      and latest_visit.next_visit_date < current_date - (c.risk_lost_days || ' days')::interval
      then 'lost'
    when overdue_critical.has_overdue_critical then 'at_risk'
    when latest_visit.next_visit_date is not null
      and latest_visit.next_visit_date < current_date - (c.risk_at_risk_days || ' days')::interval
      then 'at_risk'
    when coalesce(recent_contacts.no_answer_streak, 0) >= 2 then 'at_risk'
    else 'on_track'
  end as risk
from public.patients p
join public.clinics c on c.id = p.clinic_id
left join lateral (
  select v.next_visit_date
  from public.visits v
  where v.patient_id = p.id and v.next_visit_date is not null
  order by v.visit_date desc
  limit 1
) latest_visit on true
left join lateral (
  select exists (
    select 1
    from public.care_events ce
    join public.schedule_template_items sti on sti.id = ce.template_item_id
    where ce.patient_id = p.id
      and sti.is_critical
      and ce.completed_at is null
      and ce.skipped_reason is null
      and current_date > ce.due_to
  ) as has_overdue_critical
) overdue_critical on true
left join lateral (
  select count(*) filter (where cl.outcome in ('no_answer', 'wrong_number')) as no_answer_streak
  from (
    select outcome
    from public.contact_log cl
    where cl.patient_id = p.id
    order by cl.created_at desc
    limit 2
  ) cl
) recent_contacts on true;
