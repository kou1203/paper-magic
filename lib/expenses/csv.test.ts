import { describe, expect, it } from "vitest";
import { toExpensesCsv, type CsvExpense } from "./csv";

const row = (overrides: Partial<CsvExpense> = {}): CsvExpense => ({
  date: "2024-06-01",
  description: "スピードネット光 回線利用料",
  vendor: null,
  categoryName: "通信費",
  source: "csv",
  amountJpy: 5280,
  taxType: null,
  status: "confirmed",
  invoiceNumber: null,
  ...overrides,
});

describe("toExpensesCsv", () => {
  it("starts with a UTF-8 BOM and a Japanese header, using CRLF", () => {
    const csv = toExpensesCsv([]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe("﻿日付,摘要,店舗,勘定科目,出典,金額,税区分,状態,登録番号\r\n");
  });

  it("writes one line per expense with Japanese labels", () => {
    const csv = toExpensesCsv([
      row(),
      row({
        date: "2024-06-24",
        description: "コーヒー",
        vendor: "スターバックス 渋谷店",
        categoryName: "会議費",
        source: "receipt",
        amountJpy: 1280,
        taxType: "reduced_8",
        status: "pending_review",
        invoiceNumber: "T1234567890123",
      }),
    ]);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1]).toBe("2024-06-01,スピードネット光 回線利用料,,通信費,CSV,5280,,確定,");
    expect(lines[2]).toBe("2024-06-24,コーヒー,スターバックス 渋谷店,会議費,レシート,1280,軽減 8%,確認待ち,T1234567890123");
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = toExpensesCsv([row({ description: 'A, "B"\nC' })]);
    expect(csv).toContain('"A, ""B""\nC"');
  });

  it("neutralises spreadsheet formulas in text but keeps negative amounts", () => {
    const csv = toExpensesCsv([
      row({ description: '=HYPERLINK("http://evil.example")', vendor: "@SUM(A1)", amountJpy: -500 }),
    ]);
    const line = csv.slice(1).split("\r\n")[1];
    expect(line).toContain(`"'=HYPERLINK(""http://evil.example"")"`);
    expect(line).toContain("'@SUM(A1)");
    expect(line).toContain(",-500,");
  });
});
