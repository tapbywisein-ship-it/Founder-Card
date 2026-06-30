import { useState } from 'react';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, Users } from 'lucide-react';
import { useLeads, useUpdateLeadStatus } from '@/hooks/useLeads';
import type { Lead } from '@/services/leads.service';
import { leadsService } from '@/services/leads.service';
import { toast } from 'sonner';

function downloadCsv(leads: Lead[]) {
  const header = ['Name', 'Email', 'Company', 'Position', 'LinkedIn', 'Event', 'Status', 'Date'];
  const rows = leads.map((l) => {
    const p = l.attendee?.profile;
    return [
      p ? `${p.firstName} ${p.lastName}` : '',
      l.attendee?.email ?? '',
      p?.company ?? '',
      p?.position ?? '',
      p?.linkedin ?? '',
      l.event?.title ?? '',
      l.status,
      new Date(l.createdAt).toLocaleDateString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CONTACTED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  QUALIFIED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  CONVERTED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  ARCHIVED: 'bg-muted text-muted-foreground border-border',
};

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'ARCHIVED'];

const LeadsPage = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data } = useLeads({ search: search || undefined, status: statusFilter || undefined });
  const updateMutation = useUpdateLeadStatus();

  const leads = (data?.data as Lead[]) ?? [];

  return (
    <OrganizerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Leads</h1>
          <Button
            variant="ghost"
            size="sm"
            disabled={exporting}
            onClick={async () => {
              setExporting(true);
              try {
                const res = await leadsService.exportLeads();
                downloadCsv(res.data as Lead[]);
                toast.success('CSV downloaded');
              } catch {
                toast.error('Export failed');
              } finally {
                setExporting(false);
              }
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." className="pl-9 h-8 text-sm" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-3 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <Surface>
          {leads.length === 0 ? (
            <div className="text-center py-10">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No leads yet. They appear when attendees register for your events.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead) => {
                const name = lead.attendee?.profile
                  ? `${lead.attendee.profile.firstName} ${lead.attendee.profile.lastName}`
                  : lead.attendee?.email ?? 'Unknown';
                return (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {lead.attendee?.profile?.company ?? lead.attendee?.email}
                        {lead.event?.title && ` · ${lead.event.title}`}
                      </p>
                    </div>
                    <select
                      value={lead.status}
                      onChange={(e) => updateMutation.mutate({ leadId: lead.id, status: e.target.value })}
                      className={`text-[10px] font-medium px-2 py-1 rounded-full border ${STATUS_COLORS[lead.status]} bg-transparent cursor-pointer focus:outline-none`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      </div>
    </OrganizerLayout>
  );
};

export default LeadsPage;
