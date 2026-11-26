-- Security advisor: SECURITY DEFINER functions callable through the API.

-- 1) Onboarding keeps its elevated body, but in the non-exposed private schema.
--    public.create_clinic_and_profile becomes a SECURITY INVOKER wrapper so the
--    app's rpc() call is unchanged. The body still refuses a second profile.
alter function public.create_clinic_and_profile(text, text) set schema private;

revoke execute on function private.create_clinic_and_profile(text, text) from public, anon;
grant execute on function private.create_clinic_and_profile(text, text) to authenticated;

create or replace function public.create_clinic_and_profile(
  clinic_name text,
  doctor_full_name text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_clinic_and_profile(clinic_name, doctor_full_name);
$$;

revoke execute on function public.create_clinic_and_profile(text, text) from public, anon;
grant execute on function public.create_clinic_and_profile(text, text) to authenticated;

-- 2) rls_auto_enable is the ensure_rls event-trigger function. Event triggers
--    are fired by the server without an EXECUTE check, so no API role needs it.
--    Guarded because it is created by the dashboard, not by these migrations.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
