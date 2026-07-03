import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Sparkles, Power, RotateCcw, AlertCircle, Package, Nfc, Search } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/services/api';

type CardStatus = 'PENDING' | 'ACTIVE' | 'DEACTIVATED' | 'REJECTED';

interface CardRow {
  id: string;
  userId: string;
  status: CardStatus;
  nfcTagId?: string | null;
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

const STATUS_PILL: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-700',
  ACTIVE: 'bg-emerald-500/15 text-emerald-700',
  DEACTIVATED: 'bg-muted text-muted-foreground',
  REJECTED: 'bg-rose-500/15 text-rose-700',
  ordered: 'bg-blue-500/15 text-blue-700',
};

const FounderCardReviewPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [nfcTagId, setNfcTagId] = useState('');
  const [cardSearch, setCardSearch] = useState('');

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

  const provision = useMutation({
    mutationFn: ({ cardId, tagId }: { cardId: string; tagId: string }) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${cardId}/nfc`, {
        method: 'POST',
        body: JSON.stringify({ nfcTagId: tagId }),
      }),
    onSuccess: () => {
      setProvisioningId(null);
      setNfcTagId('');
      invalidate();
      toast.success('Card provisioned, NFC tag assigned');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not provision'),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${id}/deactivate`, { method: 'PUT' }),
    onSuccess: () => { invalidate(); toast.success('Card deactivated'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not deactivate'),
  });

  const reactivate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ data: unknown }>(`/founder-cards/${id}/reactivate`, { method: 'PUT' }),
    onSuccess: () => { invalidate(); toast.success('Card reactivated'); },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not reactivate'),
  });

  const rawCards = (tab === 'pending' ? pending.data : all.data) ?? [];
  const cards = cardSearch.trim()
    ? rawCards.filter((c) => {
        const q = cardSearch.toLowerCase();
        const p = c.user.profile;
        return (
          c.user.email.toLowerCase().includes(q) ||
          (p && `${p.firstName} ${p.lastName}`.toLowerCase().includes(q)) ||
          (p?.company?.toLowerCase().includes(q) ?? false)
        );
      })
    : rawCards;
  const isLoading = tab === 'pending' ? pending.isLoading : all.isLoading;
  const isError = tab === 'pending' ? pending.isError : all.isError;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold text-foreground">
            <Sparkles className="h-6 w-6 text-primary" /> Tap Cards
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ship ordered cards by assigning NFC tag IDs, and manage all active cards.
          </p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={cardSearch}
            onChange={(e) => setCardSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-10 h-9 text-sm"
          />
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
              {t === 'pending' ? 'Ordered (to ship)' : 'All Cards'}
            </button>
          ))}
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load cards. Try refreshing the page.
          </div>
        )}

        {isLoading && (
          <Surface className="text-center">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Surface>
        )}

        {!isLoading && cards.length === 0 && (
          <Surface className="text-center py-12">
            <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {tab === 'pending' ? 'No cards waiting to ship. All clear.' : 'No cards yet.'}
            </p>
          </Surface>
        )}

        <div className="grid gap-3">
          {cards.map((c) => {
            const p = c.user.profile;
            const name = p ? `${p.firstName} ${p.lastName}`.trim() : c.user.email;
            const isOrdered = tab === 'pending';
            return (
              <Surface key={c.id}>
                <div className="flex items-start gap-4">
                  {p?.avatar ? (
                    <img src={p.avatar} alt={name} loading="lazy" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base font-semibold text-foreground">{name}</p>
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${isOrdered ? STATUS_PILL.ordered : STATUS_PILL[c.status]}`}>
                        {isOrdered ? 'Paid · Awaiting NFC' : (c.nfcTagId ? 'provisioned' : c.status.toLowerCase())}
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
                      {c.user.email} · ordered {format(new Date(c.appliedAt), 'PP')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2 flex-wrap justify-end">
                    {isOrdered && (
                      <Button
                        size="sm"
                        onClick={() => { setProvisioningId(c.id); setNfcTagId(''); }}
                      >
                        <Nfc className="mr-1 h-3.5 w-3.5" /> Assign NFC Tag
                      </Button>
                    )}
                    {!isOrdered && c.status === 'ACTIVE' && (
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
                    {!isOrdered && c.status === 'DEACTIVATED' && (
                      <Button size="sm" onClick={() => reactivate.mutate(c.id)} disabled={reactivate.isPending}>
                        <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reactivate
                      </Button>
                    )}
                  </div>
                </div>

                {provisioningId === c.id && (
                  <div className="mt-3 space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-foreground">Enter the NFC tag ID printed on the physical card:</p>
                    <Input
                      value={nfcTagId}
                      onChange={(e) => setNfcTagId(e.target.value)}
                      placeholder="e.g. 04:A3:2B:1C:9F:00"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setProvisioningId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => provision.mutate({ cardId: c.id, tagId: nfcTagId })}
                        disabled={!nfcTagId.trim() || provision.isPending}
                      >
                        <Nfc className="mr-1 h-3.5 w-3.5" /> Confirm & Ship
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
