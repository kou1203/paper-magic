import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_BYTES = 72;

export const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .max(254, "メールアドレスが長すぎます")
    .pipe(z.email("メールアドレスの形式が正しくありません")),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `パスワードは${MIN_PASSWORD_LENGTH}文字以上で入力してください`)
    // bcrypt only uses the first 72 bytes; full-width characters take 3 each.
    .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, {
      message: `パスワードが長すぎます（半角${MAX_PASSWORD_BYTES}文字まで、全角は1文字を3文字分として数えます）`,
    }),
});

export type Credentials = z.infer<typeof credentialsSchema>;

export type CredentialsResult =
  | { ok: true; data: Credentials }
  | { ok: false; fieldErrors: Partial<Record<keyof Credentials, string>> };

export function parseCredentials(formData: FormData): CredentialsResult {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  const fieldErrors: Partial<Record<keyof Credentials, string>> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return { ok: false, fieldErrors };
}
