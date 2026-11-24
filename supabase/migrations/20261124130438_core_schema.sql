-- Paper Magic core schema: account categories, uploads and expenses.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.upload_kind as enum ('csv', 'xlsx', 'pdf', 'image');
create type public.upload_status as enum ('processing', 'needs_review', 'completed', 'failed');
create type public.expense_source as enum ('csv', 'receipt', 'manual');
create type public.expense_status as enum ('pending_review', 'confirmed');
-- standard_10 = 課税 10%, reduced_8 = 軽減 8%, exempt = 非課税
create type public.tax_type as enum ('standard_10', 'reduced_8', 'exempt');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Account categories (勘定科目): shared master data, read-only for users.
-- `code` is the stable identifier used from application code.
-- ---------------------------------------------------------------------------
create table public.account_categories (
  id smallint generated always as identity primary key,
  code text not null unique check (code ~ '^[a-z_]+$'),
  name text not null unique,
  sort_order smallint not null
);

insert into public.account_categories (code, name, sort_order) values
  ('outsourcing',   '外注費',     10),
  ('travel',        '旅費交通費', 20),
  ('communication', '通信費',     30),
  ('supplies',      '消耗品費',   40),
  ('meeting',       '会議費',     50),
  ('entertainment', '接待交際費', 60),
  ('utilities',     '水道光熱費', 70),
  ('insurance',     '損害保険料', 80),
  ('books',         '新聞図書費', 90),
  ('rent',          '地代家賃',   100),
  ('fees',          '支払手数料', 110),
  ('misc',          '雑費',       120);

-- ---------------------------------------------------------------------------
-- Category mappings: category names found in imported files → 勘定科目.
-- Shared defaults; unmapped categories fall back to 雑費 in the importer.
-- ---------------------------------------------------------------------------
create table public.category_mappings (
  source_category text primary key check (char_length(source_category) between 1 and 100),
  category_id smallint not null references public.account_categories (id)
);

insert into public.category_mappings (source_category, category_id)
select m.source_category, c.id
from (values
  ('SaaS/ソフトウェア', 'communication'),
  ('食費/外食',         'meeting'),
  ('通信/公共料金',     'communication'),
  ('クラウド/インフラ', 'communication'),
  ('物品/EC',           'supplies'),
  ('交通/レジャー',     'travel'),
  ('サブスク/エンタメ', 'books'),
  ('保険',              'insurance')
) as m (source_category, code)
join public.account_categories c on c.code = m.code;

-- ---------------------------------------------------------------------------
-- Uploads: one row per uploaded file. The original lives in Storage at
-- uploads/{user_id}/{upload_id}/{file_name}.
-- ---------------------------------------------------------------------------
create table public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.upload_kind not null,
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique check (char_length(storage_path) <= 1024),
  status public.upload_status not null default 'processing',
  row_count integer not null default 0 check (row_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_message text check (char_length(error_message) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index uploads_user_created_idx on public.uploads (user_id, created_at desc);

create trigger uploads_set_updated_at
before update on public.uploads
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expenses: one row per expense, whatever its source.
-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  upload_id uuid references public.uploads (id) on delete set null,
  date date not null,
  description text not null default '' check (char_length(description) <= 500),
  vendor text check (char_length(vendor) <= 200),
  category_id smallint not null references public.account_categories (id),
  -- The category exactly as it appeared in the imported file, if any.
  source_category text check (char_length(source_category) <= 100),
  source public.expense_source not null,
  -- Whole yen. Negative values are allowed for refunds in card statements.
  amount_jpy integer not null,
  tax_type public.tax_type,
  -- 適格請求書発行事業者の登録番号: T + 13 digits.
  invoice_number text check (invoice_number ~ '^T[0-9]{13}$'),
  status public.expense_status not null default 'confirmed',
  -- Per-field confidence from receipt reading, e.g. {"date": "high"}.
  confidence jsonb check (confidence is null or jsonb_typeof(confidence) = 'object'),
  -- Importer-computed key (date + amount + description) to skip duplicates.
  dedupe_key text check (char_length(dedupe_key) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- NULL keys never collide, so manual entries without a key are unaffected.
  constraint expenses_user_dedupe_key unique (user_id, dedupe_key)
);

create index expenses_user_date_idx on public.expenses (user_id, date);
create index expenses_upload_idx on public.expenses (upload_id);
create index expenses_category_idx on public.expenses (category_id);

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();
