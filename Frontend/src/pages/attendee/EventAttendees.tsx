import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Sparkles, Users } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/RoleBadge';
import {
  useEventAttendees,
  useEventSuggestions,
  useEvent,
} from '@/hooks/useEvents';
import type {
  EventAttendee,
  EventSuggestion,
} from '@/services/events.service';

const cardLink = (a: EventAttendee | EventSuggestion) =>
  ('userId' in a ? a.userId : '') && `/card/${a.userId}`;

const AttendeeRow = ({ a }: { a: EventAttendee }) => {
  const navigate = useNavigate();
  const p = a.user.profile;
  const name = p ? `${p.firstName} ${p.lastName}`.trim() : a.user.email ?? '—';
  const initial = name.charAt(0).toUpperCase();
  return (
    <button
      onClick={() => navigate(`/card/${a.userId}`)}
      className="flex w-full items-center gap-3 rounded-card border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
    >
      {p?.avatar ? (
        <img
          src={p.avatar}
          alt={name}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {a.user.founderCard?.status === 'ACTIVE' && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <RoleBadge role={a.eventRole} />
        </div>
        {(p?.position || p?.company) && (
          <p className="truncate text-xs text-muted-foreground">
            {[p?.position, p?.company].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {a.checkedIn && (
        <span className="chip-primary text-[10px]">Checked in</span>
      )}
    </button>
  );
};

const SuggestionRow = ({ s }: { s: EventSuggestion }) => {
  const navigate = useNavigate();
  const p = s.user.profile;
  const name = p ? `${p.firstName} ${p.lastName}`.trim() : '—';
  const initial = name.charAt(0).toUpperCase();
  return (
    <button
      onClick={() => navigate(`/card/${s.userId}`)}
      className="flex w-full items-center gap-3 rounded-card border border-primary/30 bg-card p-3 text-left transition-colors hover:bg-primary/5"
    >
      {p?.avatar ? (
        <img
          src={p.avatar}
          alt={name}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <RoleBadge role={s.eventRole} />
        </div>
        {(p?.position || p?.company) && (
          <p className="truncate text-xs text-muted-foreground">
            {[p?.position, p?.company].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <span className="chip-primary inline-flex items-center gap-1 text-[10px]">
        <Sparkles className="h-3 w-3" />
        Match
      </span>
    </button>
  );
};

const EventAttendeesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = id ?? '';

  const { data: event } = useEvent(eventId);
  const { data: attendeesData, isLoading } = useEventAttendees(eventId);
  const { data: suggestions } = useEventSuggestions(eventId);

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/event/${eventId}`)}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {event?.title ?? 'Back'}
          </Button>
        </div>

        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">
            <Users className="mr-2 inline h-6 w-6" />
            Who's here
          </h1>
          <p className="text-sm text-muted-foreground">
            People going to {event?.title ?? 'this event'} — tap a card to connect.
          </p>
        </header>

        {suggestions && suggestions.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Suggested for you
            </h2>
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <SuggestionRow key={s.userId} s={s} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            All attendees ({attendeesData?.pagination &&
              (attendeesData.pagination as { total?: number })?.total}
            )
          </h2>
          {isLoading && (
            <Surface className="text-center">
              <p className="text-sm text-muted-foreground">Loading attendees…</p>
            </Surface>
          )}
          {attendeesData?.attendees.length === 0 && (
            <Surface className="text-center">
              <p className="text-sm text-muted-foreground">No attendees yet — be the first.</p>
            </Surface>
          )}
          <div className="grid gap-2">
            {attendeesData?.attendees.map((a) => (
              <AttendeeRow key={a.registrationId} a={a} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default EventAttendeesPage;
