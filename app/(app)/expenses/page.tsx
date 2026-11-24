import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { MonthSwitcherFromQuery } from "@/components/ui/MonthSwitcherFromQuery";

export const metadata: Metadata = { title: "経費明細" };

export default function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  return (
    <>
      <PageHeader
        title="経費明細"
        actions={
          <>
            <MonthSwitcherFromQuery searchParams={searchParams} basePath="/expenses" />
            <Button variant="outline" disabled>
              CSV出力
            </Button>
            <Button disabled>＋ 手入力で追加</Button>
          </>
        }
      />
      <PageBody>
        <EmptyState glyph="簿">経費の一覧は KO-8 で実装します</EmptyState>
      </PageBody>
    </>
  );
}
