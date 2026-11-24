import { shiftYearMonth, type YearMonth } from "@/lib/format";

/**
 * Change from `previous` to `current` as a fraction (0.124 = +12.4%).
 * Null when there is no previous amount to compare with (shown as "—").
 */
export function changeRatio(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

/** `0.124` → `＋12.4%`, `-0.215` → `−21.5%`, null → `—`. */
export function formatChange(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio)) return "—";
  const percent = Math.round(ratio * 1000) / 10;
  if (percent === 0) return "±0.0%";
  return `${percent > 0 ? "＋" : "−"}${Math.abs(percent).toFixed(1)}%`;
}

/** `YYYY-MM` → the view's month key `YYYY-MM-01`. */
export function monthKey(month: YearMonth): string {
  return `${month}-01`;
}

/**
 * The `count` months ending with `last`, oldest first. Months before the
 * supported range are left out.
 */
export function monthsEndingAt(last: YearMonth, count: number): YearMonth[] {
  const months: YearMonth[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = shiftYearMonth(last, -i);
    if (month) months.push(month);
  }
  return months;
}

export type MonthTotal = { month: YearMonth; total: number; count: number };

/** One entry per month (oldest first), with 0 for months that have no expenses. */
export function fillMonths(
  months: readonly YearMonth[],
  rows: readonly { month: string | null; total_jpy: number | null; expense_count: number | null }[],
): MonthTotal[] {
  const byMonth = new Map(rows.map((row) => [row.month?.slice(0, 7), row]));
  return months.map((month) => {
    const row = byMonth.get(month);
    return { month, total: row?.total_jpy ?? 0, count: row?.expense_count ?? 0 };
  });
}

export type CategoryShare = {
  /** Stable key: the category code, or "other" for the folded rest. */
  key: string;
  name: string;
  total: number;
  /** Fraction of the month's total, 0–1. */
  share: number;
};

/**
 * Categories by amount, largest first. Beyond `limit`, the rest fold into one
 * "その他" row so the breakdown stays readable. Ties keep the master order.
 */
export function categoryBreakdown(
  rows: readonly { category_code: string | null; category_name: string | null; sort_order: number | null; total_jpy: number | null }[],
  limit = 5,
): CategoryShare[] {
  const items = rows
    .filter((row) => (row.total_jpy ?? 0) !== 0)
    .map((row) => ({
      key: row.category_code ?? "unknown",
      name: row.category_name ?? "不明",
      order: row.sort_order ?? Number.MAX_SAFE_INTEGER,
      total: row.total_jpy ?? 0,
    }))
    .sort((a, b) => b.total - a.total || a.order - b.order);

  const grand = items.reduce((sum, item) => sum + item.total, 0);
  const share = (total: number) => (grand === 0 ? 0 : total / grand);

  const head = items.length > limit + 1 ? items.slice(0, limit) : items;
  const rest = items.slice(head.length);
  const result: CategoryShare[] = head.map(({ key, name, total }) => ({ key, name, total, share: share(total) }));
  if (rest.length > 0) {
    const total = rest.reduce((sum, item) => sum + item.total, 0);
    result.push({ key: "other", name: "その他", total, share: share(total) });
  }
  return result;
}

/** Rounds a share to a whole percent for labels: 0.336 → "34%". */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}
