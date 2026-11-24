import type { Database } from "@/lib/supabase/database.types";

export type UploadKind = Database["public"]["Enums"]["upload_kind"];

/** The two drop zones on the upload screen. */
export type UploadGroup = "statement" | "receipt";

/** Same as the Storage bucket's file_size_limit (10 MB). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

type ExtensionRule = {
  kind: UploadKind;
  /** Content-Type we send to Storage. Must be in the bucket's allowed list. */
  contentType: string;
  /** MIME types browsers report for this extension. Empty string = unknown. */
  acceptedMimeTypes: readonly string[];
};

const EXTENSIONS: Record<string, ExtensionRule> = {
  csv: {
    kind: "csv",
    contentType: "text/csv",
    // Windows browsers often label CSV as Excel; some report nothing.
    acceptedMimeTypes: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", ""],
  },
  xlsx: {
    kind: "xlsx",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    acceptedMimeTypes: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ""],
  },
  pdf: { kind: "pdf", contentType: "application/pdf", acceptedMimeTypes: ["application/pdf"] },
  jpg: { kind: "image", contentType: "image/jpeg", acceptedMimeTypes: ["image/jpeg"] },
  jpeg: { kind: "image", contentType: "image/jpeg", acceptedMimeTypes: ["image/jpeg"] },
  png: { kind: "image", contentType: "image/png", acceptedMimeTypes: ["image/png"] },
};

export const UPLOAD_GROUPS: Record<
  UploadGroup,
  { label: string; extensions: readonly string[]; maxFiles: number }
> = {
  statement: { label: "CSVファイル", extensions: ["csv", "xlsx"], maxFiles: 12 },
  receipt: { label: "レシート画像", extensions: ["jpg", "jpeg", "png", "pdf"], maxFiles: 20 },
};

/** react-dropzone `accept` map for a group: MIME type → extensions. */
export function dropzoneAccept(group: UploadGroup): Record<string, string[]> {
  const accept: Record<string, string[]> = {};
  for (const ext of UPLOAD_GROUPS[group].extensions) {
    for (const mime of EXTENSIONS[ext].acceptedMimeTypes) {
      if (!mime) continue;
      accept[mime] = [...(accept[mime] ?? []), `.${ext}`];
    }
  }
  return accept;
}

/** Human-readable list for the drop zone, e.g. ".jpg / .png / .pdf". */
export function extensionsLabel(group: UploadGroup): string {
  return UPLOAD_GROUPS[group].extensions
    .filter((ext) => ext !== "jpeg")
    .map((ext) => `.${ext}`)
    .join(" / ");
}

export type FileDescriptor = {
  name: string;
  size: number;
  /** `File.type` as reported by the browser; may be empty. */
  type: string;
};

export type FileCheck =
  | { ok: true; kind: UploadKind; extension: string; contentType: string }
  | { ok: false; reason: string };

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : "";
}

/**
 * Decides whether a file may be uploaded into a group. Runs in the browser
 * for quick feedback and again on the server, which is the check that counts.
 */
export function checkFile(file: FileDescriptor, group: UploadGroup): FileCheck {
  const name = file.name.trim();
  if (name.length === 0 || name.length > 255) {
    return { ok: false, reason: "ファイル名が空か、長すぎます（255文字まで）" };
  }
  const extension = extensionOf(name);
  const rule = EXTENSIONS[extension];
  if (!rule || !UPLOAD_GROUPS[group].extensions.includes(extension)) {
    return { ok: false, reason: `対応していない形式です（${extensionsLabel(group)}）` };
  }
  if (!rule.acceptedMimeTypes.includes(file.type)) {
    return { ok: false, reason: "ファイルの種類が拡張子と一致しません" };
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    return { ok: false, reason: "空のファイルはアップロードできません" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "ファイルサイズが10MBを超えています" };
  }
  return { ok: true, kind: rule.kind, extension, contentType: rule.contentType };
}

/** Content-Type stored for an extension, or null when it is not accepted. */
export function contentTypeFor(extension: string): string | null {
  return EXTENSIONS[extension]?.contentType ?? null;
}

/**
 * Storage object key for an upload. Uses only ASCII so any original file name
 * (Japanese included) works; the original name is kept in uploads.file_name.
 * The first segment must be the owner's id (enforced by RLS and a CHECK).
 */
export function storagePathFor(userId: string, uploadId: string, extension: string): string {
  return `${userId}/${uploadId}/original.${extension}`;
}
