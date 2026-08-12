const KEY = 'tbw_ref';

/** Call once when a page loads — first-touch attribution for the session. */
export function captureReferralFromUrl(search: string) {
  const ref = new URLSearchParams(search).get('ref');
  if (ref) sessionStorage.setItem(KEY, ref);
}

export function getReferralCode(): string | undefined {
  return sessionStorage.getItem(KEY) ?? undefined;
}
