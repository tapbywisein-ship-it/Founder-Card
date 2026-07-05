import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, CheckCircle2, Link2, Zap, Sparkles, TrendingUp, AlertCircle, Calendar, MapPin } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { eventsService } from '@/services/events.service';

/**
 * Public, shareable networking-impact report for an event — the sponsor-facing
 * "here's the ROI our event created" page. Aggregate metrics only (no PII), so
 * it renders on an unauthenticated route (/e/:id/impact).
 */
const ImpactReportPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['impact-report', id],
    queryFn: () => eventsService.getEventImpactReport(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl px-6 space-y-4 animate-pulse">
          <div className="h-40 rounded-2xl bg-muted/50" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/50" />)}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Report unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This event's impact report isn't available yet, or the link is invalid.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            Go to TapByWisein →
          </Link>
        </div>
      </div>
    );
  }

  const { event, metrics, generatedAt } = data.data;
  const organizerName = [event.organizer.profile?.firstName, event.organizer.profile?.lastName]
    .filter(Boolean)
    .join(' ');
  const company = event.organizer.profile?.company;
  const dateStr = new Date(event.startDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  const funnel = [
    { label: 'Checked in', pct: metrics.checkInRate, count: metrics.checkedIn, color: 'bg-emerald-500' },
    { label: 'Made a connection', pct: metrics.networkedRate, count: metrics.madeOneConnection, color: 'bg-primary' },
    { label: 'Super-connectors (3+)', pct: metrics.superConnectorRate, count: metrics.madeThreeConnections, color: 'bg-amber-500' },
  ];

  const stats = [
    { label: 'Registered', value: metrics.registered, icon: Users },
    { label: 'Checked in', value: metrics.checkedIn, icon: CheckCircle2 },
    { label: 'Connections made', value: metrics.connections, icon: Link2 },
    { label: 'Avg / attendee', value: metrics.avgConnectionsPerAttendee, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12 space-y-6">
        {/* Brand + share */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground font-semibold">
            <Sparkles className="w-4 h-4 text-primary" /> TapByWisein
          </Link>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Impact Report</span>
        </div>

        {/* Event header */}
        <Surface elevated className="space-y-3">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Networking impact</p>
            <h1 className="text-2xl font-bold text-foreground leading-tight mt-1">{event.title}</h1>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {organizerName && <span>by {organizerName}{company ? ` · ${company}` : ''}</span>}
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {dateStr}</span>
            {event.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {event.city}</span>}
          </div>
        </Surface>

        {/* Hero metric */}
        <Surface className="text-center py-8" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.12), transparent)' }}>
          <p className="text-sm text-muted-foreground">Real connections created at this event</p>
          <p className="font-mono text-6xl md:text-7xl font-bold text-foreground tabular-nums leading-none mt-2">
            {metrics.connections}
          </p>
          {metrics.registered > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              across {metrics.registered} registered attendee{metrics.registered === 1 ? '' : 's'}
            </p>
          )}
        </Surface>

        {/* Stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <Surface key={label} className="text-center">
              <Icon className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </Surface>
          ))}
        </div>

        {/* Networking funnel */}
        <Surface>
          <h2 className="text-sm font-semibold text-foreground mb-4">Who actually networked</h2>
          <div className="space-y-4">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-foreground">{step.label}</span>
                  <span className="text-muted-foreground tabular-nums">{step.count} · {step.pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className={`h-full rounded-full ${step.color}`} style={{ width: `${Math.min(100, step.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {metrics.scanToConnectionRate !== null && (
            <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{metrics.scanToConnectionRate}%</span> of card taps turned into a saved connection
              </span>
            </div>
          )}
        </Surface>

        {/* CTA / footer */}
        <Surface className="text-center space-y-3">
          <p className="text-sm text-foreground font-medium">Want results like this at your event?</p>
          <Button asChild size="sm">
            <Link to="/organizer/events/create">Host with TapByWisein →</Link>
          </Button>
        </Surface>

        <p className="text-center text-[11px] text-muted-foreground/70">
          Generated {new Date(generatedAt).toLocaleDateString()} · Powered by TapByWisein
        </p>
      </div>
    </div>
  );
};

export default ImpactReportPage;
