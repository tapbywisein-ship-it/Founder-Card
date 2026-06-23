import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Calendar, Mic } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { eventsService } from '@/services/events.service';

interface EventSpeakersAgendaProps {
  eventId: string;
}

/**
 * Public-facing render of event speakers and agenda. Embedded on the event
 * detail page; renders nothing if the organizer hasn't added any.
 */
export const EventSpeakersAgenda = ({ eventId }: EventSpeakersAgendaProps) => {
  const speakers = useQuery({
    queryKey: ['events', 'speakers', eventId],
    queryFn: () => eventsService.listSpeakers(eventId),
    select: (res) => res.data,
  });
  const agenda = useQuery({
    queryKey: ['events', 'agenda', eventId],
    queryFn: () => eventsService.listAgenda(eventId),
    select: (res) => res.data,
  });

  const hasSpeakers = (speakers.data?.length ?? 0) > 0;
  const hasAgenda = (agenda.data?.length ?? 0) > 0;
  if (!hasSpeakers && !hasAgenda) return null;

  return (
    <div className="space-y-4">
      {hasSpeakers && (
        <Surface>
          <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Mic className="h-4 w-4" /> Speakers
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {speakers.data!.map((s) => (
              <div key={s.id} className="flex gap-3">
                {s.avatar ? (
                  <img
                    src={s.avatar}
                    alt={s.name}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                  {(s.title || s.company) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[s.title, s.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {s.bio && (
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{s.bio}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {hasAgenda && (
        <Surface>
          <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Calendar className="h-4 w-4" /> Schedule
          </h3>
          <ul className="space-y-2">
            {agenda.data!.map((it) => (
              <li
                key={it.id}
                className="flex gap-3 rounded-card border border-border bg-card/40 p-3"
              >
                <div className="w-20 shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(it.startsAt), 'p')}
                  </p>
                  {it.endsAt && (
                    <p className="text-[10px] text-muted-foreground">
                      → {format(new Date(it.endsAt), 'p')}
                    </p>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{it.title}</p>
                  {it.speaker && (
                    <p className="text-xs text-muted-foreground">{it.speaker.name}</p>
                  )}
                  {it.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{it.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      )}
    </div>
  );
};
