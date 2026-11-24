import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { PAGE_SIZE, keywordFilter, lastPage, monthDateRange, type ExpenseFilters } from "./filters";

export type ExpenseRow = Pick<
  Tables<"expenses">,
  | "id"
  | "date"
  | "description"
  | "vendor"
  | "category_id"
  | "source"
  | "amount_jpy"
  | "tax_type"
  | "status"
  | "invoice_number"
  | "upload_id"
>;

export type Category = Pick<Tables<"account_categories">, "id" | "code" | "name">;

const EXPENSE_COLUMNS =
  "id, date, description, vendor, category_id, source, amount_jpy, tax_type, status, invoice_number, upload_id";

/** Upper bound for the totals query and the CSV export. */
export const MAX_ROWS = 5000;

/** All account categories in display order. Deduplicated per request. */
export const listCategories = cache(async (): Promise<Category[]> => {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("account_categories")
    .select("id, code, name")
    .order("sort_order");
  if (error) throw new Error(`勘定科目を読み込めませんでした: ${error.message}`);
  return data;
});

/**
 * Applies the list filters to an expenses query. The owner filter is explicit
 * (RLS enforces it too) so the (user_id, date) index is used.
 */
function applyFilters<
  Q extends {
    eq(column: string, value: unknown): Q;
    gte(column: string, value: string): Q;
    lt(column: string, value: string): Q;
    or(filters: string): Q;
  },
>(query: Q, userId: string, filters: ExpenseFilters): Q {
  let q = query.eq("user_id", userId);
  if (filters.uploadId) {
    q = q.eq("upload_id", filters.uploadId);
  } else {
    const { from, to } = monthDateRange(filters.month);
    q = q.gte("date", from).lt("date", to);
  }
  if (filters.categoryId !== null) q = q.eq("category_id", filters.categoryId);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.q) q = q.or(keywordFilter(filters.q));
  return q;
}

export type ExpensePage = {
  rows: ExpenseRow[];
  /** Matching expenses across all pages (exact, from the database). */
  count: number;
  /** Sum of amount_jpy across all pages. */
  total: number;
  /** True when more than MAX_ROWS match, so `total` covers only the first MAX_ROWS. */
  truncated: boolean;
  page: number;
  lastPage: number;
};

/** One page of expenses plus the count and total of everything matching. */
export async function listExpenses(filters: ExpenseFilters): Promise<ExpensePage> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const fetchPage = (page: number) => {
    const offset = (page - 1) * PAGE_SIZE;
    return applyFilters(supabase.from("expenses").select(EXPENSE_COLUMNS), user.id, filters)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
  };

  // Totals (aggregates are off in PostgREST, so sum the amounts) and the
  // requested page run in parallel; the page is refetched only if it is past
  // the end.
  const [amounts, firstTry] = await Promise.all([
    applyFilters(supabase.from("expenses").select("amount_jpy", { count: "exact" }), user.id, filters).limit(
      MAX_ROWS,
    ),
    fetchPage(filters.page),
  ]);
  if (amounts.error) throw new Error(`経費を読み込めませんでした: ${amounts.error.message}`);

  const count = amounts.count ?? amounts.data.length;
  const total = amounts.data.reduce((sum, row) => sum + row.amount_jpy, 0);
  const last = lastPage(count);
  const page = Math.min(filters.page, last);
  const rows = page === filters.page ? firstTry : await fetchPage(page);
  if (rows.error) throw new Error(`経費を読み込めませんでした: ${rows.error.message}`);

  return { rows: rows.data, count, total, truncated: count > amounts.data.length, page, lastPage: last };
}

export class TooManyRowsError extends Error {}

/**
 * Every expense matching the filters (no paging), oldest first, for CSV export.
 * Throws TooManyRowsError instead of silently cutting the file at MAX_ROWS.
 */
export async function listExpensesForExport(filters: ExpenseFilters): Promise<ExpenseRow[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error, count } = await applyFilters(
    supabase.from("expenses").select(EXPENSE_COLUMNS, { count: "exact" }),
    user.id,
    filters,
  )
    .order("date", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id")
    .limit(MAX_ROWS);
  if (error) throw new Error(`経費を読み込めませんでした: ${error.message}`);
  if ((count ?? 0) > data.length) throw new TooManyRowsError(`${count}件は一度に出力できません`);
  return data;
}
