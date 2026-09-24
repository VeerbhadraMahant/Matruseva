-- Fix "multiple permissive policies" findings from `supabase db advisors`:
-- Postgres evaluates every permissive policy for a given role+action, so
-- overlapping policies on the same action are pure overhead. Merge/split
-- them so each role+action combination has exactly one permissive policy.

-- profiles: merge the two UPDATE policies (self-update OR doctor-update)
-- into a single policy with an explicit OR, same effective access.
drop policy profiles_update_self on public.profiles;
drop policy profiles_update_doctor on public.profiles;

create policy profiles_update on public.profiles for update to authenticated
  using (
    clinic_id = (select private.current_clinic_id())
    and (id = (select auth.uid()) or (select private.is_doctor()))
  )
  with check (
    clinic_id = (select private.current_clinic_id())
    and (id = (select auth.uid()) or (select private.is_doctor()))
  );

-- schedule_templates / schedule_template_items: the doctor "write" policy
-- was FOR ALL, which also covers SELECT and duplicates the plain select
-- policy (staff need read access the doctor-only policy doesn't grant).
-- Split it into insert/update/delete so SELECT has only one policy.
drop policy schedule_templates_write_doctor on public.schedule_templates;

create policy schedule_templates_insert_doctor on public.schedule_templates for insert to authenticated
  with check (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));
create policy schedule_templates_update_doctor on public.schedule_templates for update to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()))
  with check (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));
create policy schedule_templates_delete_doctor on public.schedule_templates for delete to authenticated
  using (clinic_id = (select private.current_clinic_id()) and (select private.is_doctor()));

drop policy schedule_template_items_write_doctor on public.schedule_template_items;

create policy schedule_template_items_insert_doctor on public.schedule_template_items for insert to authenticated
  with check (
    (select private.is_doctor()) and exists (
      select 1 from public.schedule_templates t
      where t.id = template_id and t.clinic_id = (select private.current_clinic_id())
    )
  );
create policy schedule_template_items_update_doctor on public.schedule_template_items for update to authenticated
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
create policy schedule_template_items_delete_doctor on public.schedule_template_items for delete to authenticated
  using (
    (select private.is_doctor()) and exists (
      select 1 from public.schedule_templates t
      where t.id = template_id and t.clinic_id = (select private.current_clinic_id())
    )
  );
