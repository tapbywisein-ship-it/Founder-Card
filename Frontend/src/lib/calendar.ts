/**
 * Calendar helpers — build a Google Calendar "add event" URL and a downloadable
 * .ics file (works with Apple Calendar, Outlook, etc.). No backend needed.
 */

export interface CalendarEvent {
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: string | Date;
  endDate: string | Date;
  url?: string;
}

/** Format a date as UTC in the compact iCal form: 20260701T183000Z. */
const toICalUTC = (d: string | Date): string =>
  new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const detailsWithUrl = (ev: CalendarEvent): string =>
  [ev.description ?? '', ev.url ? `\n\n${ev.url}` : ''].join('').trim();

/** Google Calendar "create event" link — opens a prefilled event in a new tab. */
export function googleCalendarUrl(ev: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${toICalUTC(ev.startDate)}/${toICalUTC(ev.endDate)}`,
    details: detailsWithUrl(ev),
    location: ev.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build .ics file content for Apple Calendar / Outlook / etc. */
export function buildIcs(ev: CalendarEvent): string {
  const uid = `${toICalUTC(ev.startDate)}-${Math.random().toString(36).slice(2)}@tapbywisein`;
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TapByWisein//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICalUTC(new Date())}`,
    `DTSTART:${toICalUTC(ev.startDate)}`,
    `DTEND:${toICalUTC(ev.endDate)}`,
    `SUMMARY:${esc(ev.title)}`,
    `DESCRIPTION:${esc(detailsWithUrl(ev))}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : '',
    ev.url ? `URL:${ev.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

/** Trigger a browser download of the event as an .ics file. */
export function downloadIcs(ev: CalendarEvent): void {
  const blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40) || 'event'}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
