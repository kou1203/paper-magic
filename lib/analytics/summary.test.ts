import { describe, expect, it } from "vitest";
import {
  categoryBreakdown,
  changeRatio,
  fillMonths,
  formatChange,
  formatShare,
  monthKey,
  monthsEndingAt,
} from "./summary";

describe("changeRatio / formatChange", () => {
  it("computes the change against the previous month", () => {
    expect(formatChange(changeRatio(184320, 163980))).toBe("＋12.4%");
    expect(formatChange(changeRatio(21120, 26900))).toBe("−21.5%");
    expect(formatChange(changeRatio(100, 100))).toBe("±0.0%");
  });

  it("shows — when there is no previous amount", () => {
    expect(changeRatio(5000, 0)).toBeNull();
    expect(formatChange(null)).toBe("—");
  });

  it("uses the size of a negative previous month (refunds)", () => {
    expect(changeRatio(100, -100)).toBe(2);
  });
});

describe("months", () => {
  it("lists the months ending at a month, oldest first", () => {
    expect(monthsEndingAt("2024-03", 6)).toEqual(["2023-10", "2023-11", "2023-12", "2024-01", "2024-02", "2024-03"]);
  });

  it("stops at the start of the supported range", () => {
    expect(monthsEndingAt("2000-02", 6)).toEqual(["2000-01", "2000-02"]);
  });

  it("formats the view's month key", () => {
    expect(monthKey("2024-06")).toBe("2024-06-01");
  });

  it("fills months without expenses with zero", () => {
    const filled = fillMonths(["2024-05", "2024-06"], [
      { month: "2024-06-01", total_jpy: 134512, expense_count: 40 },
    ]);
    expect(filled).toEqual([
      { month: "2024-05", total: 0, count: 0 },
      { month: "2024-06", total: 134512, count: 40 },
    ]);
  });
});

describe("categoryBreakdown", () => {
  const row = (code: string, name: string, sort: number, total: number) => ({
    category_code: code,
    category_name: name,
    sort_order: sort,
    total_jpy: total,
  });

  it("sorts by amount and computes shares", () => {
    const result = categoryBreakdown([row("meeting", "会議費", 50, 300), row("travel", "旅費交通費", 20, 700)]);
    expect(result).toEqual([
      { key: "travel", name: "旅費交通費", total: 700, share: 0.7 },
      { key: "meeting", name: "会議費", total: 300, share: 0.3 },
    ]);
  });

  it("folds everything after the top five into その他", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((n) => row(`c${n}`, `科目${n}`, n, n * 100));
    const result = categoryBreakdown(rows);
    expect(result.map((r) => r.key)).toEqual(["c7", "c6", "c5", "c4", "c3", "other"]);
    expect(result.at(-1)).toMatchObject({ name: "その他", total: 300 });
    expect(result.reduce((sum, r) => sum + (r.share ?? 0), 0)).toBeCloseTo(1);
  });

  it("does not fold a single leftover category", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((n) => row(`c${n}`, `科目${n}`, n, n * 100));
    expect(categoryBreakdown(rows).map((r) => r.key)).not.toContain("other");
  });

  it("breaks ties by the master order and skips zero totals", () => {
    const result = categoryBreakdown([row("b", "B", 20, 100), row("a", "A", 10, 100), row("z", "Z", 5, 0)]);
    expect(result.map((r) => r.key)).toEqual(["a", "b"]);
  });

  it("keeps shares within 0-100% when a category is negative (refunds)", () => {
    const result = categoryBreakdown([row("meeting", "会議費", 50, 10000), row("supplies", "消耗品費", 40, -3000)]);
    expect(result).toEqual([
      { key: "meeting", name: "会議費", total: 10000, share: 1 },
      { key: "supplies", name: "消耗品費", total: -3000, share: null },
    ]);
  });

  it("never folds negative categories into その他", () => {
    const rows = [1, 2, 3, 4, 5, 6, 7].map((n) => row(`c${n}`, `科目${n}`, n, n * 100));
    rows.push(row("refund", "返金", 99, -500));
    const result = categoryBreakdown(rows);
    expect(result.find((r) => r.key === "other")?.total).toBe(300);
    expect(result.at(-1)).toEqual({ key: "refund", name: "返金", total: -500, share: null });
  });

  it("handles an empty month", () => {
    expect(categoryBreakdown([])).toEqual([]);
  });

  it("formats shares as whole percents", () => {
    expect(formatShare(0.336)).toBe("34%");
    expect(formatShare(0)).toBe("0%");
    expect(formatShare(null)).toBe("—");
  });
});
