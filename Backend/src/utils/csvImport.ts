/**
 * Minimal CSV parser tailored to attendee imports.
 *
 * Handles the cases an organizer's spreadsheet export will produce:
 * quoted fields with embedded commas, doubled quotes, CRLF or LF line
 * endings, BOM at the start, and trailing empty lines. NOT a full RFC 4180
 * parser — escape sequences other than "" inside a quoted field will
 * pass through verbatim, which matches Excel / Google Sheets behavior for
 * email and name fields.
 */

export interface ParsedAttendeeRow {
  rowNumber: number; // 1-based, line in the file (excluding header)
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  eventRole?: 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR';
}

export interface CsvImportError {
  rowNumber: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ParsedCsv {
  valid: ParsedAttendeeRow[];
  invalid: CsvImportError[];
}

const VALID_ROLES = new Set(['ATTENDEE', 'VIP', 'SPEAKER', 'STAFF', 'SPONSOR']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HEADER_ALIASES: Record<string, string> = {
  email: 'email',
  'e-mail': 'email',
  firstname: 'firstName',
  'first name': 'firstName',
  fname: 'firstName',
  lastname: 'lastName',
  'last name': 'lastName',
  lname: 'lastName',
  surname: 'lastName',
  company: 'company',
  organization: 'company',
  org: 'company',
  role: 'eventRole',
  'event role': 'eventRole',
  type: 'eventRole',
  category: 'eventRole',
};

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(h: string): string {
  return h.replace(/^﻿/, '').trim().toLowerCase();
}

export function parseAttendeeCsv(content: string, maxRows = 500): ParsedCsv {
  const text = content.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return { valid: [], invalid: [] };

  const headerRow = splitLine(lines[0]);
  const headers = headerRow.map((h) => HEADER_ALIASES[normalizeHeader(h)] ?? null);

  const emailIdx = headers.indexOf('email');
  if (emailIdx === -1) {
    return {
      valid: [],
      invalid: [
        {
          rowNumber: 0,
          reason: 'Missing required "email" column',
          raw: { header: lines[0] },
        },
      ],
    };
  }

  const valid: ParsedAttendeeRow[] = [];
  const invalid: CsvImportError[] = [];
  const seenEmails = new Set<string>();

  for (let i = 1; i < lines.length && i <= maxRows; i++) {
    const cols = splitLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) raw[h] = cols[idx] ?? '';
    });

    const email = (raw.email ?? '').toLowerCase().trim();
    if (!email) {
      invalid.push({ rowNumber: i, reason: 'Missing email', raw });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      invalid.push({ rowNumber: i, reason: `Invalid email "${email}"`, raw });
      continue;
    }
    if (seenEmails.has(email)) {
      invalid.push({
        rowNumber: i,
        reason: 'Duplicate email in this CSV',
        raw,
      });
      continue;
    }
    seenEmails.add(email);

    const role = (raw.eventRole ?? '').trim().toUpperCase();
    const eventRole =
      role && VALID_ROLES.has(role) ? (role as ParsedAttendeeRow['eventRole']) : 'ATTENDEE';

    valid.push({
      rowNumber: i,
      email,
      firstName: raw.firstName?.trim() || undefined,
      lastName: raw.lastName?.trim() || undefined,
      company: raw.company?.trim() || undefined,
      eventRole,
    });
  }

  if (lines.length - 1 > maxRows) {
    invalid.push({
      rowNumber: maxRows + 1,
      reason: `CSV exceeds ${maxRows}-row limit; remaining rows skipped`,
      raw: {},
    });
  }

  return { valid, invalid };
}
