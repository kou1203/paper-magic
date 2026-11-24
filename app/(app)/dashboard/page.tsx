import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthSwitcherFromQuery } from "@/components/ui/MonthSwitcherFromQuery";

export const metadata: Metadata = { title: "ダッシュボード" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader
        title="ダッシュボード"
        actions={
          <>
            <MonthSwitcherFromQuery searchParams={searchParams} basePath="/dashboard" />
            <ButtonLink href="/upload">＋ アップロード</ButtonLink>
          </>
        }
      />
      <PageBody>
        <EmptyState glyph="計">月次の集計は KO-9 で実装します</EmptyState>
      </PageBody>
    </>
  );
}
