-- =============================================================================
-- UniSolve · 0010 · Storage buckets and object policies
-- Private buckets are never publicly readable; the app issues short-lived
-- signed URLs, and these policies decide who may create them.
--
-- Path conventions (first folder decides access):
--   request-files/{request_id}/{uuid}-{filename}
--   payment-proofs/{user_id}/{uuid}.{ext}
--   expert-docs/{user_id}/{uuid}-{filename}
--   avatars/{user_id}/avatar.{ext}           (public)
--   platform/upi-qr.{ext}                    (public, admin-managed)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('request-files', 'request-files', false, 26214400, array[
     'application/pdf',
     'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
     'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
     'application/zip', 'application/x-zip-compressed',
     'image/png', 'image/jpeg', 'image/webp', 'image/gif',
     'text/plain', 'text/csv', 'text/markdown', 'text/x-python', 'text/x-java-source', 'text/x-c', 'text/x-c++src',
     'text/javascript', 'application/javascript', 'application/json', 'application/x-ipynb+json', 'application/x-tex', 'text/html', 'text/css'
  ]),
  ('payment-proofs', 'payment-proofs', false, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
  ('expert-docs', 'expert-docs', false, 10485760, array[
     'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
     'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('platform', 'platform', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;

-- Safe uuid parse for folder names (malformed paths simply match nothing).
create or replace function public.try_uuid(t text)
returns uuid language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;
grant execute on function public.try_uuid(text) to anon, authenticated;

-- request-files ---------------------------------------------------------------
create policy "request files: participants read" on storage.objects
  for select to authenticated
  using (bucket_id = 'request-files' and public.can_access_request(public.try_uuid((storage.foldername(name))[1])));

create policy "request files: participants upload to open requests" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'request-files'
    and public.can_access_request(public.try_uuid((storage.foldername(name))[1]))
    and exists (select 1 from public.requests r
                where r.id = public.try_uuid((storage.foldername(name))[1]) and r.status not in ('cancelled', 'completed')));

create policy "request files: uploader or admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'request-files' and (owner_id = auth.uid()::text or public.is_admin()));

-- payment-proofs --------------------------------------------------------------
create policy "payment proofs: own folder upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "payment proofs: owner or admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- expert-docs -----------------------------------------------------------------
create policy "expert docs: own folder upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'expert-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "expert docs: owner or admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'expert-docs' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "expert docs: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'expert-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars (public read via public bucket URL) ---------------------------------
create policy "avatars: own folder write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own folder update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own folder delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- platform (UPI QR etc.) ------------------------------------------------------
create policy "platform: admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'platform' and public.is_admin());
create policy "platform: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'platform' and public.is_admin());
create policy "platform: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'platform' and public.is_admin());
