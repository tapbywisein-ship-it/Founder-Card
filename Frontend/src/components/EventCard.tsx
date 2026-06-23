import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import { getTheme } from '@/lib/eventThemes';
import type { Event } from '@/services/events.service';

interface EventCardProps {
  event: Event;
  /** Show a "Registered" badge if the user is already registered */
  registered?: boolean;
  /** Show a "Waitlisted" badge */
  waitlisted?: boolean;
  /** Optional stagger index — kept for API compatibility, no longer used. */
  index?: number;
  /**
   * Layout variant.
   *  - `grid` (default): vertical card with 16:9 cover image on top — for grid layouts.
   *  - `row`: horizontal Luma calendar-page row with 80×80 thumb on the left.
   */
  variant?: 'grid' | 'row';
}

const StatusBadges = ({
  registered,
  waitlisted,
  requiresApproval,
}: {
  registered?: boolean;
  waitlisted?: boolean;
  requiresApproval?: boolean;
}) => {
  if (!registered && !waitlisted && !requiresApproval) return null;
  return (
    <div className="flex gap-1.5 flex-wrap">
      {registered && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success border border-success/30">
          Registered
        </span>
      )}
      {waitlisted && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
          Waitlisted
        </span>
      )}
      {requiresApproval && !registered && !waitlisted && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30">
          Approval
        </span>
      )}
    </div>
  );
};

/**
 * Luma-style event card. Two layouts:
 *  - `grid`: 16:9 cover + stacked metadata. Default — used in catalog grids.
 *  - `row`: 80×80 thumb on the left + metadata to the right. Used on calendar
 *    list pages where events scroll vertically as rows.
 */
export const EventCard = ({
  event,
  registered,
  waitlisted,
  variant = 'grid',
}: EventCardProps) => {
  const theme = getTheme(event.theme);

  const startDate = event.startDate ? new Date(event.startDate) : null;
  const dateStr = startDate
    ? startDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : 'Date TBD';
  const timeStr = startDate
    ? startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const registeredCount = event.registeredCount ?? 0;
  const spotsLeft =
    event.capacity != null ? event.capacity - registeredCount : null;
  const locationStr =
    [event.address, event.city, event.country].filter(Boolean).join(', ') ||
    (event.locationType === 'VIRTUAL' ? 'Online' : null);

  const Cover = ({ size }: { size: 'thumb' | 'cover' }) =>
    event.coverImage ? (
      <img
        src={event.coverImage}
        alt={event.title}
        className={
          size === 'thumb'
            ? 'w-20 h-20 object-cover rounded-md flex-shrink-0'
            : 'w-full aspect-[16/10] object-cover'
        }
      />
    ) : (
      <div
        className={
          size === 'thumb'
            ? 'w-20 h-20 rounded-md flex-shrink-0'
            : 'w-full aspect-[16/10]'
        }
        style={{ background: theme.bannerGradient }}
        aria-hidden
      />
    );

  // ── Row variant — Luma calendar page style ────────────────────────────
  if (variant === 'row') {
    return (
      <Link
        to={`/event/${event.id}`}
        className="group flex items-start gap-4 p-3 -mx-3 rounded-card hover:bg-muted transition-colors"
      >
        <Cover size="thumb" />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>
              {dateStr}
              {timeStr ? ` · ${timeStr}` : ''}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.organizer && (
            <p className="text-xs text-muted-foreground truncate">
              {event.organizer.profile
                ? `By ${event.organizer.profile.firstName} ${event.organizer.profile.lastName}`
                : `By ${event.organizer.email}`}
            </p>
          )}
          {locationStr && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{locationStr}</span>
            </div>
          )}
          <div className="flex items-center gap-3 pt-0.5">
            <StatusBadges
              registered={registered}
              waitlisted={waitlisted}
              requiresApproval={event.requiresApproval}
            />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
              <Users className="w-3 h-3" />
              <span>{registeredCount} going</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── Grid variant (default) — Luma discover-page card ─────────────────
  return (
    <Link to={`/event/${event.id}`} className="block group">
      <div className="bg-card border border-border rounded-card shadow-card-xs overflow-hidden hover:shadow-card transition-shadow">
        <div className="relative">
          <Cover size="cover" />
          {event.category && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background/85 text-foreground backdrop-blur-sm border border-border">
              {event.category}
            </span>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>
              {dateStr}
              {timeStr ? ` · ${timeStr}` : ''}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          {event.organizer && (
            <p className="text-xs text-muted-foreground truncate">
              {event.organizer.profile
                ? `By ${event.organizer.profile.firstName} ${event.organizer.profile.lastName}`
                : `By ${event.organizer.email}`}
            </p>
          )}
          {locationStr && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{locationStr}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{registeredCount} going</span>
            </div>
            {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 20 && (
              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
              </span>
            )}
            {spotsLeft === 0 && (
              <span className="text-[10px] font-medium text-destructive">
                Sold out
              </span>
            )}
          </div>
          <StatusBadges
            registered={registered}
            waitlisted={waitlisted}
            requiresApproval={event.requiresApproval}
          />
        </div>
      </div>
    </Link>
  );
};
