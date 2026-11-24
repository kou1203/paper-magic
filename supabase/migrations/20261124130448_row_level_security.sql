-- Row Level Security: each user can read and write only their own rows.
-- Master tables are readable by signed-in users and writable by no one
-- through the API.

alter table public.account_categories enable row level security;
alter table public.category_mappings enable row level security;
alter table public.uploads enable row level security;
alter table public.expenses enable row level security;

-- Explicit privileges: nothing for anon, only what policies need for authenticated.
revoke all on public.account_categories, public.category_mappings,
  public.uploads, public.expenses from anon, authenticated;

grant select on public.account_categories, public.category_mappings to authenticated;
grant select, insert, update, delete on public.uploads, public.expenses to authenticated;

-- ---------------------------------------------------------------------------
-- Master data
-- ---------------------------------------------------------------------------
create policy "Signed-in users can read account categories"
on public.account_categories for select to authenticated
using (true);

create policy "Signed-in users can read category mappings"
on public.category_mappings for select to authenticated
using (true);

-- ---------------------------------------------------------------------------
-- Uploads
-- `(select auth.uid())` is evaluated once per statement instead of per row.
-- ---------------------------------------------------------------------------
create policy "Users can read their own uploads"
on public.uploads for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own uploads"
on public.uploads for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own uploads"
on public.uploads for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own uploads"
on public.uploads for delete to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Expenses
-- An expense may only point at an upload owned by the same user.
-- ---------------------------------------------------------------------------
create policy "Users can read their own expenses"
on public.expenses for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own expenses"
on public.expenses for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    upload_id is null
    or exists (
      select 1 from public.uploads u
      where u.id = upload_id and u.user_id = (select auth.uid())
    )
  )
);

create policy "Users can update their own expenses"
on public.expenses for update to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    upload_id is null
    or exists (
      select 1 from public.uploads u
      where u.id = upload_id and u.user_id = (select auth.uid())
    )
  )
);

create policy "Users can delete their own expenses"
on public.expenses for delete to authenticated
using ((select auth.uid()) = user_id);
