import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import {
  Search,
  Shield,
  ShieldOff,
  Flag,
  Eye,
  Ban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  X,
} from 'lucide-react';
import { useAdminReports, useActionReport } from '@/hooks/useReports';
import type { Report, ReportStatus } from '@/services/reports.service';

// Permission roles are reference-only; not derived from server state.
const permissionRoles = [
  { role: 'Attendee', permissions: ['View profile', 'Scan QR', 'Join events', 'Connect with others', 'Add notes'], restricted: ['Create events', 'Export data', 'View analytics'] },
  { role: 'FounderCard User', permissions: ['All Attendee perms', 'NFC tap connect', 'Priority event access', 'Highlighted in lists', 'Advanced profile'], restricted: ['Create events', 'Admin panel'] },
  { role: 'Organizer', permissions: ['Create & manage events', 'Attendee directory', 'Lead capture', 'Analytics dashboard', 'Speaker management'], restricted: ['User management', 'Global settings'] },
  { role: 'Admin', permissions: ['Full platform access', 'User management', 'Global settings', 'Analytics', 'Moderation'], restricted: [] },
];

const statusConfig: Record<
  ReportStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  OPEN: { label: 'Open', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  REVIEWING: { label: 'Reviewing', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Eye },
  ACTIONED: { label: 'Actioned', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', color: 'bg-muted-foreground/10 text-muted-foreground border-border', icon: X },
};

const categorySeverity: Record<string, 'low' | 'medium' | 'high'> = {
  SPAM: 'low',
  INAPPROPRIATE: 'medium',
  HARASSMENT: 'high',
  IMPERSONATION: 'high',
  OTHER: 'medium',
};

const severityClasses: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const reporterName = (r: Report): string => {
  const p = r.reporter?.profile;
  return p ? `${p.firstName} ${p.lastName}`.trim() : r.reporter?.email ?? '';
};

const AdminPermissionsPage = () => {
  const [tab, setTab] = useState<'reports' | 'permissions'>('reports');
  const [search, setSearch] = useState('');
  const [statusFilter] = useState<ReportStatus | undefined>(undefined);
  const [viewReport, setViewReport] = useState<Report | null>(null);

  const { data, isLoading } = useAdminReports({ status: statusFilter });
  const action = useActionReport();
  const reports: Report[] = data?.reports ?? [];

  const filtered = useMemo(
    () =>
      reports.filter((r) => {
        const q = search.toLowerCase();
        return (
          !q ||
          reporterName(r).toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      }),
    [reports, search]
  );

  const counts = useMemo(() => {
    const c = { OPEN: 0, REVIEWING: 0, ACTIONED: 0, DISMISSED: 0 } as Record<ReportStatus, number>;
    reports.forEach((r) => {
      c[r.status]++;
    });
    return c;
  }, [reports]);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Permissions & Moderation</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage roles, permissions, and user reports</p>
          </div>
          <div className="flex gap-2 p-1 bg-card border border-border rounded-xl">
            {(['reports', 'permissions'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {(['OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'] as const).map((s) => (
                  <Surface key={s} className="text-center py-4">
                    <p className={`text-2xl font-bold ${statusConfig[s].color.split(' ').find((c) => c.startsWith('text-')) ?? ''}`}>
                      {counts[s]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{statusConfig[s].label}</p>
                  </Surface>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-3 py-2 pl-10 text-sm bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Search reports..."
                />
              </div>

              {isLoading && (
                <Surface className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Loading reports…</p>
                </Surface>
              )}

              {!isLoading && filtered.length === 0 && (
                <Surface className="text-center py-12">
                  <Flag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? 'No reports match your search.' : 'No reports — quiet day.'}
                  </p>
                </Surface>
              )}

              <div className="space-y-3">
                {filtered.map((r, i) => {
                  const sCfg = statusConfig[r.status];
                  const SIcon = sCfg.icon;
                  const sev = categorySeverity[r.category] ?? 'medium';
                  return (
                    <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                      <Surface hover>
                        <div className="flex items-start gap-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sev === 'high' ? 'bg-red-500/20' : sev === 'medium' ? 'bg-amber-500/20' : 'bg-blue-500/20'}`}>
                            <Flag className={`w-4 h-4 ${sev === 'high' ? 'text-red-400' : sev === 'medium' ? 'text-amber-400' : 'text-blue-400'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{r.category}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${severityClasses[sev]}`}>
                                {sev}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border inline-flex items-center gap-1 ${sCfg.color}`}>
                                <SIcon className="w-3 h-3" /> {sCfg.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Target: {r.targetType.toLowerCase()} {r.targetId.slice(0, 8)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Reported by <span className="text-foreground">{reporterName(r)}</span> · {format(new Date(r.createdAt), 'PP')}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{r.reason}</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setViewReport(r)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                            {r.status === 'OPEN' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-400"
                                onClick={() => action.mutate({ reportId: r.id, action: 'MARK_REVIEWING' })}
                                disabled={action.isPending}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </Button>
                            )}
                            {r.status !== 'ACTIONED' && r.status !== 'DISMISSED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-400"
                                onClick={() => action.mutate({ reportId: r.id, action: 'DISMISS' })}
                                disabled={action.isPending}
                              >
                                <CheckCircle2 className="w-3 h-3" />
                              </Button>
                            )}
                            {r.targetType === 'USER' && r.status !== 'ACTIONED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-400"
                                onClick={() => action.mutate({ reportId: r.id, action: 'ACTION_USER_BAN' })}
                                disabled={action.isPending}
                              >
                                <Ban className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </Surface>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {tab === 'permissions' && (
            <motion.div key="permissions" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
              <p className="text-sm text-muted-foreground">Reference matrix — what each role can do on the platform.</p>
              {permissionRoles.map((role, i) => (
                <motion.div key={role.role} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Surface>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                          <Shield className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{role.role}</h3>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-emerald-400 font-medium mb-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Allowed</p>
                        <div className="space-y-1">
                          {role.permissions.map((p) => (
                            <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                      {role.restricted.length > 0 && (
                        <div>
                          <p className="text-xs text-red-400 font-medium mb-2 flex items-center gap-1"><ShieldOff className="w-3 h-3" /> Restricted</p>
                          <div className="space-y-1">
                            {role.restricted.map((p) => (
                              <div key={p} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                {p}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Surface>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Report Detail Modal */}
      <AnimatePresence>
        {viewReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setViewReport(null)}
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full max-w-md">
              <Surface className="relative">
                <button onClick={() => setViewReport(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <h3 className="text-xl font-semibold text-foreground">{viewReport.category}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['Reported By', reporterName(viewReport)],
                    ['Target', `${viewReport.targetType} · ${viewReport.targetId.slice(0, 12)}…`],
                    ['Date', format(new Date(viewReport.createdAt), 'PPpp')],
                    ['Status', statusConfig[viewReport.status].label],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-foreground font-medium">{v}</span>
                    </div>
                  ))}
                  <div>
                    <p className="text-muted-foreground mb-1">Description</p>
                    <p className="text-foreground text-sm leading-relaxed">{viewReport.reason}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  {viewReport.targetType === 'USER' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => {
                        action.mutate({ reportId: viewReport.id, action: 'ACTION_USER_BAN' });
                        setViewReport(null);
                      }}
                    >
                      <Ban className="w-3 h-3 mr-1" /> Ban User
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => {
                      action.mutate({ reportId: viewReport.id, action: 'DISMISS' });
                      setViewReport(null);
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Dismiss
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
};

export default AdminPermissionsPage;
