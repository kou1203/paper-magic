import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { UploadHistory } from "./UploadHistory";
import { UploadPanel } from "./UploadPanel";

export const metadata: Metadata = { title: "アップロード" };

function HistorySkeleton() {
  return (
    <section aria-hidden className="border border-line bg-white px-6 pt-[22px] pb-6">
      <div className="mb-4 h-4 w-32 bg-canvas" />
      <div className="flex flex-col gap-3">
        <div className="h-5 bg-canvas" />
        <div className="h-5 bg-canvas" />
        <div className="h-5 bg-canvas" />
      </div>
    </section>
  );
}

export default function UploadPage() {
  return (
    <>
      <PageHeader title="アップロード" description="CSVファイル・レシート画像から経費を取り込みます" />
      <PageBody>
        <UploadPanel />
        <Suspense fallback={<HistorySkeleton />}>
          <UploadHistory />
        </Suspense>
      </PageBody>
    </>
  );
}
