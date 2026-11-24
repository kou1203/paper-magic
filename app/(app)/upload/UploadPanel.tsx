"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { ErrorCode, useDropzone, type FileRejection } from "react-dropzone";
import { buttonClassName } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import {
  MAX_FILE_BYTES,
  UPLOAD_GROUPS,
  checkFile,
  dropzoneAccept,
  extensionsLabel,
  type UploadGroup,
} from "@/lib/uploads/rules";
import { completeUpload, prepareUploads } from "./actions";

type ItemStatus = "uploading" | "processing" | "done" | "error";

type Item = {
  key: string;
  name: string;
  status: ItemStatus;
  message?: string;
};

/** How many files are sent to Storage at the same time. */
const CONCURRENCY = 3;

const STATUS_TEXT: Record<ItemStatus, string> = {
  uploading: "送信中…",
  processing: "取り込み待ち",
  done: "受け付けました",
  error: "失敗",
};

function rejectionReason(rejection: FileRejection, group: UploadGroup): string {
  const code = rejection.errors[0]?.code;
  switch (code) {
    case ErrorCode.FileInvalidType:
      return `対応していない形式です（${extensionsLabel(group)}）`;
    case ErrorCode.FileTooLarge:
      return "ファイルサイズが10MBを超えています";
    case ErrorCode.TooManyFiles:
      return `一度にアップロードできるのは${UPLOAD_GROUPS[group].maxFiles}件までです`;
    default:
      return "このファイルは受け付けられません";
  }
}

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

export function UploadPanel() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const busy = items.some((item) => item.status === "uploading");

  const update = useCallback((key: string, patch: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const handleDrop = useCallback(
    async (group: UploadGroup, accepted: File[], rejections: FileRejection[]) => {
      const batch = `${Date.now()}`;
      const rejectedItems: Item[] = rejections.map((rejection, i) => ({
        key: `${batch}-r${i}`,
        name: rejection.file.name,
        status: "error",
        message: rejectionReason(rejection, group),
      }));

      // Same rules the server applies; catches what the dropzone's MIME check lets through.
      const candidates: { file: File; key: string }[] = [];
      accepted.forEach((file, i) => {
        const key = `${batch}-a${i}`;
        const check = checkFile(file, group);
        if (check.ok) {
          candidates.push({ file, key });
        } else {
          rejectedItems.push({ key, name: file.name, status: "error", message: check.reason });
        }
      });

      setItems((current) => [
        ...candidates.map(({ file, key }) => ({ key, name: file.name, status: "uploading" as const })),
        ...rejectedItems,
        ...current,
      ]);
      if (candidates.length === 0) return;

      const prepared = await prepareUploads({
        group,
        files: candidates.map(({ file }) => ({ name: file.name, size: file.size, type: file.type })),
      }).catch(() => ({ ok: false as const, error: "通信に失敗しました。もう一度お試しください。" }));

      if (!prepared.ok) {
        for (const { key } of candidates) update(key, { status: "error", message: prepared.error });
        return;
      }
      for (const { index, reason } of prepared.rejected) {
        update(candidates[index].key, { status: "error", message: reason });
      }

      const supabase = createClient();
      await runWithConcurrency(prepared.prepared, CONCURRENCY, async (target) => {
        const { file, key } = candidates[target.index];
        const { error } = await supabase.storage
          .from("uploads")
          .upload(target.storagePath, file, { contentType: target.contentType, upsert: false });

        const result = await completeUpload({ uploadId: target.uploadId, uploaded: !error }).catch(
          () => ({ ok: false as const, error: "通信に失敗しました。" }),
        );
        if (error || !result.ok || result.status === "failed") {
          update(key, {
            status: "error",
            message: result.ok ? "ファイルを保存できませんでした" : result.error,
          });
        } else {
          update(key, { status: result.status === "processing" ? "processing" : "done" });
        }
      });

      router.refresh();
    },
    [router, update],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DropZone
          group="statement"
          glyph="表"
          title="CSVファイル"
          description={
            <>
              銀行・クレジットカードの明細CSVをドロップ
              <br />
              Excel（.xlsx）の明細も取り込めます
            </>
          }
          buttonLabel="ファイルを選択"
          buttonVariant="outline"
          note={`${extensionsLabel("statement")} ・ 最大10MB`}
          disabled={busy}
          onDrop={handleDrop}
        />
        <DropZone
          group="receipt"
          glyph="票"
          title="レシート画像"
          description={
            <>
              レシート・領収書の写真をまとめてドロップ
              <br />
              日付・店舗・金額・カテゴリをAIが読み取ります
            </>
          }
          buttonLabel="画像を選択"
          buttonVariant="primary"
          note={`${extensionsLabel("receipt")} ・ 一度に${UPLOAD_GROUPS.receipt.maxFiles}枚まで`}
          disabled={busy}
          onDrop={handleDrop}
        />
      </div>

      {items.length > 0 ? (
        <section aria-label="送信状況" className="border border-line bg-white px-6 py-4">
          <div className="mb-2 flex items-baseline">
            <h2 className="text-[11.5px] font-semibold tracking-[0.16em] text-muted">送信状況</h2>
            {!busy ? (
              <button
                type="button"
                onClick={() => setItems([])}
                className="ml-auto cursor-pointer text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                表示を消す
              </button>
            ) : null}
          </div>
          <ul aria-live="polite" className="flex flex-col">
            {items.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-3.5 border-b border-dashed border-line py-2.5 text-[13px] last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate" title={item.name}>
                  {item.name}
                </span>
                {item.message ? <span className="text-xs text-muted">{item.message}</span> : null}
                <span
                  className={[
                    "w-24 shrink-0 border py-[3px] text-center text-[11.5px] font-semibold tracking-[0.08em]",
                    item.status === "error"
                      ? "border-ink text-ink"
                      : item.status === "uploading"
                        ? "border-line text-muted"
                        : "border-success-line text-success",
                  ].join(" ")}
                >
                  {STATUS_TEXT[item.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

type DropZoneProps = {
  group: UploadGroup;
  glyph: string;
  title: string;
  description: ReactNode;
  buttonLabel: string;
  buttonVariant: "primary" | "outline";
  note: string;
  disabled: boolean;
  onDrop: (group: UploadGroup, accepted: File[], rejections: FileRejection[]) => void;
};

function DropZone({
  group,
  glyph,
  title,
  description,
  buttonLabel,
  buttonVariant,
  note,
  disabled,
  onDrop,
}: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: dropzoneAccept(group),
    maxSize: MAX_FILE_BYTES,
    maxFiles: UPLOAD_GROUPS[group].maxFiles,
    multiple: true,
    noClick: true,
    disabled,
    onDrop: (accepted, rejections) => onDrop(group, accepted, rejections),
  });

  return (
    <div
      {...getRootProps({
        "aria-label": `${title}をアップロード`,
        className: [
          "flex flex-col items-center border-[1.5px] border-dashed px-8 pt-11 pb-[38px] text-center transition-colors",
          isDragActive ? "border-primary bg-primary-soft" : "border-sky bg-white",
          disabled ? "opacity-60" : "",
        ].join(" "),
      })}
    >
      <input {...getInputProps({ "aria-label": `${title}を選択` })} />
      <span
        aria-hidden
        className="mb-[18px] inline-flex size-[52px] items-center justify-center border border-primary font-serif text-2xl font-bold text-primary"
      >
        {glyph}
      </span>
      <p className="mb-1.5 font-serif text-[17px] font-bold tracking-[0.08em]">{title}</p>
      <p className="mb-[22px] text-[12.5px] leading-[1.9] text-muted">{description}</p>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        className={buttonClassName(buttonVariant, "px-[26px] py-2.5")}
      >
        {buttonLabel}
      </button>
      <p className="mt-3.5 text-[11px] tracking-[0.06em] text-muted">{note}</p>
    </div>
  );
}
