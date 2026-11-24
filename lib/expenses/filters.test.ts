import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  filtersToQuery,
  keywordFilter,
  lastPage,
  monthDateRange,
  parseExpenseFilters,
} from "./filters";

const now = new Date("2026-11-24T03:00:00Z");
const UPLOAD = "fafe29bf-31bc-41ab-9539-7f611550c0ab";

describe("parseExpenseFilters", () => {
  it("uses defaults for an empty query", () => {
    expect(parseExpenseFilters({}, now)).toEqual({
      month: "2026-11",
      categoryId: null,
      source: null,
      q: "",
      uploadId: null,
      page: 1,
    });
  });

  it("reads every filter", () => {
    expect(
      parseExpenseFilters(
        { month: "2024-06", category: "3", source: "receipt", q: "  スターバックス ", upload: UPLOAD.toUpperCase(), page: "2" },
        now,
      ),
    ).toEqual({
      month: "2024-06",
      categoryId: 3,
      source: "receipt",
      q: "スターバックス",
      uploadId: UPLOAD,
      page: 2,
    });
  });

  it.each([
    [{ category: "abc" }, "categoryId", null],
    [{ category: "0" }, "categoryId", null],
    [{ category: "-1" }, "categoryId", null],
    [{ source: "bank" }, "source", null],
    [{ upload: "not-a-uuid" }, "uploadId", null],
    [{ page: "0" }, "page", 1],
    [{ page: "1e3" }, "page", 1],
    [{ page: ["2", "3"] }, "page", 1],
    [{ month: "2024-13" }, "month", "2026-11"],
  ])("ignores invalid %j", (params, key, expected) => {
    expect(parseExpenseFilters(params, now)[key as keyof ReturnType<typeof parseExpenseFilters>]).toBe(expected);
  });

  it("caps the keyword length", () => {
    expect(parseExpenseFilters({ q: "あ".repeat(500) }, now).q).toHaveLength(100);
  });
});

describe("filtersToQuery", () => {
  const base = parseExpenseFilters({ month: "2024-06" }, now);

  it("keeps only non-default values", () => {
    expect(filtersToQuery(base)).toEqual({ month: "2024-06" });
    expect(filtersToQuery({ ...base, categoryId: 3, source: "csv", q: "AI", page: 2 })).toEqual({
      month: "2024-06",
      category: "3",
      source: "csv",
      q: "AI",
      page: "2",
    });
  });

  it("applies overrides", () => {
    expect(filtersToQuery({ ...base, page: 3 }, { page: 1 })).toEqual({ month: "2024-06" });
  });

  it("uses the upload instead of the month when set", () => {
    expect(filtersToQuery({ ...base, uploadId: UPLOAD })).toEqual({ upload: UPLOAD });
  });
});

describe("monthDateRange", () => {
  it("covers one calendar month", () => {
    expect(monthDateRange("2024-06")).toEqual({ from: "2024-06-01", to: "2024-07-01" });
    expect(monthDateRange("2024-12")).toEqual({ from: "2024-12-01", to: "2025-01-01" });
    expect(monthDateRange("2099-12")).toEqual({ from: "2099-12-01", to: "2100-01-01" });
  });
});

describe("keywordFilter", () => {
  it("searches description and vendor", () => {
    expect(keywordFilter("cafe")).toBe('description.ilike."%cafe%",vendor.ilike."%cafe%"');
  });

  it("treats PostgREST syntax characters literally by quoting", () => {
    expect(keywordFilter("a,b.(c)")).toBe('description.ilike."%a,b.(c)%",vendor.ilike."%a,b.(c)%"');
  });

  it("leaves * as is (PostgREST treats it as a LIKE wildcard; harmless, documented)", () => {
    expect(keywordFilter("A*B")).toBe('description.ilike."%A*B%",vendor.ilike."%A*B%"');
  });

  it("escapes LIKE wildcards and quotes", () => {
    // 100%_"x" → LIKE 100\%\_"x" → quoted with \ and " escaped
    expect(keywordFilter('100%_"x"')).toBe(
      'description.ilike."%100\\\\%\\\\_\\"x\\"%",vendor.ilike."%100\\\\%\\\\_\\"x\\"%"',
    );
  });
});

describe("lastPage", () => {
  it("rounds up and is at least 1", () => {
    expect(lastPage(0)).toBe(1);
    expect(lastPage(PAGE_SIZE)).toBe(1);
    expect(lastPage(PAGE_SIZE + 1)).toBe(2);
    expect(lastPage(42)).toBe(3);
  });
});
