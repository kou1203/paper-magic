"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { startProcessing } from "@/lib/uploads/processing";
import { UPLOAD_GROUPS, checkFile, contentTypeFor, extensionOf, storagePathFor } from "@/lib/uploads/rules";

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
    rows.push({
      id: uploadId,
      kind: check.kind,
      file_name: file.name.trim(),
      storage_path: storagePath,
      byte_size: file.size,
    });
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

const UPLOAD_COLUMNS = "id, kind, storage_path, file_name, status, processing_started_at, byte_size";

/**
 * Step 2 of an upload: called after the browser has sent the file.
 *
 * 1. Confirms the object is in Storage with the declared size and type.
 * 2. Claims the upload atomically (sets processing_started_at once), so
 *    retries, double clicks or parallel calls never import it twice.
 * 3. Starts the importer for its kind.
 *
 * A missing or mismatched file, or a failed browser upload, marks the upload
 * as failed. Transient errors return ok:false and leave it retryable.
 */
export async function completeUpload(input: unknown): Promise<CompleteResult> {
  const parsed = completeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "アップロードを特定できませんでした。" };
  }
  const { uploadId, uploaded } = parsed.data;

  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: upload, error } = await supabase
    .from("uploads")
    .select(UPLOAD_COLUMNS)
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !upload) {
    return { ok: false, error: "アップロードが見つかりません。" };
  }
  if (upload.status !== "processing" || upload.processing_started_at !== null) {
    // Already started or finished (a retried request): report the current state.
    return { ok: true, status: upload.status };
  }

  /** Fails an upload that has not been claimed yet; a claimed one is left alone. */
  const failUnclaimed = async (message: string): Promise<CompleteResult> => {
    const { data, error: updateError } = await supabase
      .from("uploads")
      .update({ status: "failed", error_message: message })
      .eq("id", uploadId)
      .eq("status", "processing")
      .is("processing_started_at", null)
      .select("status")
      .maybeSingle();
    if (updateError) {
      console.error("completeUpload: could not mark failed", updateError);
      return { ok: false, error: "状態を更新できませんでした。" };
    }
    return { ok: true, status: data?.status ?? "processing" };
  };

  if (!uploaded) {
    return failUnclaimed("ファイルの送信に失敗しました。");
  }

  const { data: stored, error: infoError } = await supabase.storage
    .from("uploads")
    .info(upload.storage_path);
  if (infoError) {
    const missing =
      ("status" in infoError && infoError.status === 404) ||
      ("code" in infoError && infoError.code === "NoSuchKey");
    if (missing) return failUnclaimed("ファイルが保存されていませんでした。");
    console.error("completeUpload: storage info failed", infoError);
    return { ok: false, error: "保存状況を確認できませんでした。もう一度お試しください。" };
  }

  const expectedType = contentTypeFor(extensionOf(upload.storage_path));
  if (stored.size !== upload.byte_size || stored.contentType !== expectedType) {
    return failUnclaimed("保存されたファイルが送信内容と一致しませんでした。");
  }

  // Claim: only one request can flip processing_started_at from NULL.
  const { data: claimed, error: claimError } = await supabase
    .from("uploads")
    .update({ processing_started_at: new Date().toISOString() })
    .eq("id", uploadId)
    .eq("status", "processing")
    .is("processing_started_at", null)
    .select(UPLOAD_COLUMNS)
    .maybeSingle();
  if (claimError) {
    console.error("completeUpload: claim failed", claimError);
    return { ok: false, error: "取り込みを開始できませんでした。もう一度お試しください。" };
  }
  if (!claimed) {
    const { data: current } = await supabase.from("uploads").select("status").eq("id", uploadId).single();
    return { ok: true, status: current?.status ?? "processing" };
  }

  try {
    await startProcessing(supabase, claimed);
  } catch (cause) {
    console.error("completeUpload: processing failed", cause);
    await supabase
      .from("uploads")
      .update({ status: "failed", error_message: "取り込み処理を開始できませんでした。" })
      .eq("id", uploadId)
      .eq("status", "processing");
    return { ok: true, status: "failed" };
  }

  const { data: after } = await supabase.from("uploads").select("status").eq("id", uploadId).single();
  return { ok: true, status: after?.status ?? "processing" };
}
