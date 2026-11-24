import { NextResponse, type NextRequest } from "next/server";
import { toExpensesCsv } from "@/lib/expenses/csv";
import { parseExpenseFilters } from "@/lib/expenses/filters";
import { MAX_ROWS, TooManyRowsError, listCategories, listExpensesForExport } from "@/lib/expenses/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /expenses/export?month=…&category=…&source=…&q=…&upload=…
 * Downloads the expenses matching the list filters as a UTF-8 (BOM) CSV.
 * Signed-out requests get 401 (not a redirect); the queries check the user again.
 */
export async function GET(request: NextRequest) {
  // A download link must not save the login page as a .csv: answer 401 instead of redirecting.
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return new NextResponse("ログインが必要です。", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const filters = parseExpenseFilters(Object.fromEntries(request.nextUrl.searchParams), new Date());
  const [rowsResult, categories] = await Promise.all([
    listExpensesForExport(filters).then(
      (rows) => ({ ok: true as const, rows }),
      (error: unknown) => ({ ok: false as const, error }),
    ),
    listCategories(),
  ]);
  if (!rowsResult.ok) {
    const { error } = rowsResult;
    if (error instanceof TooManyRowsError) {
      return new NextResponse(
        `出力できるのは一度に${MAX_ROWS.toLocaleString("ja-JP")}件までです。期間や条件を絞ってください。`,
        { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }
  const rows = rowsResult.rows;
  const names = new Map(categories.map((c) => [c.id, c.name]));

  const csv = toExpensesCsv(
    rows.map((row) => ({
      date: row.date,
      description: row.description,
      vendor: row.vendor,
      categoryName: names.get(row.category_id) ?? "",
      source: row.source,
      amountJpy: row.amount_jpy,
      taxType: row.tax_type,
      status: row.status,
      invoiceNumber: row.invoice_number,
    })),
  );

  const label = filters.uploadId ? `upload-${filters.uploadId.slice(0, 8)}` : filters.month;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="expenses-${label}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
