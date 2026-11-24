/**
 * Upload statuses (`processing` … `failed`) and expense statuses
 * (`pending_review`, `confirmed`) share one badge so they look the same
 * across screens.
 */
export type Status =
  | "processing"
  | "needs_review"
  | "completed"
  | "failed"
  | "pending_review"
  | "confirmed";

const STATUS_STYLES: Record<Status, { label: string; className: string }> = {
  processing: { label: "処理中", className: "border-line text-muted" },
  needs_review: { label: "確認待ち", className: "border-sky text-primary-text" },
  pending_review: { label: "確認待ち", className: "border-sky text-primary-text" },
  completed: { label: "取込完了", className: "border-success-line text-success" },
  confirmed: { label: "確定", className: "border-success-line text-success" },
  failed: { label: "失敗", className: "border-ink text-ink" },
};

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={[
        "inline-block w-24 border py-[3px] text-center text-[11.5px] font-semibold tracking-[0.08em]",
        style.className,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {style.label}
    </span>
  );
}
