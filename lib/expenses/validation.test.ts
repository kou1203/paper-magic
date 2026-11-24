import { describe, expect, it } from "vitest";
import { parseAmount, parseExpenseInput, parseIds } from "./validation";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = {
  date: "2024-06-24",
  description: "打ち合わせ コーヒー",
  vendor: "スターバックス 渋谷店",
  categoryId: "5",
  amountJpy: "1,280",
  taxType: "reduced_8",
};

describe("parseAmount", () => {
  it.each([
    ["1280", 1280],
    ["1,280", 1280],
    ["¥1,280", 1280],
    ["￥１，２８０", 1280],
    ["1280円", 1280],
    ["-500", -500],
    ["−500", -500],
  ])("reads %s as %i", (raw, expected) => {
    expect(parseAmount(raw)).toBe(expected);
  });

  it.each(["", "12.5", "1e3", "abc", "12345678901"])("rejects %j", (raw) => {
    expect(parseAmount(raw)).toBeNull();
  });
});

describe("parseExpenseInput", () => {
  it("normalises a valid form", () => {
    expect(parseExpenseInput(form(valid))).toEqual({
      ok: true,
      data: {
        date: "2024-06-24",
        description: "打ち合わせ コーヒー",
        vendor: "スターバックス 渋谷店",
        categoryId: 5,
        amountJpy: 1280,
        taxType: "reduced_8",
      },
    });
  });

  it("turns empty optional fields into null", () => {
    const result = parseExpenseInput(form({ ...valid, vendor: "  ", taxType: "" }));
    expect(result.ok && result.data.vendor).toBeNull();
    expect(result.ok && result.data.taxType).toBeNull();
  });

  it.each([
    [{ date: "2024/06/24" }, "date", "YYYY-MM-DD"],
    [{ date: "2024-02-30" }, "date", "存在しない日付"],
    [{ date: "1999-12-31" }, "date", "2000年〜2099年"],
    [{ description: "   " }, "description", "摘要を入力"],
    [{ categoryId: "" }, "categoryId", "勘定科目を選択"],
    [{ amountJpy: "12.5" }, "amountJpy", "整数で入力"],
    [{ amountJpy: "0" }, "amountJpy", "0円"],
    [{ amountJpy: "2,000,000,000" }, "amountJpy", "大きすぎます"],
    [{ taxType: "zero" }, "taxType", "税区分"],
  ])("rejects %j", (patch, field, message) => {
    const result = parseExpenseInput(form({ ...valid, ...patch }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors[field as keyof typeof result.fieldErrors]).toContain(message);
  });
});

describe("parseIds", () => {
  const id = "fafe29bf-31bc-41ab-9539-7f611550c0ab";

  it("accepts and de-duplicates UUIDs", () => {
    expect(parseIds([id, id.toUpperCase()])).toEqual([id]);
  });

  it.each([[[]], [["x"]], ["not-an-array"], [Array(101).fill(id)]])("rejects %j", (value) => {
    expect(parseIds(value)).toBeNull();
  });
});
