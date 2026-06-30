import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Users, Zap, BarChart3, Plus, ChevronRight,
  AlertCircle, IndianRupee, CheckCircle2, TrendingUp,
  MapPin, Clock,
} from 'lucide-react';
import { useOrgDashboard, useMyOrgEvents } from '@/hooks/useOrganizer';
import { formatINR } from '@/lib/currency';

/* ── status pill ─────────────────────────────────────────────────────── */
const statusPill = (status: string) => {
  const map: Record<string, string> = {
    PUBLISHED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    DRAFT:     'bg-amber-500/10 text-amber-600 border-amber-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    COMPLETED: 'bg-muted text-muted-foreground border-border',
  };
  return map[status] ?? map.DRAFT;
};

/* ── dashboard ───────────────────────────────────────────────────────── */
const OrganizerDashboard = () => {
  const { data: stats, isLoading, isError } = useOrgDashboard();
  const { data: eventsData } = useMyOrgEvents(1, 5);

  const events = eventsData?.events ?? stats?.recentEvents ?? [];
  const trend  = stats?.registrationTrend ?? [];

  const fade = (delay = 0) => ({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay },
  });

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
            { label: 'Total Events',   value: stats?.totalEvents   ?? 0, icon: Calendar,     fmt: (v: number) => String(v) },
            { label: 'Upcoming',       value: stats?.upcomingEvents ?? 0, icon: Zap,          fmt: (v: number) => String(v) },
            { label: 'Attendees',      value: stats?.totalAttendees ?? 0, icon: Users,        fmt: (v: number) => String(v) },
            { label: 'Revenue',        value: stats?.totalRevenue   ?? 0, icon: IndianRupee,  fmt: (v: number) => formatINR(v) },
            { label: 'Check-in Rate',  value: stats?.checkInRate    ?? 0, icon: CheckCircle2, fmt: (v: number) => `${v}%` },
            { label: 'Leads',          value: stats?.totalLeads     ?? 0, icon: BarChart3,    fmt: (v: number) => String(v) },
          ] as const).map(({ label, value, icon: Icon, fmt }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
              {isLoading ? (
                <div className="h-7 bg-muted/50 rounded animate-pulse mb-1 mx-auto w-12" />
              ) : (
                <p className="text-2xl font-bold text-foreground mb-0.5">{fmt(value)}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Registration trend */}
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

          {/* Quick links */}
          <motion.div {...fade(0.08)}>
            <Surface className="h-full">
              <span className="section-label block mb-4">Quick Actions</span>
              <div className="space-y-1.5">
                {([
                  { label: 'Create new event',   to: '/organizer/events/create', icon: Plus        },
                  { label: 'View attendees',      to: '/organizer/attendees',     icon: Users       },
                  { label: 'Manage leads',        to: '/organizer/leads',         icon: BarChart3   },
                  { label: 'Payouts & earnings',  to: '/organizer/payouts',       icon: IndianRupee },
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

        {/* Events list */}
        <motion.div {...fade(0.1)}>
          <Surface>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Your Events</h2>
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
                  <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">No events yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create your first event and start building your audience</p>
                </div>
                <Button asChild size="sm">
                  <Link to="/organizer/events/create">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Event
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((e) => (
                  <Link
                    key={e.id}
                    to={`/organizer/events/${e.id}`}
                    className="flex items-center gap-4 py-3 hover:bg-muted/30 -mx-1 px-1 rounded-xl transition-colors group"
                  >
                    {e.coverImage ? (
                      <img src={e.coverImage} alt={e.title} loading="lazy" className="w-12 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{e.title}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {e.startDate && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {e.city && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {e.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-foreground">{e.registeredCount ?? 0}</p>
                        <p className="text-[10px] text-muted-foreground">registered</p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusPill(e.status)}`}>
                        {e.status.toLowerCase()}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Surface>
        </motion.div>

      </div>
    </OrganizerLayout>
  );
};

export default OrganizerDashboard;
