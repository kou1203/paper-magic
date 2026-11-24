import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "ページが見つかりません" };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-5 px-6">
      <EmptyState glyph="無">お探しのページは見つかりませんでした</EmptyState>
      <ButtonLink href="/dashboard" className="self-center">
        ダッシュボードへ戻る
      </ButtonLink>
    </main>
  );
}
