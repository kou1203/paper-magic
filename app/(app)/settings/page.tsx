import type { Metadata } from "next";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = { title: "設定" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="設定" />
      <PageBody>
        <EmptyState glyph="設">設定画面は今回の対象外です</EmptyState>
      </PageBody>
    </>
  );
}
