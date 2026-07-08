import { supabase, getCachedAccessToken } from '@/lib/supabase';

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

// Slow-path session fetch, bounded by a timeout so a contended cross-tab auth
// lock (navigator.locks) can never hang a request indefinitely. On timeout we
// resolve to null — the request proceeds unauthenticated and surfaces a normal
// error instead of an infinite skeleton loader.
async function getSessionTokenWithTimeout(ms = 4000): Promise<string | null> {
  return Promise.race([
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error('[auth] getSession error:', error.message);
          return null;
        }
        return data.session?.access_token ?? null;
      })
      .catch((err) => {
        console.error('[auth] Failed to retrieve session:', err);
        return null;
      }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

async function getAuthHeader(): Promise<string | null> {
  // Fast path: the in-memory token maintained by onAuthStateChange in
  // lib/supabase.ts. Avoids awaiting getSession() (cross-tab lock) per request.
  const cached = getCachedAccessToken();
  if (cached) return `Bearer ${cached}`;
  // Slow path (token missing / near expiry): let supabase refresh, but bounded.
  const token = await getSessionTokenWithTimeout();
  return token ? `Bearer ${token}` : null;
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
      ? `${errData.message || 'Validation failed'}: ${detail}`
      : errData.message || 'Request failed';
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

/**
 * Fetch a file endpoint WITH the auth header and return its Blob. Plain
 * `<a href>` downloads can't send Authorization, so viewer-dependent files
 * (e.g. the contact-gated vCard) must go through this.
 */
export async function apiDownload(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const authHeader = await getAuthHeader();
  if (authHeader) headers['Authorization'] = authHeader;
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError('Download failed', res.status);
  return res.blob();
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
