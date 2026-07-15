import { createContext, useContext } from 'react';
import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Share2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Button } from '@/components/ui/button';
import { useEvent } from '@/hooks/useEvents';
import type { Event } from '@/services/events.service';

interface EventContextValue {
  event: Event | undefined;
  eventId: string | undefined;
  isLoading: boolean;
}

const EventContext = createContext<EventContextValue | null>(null);

/**
 * Hook for tab pages to access the parent event without re-fetching.
 * Throws if used outside `<OrganizerEventLayout>` so misuse is loud.
 */
export const useEventContext = (): EventContextValue => {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error('useEventContext must be used inside <OrganizerEventLayout>');
  }
  return ctx;
};

const TABS = [
  { label: 'Overview',     to: '',         end: true  },
  { label: 'Guests',       to: 'guests',   end: false },
  { label: 'Visitors',     to: 'visitors', end: false },
  { label: 'Blasts',       to: 'blasts',   end: false },
  { label: 'Coupons',      to: 'coupons',  end: false },
  { label: 'Insights',     to: 'analytics',end: false },
  { label: 'Matchmaking',  to: 'matchmaking', end: false },
  { label: 'Check-in',     to: 'checkin',  end: false },
  { label: 'More',         to: 'more',     end: false },
] as const;

/**
 * Tabbed shell for `/organizer/events/:id/*` — Luma's host dashboard pattern.
 *
 * Renders:
 *   • OrganizerLayout (slim sidebar)
 *   • Header row: back link + Share + Edit
 *   • Title block (event title + calendar label)
 *   • NavLink tab strip with bottom-border indicator
 *   • <Outlet /> for the active tab's content
 *
 * Provides EventContext so child tabs don't have to re-call useEvent(id).
 *
 * Phase 2 step 6 ships only the four legacy tab routes (Overview, Registration,
 * Insights, Check-in). Step 7e adds Guests, Blasts, More once those tab modules
 * exist.
 */
export const OrganizerEventLayout = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id || '');

  const handleShare = () => {
    if (!id) return;
    const link = `${window.location.origin}/e/${id}`;
    void navigator.clipboard
      .writeText(link)
      .then(() => toast.success('Event link copied'))
      .catch(() => toast.error('Could not copy link'));
  };

  return (
    <OrganizerLayout>
      <EventContext.Provider value={{ event, eventId: id, isLoading }}>
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/organizer/dashboard')}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> All events
            </button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4" /> Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/organizer/events/${id}/manage`)}
              >
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            </div>
          </div>

          {/* Title block */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Personal calendar</p>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">
              {isLoading ? (
                <span className="inline-block bg-muted rounded h-8 w-48 animate-pulse" />
              ) : (
                event?.title || 'Event'
              )}
            </h1>
          </div>

          {/* Tab strip */}
          <nav aria-label="Event tabs" className="border-b border-border">
            <div className="flex gap-1 -mb-px overflow-x-auto">
              {TABS.map((tab) => (
                <NavLink
                  key={tab.to || 'index'}
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Tab content */}
          <Outlet />
        </div>
      </EventContext.Provider>
    </OrganizerLayout>
  );
};
