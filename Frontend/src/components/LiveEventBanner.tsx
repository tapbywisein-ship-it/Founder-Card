import { useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, QrCode, Scan, Sparkles, Users, Zap } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { useMyRegistrations } from '@/hooks/useEvents';
import { useEventSuggestions } from '@/hooks/useEvents';
import { useSetCheckedInEventId } from '@/lib/useActiveEvent';

interface LiveRegistration {
  id: string;
  eventId: string;
  status: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  event?: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    city: string | null;
  };
}

/**
 * Compact "live event mode" banner. Surfaces on the dashboard when a user has
 * a registration for an event whose start..end window contains now(). Two
 * states: not yet checked-in (CTA: check in) and checked-in (CTA: scan / QR /
 * see who's here).
 */
export const LiveEventBanner = () => {
  const { data: regsData } = useMyRegistrations(1, 50);
  const setCheckedInEventId = useSetCheckedInEventId();

  const live = useMemo<LiveRegistration | null>(() => {
    const regs = (regsData?.registrations ?? []) as unknown as LiveRegistration[];
    const now = Date.now();
    return (
      regs.find((r) => {
        if (!r.event) return false;
        const start = new Date(r.event.startDate).getTime();
        const end = new Date(r.event.endDate).getTime();
        return now >= start && now <= end && r.status !== 'CANCELLED';
      }) ?? null
    );
  }, [regsData]);

  // When we detect a live + checked-in event, write to the active-event slice
  // so QR scans inside attribute the connection to it.
  useEffect(() => {
    if (live?.checkedIn && live.event) {
      setCheckedInEventId(live.event.id);
    } else {
      setCheckedInEventId(null);
    }
  }, [live, setCheckedInEventId]);

  // Only fetch suggestions once we know there's a live event.
  const { data: suggestions } = useEventSuggestions(
    live?.event?.id ?? '',
    !!live?.event?.id && !!live?.checkedIn
  );

  if (!live || !live.event) return null;

  const title = live.event.title;
  const checkedIn = live.checkedIn;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Surface
        elevated
        padding="lg"
        className="relative overflow-hidden border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
      >
        <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          LIVE NOW
        </div>

        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Zap className="h-3 w-3" /> {checkedIn ? 'You’re here' : 'Happening now'}
        </div>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">{title}</h2>
        {live.event.city && (
          <p className="mt-0.5 text-sm text-muted-foreground">{live.event.city}</p>
        )}

        {!checkedIn && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`/event/${live.eventId}`}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Check in
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/event/${live.eventId}/attendees`}>
                <Users className="mr-1.5 h-4 w-4" /> Who's here
              </Link>
            </Button>
          </div>
        )}

        {checkedIn && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button asChild variant="outline" className="flex-col gap-1 py-3 h-auto">
                <Link to="/connect">
                  <QrCode className="h-5 w-5" />
                  <span className="text-xs">My QR</span>
                </Link>
              </Button>
              <Button asChild className="flex-col gap-1 py-3 h-auto">
                <Link to="/connect">
                  <Scan className="h-5 w-5" />
                  <span className="text-xs">Scan</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-col gap-1 py-3 h-auto">
                <Link to={`/event/${live.eventId}/attendees`}>
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Here now</span>
                </Link>
              </Button>
            </div>

            {suggestions && suggestions.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> Suggested for you here
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {suggestions.slice(0, 6).map((s) => {
                    const p = s.user.profile;
                    const name = p ? `${p.firstName} ${p.lastName}`.trim() : '';
                    return (
                      <Link
                        key={s.userId}
                        to={`/card/${s.userId}`}
                        className="group flex shrink-0 flex-col items-center gap-1 rounded-card border border-border bg-card p-2 transition-colors hover:border-primary/40"
                      >
                        {p?.avatar ? (
                          <img
                            src={p.avatar}
                            alt={name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="max-w-20 truncate text-[10px] font-medium text-foreground">
                          {name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </Surface>
    </motion.div>
  );
};
