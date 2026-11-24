import Link from "next/link";
import { formatYearMonth, shiftYearMonth, type YearMonth } from "@/lib/format";

type MonthSwitcherProps = {
  month: YearMonth;
  /** Page the arrows link to. The month is passed as `?month=YYYY-MM`. */
  basePath: string;
};

const ARROW =
  "flex h-[34px] w-8 items-center justify-center text-[13px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary";

function MonthArrow({
  target,
  basePath,
  direction,
}: {
  target: YearMonth | null;
  basePath: string;
  direction: "prev" | "next";
}) {
  const glyph = direction === "prev" ? "‹" : "›";
  const word = direction === "prev" ? "前の月" : "次の月";

  // At the edge of the supported range there is nowhere to go.
  if (target === null) {
    return (
      <span aria-disabled className={`${ARROW} cursor-not-allowed opacity-30 hover:text-muted`}>
        <span aria-hidden>{glyph}</span>
        <span className="sr-only">{word}はありません</span>
      </span>
    );
  }

  return (
    <Link
      href={{ pathname: basePath, query: { month: target } }}
      className={ARROW}
      aria-label={`${word}（${formatYearMonth(target)}）`}
    >
      {glyph}
    </Link>
  );
}

/** ‹ 2026年6月 › — moves between months by changing the `month` query. */
export function MonthSwitcher({ month, basePath }: MonthSwitcherProps) {
  return (
    <div className="flex items-center border border-line bg-paper">
      <MonthArrow target={shiftYearMonth(month, -1)} basePath={basePath} direction="prev" />
      <span className="num px-2.5 font-serif text-sm font-bold tracking-[0.08em]">
        {formatYearMonth(month)}
      </span>
      <MonthArrow target={shiftYearMonth(month, 1)} basePath={basePath} direction="next" />
    </div>
  );
}
