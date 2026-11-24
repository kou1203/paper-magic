/** Where signed-in users land by default. */
export const HOME_PATH = "/dashboard";
export const LOGIN_PATH = "/login";
export const AUTH_CALLBACK_PATH = "/auth/callback";

/** Paths reachable without signing in. Everything else requires a session. */
const PUBLIC_PATHS = [LOGIN_PATH, AUTH_CALLBACK_PATH] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Endpoints that return files or data rather than pages. Signed-out requests
 * get 401 instead of a redirect, so a download never saves the login page.
 */
const DATA_PATHS = ["/expenses/export"] as const;

export function isDataPath(pathname: string): boolean {
  return DATA_PATHS.some((path) => pathname === path);
}

/**
 * Turns an untrusted `next` value into a same-origin path, so redirects after
 * sign-in cannot send the user to another site. Anything suspicious becomes
 * HOME_PATH.
 */
export function safeNextPath(next: string | string[] | null | undefined): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) {
    return HOME_PATH;
  }
  // Must be a single-slash absolute path: rejects "//evil.com", "/\evil.com",
  // "https://evil.com" and "javascript:..." alike.
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return HOME_PATH;
  }
  // Control characters (tabs, newlines) are stripped by URL parsers and can
  // turn "/\t/evil.com" into "//evil.com".
  if (/[\u0000-\u001f\u007f]/.test(next)) {
    return HOME_PATH;
  }
  const url = new URL(next, "http://paper-magic.invalid");
  const path = `${url.pathname}${url.search}`;
  // Check the *normalised* path again: dot segments can collapse
  // "/..//evil.example" or "/%2e%2e//evil.example" into "//evil.example",
  // which browsers treat as another host.
  if (url.origin !== "http://paper-magic.invalid" || path.startsWith("//") || path.includes("\\")) {
    return HOME_PATH;
  }
  // Never bounce back into the auth screens.
  if (isPublicPath(url.pathname)) {
    return HOME_PATH;
  }
  return path;
}

/** Login URL that returns to `pathname` (plus query) after sign-in. */
export function loginPathFor(pathnameWithSearch: string): string {
  const next = safeNextPath(pathnameWithSearch);
  return next === HOME_PATH ? LOGIN_PATH : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}
