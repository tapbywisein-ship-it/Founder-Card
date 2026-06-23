import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Sparkles, Power, RotateCcw } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/services/api';

type CardStatus = 'PENDING' | 'ACTIVE' | 'DEACTIVATED' | 'REJECTED';

interface CardRow {
  id: string;
  userId: string;
  status: CardStatus;
  message: string | null;
  appliedAt: string;
  reviewedAt: string | null;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      avatar: string | null;
      company: string | null;
      position: string | null;
    } | null;
    gamification?: { fkScore: number; level: number } | null;
  };
}

const STATUS_PILL: Record<CardStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700',
  DEACTIVATED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-rose-500/15 text-rose-700',
};

const FounderCardReviewPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const pending = useQuery({
    queryKey: ['admin', 'founder-cards', 'pending'],
    queryFn: () =>
      apiFetch<{ data: CardRow[]; pagination: unknown }>('/founder-cards/pending'),
    select: (res) => res.data,
    enabled: tab === 'pending',
  });

  const all = useQuery({
    queryKey: ['admin', 'founder-cards', 'all'],
    queryFn: () => apiFetch<{ data: CardRow[]; pagination: unknown }>(`/founder-cards`),
    select: (res) => res.data,
    enabled: tab === 'all',
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin', 'founder-cards', 'pending'] });
    qc.invalidateQueries({ queryKey: ['admin', 'founder-cards', 'all'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      invalidate();
      toast.success('Founder Card approved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not approve'),
  });

  const reject = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      }),
    onSuccess: () => {
      setRejectingId(null);
      setReason('');
      invalidate();
      toast.success('Application rejected');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not reject'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${id}/deactivate`, { method: 'PUT' }),
    onSuccess: () => {
      invalidate();
      toast.success('Card deactivated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not deactivate'),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${id}/reactivate`, { method: 'PUT' }),
    onSuccess: () => {
      invalidate();
      toast.success('Card reactivated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not reactivate'),
  });

  const cards = (tab === 'pending' ? pending.data : all.data) ?? [];
  const isLoading = tab === 'pending' ? pending.isLoading : all.isLoading;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold text-foreground">
            <Sparkles className="h-6 w-6 text-primary" /> Founder Cards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review pending applications, manage active cards, and see FK Scores at a glance.
          </p>
        </div>

        <div className="flex border-b border-border">
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'pending' ? 'Pending' : 'All Cards'}
            </button>
          ))}
        </div>

        {isLoading && (
          <Surface className="text-center">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Surface>
        )}

        {!isLoading && cards.length === 0 && (
          <Surface className="text-center py-12">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {tab === 'pending' ? 'No pending applications — quiet day.' : 'No cards yet.'}
            </p>
          </Surface>
        )}

        <div className="grid gap-3">
          {cards.map((c) => {
            const p = c.user.profile;
            const name = p ? `${p.firstName} ${p.lastName}`.trim() : c.user.email;
            return (
              <Surface key={c.id}>
                <div className="flex items-start gap-4">
                  {p?.avatar ? (
                    <img src={p.avatar} alt={name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-foreground">{name}</p>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_PILL[c.status]}`}>
                        {c.status.toLowerCase()}
                      </span>
                      {c.user.gamification && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          FK {c.user.gamification.fkScore} · Lv {c.user.gamification.level}
                        </span>
                      )}
                    </div>
                    {(p?.position || p?.company) && (
                      <p className="text-xs text-muted-foreground">
                        {[p?.position, p?.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.user.email} · applied {format(new Date(c.appliedAt), 'PP')}
                    </p>
                    {c.message && (
                      <p className="mt-3 whitespace-pre-wrap rounded-card border border-border bg-card/40 p-3 text-sm text-foreground">
                        {c.message}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 flex-wrap justify-end">
                    {c.status === 'PENDING' && (
                      <>
                        <Button size="sm" onClick={() => approve.mutate(c.id)} disabled={approve.isPending}>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                          onClick={() => { setRejectingId(c.id); setReason(''); }}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                        </Button>
                      </>
                    )}
                    {c.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-amber-700 hover:bg-amber-500/10"
                        onClick={() => deactivate.mutate(c.id)}
                        disabled={deactivate.isPending}
                      >
                        <Power className="mr-1 h-3.5 w-3.5" /> Deactivate
                      </Button>
                    )}
                    {c.status === 'DEACTIVATED' && (
                      <Button size="sm" onClick={() => reactivate.mutate(c.id)} disabled={reactivate.isPending}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reactivate
                      </Button>
                    )}
                  </div>
                </div>

                {rejectingId === c.id && (
                  <div className="mt-3 space-y-2 rounded-card border border-rose-500/30 bg-rose-500/5 p-3">
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for rejection (optional, sent to applicant)"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setRejectingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={() => reject.mutate(c.id)}
                        disabled={reject.isPending}
                      >
                        Confirm reject
                      </Button>
                    </div>
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
};

export default FounderCardReviewPage;
