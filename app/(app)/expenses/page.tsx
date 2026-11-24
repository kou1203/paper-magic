import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { buttonClassName } from "@/components/ui/Button";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { SOURCE_LABELS } from "@/lib/expenses/csv";
import { pageWindow } from "@/lib/expenses/display";
import {
  EXPENSE_SOURCES,
  MAX_QUERY_LENGTH,
  PAGE_SIZE,
  filtersToQuery,
  parseExpenseFilters,
  type ExpenseFilters,
} from "@/lib/expenses/filters";
import { listCategories, listExpenses, type Category } from "@/lib/expenses/queries";
import { formatJPY, formatYearMonth } from "@/lib/format";
import { AddExpenseButton } from "./AddExpenseButton";
import { ExpensesTable } from "./ExpensesTable";

export const metadata: Metadata = { title: "経費明細" };

type SearchParams = PageProps<"/expenses">["searchParams"];

async function readFilters(searchParams: SearchParams): Promise<ExpenseFilters> {
  return parseExpenseFilters(await searchParams, new Date());
}

/** Today in Japan if it falls in the shown month, else the month's first day. */
function defaultDateFor(filters: ExpenseFilters): string {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  return today.startsWith(filters.month) ? today : `${filters.month}-01`;
}

async function HeaderActions({ searchParams }: { searchParams: SearchParams }) {
  const [filters, categories] = await Promise.all([readFilters(searchParams), listCategories()]);
  const keep = filtersToQuery(filters, { page: 1 });
  delete keep.month;
  const exportQuery = new URLSearchParams(filtersToQuery(filters, { page: 1 })).toString();

  return (
    <>
      {filters.uploadId ? null : <MonthSwitcher month={filters.month} basePath="/expenses" query={keep} />}
      <a href={`/expenses/export?${exportQuery}`} className={buttonClassName("outline")} download>
        CSV出力
      </a>
      <AddExpenseButton categories={categories} defaultDate={defaultDateFor(filters)} />
    </>
  );
}

const CONTROL = "border border-line bg-paper px-3 py-2 text-[13px] text-ink";

function FilterBar({
  filters,
  categories,
  count,
  total,
}: {
  filters: ExpenseFilters;
  categories: Category[];
  count: number;
  total: number;
}) {
  return (
    <form
      method="get"
      action="/expenses"
      role="search"
      aria-label="経費の絞り込み"
      className="flex flex-wrap items-center gap-3 border border-line bg-white px-[18px] py-3.5"
    >
      {filters.uploadId ? (
        <input type="hidden" name="upload" value={filters.uploadId} />
      ) : (
        <input type="hidden" name="month" value={filters.month} />
      )}
      <label className="sr-only" htmlFor="filter-category">
        勘定科目
      </label>
      <select id="filter-category" name="category" defaultValue={filters.categoryId ?? ""} className={CONTROL}>
        <option value="">すべてのカテゴリ</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="filter-source">
        出典
      </label>
      <select id="filter-source" name="source" defaultValue={filters.source ?? ""} className={CONTROL}>
        <option value="">すべての出典</option>
        {EXPENSE_SOURCES.map((s) => (
          <option key={s} value={s}>
            {SOURCE_LABELS[s]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="filter-q">
        店舗名・摘要で検索
      </label>
      <input
        id="filter-q"
        type="search"
        name="q"
        defaultValue={filters.q}
        maxLength={MAX_QUERY_LENGTH}
        placeholder="店舗名・摘要で検索"
        className={`${CONTROL} w-full max-w-[280px] flex-1`}
      />
      <button type="submit" className={buttonClassName("outline", "px-4 py-2")}>
        絞り込む
      </button>
      <p className="num ml-auto text-[12.5px] text-muted">
        {count}件 ・ 合計{" "}
        <b className="font-serif text-[15px] text-ink">{formatJPY(total)}</b>
      </p>
    </form>
  );
}

function Pagination({ filters, page, lastPage, count }: { filters: ExpenseFilters; page: number; lastPage: number; count: number }) {
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);
  const href = (p: number) => ({ pathname: "/expenses", query: filtersToQuery(filters, { page: p }) });
  const box = "inline-flex size-[30px] items-center justify-center border text-xs";

  return (
    <nav aria-label="ページ送り" className="flex items-center gap-3.5 bg-paper px-[18px] py-[13px] text-[12.5px] text-muted">
      <span className="num">
        {from}〜{to}件を表示（全{count}件）
      </span>
      {lastPage > 1 ? (
        <span className="ml-auto flex gap-1.5">
          {page > 1 ? (
            <Link href={href(page - 1)} className={`${box} border-line bg-white`} aria-label="前のページ">
              ‹
            </Link>
          ) : null}
          {pageWindow(page, lastPage).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className={`${box} border-transparent`} aria-hidden>
                …
              </span>
            ) : p === page ? (
              <span key={p} aria-current="page" className={`${box} num border-primary bg-primary font-semibold text-white`}>
                {p}
              </span>
            ) : (
              <Link key={p} href={href(p)} className={`${box} num border-line bg-white hover:border-primary`}>
                {p}
              </Link>
            ),
          )}
          {page < lastPage ? (
            <Link href={href(page + 1)} className={`${box} border-line bg-white`} aria-label="次のページ">
              ›
            </Link>
          ) : null}
        </span>
      ) : null}
    </nav>
  );
}

async function ExpensesSection({ searchParams }: { searchParams: SearchParams }) {
  const filters = await readFilters(searchParams);
  const [categories, result] = await Promise.all([listCategories(), listExpenses(filters)]);

  return (
    <>
      {filters.uploadId ? (
        <p className="flex items-center gap-3 border border-sky bg-primary-soft px-[18px] py-2.5 text-[12.5px]">
          1件のアップロードから取り込んだ経費を表示しています。
          <Link href="/expenses" className="font-semibold text-primary hover:text-primary-hover">
            すべての経費に戻る →
          </Link>
        </p>
      ) : (
        <h2 className="sr-only">{formatYearMonth(filters.month)}の経費</h2>
      )}
      <FilterBar filters={filters} categories={categories} count={result.count} total={result.total} />
      <section className="border border-line bg-white">
        <ExpensesTable rows={result.rows} categories={categories} />
        <Pagination filters={filters} page={result.page} lastPage={result.lastPage} count={result.count} />
      </section>
    </>
  );
}

function SectionSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-[62px] border border-line bg-white" />
      <div className="h-96 border border-line bg-white" />
    </div>
  );
}

export default function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  return (
    <>
      <PageHeader
        title="経費明細"
        actions={
          <Suspense fallback={<div aria-hidden className="h-9 w-96" />}>
            <HeaderActions searchParams={searchParams} />
          </Suspense>
        }
      />
      <PageBody>
        <Suspense fallback={<SectionSkeleton />}>
          <ExpensesSection searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}
