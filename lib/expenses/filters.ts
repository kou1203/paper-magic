import { isYearMonth, resolveYearMonth, shiftYearMonth, type YearMonth } from "@/lib/format";
import type { Database } from "@/lib/supabase/database.types";

export type ExpenseSource = Database["public"]["Enums"]["expense_source"];

export const EXPENSE_SOURCES: readonly ExpenseSource[] = ["csv", "receipt", "manual"];
export const PAGE_SIZE = 20;
export const MAX_QUERY_LENGTH = 100;

export type ExpenseFilters = {
  month: YearMonth;
  categoryId: number | null;
  source: ExpenseSource | null;
  /** Keyword for description / vendor. Trimmed, may be empty. */
  q: string;
  /** Show only one upload's expenses (from the upload history). Overrides the month. */
  uploadId: string | null;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function positiveInt(value: string | undefined, max: number): number | null {
  if (!value || !/^\d{1,6}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

/** Reads the list filters from the URL. Anything invalid falls back to its default. */
export function parseExpenseFilters(params: SearchParams, now: Date): ExpenseFilters {
  const source = single(params.source);
  const uploadId = single(params.upload);
  return {
    month: resolveYearMonth(params.month, now),
    categoryId: positiveInt(single(params.category), 32767),
    source: EXPENSE_SOURCES.includes(source as ExpenseSource) ? (source as ExpenseSource) : null,
    q: (single(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    uploadId: uploadId && UUID.test(uploadId) ? uploadId.toLowerCase() : null,
    page: positiveInt(single(params.page), 100000) ?? 1,
  };
}

/**
 * URL query for a set of filters, leaving out defaults so links stay short.
 * `overrides` changes individual values (e.g. the page number).
 */
export function filtersToQuery(
  filters: ExpenseFilters,
  overrides: Partial<ExpenseFilters> = {},
): Record<string, string> {
  const f = { ...filters, ...overrides };
  const query: Record<string, string> = {};
  if (f.uploadId) query.upload = f.uploadId;
  else query.month = f.month;
  if (f.categoryId !== null) query.category = String(f.categoryId);
  if (f.source) query.source = f.source;
  if (f.q) query.q = f.q;
  if (f.page > 1) query.page = String(f.page);
  return query;
}

/** First day of the month and first day of the next month, as `YYYY-MM-DD`. */
export function monthDateRange(month: YearMonth): { from: string; to: string } {
  if (!isYearMonth(month)) throw new RangeError(`YYYY-MM 形式ではありません: ${month}`);
  // shiftYearMonth returns null after 2099-12; the next month then is 2100-01.
  const next = shiftYearMonth(month, 1) ?? "2100-01";
  return { from: `${month}-01`, to: `${next}-01` };
}

/**
 * PostgREST `or` filter matching the keyword in description or vendor.
 * The value is double-quoted so commas, dots and parentheses are literal, and
 * LIKE wildcards in the keyword are escaped so "%" matches a percent sign.
 * PostgREST also reads "*" as "%" in like patterns and offers no escape for it,
 * so a keyword containing "*" matches more broadly. That only widens the
 * user's own results; it is not a security issue.
 */
export function keywordFilter(q: string): string {
  const like = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  const quoted = `"%${like.replace(/["\\]/g, (c) => `\\${c}`)}%"`;
  return `description.ilike.${quoted},vendor.ilike.${quoted}`;
}

/** Last page number for a result count (at least 1). */
export function lastPage(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE));
}
