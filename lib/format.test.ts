import { describe, expect, it } from "vitest";
import {
  formatJPY,
  formatYearMonth,
  isYearMonth,
  resolveYearMonth,
  shiftYearMonth,
  yearMonthOf,
} from "./format";

describe("formatJPY", () => {
  it("adds the yen sign and thousands separators", () => {
    expect(formatJPY(184320)).toBe("¥184,320");
    expect(formatJPY(0)).toBe("¥0");
  });

  it("puts a minus sign before the yen sign", () => {
    expect(formatJPY(-5780)).toBe("−¥5,780");
  });

  it("rejects non-integers", () => {
    expect(() => formatJPY(1.5)).toThrow(RangeError);
    expect(() => formatJPY(Number.NaN)).toThrow(RangeError);
  });
});

describe("isYearMonth", () => {
  it.each(["2026-06", "2024-01", "2024-12"])("accepts %s", (value) => {
    expect(isYearMonth(value)).toBe(true);
  });

  it.each(["2026-6", "2026-13", "2026-00", "202606", "", undefined, ["2026-06"]])(
    "rejects %j",
    (value) => {
      expect(isYearMonth(value)).toBe(false);
    },
  );
});

describe("formatYearMonth", () => {
  it("drops the leading zero of the month", () => {
    expect(formatYearMonth("2026-06")).toBe("2026年6月");
    expect(formatYearMonth("2024-12")).toBe("2024年12月");
  });
});

describe("shiftYearMonth", () => {
  it("moves within a year", () => {
    expect(shiftYearMonth("2026-06", 1)).toBe("2026-07");
    expect(shiftYearMonth("2026-06", -1)).toBe("2026-05");
  });

  it("crosses year boundaries in both directions", () => {
    expect(shiftYearMonth("2024-12", 1)).toBe("2025-01");
    expect(shiftYearMonth("2025-01", -1)).toBe("2024-12");
    expect(shiftYearMonth("2025-01", -13)).toBe("2023-12");
  });

  it("rejects fractional deltas", () => {
    expect(() => shiftYearMonth("2026-06", 0.5)).toThrow(RangeError);
  });
});

describe("resolveYearMonth", () => {
  const now = new Date(2026, 10, 24);

  it("uses a valid query value", () => {
    expect(resolveYearMonth("2024-06", now)).toBe("2024-06");
  });

  it.each([undefined, "", "2024-6", "junk", ["2024-06", "2024-07"]])(
    "falls back to the current month for %j",
    (value) => {
      expect(resolveYearMonth(value, now)).toBe("2026-11");
    },
  );
});

describe("yearMonthOf", () => {
  it("pads the month", () => {
    expect(yearMonthOf(new Date(2024, 0, 31))).toBe("2024-01");
  });
});
