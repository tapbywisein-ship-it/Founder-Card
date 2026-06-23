import type { Location } from 'react-router-dom';

const POST_AUTH_RETURN_KEY = 'fk-post-auth-return';

/** Read `from` from login navigation state (shape varies: `{ pathname }` or full `Location`). */
export function getLoginReturnPathname(state: unknown): string | undefined {
  if (!state || typeof state !== 'object') return undefined;
  const from = (state as { from?: Location | { pathname?: string } }).from;
  if (!from || typeof from !== 'object') return undefined;
  const pathname = 'pathname' in from && typeof from.pathname === 'string' ? from.pathname : undefined;
  return pathname || undefined;
}

/** Allow only same-origin public event paths (open redirect hardening). */
export function safePublicEventReturnPath(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const [pathname] = raw.split('?');
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return undefined;
  if (!pathname.startsWith('/e/')) return undefined;
  const slug = pathname.slice(3).replace(/\/$/, '');
  if (!slug || slug.includes('/')) return undefined;
  return `/e/${slug}`;
}

/**
 * Read a same-origin path from `?from=` (or `?redirect=`) on the URL. Used by
 * the login/register pages so deep links like /login?from=/organizer/payouts
 * land back on the requested page after auth. The leading-slash + no-double-
 * slash check blocks open-redirect attempts like ?from=//evil.com.
 */
export function safeAppReturnPath(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* fall through with raw */
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return undefined;
  // Disallow protocol-relative or absolute URLs sneaking in.
  if (/^https?:/i.test(decoded)) return undefined;
  // Cap length to keep this off any abuse path.
  return decoded.slice(0, 256);
}

/** Pull `?from=` (or `?redirect=`) out of a search string. */
export function getReturnPathFromSearch(search: string): string | undefined {
  try {
    const params = new URLSearchParams(search);
    return safeAppReturnPath(params.get('from') ?? params.get('redirect') ?? undefined);
  } catch {
    return undefined;
  }
}

export function setPostAuthReturnPath(pathname: string) {
  const safe = safePublicEventReturnPath(pathname);
  if (!safe) return;
  try {
    localStorage.setItem(POST_AUTH_RETURN_KEY, safe);
  } catch {
    /* ignore */
  }
}

export function takePostAuthReturnPath(): string | undefined {
  try {
    const v = localStorage.getItem(POST_AUTH_RETURN_KEY);
    if (v) localStorage.removeItem(POST_AUTH_RETURN_KEY);
    return safePublicEventReturnPath(v || undefined);
  } catch {
    return undefined;
  }
}

export function peekPostAuthReturnPath(): string | undefined {
  try {
    return localStorage.getItem(POST_AUTH_RETURN_KEY) || undefined;
  } catch {
    return undefined;
  }
}

export function clearPostAuthReturnPath() {
  try {
    localStorage.removeItem(POST_AUTH_RETURN_KEY);
  } catch {
    /* ignore */
  }
}
