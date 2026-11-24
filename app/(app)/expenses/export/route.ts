import { NextResponse, type NextRequest } from "next/server";
import { toExpensesCsv } from "@/lib/expenses/csv";
import { parseExpenseFilters } from "@/lib/expenses/filters";
import { listCategories, listExpensesForExport } from "@/lib/expenses/queries";

/**
 * GET /expenses/export?month=…&category=…&source=…&q=…&upload=…
 * Downloads the expenses matching the list filters as a UTF-8 (BOM) CSV.
 * The proxy already requires a session; the queries check the user again.
 */
export async function GET(request: NextRequest) {
  const filters = parseExpenseFilters(Object.fromEntries(request.nextUrl.searchParams), new Date());
  const [rows, categories] = await Promise.all([listExpensesForExport(filters), listCategories()]);
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
