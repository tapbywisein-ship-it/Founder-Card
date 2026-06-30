import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { useCardAnalytics } from '@/hooks/useFounderCard';
import { founderCardService } from '@/services/founderCard.service';
import { Eye, Users, Scan, Zap, AlertCircle, BarChart3, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const CardAnalyticsPage = () => {
  const { data, isLoading, isError } = useCardAnalytics();
  const leads = useQuery({
    queryKey: ['card-leads'],
    queryFn: () => founderCardService.listLeads(),
    select: (res) => res.data,
  });

  const stats = [
    { label: 'Total views', value: data?.totalViews ?? 0, icon: Eye },
    { label: 'Unique viewers', value: data?.uniqueViewers ?? 0, icon: Users },
    { label: 'Scans / taps', value: data?.taps ?? 0, icon: Scan },
    { label: 'Connections', value: data?.connections ?? 0, icon: Zap },
  ];

  const peak = Math.max(1, ...(data?.timeseries ?? []).map((d) => d.views));

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8 max-w-content mx-auto">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Card Analytics</h1>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load analytics. Try refreshing the page.
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
              <p className={`text-2xl font-bold tabular-nums transition-colors ${isLoading ? 'text-muted-foreground/30' : 'text-foreground'}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </div>

        {/* 14-day views sparkline */}
        <Surface>
          <h2 className="text-sm font-semibold text-foreground mb-4">Views — last 14 days</h2>
          {isLoading ? (
            <div className="h-28 bg-muted/40 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-end justify-between gap-1 h-28">
              {(data?.timeseries ?? []).map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <motion.div
                    className="w-full rounded-t bg-primary/70"
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.views / peak) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    title={`${d.views} view${d.views === 1 ? '' : 's'} on ${d.date}`}
                    style={{ minHeight: d.views > 0 ? 4 : 0 }}
                  />
                  <span className="text-[8px] text-muted-foreground">{d.date.slice(8)}</span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        {/* Recent viewers */}
        <Surface>
          <h2 className="text-sm font-semibold text-foreground mb-3">Recent viewers</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (data?.recentViewers.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No views yet. Share your card link to start tracking.
            </p>
          ) : (
            <div className="space-y-1">
              {data!.recentViewers.map((v) => {
                const name = v.anonymous ? 'Anonymous visitor' : v.name ?? 'Member';
                const row = (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0 overflow-hidden">
                      {v.avatar ? (
                        <img src={v.avatar} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : v.anonymous ? (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        name[0]?.toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      {!v.anonymous && (v.position || v.company) && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[v.position, v.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">
                      {formatDistanceToNow(new Date(v.at), { addSuffix: true })}
                    </span>
                  </div>
                );
                return v.userId ? (
                  <Link key={v.id} to={`/card/${v.userId}`}>{row}</Link>
                ) : (
                  <div key={v.id}>{row}</div>
                );
              })}
            </div>
          )}
        </Surface>

        {/* Captured leads */}
        <Surface>
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Leads from your card</h2>
          </div>
          {(leads.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No leads yet. Visitors who leave their details on your card show up here.
            </p>
          ) : (
            <div className="space-y-1">
              {leads.data!.map((l) => (
                <div
                  key={l.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{l.name}</p>
                    <a href={`mailto:${l.email}`} className="text-xs text-primary hover:underline">
                      {l.email}
                    </a>
                    {l.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{l.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">
                    {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>
      </div>
    </PortalLayout>
  );
};

export default CardAnalyticsPage;
