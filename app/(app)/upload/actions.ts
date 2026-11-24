"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { startProcessing } from "@/lib/uploads/processing";
import { UPLOAD_GROUPS, checkFile, storagePathFor } from "@/lib/uploads/rules";

type UploadStatus = Database["public"]["Enums"]["upload_status"];

const prepareInput = z.object({
  group: z.enum(["statement", "receipt"]),
  files: z
    .array(
      z.object({
        name: z.string().max(1000),
        size: z.number(),
        type: z.string().max(200),
      }),
    )
    .min(1)
    .max(Math.max(UPLOAD_GROUPS.statement.maxFiles, UPLOAD_GROUPS.receipt.maxFiles)),
});

export type PreparedUpload = {
  /** Position of the file in the request, so the browser can match it. */
  index: number;
  uploadId: string;
  storagePath: string;
  contentType: string;
};

export type PrepareResult =
  | { ok: true; prepared: PreparedUpload[]; rejected: { index: number; reason: string }[] }
  | { ok: false; error: string };

/**
 * Step 1 of an upload: validates the files the browser wants to send and
 * records each accepted one as an `uploads` row in `processing`. Returns where
 * in Storage each file must go. The browser then uploads the bytes directly to
 * Storage (Server Actions cap request bodies at 1 MB), where the bucket's own
 * size and type limits and per-user folder policies apply.
 */
export async function prepareUploads(input: unknown): Promise<PrepareResult> {
  const parsed = prepareInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "アップロードするファイルを確認してください。" };
  }
  const { group, files } = parsed.data;
  const { maxFiles } = UPLOAD_GROUPS[group];
  if (files.length > maxFiles) {
    return { ok: false, error: `一度にアップロードできるのは${maxFiles}件までです。` };
  }

  const user = await getCurrentUser();
  const prepared: PreparedUpload[] = [];
  const rejected: { index: number; reason: string }[] = [];
  const rows: Database["public"]["Tables"]["uploads"]["Insert"][] = [];

  files.forEach((file, index) => {
    const check = checkFile(file, group);
    if (!check.ok) {
      rejected.push({ index, reason: check.reason });
      return;
    }
    const uploadId = randomUUID();
    const storagePath = storagePathFor(user.id, uploadId, check.extension);
    rows.push({ id: uploadId, kind: check.kind, file_name: file.name.trim(), storage_path: storagePath });
    prepared.push({ index, uploadId, storagePath, contentType: check.contentType });
  });

  if (rows.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase.from("uploads").insert(rows);
    if (error) {
      console.error("prepareUploads: insert failed", error);
      return { ok: false, error: "アップロードを開始できませんでした。時間をおいてもう一度お試しください。" };
    }
  }

  return { ok: true, prepared, rejected };
}

const completeInput = z.object({
  uploadId: z.uuid(),
  /** Whether the browser's upload to Storage succeeded. */
  uploaded: z.boolean(),
});

export type CompleteResult = { ok: true; status: UploadStatus } | { ok: false; error: string };

/**
 * Step 2 of an upload: called after the browser has sent the file. Confirms
 * the object really is in Storage, then starts the importer for its kind.
 * A missing file or a failed browser upload marks the upload as failed.
 */
export async function completeUpload(input: unknown): Promise<CompleteResult> {
  const parsed = completeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "アップロードを特定できませんでした。" };
  }
  const { uploadId, uploaded } = parsed.data;

  await getCurrentUser();
  const supabase = await createClient();

  // RLS limits this to the caller's own uploads.
  const { data: upload, error } = await supabase
    .from("uploads")
    .select("id, kind, storage_path, file_name, status")
    .eq("id", uploadId)
    .maybeSingle();
  if (error || !upload) {
    return { ok: false, error: "アップロードが見つかりません。" };
  }
  if (upload.status !== "processing") {
    // Already finished (e.g. a retried request): report the current state.
    return { ok: true, status: upload.status };
  }

  const fail = async (message: string): Promise<CompleteResult> => {
    await supabase
      .from("uploads")
      .update({ status: "failed", error_message: message })
      .eq("id", uploadId)
      .eq("status", "processing");
    return { ok: true, status: "failed" };
  };

  if (!uploaded) {
    return fail("ファイルの送信に失敗しました。");
  }

  const { data: exists } = await supabase.storage.from("uploads").exists(upload.storage_path);
  if (!exists) {
    return fail("ファイルが保存されていませんでした。");
  }

  try {
    await startProcessing(supabase, upload);
  } catch (cause) {
    console.error("completeUpload: processing failed", cause);
    return fail("取り込み処理を開始できませんでした。");
  }

  const { data: after } = await supabase.from("uploads").select("status").eq("id", uploadId).single();
  return { ok: true, status: after?.status ?? "processing" };
}
