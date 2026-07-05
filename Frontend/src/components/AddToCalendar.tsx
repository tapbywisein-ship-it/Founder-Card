import { useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { googleCalUrl, downloadIcs, type CalEvent } from '@/lib/calendar';

/** "Add to calendar" split control — Google Calendar link + .ics download. */
export const AddToCalendar = ({ event, className }: { event: CalEvent; className?: string }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
        <CalendarPlus className="w-4 h-4 mr-1.5" /> Add to calendar
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-52 rounded-xl border border-border bg-card shadow-card p-1">
            <a
              href={googleCalUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm rounded-lg hover:bg-muted/50 text-foreground"
            >
              Google Calendar
            </a>
            <button
              type="button"
              onClick={() => {
                downloadIcs(event, `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted/50 text-foreground"
            >
              Apple / Outlook (.ics)
            </button>
          </div>
        </>
      )}
    </div>
  );
};
