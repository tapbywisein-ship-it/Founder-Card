import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Award, AlertCircle, MapPin, Check, X, ArrowRight, RotateCcw, Loader2, Truck, Package, CheckCircle2 } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ambassadorsService,
  type AmbassadorStatus,
  type FulfillmentStatus,
  LEVEL_LABELS,
  LEVEL_REWARDS,
} from '@/services/ambassadors.service';

const COURIER_OPTIONS = ['Delhivery', 'Shiprocket', 'India Post', 'DTDC', 'BlueDart', 'Ekart', 'Other'];

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
  const [view, setView] = useState<'applications' | 'rewards'>('applications');

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold text-foreground">
            <Award className="h-6 w-6 text-primary" /> Ambassadors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review applications, move leaders through the pipeline, and fulfill their level rewards.
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant={view === 'applications' ? 'default' : 'outline'} onClick={() => setView('applications')}>
            Applications
          </Button>
          <Button size="sm" variant={view === 'rewards' ? 'default' : 'outline'} onClick={() => setView('rewards')}>
            <Package className="w-3.5 h-3.5" /> Rewards
          </Button>
        </div>

        {view === 'applications' ? <ApplicationsQueue /> : <RewardsQueue />}
      </div>
    </AdminLayout>
  );
};

const ApplicationsQueue = () => {
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
    <div className="space-y-4">
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
                      {a.status === 'ACTIVE' && a.level && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {LEVEL_LABELS[a.level]} · {a.bookingCount ?? 0} booking{a.bookingCount === 1 ? '' : 's'}
                        </span>
                      )}
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
  );
};

// ── Reward fulfillment queue ───────────────────────────────────────────────────
const REWARD_TABS: { key: FulfillmentStatus; label: string }[] = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'DELIVERED', label: 'Delivered' },
];

const RewardsQueue = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<FulfillmentStatus>('PENDING');
  const [dispatchTargetId, setDispatchTargetId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingProvider, setTrackingProvider] = useState('Delhivery');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'ambassador-rewards', tab],
    queryFn: () => ambassadorsService.adminListRewards(tab),
    select: (res) => res.data,
  });

  const dispatchMutation = useMutation({
    mutationFn: ({ id, trackingId, trackingProvider }: { id: string; trackingId: string; trackingProvider: string }) =>
      ambassadorsService.dispatchReward(id, trackingId, trackingProvider),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ambassador-rewards'] });
      toast.success('Reward dispatched');
      setDispatchTargetId(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not dispatch'),
  });

  const deliveredMutation = useMutation({
    mutationFn: (id: string) => ambassadorsService.markRewardDelivered(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ambassador-rewards'] });
      toast.success('Marked delivered');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update'),
  });

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex border-b border-border">
        {REWARD_TABS.map((t) => (
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
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> Failed to load rewards. Try refreshing.
        </div>
      )}

      {isLoading && (
        <Surface className="text-center"><p className="text-sm text-muted-foreground">Loading…</p></Surface>
      )}

      {!isLoading && rows.length === 0 && (
        <Surface className="text-center py-12">
          <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No {tab.toLowerCase()} rewards.</p>
        </Surface>
      )}

      <div className="grid gap-3">
        {rows.map((r) => {
          const p = r.ambassador.user.profile;
          const name = p ? `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() : r.ambassador.user.username || 'Ambassador';
          const isDispatchTarget = dispatchTargetId === r.id;
          return (
            <Surface key={r.id}>
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
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {LEVEL_LABELS[r.level]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{LEVEL_REWARDS[r.level]}</p>

                  {r.shippingAddress ? (
                    <div className="mt-2 text-xs text-foreground leading-relaxed">
                      <p className="font-medium">{r.shippingAddress.fullName} · {r.shippingAddress.phone}</p>
                      <p className="text-muted-foreground">
                        {r.shippingAddress.addressLine1}{r.shippingAddress.addressLine2 ? `, ${r.shippingAddress.addressLine2}` : ''}
                      </p>
                      <p className="text-muted-foreground">
                        {r.shippingAddress.city}, {r.shippingAddress.state}, {r.shippingAddress.pincode}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground/60">No shipping address yet</p>
                  )}

                  {r.fulfillmentStatus !== 'PENDING' && r.trackingId && (
                    <p className="mt-1 text-xs text-muted-foreground font-mono">{r.trackingProvider}: {r.trackingId}</p>
                  )}

                  {isDispatchTarget && (
                    <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Tracking ID" value={trackingId} className="h-8 text-xs" onChange={(e) => setTrackingId(e.target.value)} />
                        <select
                          value={trackingProvider}
                          onChange={(e) => setTrackingProvider(e.target.value)}
                          className="h-8 text-xs rounded-md border border-border bg-background px-2"
                        >
                          {COURIER_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={!trackingId.trim() || dispatchMutation.isPending}
                          onClick={() => dispatchMutation.mutate({ id: r.id, trackingId: trackingId.trim(), trackingProvider })}
                        >
                          {dispatchMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm dispatch'}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDispatchTargetId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2 items-end">
                  {r.fulfillmentStatus === 'PENDING' && !isDispatchTarget && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-32 justify-center"
                      disabled={!r.shippingAddress}
                      title={!r.shippingAddress ? 'Waiting on shipping address' : undefined}
                      onClick={() => { setDispatchTargetId(r.id); setTrackingId(''); setTrackingProvider('Delhivery'); }}
                    >
                      <Truck className="mr-1 h-3.5 w-3.5" /> Dispatch
                    </Button>
                  )}
                  {r.fulfillmentStatus === 'DISPATCHED' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-32 justify-center text-emerald-600 hover:text-emerald-700"
                      disabled={deliveredMutation.isPending}
                      onClick={() => deliveredMutation.mutate(r.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Delivered
                    </Button>
                  )}
                  {r.fulfillmentStatus === 'DELIVERED' && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Done</span>
                  )}
                </div>
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
};

export default AmbassadorReviewPage;
