"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/** Keeps the sidebar visible and offers a retry when a page fails to render. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title="エラーが発生しました" />
      <PageBody>
        <EmptyState glyph="誤">ページを表示できませんでした。時間をおいてもう一度お試しください。</EmptyState>
        <div className="flex gap-3">
          <Button onClick={() => retry()}>もう一度読み込む</Button>
          <ButtonLink href="/dashboard" variant="outline">
            ダッシュボードへ戻る
          </ButtonLink>
        </div>
      </PageBody>
    </>
  );
}
