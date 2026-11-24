import Link from "next/link";
import { formatYearMonth, shiftYearMonth, type YearMonth } from "@/lib/format";

type MonthSwitcherProps = {
  month: YearMonth;
  /** Page the arrows link to. The month is passed as `?month=YYYY-MM`. */
  basePath: string;
};

/** ‹ 2026年6月 › — moves between months by changing the `month` query. */
export function MonthSwitcher({ month, basePath }: MonthSwitcherProps) {
  const prev = shiftYearMonth(month, -1);
  const next = shiftYearMonth(month, 1);
  const arrow =
    "flex h-[34px] w-8 items-center justify-center text-[13px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <div className="flex items-center border border-line bg-paper">
      <Link
        href={{ pathname: basePath, query: { month: prev } }}
        className={arrow}
        aria-label={`前の月（${formatYearMonth(prev)}）`}
      >
        ‹
      </Link>
      <span className="num px-2.5 font-serif text-sm font-bold tracking-[0.08em]" aria-live="polite">
        {formatYearMonth(month)}
      </span>
      <Link
        href={{ pathname: basePath, query: { month: next } }}
        className={arrow}
        aria-label={`次の月（${formatYearMonth(next)}）`}
      >
        ›
      </Link>
    </div>
  );
}
