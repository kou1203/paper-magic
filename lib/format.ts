/** A calendar month in `YYYY-MM` form, e.g. `2026-06`. */
export type YearMonth = `${number}-${number}`;

/** Months outside this range are rejected, so navigation cannot run off the end. */
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2099;

/** The app's users file taxes in Japan, so "this month" means Japan time. */
export const APP_TIME_ZONE = "Asia/Tokyo";

const YEAR_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Formats an integer yen amount as `¥184,320`, or `−¥5,780` when negative. */
export function formatJPY(amount: number): string {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`金額は整数で指定してください: ${amount}`);
  }
  const body = `¥${Math.abs(amount).toLocaleString("ja-JP")}`;
  return amount < 0 ? `−${body}` : body;
}

function splitYearMonth(value: string): { year: number; month: number } | null {
  const match = YEAR_MONTH_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < MIN_YEAR || year > MAX_YEAR) return null;
  return { year, month: Number(match[2]) };
}

export function isYearMonth(value: unknown): value is YearMonth {
  return typeof value === "string" && splitYearMonth(value) !== null;
}

function parseYearMonth(value: YearMonth): { year: number; month: number } {
  const parts = splitYearMonth(value);
  if (!parts) {
    throw new RangeError(`${MIN_YEAR}〜${MAX_YEAR}年の YYYY-MM 形式ではありません: ${value}`);
  }
  return parts;
}

function toYearMonth(year: number, month: number): YearMonth {
  return `${year}-${String(month).padStart(2, "0")}` as YearMonth;
}

/** Formats `2026-06` as `2026年6月`. */
export function formatYearMonth(value: YearMonth): string {
  const { year, month } = parseYearMonth(value);
  return `${year}年${month}月`;
}

/** Formats `2026-06` as `6月` (no year), for axis labels and short notes. */
export function formatMonthShort(value: YearMonth): string {
  return `${parseYearMonth(value).month}月`;
}

/**
 * Moves a month forwards or backwards, crossing year boundaries.
 * Returns `null` when the result would fall outside MIN_YEAR–MAX_YEAR.
 */
export function shiftYearMonth(value: YearMonth, deltaMonths: number): YearMonth | null {
  if (!Number.isInteger(deltaMonths)) {
    throw new RangeError(`月数は整数で指定してください: ${deltaMonths}`);
  }
  const { year, month } = parseYearMonth(value);
  const index = year * 12 + (month - 1) + deltaMonths;
  const nextYear = Math.floor(index / 12);
  if (nextYear < MIN_YEAR || nextYear > MAX_YEAR) return null;
  return toYearMonth(nextYear, (index % 12) + 1);
}

/** The month containing `date` in `timeZone` (Japan time by default). */
export function yearMonthOf(date: Date, timeZone: string = APP_TIME_ZONE): YearMonth {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return toYearMonth(year, month);
}

const DATE_TIME_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function tokyoParts(date: Date): Record<"year" | "month" | "day" | "hour" | "minute", string> {
  const parts = Object.fromEntries(
    DATE_TIME_PARTS.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute };
}

/**
 * Formats a timestamp in Japan time as `6月24日 18:42`, adding the year
 * (`2024年6月24日 18:42`) when it is not the current year.
 */
export function formatDateTime(value: string | Date, now: Date = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`日時として解釈できません: ${String(value)}`);
  }
  const p = tokyoParts(date);
  const time = `${p.month}月${p.day}日 ${p.hour}:${p.minute}`;
  return p.year === tokyoParts(now).year ? time : `${p.year}年${time}`;
}

/**
 * Reads a `?month=` query value. Falls back to the current month (Japan time)
 * when the value is missing, repeated, malformed or out of range.
 */
export function resolveYearMonth(value: string | string[] | undefined, now: Date): YearMonth {
  return isYearMonth(value) ? value : yearMonthOf(now);
}
