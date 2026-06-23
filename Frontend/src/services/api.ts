const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000/api/v1';

const ACCESS_TOKEN_KEY = 'fk-access-token';
const REFRESH_TOKEN_KEY = 'fk-refresh-token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Prevent multiple simultaneous refresh calls
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

async function doTokenRefresh(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const res = await fetch(`${API_URL}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  const json = await res.json() as { data: { accessToken: string; refreshToken: string } };
  setTokens(json.data.accessToken, json.data.refreshToken);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
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

  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Attempt one token refresh on 401
  if (res.status === 401 && getRefreshToken()) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = doTokenRefresh().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
    } catch {
      throw new ApiError('Session expired. Please log in again.', 401);
    }

    // Retry with new token
    const newToken = getAccessToken();
    if (newToken) headers['Authorization'] = `Bearer ${newToken}`;

    const retryRes = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!retryRes.ok) {
      const err = await retryRes.json().catch(() => ({ message: 'Request failed' }));
      const retryData = err as { message?: string; errors?: { field: string; message: string }[] };
      const retryDetail = retryData.errors?.length
        ? retryData.errors.map((e) => `${e.field}: ${e.message}`).join(' | ')
        : null;
      const retryMessage = retryDetail
        ? `${retryData.message || 'Validation failed'} — ${retryDetail}`
        : retryData.message || 'Request failed';
      throw new ApiError(retryMessage, retryRes.status);
    }
    return retryRes.json() as Promise<T>;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    const errData = err as { message?: string; errors?: { field: string; message: string }[] };
    // Include field-level validation errors in the message so toasts are actionable
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

/** Upload a file as multipart/form-data. Returns the parsed JSON response. */
export async function apiUpload<T = { data: { url: string } }>(
  path: string,
  file: File,
  fieldName = 'file'
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const body = new FormData();
  body.append(fieldName, file);

  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers, body });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new ApiError((err as { message: string }).message || 'Upload failed', res.status);
  }

  return res.json() as Promise<T>;
}
