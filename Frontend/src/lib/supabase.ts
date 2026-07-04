import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/*
 * In-memory access-token cache.
 *
 * `supabase.auth.getSession()` acquires a cross-tab Web Lock (navigator.locks)
 * to serialize token refresh. With several app tabs open, one tab holding that
 * lock blocks every other tab's getSession() until it frees. Because api.ts
 * awaits it before *every* request, that turns into requests that never fire —
 * pages stuck on skeleton loaders. We avoid the hot-path lock by caching the
 * token here and refreshing it from onAuthStateChange (sign-in, refresh,
 * sign-out) instead of asking for the session on each call.
 */
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0; // epoch seconds

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
  tokenExpiresAt = session?.expires_at ?? 0;
});

// Seed once on boot so the token is available before the first auth event.
supabase.auth
  .getSession()
  .then(({ data }) => {
    cachedAccessToken = data.session?.access_token ?? null;
    tokenExpiresAt = data.session?.expires_at ?? 0;
  })
  .catch(() => {});

/** The cached bearer token, or null if missing/near-expiry (caller should refresh). */
export function getCachedAccessToken(): string | null {
  if (!cachedAccessToken) return null;
  // Treat as stale 10s before actual expiry so we refresh proactively.
  if (tokenExpiresAt && tokenExpiresAt * 1000 < Date.now() + 10_000) return null;
  return cachedAccessToken;
}
