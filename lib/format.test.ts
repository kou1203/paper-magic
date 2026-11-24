import { describe, expect, it } from "vitest";
import {
  formatJPY,
  formatDateTime,
  formatMonthShort,
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

  it.each([
    "2026-6",
    "2026-13",
    "2026-00",
    "202606",
    "",
    undefined,
    ["2026-06"],
    "0000-01",
    "1999-12",
    "2100-01",
    "9999-12",
  ])(
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

describe("formatMonthShort", () => {
  it("drops the year and the leading zero", () => {
    expect(formatMonthShort("2024-06")).toBe("6月");
    expect(formatMonthShort("2024-12")).toBe("12月");
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

  it("returns null instead of leaving the supported range", () => {
    expect(shiftYearMonth("2000-01", -1)).toBeNull();
    expect(shiftYearMonth("2099-12", 1)).toBeNull();
    expect(shiftYearMonth("2000-02", -1)).toBe("2000-01");
  });

  it("rejects fractional deltas", () => {
    expect(() => shiftYearMonth("2026-06", 0.5)).toThrow(RangeError);
  });
});

describe("resolveYearMonth", () => {
  const now = new Date("2026-11-24T03:00:00Z");

  it("uses a valid query value", () => {
    expect(resolveYearMonth("2024-06", now)).toBe("2024-06");
  });

  it.each([undefined, "", "2024-6", "junk", ["2024-06", "2024-07"], "0000-01", "9999-12"])(
    "falls back to the current month for %j",
    (value) => {
      expect(resolveYearMonth(value, now)).toBe("2026-11");
    },
  );
});

describe("formatDateTime", () => {
  const now = new Date("2026-11-24T03:00:00Z");

  it("shows Japan time without the year for this year", () => {
    // 09:42 UTC = 18:42 JST
    expect(formatDateTime("2026-06-24T09:42:00Z", now)).toBe("6月24日 18:42");
  });

  it("pads hours and minutes", () => {
    expect(formatDateTime("2026-01-04T23:05:00Z", now)).toBe("1月5日 08:05");
  });

  it("adds the year for other years, judged in Japan time", () => {
    expect(formatDateTime("2024-06-24T09:42:00Z", now)).toBe("2024年6月24日 18:42");
    // 2025-12-31 16:00 UTC is already 2026-01-01 01:00 in Tokyo.
    expect(formatDateTime("2025-12-31T16:00:00Z", now)).toBe("1月1日 01:00");
  });

  it("rejects invalid input", () => {
    expect(() => formatDateTime("not a date", now)).toThrow(RangeError);
  });
});

describe("yearMonthOf", () => {
  it("pads the month", () => {
    expect(yearMonthOf(new Date("2024-01-15T03:00:00Z"))).toBe("2024-01");
  });

  it("uses Japan time, not the server's time zone", () => {
    // 2024-07-01 00:30 in Tokyo is still June 30 in UTC.
    const firstOfMonthInTokyo = new Date("2024-06-30T15:30:00Z");
    expect(yearMonthOf(firstOfMonthInTokyo)).toBe("2024-07");
    expect(yearMonthOf(firstOfMonthInTokyo, "UTC")).toBe("2024-06");
  });
});
