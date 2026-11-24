-- Aggregates for the dashboard and reports. Only confirmed expenses count.
-- security_invoker makes the views run with the caller's privileges, so the
-- expenses RLS policies still restrict every row to its owner.

create view public.monthly_expense_totals
with (security_invoker = true)
as
select
  e.user_id,
  date_trunc('month', e.date)::date as month,
  sum(e.amount_jpy)::bigint as total_jpy,
  count(*)::integer as expense_count,
  count(*) filter (where e.source = 'csv')::integer as csv_count,
  count(*) filter (where e.source = 'receipt')::integer as receipt_count,
  count(*) filter (where e.source = 'manual')::integer as manual_count
from public.expenses e
where e.status = 'confirmed'
group by e.user_id, date_trunc('month', e.date);

create view public.monthly_category_totals
with (security_invoker = true)
as
select
  e.user_id,
  date_trunc('month', e.date)::date as month,
  c.id as category_id,
  c.code as category_code,
  c.name as category_name,
  c.sort_order,
  sum(e.amount_jpy)::bigint as total_jpy,
  count(*)::integer as expense_count
from public.expenses e
join public.account_categories c on c.id = e.category_id
where e.status = 'confirmed'
group by e.user_id, date_trunc('month', e.date), c.id;

revoke all on public.monthly_expense_totals, public.monthly_category_totals from anon, authenticated;
grant select on public.monthly_expense_totals, public.monthly_category_totals to authenticated;
