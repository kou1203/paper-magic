import type { Metadata } from "next";
import Link from "next/link";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "読み取り結果の確認" };

export default function ReviewPage() {
  return (
    <>
      <PageHeader
        title="読み取り結果の確認"
        leading={
          <Link href="/upload" className="text-[13px] text-muted hover:text-ink">
            ← 戻る
          </Link>
        }
      />
      <PageBody>
        <EmptyState glyph="票">読み取り結果の確認は KO-13 で実装します</EmptyState>
      </PageBody>
    </>
  );
}
