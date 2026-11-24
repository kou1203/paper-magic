import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "レポート" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="レポート" />
      <PageBody>
        <EmptyState glyph="析">レポートは KO-12 で実装します</EmptyState>
      </PageBody>
    </>
  );
}
