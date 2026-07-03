import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertCircle, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAdmin';

interface AuditLog {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string } | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
  USER_BANNED:      'text-red-400 bg-red-400/10',
  USER_SUSPENDED:   'text-amber-400 bg-amber-400/10',
  USER_RESTORED:    'text-emerald-400 bg-emerald-400/10',
  ROLE_UPDATED:     'text-blue-400 bg-blue-400/10',
  CARD_REVIEWED:    'text-purple-400 bg-purple-400/10',
  SETTING_UPDATED:  'text-cyan-400 bg-cyan-400/10',
  EVENT_CANCELLED:  'text-orange-400 bg-orange-400/10',
  EVENT_DELETED:    'text-red-400 bg-red-400/10',
};

const actionColor = (action: string) =>
  ACTION_COLORS[action] ?? 'text-muted-foreground bg-muted/40';

const AdminAuditLogsPage = () => {
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAuditLogs({
    action: actionFilter || undefined,
    resource: resourceFilter || undefined,
    page,
    limit: 25,
  });

  const logs = (data?.logs as AuditLog[]) ?? [];
  const pagination = data?.pagination as Pagination | undefined;

  const handleFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Audit Logs</h1>
              {pagination && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {pagination.total.toLocaleString()} total entries
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={actionFilter}
              onChange={(e) => handleFilter(setActionFilter)(e.target.value)}
              placeholder="Filter by action…"
              className="pl-10"
            />
          </div>
          <div className="relative flex-1 min-w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={resourceFilter}
              onChange={(e) => handleFilter(setResourceFilter)(e.target.value)}
              placeholder="Filter by resource…"
              className="pl-10"
            />
          </div>
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load audit logs.
            </span>
            <button
              onClick={() => refetch()}
              className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        <Surface className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Time', 'Admin', 'Action', 'Resource', 'Resource ID', 'Details'].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs text-muted-foreground font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-8 bg-muted/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const adminName = log.user?.profile
                    ? `${log.user.profile.firstName} ${log.user.profile.lastName}`
                    : (log.user?.email ?? 'System');
                  const details = log.metadata
                    ? Object.entries(log.metadata)
                        .filter(([, v]) => v !== null && v !== undefined)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ')
                    : '-';
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-foreground">{adminName}</p>
                        {log.user?.email && (
                          <p className="text-[11px] text-muted-foreground">{log.user.email}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-xs font-medium px-2 py-0.5 rounded-md ${actionColor(log.action)}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-foreground">
                        {log.resource ?? '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {log.resourceId ? log.resourceId.slice(0, 8) + '…' : '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs truncate">
                        {details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Surface>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-foreground px-2">{page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (pagination.totalPages ?? 1) || isLoading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogsPage;
