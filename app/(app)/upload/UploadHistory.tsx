import Link from "next/link";
import { CardTitle } from "@/components/ui/Card";
import { KindTag } from "@/components/ui/SourceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentUser } from "@/lib/auth/current-user";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

/** How many recent uploads the history shows. */
const HISTORY_LIMIT = 50;

type HistoryRow = Pick<
  Tables<"uploads">,
  "id" | "kind" | "file_name" | "status" | "row_count" | "error_message" | "created_at"
>;

const HEAD = "py-2.5 font-semibold";
const CELL = "py-[13px] align-middle";

/** Upload history, newest first. Reads the session, so render inside Suspense. */
export async function UploadHistory() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, kind, file_name, status, row_count, error_message, created_at")
    // Explicit owner filter (RLS enforces it too) so uploads_user_created_idx is used.
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    // Files from one drop share a timestamp; keep their order stable.
    .order("file_name", { ascending: true })
    .limit(HISTORY_LIMIT);

  return (
    <section className="border border-line bg-white px-6 pt-[22px] pb-2">
      <CardTitle>アップロード履歴</CardTitle>
      {error ? (
        <p role="alert" className="py-6 text-center text-[13px] text-muted">
          履歴を読み込めませんでした。ページを再読み込みしてください。
        </p>
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-[13px] tracking-[0.06em] text-muted">
          まだアップロードはありません。上の枠にファイルをドロップしてください。
        </p>
      ) : (
        <table className="w-full table-fixed border-collapse text-[13px]">
          <colgroup>
            <col className="w-[58px]" />
            <col />
            <col className="w-[84px]" />
            <col className="w-[164px]" />
            <col className="w-[110px]" />
            <col className="w-[92px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line text-[11px] tracking-[0.12em] text-muted">
              <th scope="col" className={`${HEAD} text-left`}>種別</th>
              <th scope="col" className={`${HEAD} text-left`}>ファイル</th>
              <th scope="col" className={`${HEAD} text-right`}>件数</th>
              <th scope="col" className={`${HEAD} pl-3.5 text-left`}>日時</th>
              <th scope="col" className={`${HEAD} text-center`}>状態</th>
              <th scope="col" className={HEAD}>
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <HistoryItem key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function HistoryItem({ row }: { row: HistoryRow }) {
  const counted = row.status === "completed" || row.status === "needs_review";
  return (
    <tr className="border-b border-dashed border-line last:border-b-0">
      <td className={CELL}>
        <KindTag kind={row.kind} />
      </td>
      <td className={`${CELL} pl-1`}>
        <span className="block truncate" title={row.file_name}>
          {row.file_name}
        </span>
        {row.status === "failed" && row.error_message ? (
          <span className="block text-xs text-muted">{row.error_message}</span>
        ) : null}
      </td>
      <td className={`${CELL} num text-right`}>{counted ? `${row.row_count}件` : "—"}</td>
      <td className={`${CELL} num pl-3.5 text-muted`}>{formatDateTime(row.created_at)}</td>
      <td className={`${CELL} text-center`}>
        <StatusBadge status={row.status} />
      </td>
      <td className={`${CELL} text-right`}>
        <HistoryLink row={row} />
      </td>
    </tr>
  );
}

function HistoryLink({ row }: { row: HistoryRow }) {
  const link = "text-xs font-semibold text-primary hover:text-primary-hover";
  if (row.status === "needs_review") {
    return (
      <Link href={{ pathname: "/upload/review", query: { upload: row.id } }} className={link}>
        確認する →
      </Link>
    );
  }
  if (row.status === "completed") {
    return (
      <Link href={{ pathname: "/expenses", query: { upload: row.id } }} className={link}>
        明細へ →
      </Link>
    );
  }
  return null;
}
