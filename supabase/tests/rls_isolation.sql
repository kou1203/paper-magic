-- RLS isolation test: user B must not be able to see or change user A's data.
--
-- Runs in one transaction and rolls back, so it leaves nothing behind.
-- Run it with any Postgres client connected as `postgres`, e.g. the SQL editor
-- or `psql "$DATABASE_URL" -f supabase/tests/rls_isolation.sql`.
-- It raises an exception on the first failed assertion; success prints
-- "RLS isolation: all checks passed".

begin;

-- Two throwaway users.
insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-8000-00000000000a', 'rls-test-a@example.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-test-b@example.invalid', 'authenticated', 'authenticated');

-- Helper: act as a signed-in user for the rest of the transaction.
create function pg_temp.act_as(user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

create function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'RLS check failed: %', label;
  end if;
end;
$$;

do $$
declare
  user_a constant uuid := '00000000-0000-4000-8000-00000000000a';
  user_b constant uuid := '00000000-0000-4000-8000-00000000000b';
  misc_id smallint;
  upload_a uuid;
  expense_a uuid;
  affected integer;
  blocked boolean;
begin
  -- ---------------------------------------------------------------- user A
  perform pg_temp.act_as(user_a);

  select id into misc_id from public.account_categories where code = 'misc';
  perform pg_temp.check(misc_id is not null, 'A can read account categories');

  insert into public.uploads (kind, file_name, storage_path)
  values ('csv', 'a.csv', user_a || '/u1/a.csv')
  returning id into upload_a;

  insert into public.expenses (upload_id, date, description, category_id, source, amount_jpy, dedupe_key)
  values (upload_a, '2024-06-01', 'A の経費', misc_id, 'csv', 1000, 'k1')
  returning id into expense_a;

  perform pg_temp.check((select count(*) = 1 from public.expenses), 'A sees own expense');
  perform pg_temp.check(
    (select total_jpy = 1000 from public.monthly_expense_totals where month = '2024-06-01'),
    'A sees own monthly total');

  insert into storage.objects (bucket_id, name)
  values ('uploads', user_a || '/u1/a.csv');

  -- A cannot spoof another owner.
  begin
    insert into public.uploads (user_id, kind, file_name, storage_path)
    values (user_b, 'csv', 'spoof.csv', 'spoof');
    blocked := false;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform pg_temp.check(blocked, 'A cannot insert an upload owned by B');

  -- ---------------------------------------------------------------- user B
  execute 'reset role';
  perform pg_temp.act_as(user_b);

  perform pg_temp.check((select count(*) = 0 from public.uploads), 'B cannot read A uploads');
  perform pg_temp.check((select count(*) = 0 from public.expenses), 'B cannot read A expenses');
  perform pg_temp.check((select count(*) = 0 from public.monthly_expense_totals), 'B cannot read A monthly totals');
  perform pg_temp.check((select count(*) = 0 from public.monthly_category_totals), 'B cannot read A category totals');
  perform pg_temp.check((select count(*) = 12 from public.account_categories), 'B can read account categories');
  perform pg_temp.check(
    (select count(*) = 0 from storage.objects where bucket_id = 'uploads'),
    'B cannot list A files');

  update public.expenses set amount_jpy = 1 where id = expense_a;
  get diagnostics affected = row_count;
  perform pg_temp.check(affected = 0, 'B cannot update A expense');

  delete from public.expenses where id = expense_a;
  get diagnostics affected = row_count;
  perform pg_temp.check(affected = 0, 'B cannot delete A expense');

  delete from public.uploads where id = upload_a;
  get diagnostics affected = row_count;
  perform pg_temp.check(affected = 0, 'B cannot delete A upload');

  begin
    insert into public.expenses (upload_id, date, category_id, source, amount_jpy)
    values (upload_a, '2024-06-02', misc_id, 'manual', 500);
    blocked := false;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform pg_temp.check(blocked, 'B cannot attach an expense to A upload');

  begin
    insert into storage.objects (bucket_id, name)
    values ('uploads', user_a || '/u1/evil.csv');
    blocked := false;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform pg_temp.check(blocked, 'B cannot write into A folder');

  begin
    insert into public.account_categories (code, name, sort_order) values ('hack', 'ハック', 999);
    blocked := false;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform pg_temp.check(blocked, 'B cannot modify account categories');

  -- ---------------------------------------------------------------- anon
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
  begin
    perform count(*) from public.expenses;
    blocked := false;
  exception when insufficient_privilege then
    blocked := true;
  end;
  perform pg_temp.check(blocked, 'anon cannot read expenses');

  -- ---------------------------------------------------------------- back to A
  execute 'reset role';
  perform pg_temp.act_as(user_a);
  perform pg_temp.check(
    (select amount_jpy = 1000 from public.expenses where id = expense_a),
    'A expense is unchanged after B attempts');

  execute 'reset role';
  raise notice 'RLS isolation: all checks passed';
end;
$$;

select 'RLS isolation: all checks passed' as result;

rollback;
