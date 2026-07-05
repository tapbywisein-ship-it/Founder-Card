export interface CalEvent {
  title: string;
  description?: string;
  start: string | Date;
  end: string | Date;
  location?: string;
  url?: string;
}

/** iCal UTC timestamp: YYYYMMDDTHHMMSSZ */
function toUtcStamp(d: string | Date): string {
  return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** "Add to Google Calendar" prefilled-event URL. */
export function googleCalUrl(e: CalEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toUtcStamp(e.start)}/${toUtcStamp(e.end)}`,
    details: [e.description, e.url].filter(Boolean).join('\n\n'),
    location: e.location ?? '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** RFC-5545 VCALENDAR text for Apple Calendar / Outlook / etc. */
export function buildIcs(e: CalEvent): string {
  const uid = `${toUtcStamp(e.start)}-${Math.random().toString(36).slice(2)}@tapbywisein`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TapByWisein//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toUtcStamp(new Date())}`,
    `DTSTART:${toUtcStamp(e.start)}`,
    `DTEND:${toUtcStamp(e.end)}`,
    `SUMMARY:${icsEscape(e.title)}`,
    e.description ? `DESCRIPTION:${icsEscape([e.description, e.url].filter(Boolean).join('\n\n'))}` : '',
    e.location ? `LOCATION:${icsEscape(e.location)}` : '',
    e.url ? `URL:${e.url}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function downloadIcs(e: CalEvent, filename = 'event.ics'): void {
  const blob = new Blob([buildIcs(e)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
