import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "アップロード" };

export default function UploadPage() {
  return (
    <>
      <PageHeader title="アップロード" description="CSVファイル・レシート画像から経費を取り込みます" />
      <PageBody>
        <EmptyState glyph="紙">アップロード機能は KO-7 で実装します</EmptyState>
      </PageBody>
    </>
  );
}
