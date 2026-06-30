import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Calendar, Users, Pause, Trash2, Filter, CheckCircle2, Clock, Circle, AlertCircle, ExternalLink } from 'lucide-react';
import { useAdminEvents } from '@/hooks/useAdmin';
import { adminService } from '@/services/admin.service';

interface AdminEvent {
  id: string;
  title: string;
  status: string;
  category?: string;
  startDate: string;
  location?: string;
  capacity?: number;
  organizer?: { email: string; profile?: { firstName: string; lastName: string } | null };
  _count?: { registrations?: number };
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PUBLISHED: { label: 'Live', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: Circle },
  DRAFT: { label: 'Draft', color: 'bg-muted/30 text-muted-foreground border-border', icon: Clock },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Pause },
  COMPLETED: { label: 'Completed', color: 'bg-muted/30 text-muted-foreground border-border', icon: CheckCircle2 },
};

const AdminEventsPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = (ids: string[]) => setSelected(new Set(ids));
  const clearSelect = () => setSelected(new Set());

  const { data, isLoading, isError } = useAdminEvents({ search: search || undefined, status: statusFilter || undefined });
  const events = (data?.data as AdminEvent[]) ?? [];
  const qc = useQueryClient();
  const suspend = useMutation({
    mutationFn: (id: string) => adminService.suspendEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Event suspended');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not suspend'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success('Event deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not delete'),
  });

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Platform Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{events.length} events across all organizers</p>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load events. Try refreshing the page.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: events.length, color: 'text-foreground' },
            { label: 'Published', value: events.filter((e) => e.status === 'PUBLISHED').length, color: 'text-emerald-400' },
            { label: 'Draft', value: events.filter((e) => e.status === 'DRAFT').length, color: 'text-blue-400' },
            { label: 'Total Attendees', value: events.reduce((s, e) => s + (e._count?.registrations ?? 0), 0).toLocaleString(), color: 'text-primary' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Surface className="text-center py-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{s.label}</p>
              </Surface>
            </motion.div>
          ))}
        </div>

        {selected.size > 0 && (
          <Surface className="flex items-center gap-3 bg-primary/5 border-primary/20">
            <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
            <Button
              size="sm"
              variant="outline"
              className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
              onClick={async () => {
                if (!window.confirm(`Suspend ${selected.size} events?`)) return;
                await Promise.all([...selected].map((id) => suspend.mutateAsync(id)));
                clearSelect();
              }}
              disabled={suspend.isPending}
            >
              <Pause className="w-3 h-3 mr-1" /> Suspend all
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-400 border-red-400/30 hover:bg-red-500/10"
              onClick={async () => {
                if (!window.confirm(`Delete ${selected.size} events? This cannot be undone.`)) return;
                await Promise.all([...selected].map((id) => remove.mutateAsync(id)));
                clearSelect();
              }}
              disabled={remove.isPending}
            >
              <Trash2 className="w-3 h-3 mr-1" /> Delete all
            </Button>
            <button onClick={clearSelect} className="text-xs text-muted-foreground hover:text-foreground ml-auto">Clear</button>
          </Surface>
        )}

        <Surface className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 text-sm" placeholder="Search events or organizers..." />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
              {(['', 'PUBLISHED', 'DRAFT', 'COMPLETED', 'CANCELLED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.size === events.length && events.length > 0}
                      onChange={(e) => e.target.checked ? selectAll(events.map((ev) => ev.id)) : clearSelect()}
                    />
                  </th>
                  {['Event', 'Organizer', 'Date', 'Attendees', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-10 bg-muted/50 rounded animate-pulse" /></td></tr>
                  ))
                ) : events.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No events found.</td></tr>
                ) : (
                  <AnimatePresence>
                    {events.map((e, i) => {
                      const cfg = statusConfig[e.status] ?? statusConfig.DRAFT;
                      const orgName = e.organizer?.profile
                        ? `${e.organizer.profile.firstName} ${e.organizer.profile.lastName}`
                        : e.organizer?.email ?? '—';
                      const isSelected = selected.has(e.id);
                      return (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className={`border-b border-border/50 hover:bg-muted/20 transition-colors group ${isSelected ? 'bg-primary/5' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={isSelected}
                              onChange={() => toggleSelect(e.id)}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground whitespace-nowrap flex items-center gap-1">
                                  {e.title}
                                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                                </p>
                                {e.category && <span className="text-[10px] text-muted-foreground">{e.category}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{orgName}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-foreground">
                              <Users className="w-3 h-3 text-muted-foreground" />
                              {e._count?.registrations ?? 0}{e.capacity ? ` / ${e.capacity}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border inline-flex items-center gap-1 ${cfg.color}`}>
                              {e.status === 'PUBLISHED' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-amber-400 hover:text-amber-300"
                                title="Suspend"
                                disabled={suspend.isPending || e.status === 'CANCELLED'}
                                onClick={() => suspend.mutate(e.id)}
                              >
                                <Pause className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                                title="Delete"
                                disabled={remove.isPending}
                                onClick={() => {
                                  if (window.confirm(`Delete "${e.title}"? This cannot be undone.`)) {
                                    remove.mutate(e.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </Surface>
      </div>
    </AdminLayout>
  );
};

export default AdminEventsPage;
