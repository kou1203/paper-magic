"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState, type ReactNode } from "react";
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

/** react-dropzone accept maps, computed once. */
const ACCEPT: Record<UploadGroup, Record<string, string[]>> = {
  statement: dropzoneAccept("statement"),
  receipt: dropzoneAccept("receipt"),
};

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

/** One-line progress summary, e.g. "8件中8件処理済み（うち失敗3件）". */
function summarise(items: Item[]): string {
  if (items.length === 0) return "";
  const finished = items.filter((item) => item.status !== "uploading").length;
  const failed = items.filter((item) => item.status === "error").length;
  const base = `${items.length}件中${finished}件処理済み`;
  return failed > 0 ? `${base}（うち失敗${failed}件）` : base;
}

export function UploadPanel() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const nextKey = useRef(0);
  const busy = items.some((item) => item.status === "uploading");

  const update = useCallback((key: string, patch: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const handleDrop = useCallback(
    async (group: UploadGroup, accepted: File[], rejections: FileRejection[]) => {
      const newKey = () => `item-${nextKey.current++}`;
      const rejectedItems: Item[] = rejections.map((rejection) => ({
        key: newKey(),
        name: rejection.file.name,
        status: "error",
        message: rejectionReason(rejection, group),
      }));

      // Same rules the server applies; catches what the dropzone's MIME check lets through.
      const candidates: { file: File; key: string }[] = [];
      for (const file of accepted) {
        const key = newKey();
        const check = checkFile(file, group);
        if (check.ok) {
          candidates.push({ file, key });
        } else {
          rejectedItems.push({ key, name: file.name, status: "error", message: check.reason });
        }
      }

      setItems((current) => [
        ...candidates.map(({ file, key }) => ({ key, name: file.name, status: "uploading" as const })),
        ...rejectedItems,
        ...current,
      ]);
      if (candidates.length === 0) return;

      const failAll = (message: string) => {
        for (const { key } of candidates) update(key, { status: "error", message });
      };

      try {
        const prepared = await prepareUploads({
          group,
          files: candidates.map(({ file }) => ({ name: file.name, size: file.size, type: file.type })),
        });
        if (!prepared.ok) {
          failAll(prepared.error);
          return;
        }
        for (const { index, reason } of prepared.rejected) {
          update(candidates[index].key, { status: "error", message: reason });
        }

        const supabase = createClient();
        await runWithConcurrency(prepared.prepared, CONCURRENCY, async (target) => {
          const { file, key } = candidates[target.index];
          try {
            const { error } = await supabase.storage
              .from("uploads")
              .upload(target.storagePath, file, { contentType: target.contentType, upsert: false });
            const result = await completeUpload({ uploadId: target.uploadId, uploaded: !error });
            if (!result.ok) {
              update(key, { status: "error", message: result.error });
            } else if (error || result.status === "failed") {
              update(key, { status: "error", message: "ファイルを保存できませんでした" });
            } else {
              update(key, { status: result.status === "processing" ? "processing" : "done" });
            }
          } catch {
            // Reading the file or the network failed: report it, keep the others going.
            update(key, { status: "error", message: "送信に失敗しました" });
          }
        });
      } catch {
        failAll("通信に失敗しました。もう一度お試しください。");
      } finally {
        // Anything still marked as uploading has no result coming; never leave the zones locked.
        setItems((current) =>
          current.map((item) =>
            candidates.some((c) => c.key === item.key) && item.status === "uploading"
              ? { ...item, status: "error", message: "送信に失敗しました" }
              : item,
          ),
        );
        router.refresh();
      }
    },
    [router, update],
  );

  const summary = summarise(items);

  return (
    <div className="flex flex-col gap-4">
      {/* Always mounted, so screen readers announce even the first update. */}
      <p role="status" className="sr-only">
        {summary}
      </p>
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
        <section aria-labelledby="upload-progress-title" className="border border-line bg-white px-6 py-4">
          <div className="mb-2 flex items-baseline gap-3">
            <h2 id="upload-progress-title" className="text-[11.5px] font-semibold tracking-[0.16em] text-muted">
              送信状況
            </h2>
            {/* Visual copy of the live summary above; the list itself is not live. */}
            <p aria-hidden className="num text-xs text-muted">
              {summary}
            </p>
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
          <ul className="flex flex-col">
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
  const titleId = useId();
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT[group],
    maxSize: MAX_FILE_BYTES,
    maxFiles: UPLOAD_GROUPS[group].maxFiles,
    multiple: true,
    // Keyboard and click users go through the button; the zone is for dragging.
    noClick: true,
    noKeyboard: true,
    disabled,
    onDrop: (accepted, rejections) => onDrop(group, accepted, rejections),
  });

  return (
    <div
      {...getRootProps({
        role: "group",
        "aria-labelledby": titleId,
        className: [
          "flex flex-col items-center border-[1.5px] border-dashed px-8 pt-11 pb-[38px] text-center transition-colors",
          isDragActive ? "border-primary bg-primary-soft" : "border-sky bg-white",
          disabled ? "opacity-60" : "",
        ].join(" "),
      })}
    >
      <input {...getInputProps()} />
      <span
        aria-hidden
        className="mb-[18px] inline-flex size-[52px] items-center justify-center border border-primary font-serif text-2xl font-bold text-primary"
      >
        {glyph}
      </span>
      <p id={titleId} className="mb-1.5 font-serif text-[17px] font-bold tracking-[0.08em]">
        {title}
      </p>
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
