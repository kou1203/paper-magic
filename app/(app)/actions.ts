"use server";

import { redirect } from "next/navigation";
import { LOGIN_PATH } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  // Ends this browser's session only; other devices stay signed in.
  await supabase.auth.signOut({ scope: "local" });
  redirect(LOGIN_PATH);
}
