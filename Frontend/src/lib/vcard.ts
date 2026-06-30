interface VCardInput {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  position?: string | null;
  company?: string | null;
  bio?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  /** Public URL of the TapByWisein card so the recipient can open it later. */
  cardUrl?: string;
  /** Optional avatar URL — embedded as a PHOTO if reachable. */
  avatarUrl?: string | null;
}

/**
 * Build an RFC 6350 vCard 3.0 string. We use 3.0 (not 4.0) because every
 * mobile contact app on the planet handles 3.0 cleanly; 4.0 is still spotty
 * on iOS Contacts as of 2026.
 */
export function buildVCard(input: VCardInput): string {
  const lines: string[] = [];
  const esc = (v: string) => v.replace(/[\\,;]/g, (c) => `\\${c}`);

  lines.push('BEGIN:VCARD');
  lines.push('VERSION:3.0');
  lines.push(`N:${esc(input.lastName ?? '')};${esc(input.firstName ?? '')};;;`);
  const fullName = `${input.firstName ?? ''} ${input.lastName ?? ''}`.trim();
  if (fullName) lines.push(`FN:${esc(fullName)}`);
  if (input.position && input.company) {
    lines.push(`TITLE:${esc(input.position)}`);
    lines.push(`ORG:${esc(input.company)}`);
  } else if (input.position) {
    lines.push(`TITLE:${esc(input.position)}`);
  } else if (input.company) {
    lines.push(`ORG:${esc(input.company)}`);
  }
  if (input.email) lines.push(`EMAIL;TYPE=INTERNET:${esc(input.email)}`);
  if (input.phone) lines.push(`TEL;TYPE=CELL:${esc(input.phone)}`);
  if (input.bio) lines.push(`NOTE:${esc(input.bio)}`);
  if (input.website) lines.push(`URL:${esc(input.website)}`);
  if (input.linkedin) lines.push(`URL;TYPE=linkedin:${esc(input.linkedin)}`);
  if (input.twitter) lines.push(`URL;TYPE=twitter:${esc(input.twitter)}`);
  if (input.cardUrl) lines.push(`URL;TYPE=tapbywisein:${esc(input.cardUrl)}`);
  // PHOTO is referenced by URL — inlining base64 would balloon the .vcf size
  // and most contact apps fetch the URL when they have network.
  if (input.avatarUrl) lines.push(`PHOTO;VALUE=URI:${esc(input.avatarUrl)}`);
  lines.push(`X-TAPBYWISEIN-CARD:${esc(input.cardUrl ?? '')}`);
  lines.push('END:VCARD');

  // RFC requires CRLF.
  return lines.join('\r\n');
}

/** Trigger a download of the vCard as `<filename>.vcf` in the current tab. */
export function downloadVCard(input: VCardInput, filename?: string): void {
  const vcard = buildVCard(input);
  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const fallbackName =
    `${input.firstName ?? 'contact'}-${input.lastName ?? ''}`
      .trim()
      .replace(/\s+/g, '_') || 'contact';
  const safeName = filename ?? fallbackName;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
