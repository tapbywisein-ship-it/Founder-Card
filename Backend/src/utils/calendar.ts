/**
 * Stateless .ics (VCALENDAR) and .vcf (VCARD) string builders — no deps,
 * mirroring the sitemap string-building in seo.service. Both formats need
 * their own escaping: commas, semicolons and newlines are significant.
 */

/** Escape a text value per RFC 5545/6350 (\, \; \n). */
const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** UTC timestamp in ICS basic format: 20260706T173000Z */
const icsDate = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/**
 * Fold long content lines at 75 octets per RFC 5545 §3.1 (continuation lines
 * start with a space). Keeps strict parsers (Outlook, Apple Calendar) happy.
 */
const fold = (line: string): string => {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join('\r\n');
};

export interface IcsEventInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  start: Date;
  end: Date;
}

/** Build a single-event VCALENDAR document. */
export function buildEventIcs(e: IcsEventInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TapByWisein//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${esc(e.uid)}@tapbywisein.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${esc(e.location)}`] : []),
    ...(e.url ? [`URL:${esc(e.url)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export interface VCardInput {
  firstName: string;
  lastName: string;
  company?: string | null;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  /** The person's public card URL — included so the contact links back. */
  cardUrl?: string | null;
}

/** Build a VCARD 3.0 document (3.0 = widest importer support: iOS/Android/Outlook). */
export function buildVCard(p: VCardInput): string {
  const fullName = `${p.firstName} ${p.lastName}`.trim();
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(p.lastName)};${esc(p.firstName)};;;`,
    `FN:${esc(fullName)}`,
    ...(p.company ? [`ORG:${esc(p.company)}`] : []),
    ...(p.position ? [`TITLE:${esc(p.position)}`] : []),
    ...(p.phone ? [`TEL;TYPE=CELL:${esc(p.phone)}`] : []),
    ...(p.email ? [`EMAIL;TYPE=INTERNET:${esc(p.email)}`] : []),
    ...(p.website ? [`URL:${esc(p.website)}`] : []),
    ...(p.cardUrl ? [`URL;TYPE=TapByWisein:${esc(p.cardUrl)}`] : []),
    ...(p.linkedin ? [`X-SOCIALPROFILE;TYPE=linkedin:${esc(p.linkedin)}`] : []),
    ...(p.twitter ? [`X-SOCIALPROFILE;TYPE=twitter:${esc(p.twitter)}`] : []),
    ...(p.instagram ? [`X-SOCIALPROFILE;TYPE=instagram:${esc(p.instagram)}`] : []),
    ...(p.avatarUrl && /^https?:\/\//i.test(p.avatarUrl) ? [`PHOTO;VALUE=URI:${esc(p.avatarUrl)}`] : []),
    ...(p.bio ? [`NOTE:${esc(p.bio)}`] : []),
    'END:VCARD',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}
