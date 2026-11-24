import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];

export type CsvExpense = {
  date: string;
  description: string;
  vendor: string | null;
  categoryName: string;
  source: Enums["expense_source"];
  amountJpy: number;
  taxType: Enums["tax_type"] | null;
  status: Enums["expense_status"];
  invoiceNumber: string | null;
};

export const SOURCE_LABELS: Record<Enums["expense_source"], string> = {
  csv: "CSV",
  receipt: "レシート",
  manual: "手入力",
};

export const TAX_TYPE_LABELS: Record<Enums["tax_type"], string> = {
  standard_10: "課税 10%",
  reduced_8: "軽減 8%",
  exempt: "非課税",
};

export const STATUS_LABELS: Record<Enums["expense_status"], string> = {
  pending_review: "確認待ち",
  confirmed: "確定",
};

const HEADER = ["日付", "摘要", "店舗", "勘定科目", "出典", "金額", "税区分", "状態", "登録番号"];

/**
 * Text cells a spreadsheet would run as a formula ("=HYPERLINK(...)" etc.)
 * get a leading apostrophe, so an exported description cannot execute.
 */
function neutraliseFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function textCell(value: string | null): string {
  return cell(neutraliseFormula(value ?? ""));
}

/**
 * Expenses as CSV for Excel: UTF-8 with BOM (so Japanese is not garbled),
 * CRLF line endings, amounts as plain integers.
 */
export function toExpensesCsv(rows: readonly CsvExpense[]): string {
  const lines = [HEADER.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.date,
        textCell(row.description),
        textCell(row.vendor),
        textCell(row.categoryName),
        SOURCE_LABELS[row.source],
        String(row.amountJpy),
        row.taxType ? TAX_TYPE_LABELS[row.taxType] : "",
        STATUS_LABELS[row.status],
        textCell(row.invoiceNumber),
      ].join(","),
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
