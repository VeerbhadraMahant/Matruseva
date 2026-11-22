-- Add obstetric_questionnaire jsonb column to public.patients
alter table public.patients
  add column if not exists obstetric_questionnaire jsonb;

comment on column public.patients.obstetric_questionnaire is 'Standardized 7-question clinical obstetric questionnaire payload for antenatal registration.';
