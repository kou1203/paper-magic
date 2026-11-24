"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { parseCredentials, type Credentials } from "@/lib/auth/credentials";
import { AUTH_CALLBACK_PATH, safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  /** Message for the whole form, shown above the fields. */
  error?: string;
  /** Success notice, e.g. "check your email". */
  notice?: string;
  fieldErrors?: Partial<Record<keyof Credentials, string>>;
  /** Echoed back so the email field keeps its value after an error. */
  email?: string;
};

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for unknown email and wrong password, so accounts cannot be probed.
    if (error.code === "email_not_confirmed") {
      return { error: "メールアドレスの確認が済んでいません。届いたメールのリンクを開いてください。", email };
    }
    return { error: "メールアドレスまたはパスワードが正しくありません。", email };
  }

  redirect(safeNextPath(formData.get("next")?.toString()));
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = parseCredentials(formData);
  const email = String(formData.get("email") ?? "");
  if (!parsed.ok) {
    return { fieldErrors: parsed.fieldErrors, email };
  }

  // Supabase only follows this link if it is on the project's redirect allow list.
  const origin = (await headers()).get("origin");
  const next = safeNextPath(formData.get("next")?.toString());
  const emailRedirectTo = origin
    ? `${origin}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}`
    : undefined;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo },
  });
  if (error) {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: "より推測されにくいパスワードを設定してください" }, email };
    }
    if (error.code === "over_email_send_rate_limit") {
      return { error: "確認メールの送信が混み合っています。しばらくしてからお試しください。", email };
    }
    return { error: "登録できませんでした。時間をおいてもう一度お試しください。", email };
  }

  // Email confirmation off: signed in right away.
  if (data.session) {
    redirect(next);
  }
  // Email confirmation on. Supabase answers the same way for an existing
  // address, so the message does not reveal whether one is registered.
  return {
    notice: "確認メールを送信しました。メール内のリンクを開くと登録が完了します。",
    email,
  };
}
