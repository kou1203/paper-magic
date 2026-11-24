import { Suspense } from "react";
import { resolveYearMonth } from "@/lib/format";
import { MonthSwitcher } from "./MonthSwitcher";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function ResolvedMonthSwitcher({
  searchParams,
  basePath,
}: {
  searchParams: SearchParams;
  basePath: string;
}) {
  const { month } = await searchParams;
  return <MonthSwitcher month={resolveYearMonth(month, new Date())} basePath={basePath} />;
}

/**
 * Month switcher driven by the page's `?month=` query. Reading search params
 * is request-time work, so it streams inside Suspense (Cache Components).
 */
export function MonthSwitcherFromQuery(props: { searchParams: SearchParams; basePath: string }) {
  return (
    <Suspense fallback={<div aria-hidden className="h-9 w-40 border border-line bg-paper" />}>
      <ResolvedMonthSwitcher {...props} />
    </Suspense>
  );
}
