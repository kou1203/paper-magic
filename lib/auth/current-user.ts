import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "./paths";

export type CurrentUser = {
  id: string;
  email: string;
};

/**
 * The signed-in user, verified with the Supabase Auth server. Redirects to the
 * login page when there is none. This is the authoritative check: call it in
 * every page and Server Action that touches user data, not just rely on the
 * proxy. Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect(LOGIN_PATH);
  }
  return { id: data.user.id, email: data.user.email ?? "" };
});

/** Short name for the sidebar: the part of the email before "@". */
export function displayNameOf(user: Pick<CurrentUser, "email">): string {
  const local = user.email.split("@")[0];
  return local || "ユーザー";
}
