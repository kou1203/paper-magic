/**
 * Supabase connection settings. Both values are public by design: the
 * publishable key only grants what Row Level Security allows.
 *
 * The `process.env.NEXT_PUBLIC_*` reads must stay literal so Next.js can
 * inline them into the browser bundle.
 */
export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定してください（.env.example を参照）。",
    );
  }
  return { url, publishableKey };
}
