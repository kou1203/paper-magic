import { formatShare, type CategoryShare } from "@/lib/analytics/summary";
import { formatJPY } from "@/lib/format";

/**
 * Category breakdown as horizontal bars. Each row is named by its label, so
 * all bars share one hue (colour must not change with rank). Amount and share
 * are written out on every row, so the bar is never the only carrier.
 */
export function CategoryBars({ items }: { items: CategoryShare[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-[5px] flex justify-between gap-3 text-xs">
            <span className="truncate">{item.name}</span>
            <span className="num shrink-0 text-muted">
              {formatJPY(item.total)} ・ {formatShare(item.share)}
            </span>
          </div>
          <div aria-hidden className="h-2 bg-canvas">
            <div
              className={["h-full rounded-r-[4px]", item.key === "other" ? "bg-mist" : "bg-primary"].join(" ")}
              style={{ width: `${Math.max(0, Math.min(1, item.share)) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
