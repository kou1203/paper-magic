import "server-only";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isYearMonth, shiftYearMonth, yearMonthOf, type YearMonth } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import {
  categoryBreakdown,
  fillMonths,
  monthKey,
  monthsEndingAt,
  type CategoryShare,
  type MonthTotal,
} from "./summary";

/** How many months the trend chart shows. */
export const TREND_MONTHS = 6;

/**
 * The month the dashboard opens on: the `?month=` value when valid, else the
 * latest month that has confirmed expenses, else the current month (Japan time).
 */
export const resolveDashboardMonth = cache(async (requested: string | string[] | undefined): Promise<YearMonth> => {
  if (isYearMonth(requested)) return requested;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("monthly_expense_totals")
    .select("month")
    .eq("user_id", user.id)
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latest = data?.month?.slice(0, 7);
  return isYearMonth(latest) ? latest : yearMonthOf(new Date());
});

export type DashboardData = {
  month: YearMonth;
  /** Confirmed totals for the selected month. */
  current: { total: number; count: number; csv: number; receipt: number; manual: number };
  /** Total of the month before, for the change figure. */
  previous: { month: YearMonth | null; total: number };
  /** Oldest first, ending with the selected month. */
  trend: MonthTotal[];
  categories: CategoryShare[];
  /** Receipts read by AI and not yet confirmed (any month). */
  pendingReceipts: number;
  recentUploads: Pick<Tables<"uploads">, "id" | "kind" | "file_name" | "status" | "row_count" | "created_at">[];
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Confirmed totals per month in [from, to], oldest first. Reused by reports (KO-12). */
export async function getMonthlyTotals(supabase: Supabase, userId: string, from: YearMonth, to: YearMonth) {
  const { data, error } = await supabase
    .from("monthly_expense_totals")
    .select("month, total_jpy, expense_count, csv_count, receipt_count, manual_count")
    .eq("user_id", userId)
    .gte("month", monthKey(from))
    .lte("month", monthKey(to))
    .order("month");
  if (error) throw new Error(`月別の集計を読み込めませんでした: ${error.message}`);
  return data;
}

/** Confirmed totals per account category for one month. Reused by reports (KO-12). */
export async function getCategoryTotals(supabase: Supabase, userId: string, month: YearMonth) {
  const { data, error } = await supabase
    .from("monthly_category_totals")
    .select("category_code, category_name, sort_order, total_jpy")
    .eq("user_id", userId)
    .eq("month", monthKey(month));
  if (error) throw new Error(`勘定科目別の集計を読み込めませんでした: ${error.message}`);
  return data;
}

export async function getDashboardData(month: YearMonth): Promise<DashboardData> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const months = monthsEndingAt(month, TREND_MONTHS);
  // Null only at the start of the supported range (2000-01).
  const previousMonth = shiftYearMonth(month, -1);

  const [totals, categories, pending, uploads] = await Promise.all([
    getMonthlyTotals(supabase, user.id, months[0], month),
    getCategoryTotals(supabase, user.id, month),
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("source", "receipt")
      .eq("status", "pending_review"),
    supabase
      .from("uploads")
      .select("id, kind, file_name, status, row_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("file_name")
      .limit(3),
  ]);
  for (const result of [pending, uploads]) {
    if (result.error) throw new Error(`ダッシュボードを読み込めませんでした: ${result.error.message}`);
  }

  const currentRow = totals.find((row) => row.month === monthKey(month));
  const previousRow = previousMonth ? totals.find((row) => row.month === monthKey(previousMonth)) : undefined;

  return {
    month,
    current: {
      total: currentRow?.total_jpy ?? 0,
      count: currentRow?.expense_count ?? 0,
      csv: currentRow?.csv_count ?? 0,
      receipt: currentRow?.receipt_count ?? 0,
      manual: currentRow?.manual_count ?? 0,
    },
    previous: { month: previousMonth, total: previousRow?.total_jpy ?? 0 },
    trend: fillMonths(months, totals),
    categories: categoryBreakdown(categories),
    pendingReceipts: pending.count ?? 0,
    recentUploads: uploads.data ?? [],
  };
}
