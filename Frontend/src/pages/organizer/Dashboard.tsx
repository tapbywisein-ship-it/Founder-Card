import { useState } from 'react';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Zap, BarChart3, Plus, ChevronRight,
  AlertCircle, IndianRupee, CheckCircle2, TrendingUp,
  MapPin, Clock, Share2, ScanLine, Pencil, Copy,
} from 'lucide-react';
import { useOrgDashboard, useMyOrgEvents } from '@/hooks/useOrganizer';
import { formatINR } from '@/lib/currency';
import { toast } from 'sonner';

type Tab = 'upcoming' | 'past';

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    PUBLISHED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    DRAFT:     'bg-amber-500/10 text-amber-600 border-amber-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    COMPLETED: 'bg-muted text-muted-foreground border-border',
  };
  return map[status] ?? map.DRAFT;
};

const OrganizerDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('upcoming');
  const { data: stats, isLoading, isError } = useOrgDashboard();
  const { data: eventsData } = useMyOrgEvents(1, 50);

  const allEvents = eventsData?.events ?? stats?.recentEvents ?? [];
  const now = new Date();

  const upcoming = allEvents.filter(
    (e) => e.status !== 'CANCELLED' && e.status !== 'COMPLETED' && new Date(e.startDate) >= now
  );
  const past = allEvents.filter(
    (e) => e.status === 'COMPLETED' || e.status === 'CANCELLED' || new Date(e.startDate) < now
  );
  const events = tab === 'upcoming' ? upcoming : past;

  const trend = stats?.registrationTrend ?? [];

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay },
  });

  const handleShare = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    const link = `${window.location.origin}/e/${eventId}`;
    navigator.clipboard.writeText(link).then(
      () => toast.success('Event link copied'),
      () => toast.error('Could not copy link')
    );
  };

  return (
    <OrganizerLayout>
      <div className="space-y-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your event performance at a glance</p>
          </div>
          <Button asChild>
            <Link to="/organizer/events/create">
              <Plus className="w-4 h-4 mr-1.5" /> New Event
            </Link>
          </Button>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load dashboard data. Check your connection and refresh.
          </div>
        )}

        {/* Stats grid */}
        <motion.div {...fade(0)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            { label: 'Total Events',  value: stats?.totalEvents   ?? 0, icon: Calendar,     fmt: (v: number) => String(v) },
            { label: 'Upcoming',      value: stats?.upcomingEvents ?? 0, icon: Zap,          fmt: (v: number) => String(v) },
            { label: 'Attendees',     value: stats?.totalAttendees ?? 0, icon: Users,        fmt: (v: number) => String(v) },
            { label: 'Revenue',       value: stats?.totalRevenue   ?? 0, icon: IndianRupee,  fmt: (v: number) => formatINR(v) },
            { label: 'Check-in Rate', value: stats?.checkInRate    ?? 0, icon: CheckCircle2, fmt: (v: number) => `${v}%` },
            { label: 'Leads',         value: stats?.totalLeads     ?? 0, icon: BarChart3,    fmt: (v: number) => String(v) },
          ] as const).map(({ label, value, icon: Icon, fmt }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
              <p className={`text-2xl font-bold mb-0.5 transition-colors ${isLoading ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                {fmt(value)}
              </p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </motion.div>

        {/* Trend + Quick links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div {...fade(0.06)} className="lg:col-span-2">
            <Surface className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <span className="section-label">Registrations — Last 7 Days</span>
                </div>
                {trend.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {trend.reduce((s, d) => s + d.count, 0)} total
                  </span>
                )}
              </div>
              {isLoading ? (
                <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
              ) : trend.length === 0 || trend.every((d) => d.count === 0) ? (
                <div className="h-32 flex flex-col items-center justify-center text-center gap-2">
                  <TrendingUp className="w-8 h-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No registrations yet this week</p>
                </div>
              ) : (
                <div className="flex items-end gap-1.5 h-28">
                  {trend.map((d, i) => {
                    const max = Math.max(...trend.map((t) => t.count), 1);
                    const heightPct = (d.count / max) * 100;
                    const day = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {d.count > 0 ? d.count : ''}
                        </span>
                        <motion.div
                          className="w-full rounded-t-md bg-primary/80"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(heightPct, d.count > 0 ? 8 : 0)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                          style={{ minHeight: d.count > 0 ? 4 : 0 }}
                        />
                        <span className="text-[10px] text-muted-foreground">{day}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Surface>
          </motion.div>

          <motion.div {...fade(0.08)}>
            <Surface className="h-full">
              <span className="section-label block mb-4">Quick Actions</span>
              <div className="space-y-1.5">
                {([
                  { label: 'Create new event',  to: '/organizer/events/create', icon: Plus        },
                  { label: 'View attendees',     to: '/organizer/attendees',     icon: Users       },
                  { label: 'Manage leads',       to: '/organizer/leads',         icon: BarChart3   },
                  { label: 'Payouts & earnings', to: '/organizer/payouts',       icon: IndianRupee },
                ] as const).map(({ label, to, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm text-foreground flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Surface>
          </motion.div>
        </div>

        {/* Events list with tabs */}
        <motion.div {...fade(0.1)}>
          <Surface>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1">
                {(['upcoming', 'past'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      tab === t
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/organizer/events/create">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
                  </p>
                  {tab === 'upcoming' && (
                    <p className="text-xs text-muted-foreground mt-1">Create your first event and start building your audience</p>
                  )}
                </div>
                {tab === 'upcoming' && (
                  <Button asChild size="sm">
                    <Link to="/organizer/events/create">
                      <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Event
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {events.map((e) => {
                  const registered = e.registeredCount ?? 0;
                  const capacity   = (e as { capacity?: number }).capacity ?? 100;
                  const pct        = Math.min(Math.round((registered / capacity) * 100), 100);
                  const capColor   = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';

                  return (
                    <div key={e.id} className="py-3 group">
                      <div className="flex items-start gap-3">
                        {/* Cover thumbnail */}
                        {e.coverImage ? (
                          <img src={e.coverImage} alt={e.title} loading="lazy"
                            className="w-12 h-10 rounded-lg object-cover flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-12 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Calendar className="w-4 h-4 text-muted-foreground/40" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/organizer/events/${e.id}`}
                              className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                            >
                              {e.title}
                            </Link>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusPill(e.status)}`}>
                              {e.status.toLowerCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {e.startDate && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {(e as { city?: string }).city && (
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {(e as { city?: string }).city}
                              </span>
                            )}
                          </div>

                          {/* Capacity bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-32">
                              <div className={`h-full rounded-full ${capColor}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {registered}/{capacity} registered
                            </span>
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(ev) => handleShare(ev, e.id)}
                            title="Copy event link"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/organizer/events/${e.id}/checkin`)}
                            title="Check-in"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <ScanLine className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/organizer/events/${e.id}/manage`)}
                            title="Edit event"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/organizer/events/${e.id}`}
                            title="View event"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Surface>
        </motion.div>

      </div>
    </OrganizerLayout>
  );
};

export default OrganizerDashboard;
