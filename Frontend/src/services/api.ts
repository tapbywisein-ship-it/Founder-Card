import { supabase } from '@/lib/supabase';

let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) { _onUnauthorized = fn; }

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Cache the token in memory so we don't call getSession() on every request.
// Supabase fires onAuthStateChange when the session changes (sign-in, refresh,
// sign-out) — we update the cache there instead of fetching per-request.
let _cachedToken: string | null = null;
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null;
});
// Warm the cache immediately on module load (handles page refreshes).
supabase.auth.getSession().then(({ data }) => {
  _cachedToken = data.session?.access_token ?? null;
}).catch(() => { /* ignore */ });

async function getAuthHeader(): Promise<string | null> {
  if (_cachedToken) return `Bearer ${_cachedToken}`;
  // Fallback: token not cached yet — fetch once and cache.
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[auth] getSession error:', error.message);
      return null;
    }
    _cachedToken = data.session?.access_token ?? null;
    return _cachedToken ? `Bearer ${_cachedToken}` : null;
  } catch (err) {
    console.error('[auth] Failed to retrieve session:', err);
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  const authHeader = await getAuthHeader();
  if (authHeader) headers['Authorization'] = authHeader;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      _onUnauthorized?.();
    }
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    const errData = err as { message?: string; errors?: { field: string; message: string }[] };
    const detail = errData.errors?.length
      ? errData.errors.map((e) => `${e.field}: ${e.message}`).join(' | ')
      : null;
    const message = detail
      ? `${errData.message || 'Validation failed'} — ${detail}`
      : errData.message || 'Request failed';
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

export async function apiUpload<T = { data: { url: string } }>(
  path: string,
  file: File,
  fieldName = 'file'
): Promise<T> {
  const headers: Record<string, string> = {};
  const authHeader = await getAuthHeader();
  if (authHeader) headers['Authorization'] = authHeader;

  const body = new FormData();
  body.append(fieldName, file);

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new ApiError((err as { message: string }).message || 'Upload failed', res.status);
  }

  return res.json() as Promise<T>;
}
