/** A calendar month in `YYYY-MM` form, e.g. `2026-06`. */
export type YearMonth = `${number}-${number}`;

const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Formats an integer yen amount as `¥184,320`, or `−¥5,780` when negative. */
export function formatJPY(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`金額は整数で指定してください: ${amount}`);
  }
  const body = `¥${Math.abs(amount).toLocaleString("ja-JP")}`;
  return amount < 0 ? `−${body}` : body;
}

export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === "string" && YEAR_MONTH_PATTERN.test(value);
}

function parseYearMonth(value: YearMonth): { year: number; month: number } {
  const match = YEAR_MONTH_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`YYYY-MM 形式ではありません: ${value}`);
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function toYearMonth(year: number, month: number): YearMonth {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}` as YearMonth;
}

/** Formats `2026-06` as `2026年6月`. */
export function formatYearMonth(value: YearMonth): string {
  const { year, month } = parseYearMonth(value);
  return `${year}年${month}月`;
}

/** Moves a month forwards or backwards, crossing year boundaries. */
export function shiftYearMonth(value: YearMonth, deltaMonths: number): YearMonth {
  if (!Number.isInteger(deltaMonths)) {
    throw new RangeError(`月数は整数で指定してください: ${deltaMonths}`);
  }
  const { year, month } = parseYearMonth(value);
  const index = year * 12 + (month - 1) + deltaMonths;
  return toYearMonth(Math.floor(index / 12), (((index % 12) + 12) % 12) + 1);
}

/** The month containing `date`, in the local time zone. */
export function yearMonthOf(date: Date): YearMonth {
  return toYearMonth(date.getFullYear(), date.getMonth() + 1);
}

/**
 * Reads a `?month=` query value. Falls back to the month of `now` when the
 * value is missing, repeated or malformed.
 */
export function resolveYearMonth(value: string | string[] | undefined, now: Date): YearMonth {
  return isYearMonth(value) ? value : yearMonthOf(now);
}
