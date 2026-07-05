import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { useEventAnalytics, useNetworkingAnalytics } from '@/hooks/useOrganizer';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BarChart3,
  Zap,
  Trophy,
  AlertCircle,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

const AnalyticsPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: analytics, isLoading, isError } = useEventAnalytics(id!);
  const { data: networking } = useNetworkingAnalytics(id!);

  if (isLoading) {
    return (
      <>
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-1/3 bg-muted/50 rounded" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-xl" />)}
          </div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load analytics. Try refreshing the page.
        </div>
      </>
    );
  }

  if (!analytics) {
    return (
      <>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Analytics not available.</p>
        </div>
      </>
    );
  }

  const { event, registrations, leads, quality, funnel } = analytics;
  const leadStatusEntries = Object.entries(leads);
  const totalSeniority = (quality?.seniorityMix ?? []).reduce((s, x) => s + x.value, 0);
  const repeatTotal = (quality?.repeatAttendees ?? 0) + (quality?.firstTimeAttendees ?? 0);

  const reportUrl = `${window.location.origin}/e/${id}/impact`;

  return (
    <div className="space-y-6">
        {/* Shareable impact report — sponsor-facing networking-ROI summary */}
        <Surface className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Share2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Share your networking impact</p>
              <p className="text-xs text-muted-foreground">
                A public, aggregate report of connections made — great for sponsors & recaps.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(reportUrl);
                toast.success('Report link copied');
              }}
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" /> Copy link
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/e/${id}/impact`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View
              </Link>
            </Button>
          </div>
        </Surface>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Registrations', value: registrations.total, icon: Users, color: '' },
            { label: 'Attended', value: registrations.attended, icon: CheckCircle2, color: 'text-emerald-400' },
            { label: 'Cancelled', value: registrations.cancelled, icon: XCircle, color: 'text-rose-400' },
            { label: 'Waitlisted', value: registrations.waitlisted, icon: Clock, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className={`w-4 h-4 mx-auto mb-2 ${color || 'text-muted-foreground'}`} />
              <p className={`text-2xl font-bold mb-0.5 ${color || 'text-foreground'}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </div>

        {/* Conversion & capacity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Surface>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Conversion Rate</h2>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-foreground">{registrations.conversionRate}%</span>
              <span className="text-sm text-muted-foreground mb-1">attended</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${registrations.conversionRate}%` }}
                transition={{ duration: 1, delay: 0.2 }}
              />
            </div>
          </Surface>

          <Surface>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Capacity Utilization</h2>
            </div>
            <div className="flex items-end gap-3 mb-3">
              <span className="text-4xl font-bold text-foreground">{registrations.capacityUtilization}%</span>
              <span className="text-sm text-muted-foreground mb-1">of {event.capacity}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50">
              <motion.div
                className="h-full rounded-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(registrations.capacityUtilization, 100)}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </Surface>
        </div>

        {/* Attendee quality + funnel */}
        {quality && funnel && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Engagement funnel */}
            <Surface>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">Engagement funnel</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Registered', value: funnel.registered, color: 'bg-primary' },
                  { label: 'Checked in', value: funnel.checkedIn, color: 'bg-emerald-500' },
                  { label: 'Made a connection', value: funnel.connected, color: 'bg-amber-500' },
                ].map((step) => {
                  const pct = funnel.registered > 0 ? Math.round((step.value / funnel.registered) * 100) : 0;
                  return (
                    <div key={step.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground">{step.label}</span>
                        <span className="text-muted-foreground">{step.value} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                        <motion.div className={`h-full ${step.color}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Surface>

            {/* Seniority mix + repeat */}
            <Surface>
              <div className="mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">Who showed up</h2>
              </div>

              {totalSeniority > 0 ? (
                <div className="space-y-2 mb-4">
                  {quality.seniorityMix.map((s) => {
                    const pct = Math.round((s.value / totalSeniority) * 100);
                    return (
                      <div key={s.name} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-muted-foreground shrink-0">{s.name}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted/40 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-12 text-right text-foreground">{s.value} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-4">No role data yet.</p>
              )}

              {repeatTotal > 0 && (
                <div className="flex gap-2 pt-3 border-t border-border">
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold text-foreground">{quality.repeatAttendees}</p>
                    <p className="text-[11px] text-muted-foreground">Returning</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold text-foreground">{quality.firstTimeAttendees}</p>
                    <p className="text-[11px] text-muted-foreground">First-time</p>
                  </div>
                </div>
              )}
            </Surface>
          </div>
        )}

        {/* Top companies */}
        {quality?.topCompanies && quality.topCompanies.length > 0 && (
          <Surface>
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">Top companies represented</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {quality.topCompanies.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-foreground">
                  {c.name}
                  <span className="text-[10px] text-muted-foreground">{c.count}</span>
                </span>
              ))}
            </div>
          </Surface>
        )}

        {/* Networking — Phase 3 */}
        {networking && (
          <Surface>
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-medium text-foreground">Networking</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <NetStat label="Connections" value={networking.connections} />
              <NetStat label="Scans / taps" value={networking.taps} />
              <NetStat
                label="Scan → connect"
                value={
                  networking.scanToConnectionRate === null
                    ? '-'
                    : `${Math.round(networking.scanToConnectionRate * 100)}%`
                }
              />
              <NetStat
                label="Made ≥3 connections"
                value={networking.funnel.madeThreeConnections}
              />
            </div>

            {/* Funnel */}
            <div className="mt-5 space-y-2">
              <FunnelRow
                label="Registered"
                value={networking.funnel.registered}
                base={networking.funnel.registered}
              />
              <FunnelRow
                label="Checked in"
                value={networking.funnel.checkedIn}
                base={networking.funnel.registered}
              />
              <FunnelRow
                label="Made ≥1 connection"
                value={networking.funnel.madeOneConnection}
                base={networking.funnel.registered}
              />
              <FunnelRow
                label="Made ≥3 connections"
                value={networking.funnel.madeThreeConnections}
                base={networking.funnel.registered}
              />
            </div>

            {networking.topConnectors.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Trophy className="mr-1 inline h-3 w-3" /> Top connectors
                </p>
                <div className="space-y-1.5">
                  {networking.topConnectors.map((u, i) => {
                    const name =
                      [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Member';
                    return (
                      <div
                        key={u.userId}
                        className="flex items-center gap-3 rounded-card border border-border bg-card px-3 py-1.5"
                      >
                        <span className="w-5 text-center text-xs font-mono text-muted-foreground">
                          {i + 1}
                        </span>
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={name}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                            {name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{name}</p>
                          {u.position && (
                            <p className="truncate text-xs text-muted-foreground">{u.position}</p>
                          )}
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {u.connections}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Surface>
        )}

        {/* Leads breakdown */}
        {leadStatusEntries.length > 0 && (
          <Surface>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-foreground">Leads Breakdown</h2>
            </div>
            <div className="space-y-3">
              {leadStatusEntries.map(([status, count]) => {
                const total = leadStatusEntries.reduce((sum, [, c]) => sum + (c as number), 0);
                const pct = total > 0 ? Math.round(((count as number) / total) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24">{status}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted/50">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-8 text-right">{count as number}</span>
                  </div>
                );
              })}
            </div>
          </Surface>
        )}
    </div>
  );
};

const NetStat = ({ label, value }: { label: string; value: number | string }) => (
  <Surface padding="sm" className="text-center">
    <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </Surface>
);

const FunnelRow = ({
  label,
  value,
  base,
}: {
  label: string;
  value: number;
  base: number;
}) => {
  const pct = base > 0 ? Math.round((value / base) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-muted/50">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  );
};

export default AnalyticsPage;
