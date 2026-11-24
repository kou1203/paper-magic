-- Review follow-up for KO-6.
--
-- 1. uploads.storage_path must live in the owner's own Storage folder
--    ({user_id}/...). Without this, a user could register another user's path
--    (squatting it via the global unique key, or pointing later server-side
--    processing at someone else's file).
-- 2. Uniqueness is per user, so one user's paths never collide with another's.
-- 3. Expenses policies name expenses.upload_id explicitly, so the check keeps
--    its meaning even if uploads ever gains a column called upload_id.

alter table public.uploads drop constraint uploads_storage_path_key;

alter table public.uploads
  add constraint uploads_storage_path_in_owner_folder
  check (split_part(storage_path, '/', 1) = user_id::text);

alter table public.uploads
  add constraint uploads_user_storage_path_key unique (user_id, storage_path);

drop policy "Users can create their own expenses" on public.expenses;
create policy "Users can create their own expenses"
on public.expenses for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    expenses.upload_id is null
    or exists (
      select 1 from public.uploads u
      where u.id = expenses.upload_id and u.user_id = (select auth.uid())
    )
  )
);

drop policy "Users can update their own expenses" on public.expenses;
create policy "Users can update their own expenses"
on public.expenses for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    expenses.upload_id is null
    or exists (
      select 1 from public.uploads u
      where u.id = expenses.upload_id and u.user_id = (select auth.uid())
    )
  )
);
