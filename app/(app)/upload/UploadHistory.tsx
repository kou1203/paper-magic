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

const COLUMNS = "flex items-center gap-3.5";

/** Upload history, newest first. Reads the session, so render inside Suspense. */
export async function UploadHistory() {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("uploads")
    .select("id, kind, file_name, status, row_count, error_message, created_at")
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
        <table className="w-full text-[13px]">
          <thead>
            <tr className={`${COLUMNS} border-b border-line py-2.5 text-[11px] font-semibold tracking-[0.12em] text-muted`}>
              <th scope="col" className="w-11 shrink-0 text-left font-semibold">種別</th>
              <th scope="col" className="min-w-0 flex-1 text-left font-semibold">ファイル</th>
              <th scope="col" className="w-[70px] shrink-0 text-right font-semibold">件数</th>
              <th scope="col" className="w-[150px] shrink-0 text-left font-semibold">日時</th>
              <th scope="col" className="w-24 shrink-0 text-center font-semibold">状態</th>
              <th scope="col" className="w-20 shrink-0 font-semibold">
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
    <tr className={`${COLUMNS} border-b border-dashed border-line py-[13px] last:border-b-0`}>
      <td className="w-11 shrink-0">
        <KindTag kind={row.kind} />
      </td>
      <td className="min-w-0 flex-1">
        <span className="block truncate" title={row.file_name}>
          {row.file_name}
        </span>
        {row.status === "failed" && row.error_message ? (
          <span className="block text-xs text-muted">{row.error_message}</span>
        ) : null}
      </td>
      <td className="num w-[70px] shrink-0 text-right">{counted ? `${row.row_count}件` : "—"}</td>
      <td className="num w-[150px] shrink-0 text-muted">{formatDateTime(row.created_at)}</td>
      <td className="w-24 shrink-0 text-center">
        <StatusBadge status={row.status} />
      </td>
      <td className="w-20 shrink-0 text-right">
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
