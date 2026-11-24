import type { MonthTotal } from "@/lib/analytics/summary";
import { formatJPY, formatYearMonth, type YearMonth } from "@/lib/format";

const PLOT_HEIGHT = 160;

function monthLabel(month: YearMonth): string {
  return `${Number(month.slice(5, 7))}月`;
}

/**
 * Monthly totals as columns, oldest first. One series, so no legend: the card
 * title names it. The selected month is the accent; the rest step back.
 * Every column carries its value on the cap, a hover/focus tooltip, and the
 * same numbers are in a visually hidden table for screen readers.
 */
export function MonthlyTrendChart({ data, selected }: { data: MonthTotal[]; selected: YearMonth }) {
  const max = Math.max(0, ...data.map((d) => d.total));

  return (
    <figure className="m-0">
      <div
        aria-hidden
        className="flex items-end gap-4 border-b border-line px-2"
        style={{ height: PLOT_HEIGHT + 28 }}
      >
        {data.map((d, index) => {
          const isSelected = d.month === selected;
          // Tooltip sits beside the bar (inside the plot, never over the title);
          // the last two columns open to the left so it stays inside the card.
          const openLeft = index >= data.length - 2;
          // Refund-heavy months can be negative: draw them as empty.
          const height = max === 0 ? 0 : Math.round((Math.max(0, d.total) / max) * PLOT_HEIGHT);
          return (
            <div
              key={d.month}
              tabIndex={0}
              className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                className={[
                  "num text-[10.5px] whitespace-nowrap",
                  isSelected ? "font-bold text-ink" : "text-muted",
                ].join(" ")}
              >
                {d.total === 0 ? "—" : d.total.toLocaleString("ja-JP")}
              </span>
              <span
                className={["block w-6 rounded-t-[4px]", isSelected ? "bg-primary" : "bg-mist"].join(" ")}
                style={{ height: Math.max(height, d.total > 0 ? 2 : 0) }}
              />
              {/* Tooltip: hover or keyboard focus. Text stays in ink, not the bar colour. */}
              <span
                className={[
                  "pointer-events-none absolute z-10 hidden border border-line bg-white px-2.5 py-1.5 text-left text-[11.5px] whitespace-nowrap text-ink shadow-[0_8px_16px_-10px_rgba(16,35,60,0.35)] group-hover:block group-focus-visible:block",
                  openLeft ? "right-[calc(50%+18px)]" : "left-[calc(50%+18px)]",
                ].join(" ")}
                style={{ bottom: Math.min(Math.max(height - 20, 0), PLOT_HEIGHT - 44) }}
              >
                <span className="block font-semibold">{formatYearMonth(d.month)}</span>
                <span className="num block">
                  {formatJPY(d.total)}（{d.count}件）
                </span>
              </span>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="flex gap-4 px-2 pt-2">
        {data.map((d) => (
          <span
            key={d.month}
            className={[
              "flex-1 text-center text-[11px]",
              d.month === selected ? "font-bold text-ink" : "text-muted",
            ].join(" ")}
          >
            {monthLabel(d.month)}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>月別の経費合計（確定済み）</caption>
        <thead>
          <tr>
            <th scope="col">月</th>
            <th scope="col">合計</th>
            <th scope="col">件数</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month} aria-current={d.month === selected ? "true" : undefined}>
              <th scope="row">{formatYearMonth(d.month)}</th>
              <td>{formatJPY(d.total)}</td>
              <td>{d.count}件</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
