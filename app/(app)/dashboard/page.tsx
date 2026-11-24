import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { CategoryBars } from "@/components/charts/CategoryBars";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { CardTitle } from "@/components/ui/Card";
import { MonthSwitcher } from "@/components/ui/MonthSwitcher";
import { KindTag } from "@/components/ui/SourceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TREND_MONTHS, getDashboardData, resolveDashboardMonth, type DashboardData } from "@/lib/analytics/queries";
import { changeRatio, formatChange } from "@/lib/analytics/summary";
import { formatDateTime, formatJPY, formatYearMonth, type YearMonth } from "@/lib/format";

export const metadata: Metadata = { title: "ダッシュボード" };

type SearchParams = PageProps<"/dashboard">["searchParams"];

async function readMonth(searchParams: SearchParams): Promise<YearMonth> {
  const { month } = await searchParams;
  return resolveDashboardMonth(month);
}

async function HeaderMonth({ searchParams }: { searchParams: SearchParams }) {
  return <MonthSwitcher month={await readMonth(searchParams)} basePath="/dashboard" />;
}

const PANEL = "border border-line bg-white";
const KPI_LABEL = "mb-2 text-[11.5px] font-semibold tracking-[0.18em] text-muted";
const KPI_VALUE = "num font-serif text-[34px] leading-tight font-bold";

function Unit({ children }: { children: ReactNode }) {
  return <span className="ml-1 font-sans text-[15px] font-normal text-muted">{children}</span>;
}

function monthName(month: YearMonth | null): string {
  return month ? `${Number(month.slice(5, 7))}月` : "前月";
}

function Kpis({ data }: { data: DashboardData }) {
  const change = formatChange(changeRatio(data.current.total, data.previous.total));
  const sources = [
    ["CSV", data.current.csv],
    ["レシート", data.current.receipt],
    ["手入力", data.current.manual],
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr_1fr]">
      <section className={`${PANEL} px-6 pt-5 pb-[18px]`} aria-labelledby="kpi-total">
        <h2 id="kpi-total" className={KPI_LABEL}>
          今月の経費合計
        </h2>
        <p className={KPI_VALUE}>{formatJPY(data.current.total)}</p>
        <p className="mt-2 text-xs text-muted">
          前月比 <span className="num font-semibold text-ink">{change}</span> ／ {monthName(data.previous.month)}{" "}
          <span className="num">{formatJPY(data.previous.total)}</span>
        </p>
      </section>
      <section className={`${PANEL} px-6 pt-5 pb-[18px]`} aria-labelledby="kpi-pending">
        <h2 id="kpi-pending" className={KPI_LABEL}>
          未確認レシート
        </h2>
        <p className={KPI_VALUE}>
          {data.pendingReceipts}
          <Unit>件</Unit>
        </p>
        <p className="mt-2 text-xs">
          {data.pendingReceipts > 0 ? (
            <Link href="/upload/review" className="font-semibold tracking-[0.04em] text-primary hover:text-primary-hover">
              読み取り結果を確認する →
            </Link>
          ) : (
            <span className="text-muted">確認待ちはありません</span>
          )}
        </p>
      </section>
      <section className={`${PANEL} px-6 pt-5 pb-[18px]`} aria-labelledby="kpi-count">
        <h2 id="kpi-count" className={KPI_LABEL}>
          今月の登録件数
        </h2>
        <p className={KPI_VALUE}>
          {data.current.count}
          <Unit>件</Unit>
        </p>
        <p className="num mt-2 text-xs text-muted">
          {sources
            .filter(([, n], i) => n > 0 || i < 2)
            .map(([label, n]) => `${label} ${n}件`)
            .join(" ・ ")}
        </p>
      </section>
    </div>
  );
}

function EmptyPanelText({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-[13px] tracking-[0.06em] text-muted">{children}</p>;
}

function Charts({ data }: { data: DashboardData }) {
  const first = data.trend[0]?.month;
  const hasTrend = data.trend.some((d) => d.count > 0);
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className={`${PANEL} px-6 pt-[22px] pb-5`}>
        <CardTitle
          note={first ? `${formatYearMonth(first)}〜${formatYearMonth(data.month)}（単位:円）` : undefined}
        >
          月別費用の推移
        </CardTitle>
        {hasTrend ? (
          <MonthlyTrendChart data={data.trend} selected={data.month} />
        ) : (
          <EmptyPanelText>直近{TREND_MONTHS}ヶ月の確定済み経費はありません</EmptyPanelText>
        )}
      </section>
      <section className={`${PANEL} px-6 pt-[22px] pb-5`}>
        <CardTitle note="今月">カテゴリ別内訳</CardTitle>
        {data.categories.length > 0 ? (
          <CategoryBars items={data.categories} />
        ) : (
          <EmptyPanelText>この月の確定済み経費はありません</EmptyPanelText>
        )}
      </section>
    </div>
  );
}

function RecentUploads({ uploads }: { uploads: DashboardData["recentUploads"] }) {
  return (
    <section className={`${PANEL} px-6 pt-[22px] pb-2.5`}>
      <CardTitle
        action={
          <Link href="/upload" className="text-xs font-semibold tracking-[0.04em] text-primary hover:text-primary-hover">
            すべて見る →
          </Link>
        }
      >
        最近のアップロード
      </CardTitle>
      {uploads.length === 0 ? (
        <EmptyPanelText>まだアップロードはありません</EmptyPanelText>
      ) : (
        <ul className="m-0 list-none p-0">
          {uploads.map((upload) => (
            <li
              key={upload.id}
              className="flex items-center gap-3.5 border-b border-dashed border-line py-3 text-[13px] last:border-b-0"
            >
              <KindTag kind={upload.kind} />
              <span className="min-w-0 flex-1 truncate" title={upload.file_name}>
                {upload.file_name}
              </span>
              <span className="num shrink-0 text-muted">{formatDateTime(upload.created_at)}</span>
              <StatusBadge status={upload.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function DashboardContent({ searchParams }: { searchParams: SearchParams }) {
  const month = await readMonth(searchParams);
  const data = await getDashboardData(month);
  return (
    <>
      <h2 className="sr-only">{formatYearMonth(month)}のダッシュボード</h2>
      <Kpis data={data} />
      <Charts data={data} />
      <RecentUploads uploads={data.recentUploads} />
    </>
  );
}

function ContentSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[132px] border border-line bg-white" />
        <div className="h-[132px] border border-line bg-white" />
        <div className="h-[132px] border border-line bg-white" />
      </div>
      <div className="h-72 border border-line bg-white" />
    </div>
  );
}

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader
        title="ダッシュボード"
        actions={
          <>
            <Suspense fallback={<div aria-hidden className="h-9 w-40 border border-line bg-paper" />}>
              <HeaderMonth searchParams={searchParams} />
            </Suspense>
            <ButtonLink href="/upload">＋ アップロード</ButtonLink>
          </>
        }
      />
      <PageBody>
        <Suspense fallback={<ContentSkeleton />}>
          <DashboardContent searchParams={searchParams} />
        </Suspense>
      </PageBody>
    </>
  );
}
