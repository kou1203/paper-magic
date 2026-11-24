import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CALLBACK_PATH, LOGIN_PATH, isDataPath, isPublicPath, loginPathFor, safeNextPath } from "@/lib/auth/paths";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/**
 * Runs on every page request (see proxy.ts):
 * 1. refreshes the Supabase session and writes the new cookies back, and
 * 2. sends signed-out visitors to /login (and signed-in ones away from it).
 *
 * This is an optimistic check. Pages and Server Actions still verify the user
 * themselves through getCurrentUser(), and RLS guards the data.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  // Headers Supabase asks us to send whenever it sets auth cookies
  // (Cache-Control: private, no-store, ...), so no shared cache stores them.
  const authHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        Object.assign(authHeaders, headers);
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Do not run code between createServerClient and getClaims: it refreshes
  // the session, and anything in between can race with the cookie write.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search, searchParams } = request.nextUrl;

  // Email links fall back to the Site URL ("/?code=...") when the callback URL
  // is not on Supabase's redirect allow list. Forward them to the callback.
  if (pathname === "/" && searchParams.has("code")) {
    return redirectKeepingSession(request, response, authHeaders, `${AUTH_CALLBACK_PATH}${search}`);
  }

  if (!signedIn && isDataPath(pathname)) {
    return new NextResponse("ログインが必要です。", {
      status: 401,
      headers: { ...authHeaders, "Cache-Control": "private, no-store" },
    });
  }

  if (!signedIn && !isPublicPath(pathname)) {
    return redirectKeepingSession(request, response, authHeaders, loginPathFor(`${pathname}${search}`));
  }

  if (signedIn && pathname === LOGIN_PATH) {
    const next = safeNextPath(searchParams.get("next"));
    return redirectKeepingSession(request, response, authHeaders, next);
  }

  return response;
}

/** Redirect that still carries any refreshed session cookies and their cache headers. */
function redirectKeepingSession(
  request: NextRequest,
  from: NextResponse,
  authHeaders: Record<string, string>,
  path: string,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const [key, value] of Object.entries(authHeaders)) {
    redirect.headers.set(key, value);
  }
  return redirect;
}
