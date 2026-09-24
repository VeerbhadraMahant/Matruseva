-- Private Storage bucket for OPD captures/reports. Path convention:
-- {clinic_id}/{patient_id|inbox}/{uuid}.{ext} — RLS checks the first path
-- segment against the uploading user's clinic, mirroring the `documents`
-- table's clinic scoping.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy documents_bucket_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select private.current_clinic_id())::text
  );

create policy documents_bucket_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select private.current_clinic_id())::text
  );

create policy documents_bucket_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select private.current_clinic_id())::text
    and (select private.is_doctor())
  );
