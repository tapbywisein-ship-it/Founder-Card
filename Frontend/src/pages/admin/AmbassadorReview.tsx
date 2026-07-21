import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Award, AlertCircle, MapPin, Check, X, ArrowRight, RotateCcw, Loader2 } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { ambassadorsService, type AmbassadorStatus } from '@/services/ambassadors.service';

const TABS: { key: AmbassadorStatus; label: string }[] = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'REJECTED', label: 'Rejected' },
];

const STATUS_PILL: Record<AmbassadorStatus, string> = {
  APPLIED: 'bg-amber-500/15 text-amber-700',
  INTERVIEW: 'bg-blue-500/15 text-blue-700',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700',
  REJECTED: 'bg-rose-500/15 text-rose-700',
};

const AmbassadorReviewPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<AmbassadorStatus>('APPLIED');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'ambassadors', tab],
    queryFn: () => ambassadorsService.adminList(tab),
    select: (res) => res.data,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AmbassadorStatus }) =>
      ambassadorsService.updateStatus(id, status),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'ambassadors'] });
      qc.invalidateQueries({ queryKey: ['public', 'stats'] }); // active count changed
      toast.success(`Moved to ${vars.status.toLowerCase()}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  const rows = data ?? [];
  const pendingId = update.isPending ? update.variables?.id : null;

  // Actions available per current status.
  const actionsFor = (status: AmbassadorStatus): { label: string; to: AmbassadorStatus; icon: typeof Check; variant?: 'outline' }[] => {
    switch (status) {
      case 'APPLIED':
        return [
          { label: 'Interview', to: 'INTERVIEW', icon: ArrowRight, variant: 'outline' },
          { label: 'Approve', to: 'ACTIVE', icon: Check },
          { label: 'Reject', to: 'REJECTED', icon: X, variant: 'outline' },
        ];
      case 'INTERVIEW':
        return [
          { label: 'Approve', to: 'ACTIVE', icon: Check },
          { label: 'Reject', to: 'REJECTED', icon: X, variant: 'outline' },
        ];
      case 'ACTIVE':
        return [{ label: 'Remove', to: 'REJECTED', icon: X, variant: 'outline' }];
      case 'REJECTED':
        return [{ label: 'Reconsider', to: 'APPLIED', icon: RotateCcw, variant: 'outline' }];
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold text-foreground">
            <Award className="h-6 w-6 text-primary" /> Ambassadors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review applications and move leaders through the pipeline. Only Active ambassadors appear in the public directory.
          </p>
        </div>

        <div className="flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> Failed to load applications. Try refreshing.
          </div>
        )}

        {isLoading && (
          <Surface className="text-center"><p className="text-sm text-muted-foreground">Loading…</p></Surface>
        )}

        {!isLoading && rows.length === 0 && (
          <Surface className="text-center py-12">
            <Award className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No {tab.toLowerCase()} applications.</p>
          </Surface>
        )}

        <div className="grid gap-3">
          {rows.map((a) => {
            const p = a.user.profile;
            const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : a.user.username || 'Applicant';
            const busy = pendingId === a.id;
            return (
              <Surface key={a.id}>
                <div className="flex items-start gap-4">
                  {p?.avatar ? (
                    <img src={p.avatar} alt={name} loading="lazy" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {name.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-foreground">{name}</p>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_PILL[a.status]}`}>
                        {a.status.toLowerCase()}
                      </span>
                    </div>
                    {(p?.position || p?.company) && (
                      <p className="text-xs text-muted-foreground">{[p?.position, p?.company].filter(Boolean).join(' · ')}</p>
                    )}
                    <p className="mt-0.5 text-xs text-primary flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {a.city}{a.region ? `, ${a.region}` : ''}
                      <span className="text-muted-foreground">· applied {format(new Date(a.createdAt), 'PP')}</span>
                    </p>
                    <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{a.motivation}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 items-end">
                    {actionsFor(a.status).map((act) => (
                      <Button
                        key={act.to}
                        size="sm"
                        variant={act.variant}
                        disabled={busy}
                        onClick={() => update.mutate({ id: a.id, status: act.to })}
                        className="w-32 justify-center"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><act.icon className="mr-1 h-3.5 w-3.5" /> {act.label}</>}
                      </Button>
                    ))}
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AmbassadorReviewPage;
