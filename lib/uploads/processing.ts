import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

export type UploadToProcess = Pick<Tables<"uploads">, "id" | "kind" | "storage_path" | "file_name">;

/**
 * Hands a stored upload to the importer for its kind. Called once the original
 * file is confirmed to be in Storage.
 *
 * The importers themselves come in later tickets; until then the upload stays
 * in `processing`:
 * - csv / xlsx → KO-10 (parse rows, map categories, insert confirmed expenses)
 * - pdf / image → KO-11 (read the receipt with AI, insert pending_review expenses)
 *
 * Each importer must move the upload to `completed`, `needs_review` or `failed`.
 */
export async function startProcessing(
  _supabase: SupabaseClient<Database>,
  upload: UploadToProcess,
): Promise<void> {
  switch (upload.kind) {
    case "csv":
    case "xlsx":
      // KO-10: statement import.
      return;
    case "pdf":
    case "image":
      // KO-11: receipt reading.
      return;
    default: {
      const unhandled: never = upload.kind;
      throw new Error(`未対応のアップロード種別です: ${String(unhandled)}`);
    }
  }
}
