-- Additive migration: Delivery Outcome Recording & Pregnancy Closure
-- Adds delivery details and pregnancy status columns to public.patients

alter table public.patients
  add column if not exists delivery_date date,
  add column if not exists delivery_mode text check (delivery_mode is null or delivery_mode in ('NVD', 'LSCS')),
  add column if not exists birth_weight_kg numeric(4,2) check (birth_weight_kg is null or (birth_weight_kg >= 0.5 and birth_weight_kg <= 6.5)),
  add column if not exists pregnancy_status text not null default 'active' check (pregnancy_status in ('active', 'delivered', 'closed')),
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references public.profiles (id) on delete set null;

-- Safe backfill: ensure all existing rows have pregnancy_status matching status
update public.patients
set pregnancy_status = case
  when status in ('delivered', 'closed') then status
  else 'active'
end
where pregnancy_status is null or pregnancy_status = 'active';

-- Index for analytics and active queries
create index if not exists patients_pregnancy_status_idx on public.patients (clinic_id, pregnancy_status);
create index if not exists patients_delivery_date_idx on public.patients (clinic_id, delivery_date) where delivery_date is not null;
