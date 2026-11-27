alter table public.profiles
  add column degree text,
  add column years_of_experience integer,
  add constraint profiles_years_of_experience_nonnegative check (years_of_experience >= 0);
