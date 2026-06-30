import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, IndianRupee, Download, ChevronLeft, ChevronRight, AlertCircle, Truck, X, Package, CheckCircle2 } from 'lucide-react';
import { useAdminRevenue, useAdminDashboard, useDispatchOrder, useMarkOrderDelivered } from '@/hooks/useAdmin';
import { formatINR } from '@/lib/currency';
import { toast } from 'sonner';

interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface RevenueItem {
  id: string;
  status: string;
  amount: number;
  createdAt: string;
  razorpayOrderId: string | null;
  shippingAddress: ShippingAddress | null;
  fulfillmentStatus: 'PENDING' | 'DISPATCHED' | 'DELIVERED';
  trackingId: string | null;
  trackingProvider: string | null;
  dispatchedAt: string | null;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; lastName: string; avatar: string | null; company: string | null } | null;
    founderCard: { publicSlug: string | null; nfcTagId: string | null; status: string } | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_COLORS: Record<string, string> = {
  PAID:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  FAILED:  'bg-red-500/10 text-red-500 border-red-500/20',
  REFUNDED:'bg-muted text-muted-foreground border-border',
};

const COURIER_OPTIONS = ['Delhivery', 'Shiprocket', 'India Post', 'DTDC', 'BlueDart', 'Ekart', 'Other'];

const FULFILLMENT_COLORS: Record<string, string> = {
  PENDING:    'bg-amber-500/10 text-amber-600 border-amber-500/20',
  DISPATCHED: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DELIVERED:  'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
};

const AdminRevenuePage = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Dispatch modal state
  const [dispatchTarget, setDispatchTarget] = useState<RevenueItem | null>(null);
  const [trackingId, setTrackingId]         = useState('');
  const [trackingProvider, setTrackingProvider] = useState('Delhivery');
  const [nfcTagId, setNfcTagId]             = useState('');

  const { data, isLoading, isError } = useAdminRevenue({ search: search || undefined, page, limit: 25 });
  const { data: stats } = useAdminDashboard();
  const dispatchMutation  = useDispatchOrder();
  const deliveredMutation = useMarkOrderDelivered();

  const items = (data?.items as RevenueItem[]) ?? [];
  const pagination = data?.pagination as Pagination | undefined;

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const openDispatch = (item: RevenueItem) => {
    setDispatchTarget(item);
    setTrackingId('');
    setTrackingProvider('Delhivery');
    setNfcTagId('');
  };

  const handleDispatch = () => {
    if (!dispatchTarget || !trackingId.trim()) return;
    dispatchMutation.mutate(
      { id: dispatchTarget.id, trackingId: trackingId.trim(), trackingProvider, nfcTagId: nfcTagId.trim() || undefined },
      { onSuccess: () => setDispatchTarget(null) }
    );
  };

  const exportCsv = () => {
    if (!items.length) { toast.error('No data to export'); return; }
    const header = ['Name', 'Email', 'Company', 'Amount', 'Status', 'NFC URL', 'NFC Programmed', 'Order ID', 'Date',
      'Ship To', 'Phone', 'Address', 'City', 'State', 'PIN'];
    const rows = items.map((r) => {
      const p = r.user.profile;
      const a = r.shippingAddress;
      return [
        p ? `${p.firstName} ${p.lastName}` : '',
        r.user.email,
        p?.company ?? '',
        r.amount,
        r.status,
        r.razorpayOrderId ?? '',
        new Date(r.createdAt).toLocaleDateString(),
        r.user.founderCard?.publicSlug ? `https://tapbywisein.com/c/${r.user.founderCard.publicSlug}` : '',
        r.user.founderCard?.nfcTagId ? 'Yes' : 'No',
        a?.fullName ?? '',
        a?.phone ?? '',
        a ? [a.addressLine1, a.addressLine2].filter(Boolean).join(', ') : '',
        a?.city ?? '',
        a?.state ?? '',
        a?.pincode ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  return (
    <>
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Revenue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Tap Card purchase transactions</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Surface padding="md" className="text-center">
            <IndianRupee className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalRevenue !== undefined ? formatINR(stats.totalRevenue) : '—'}</p>
            <p className="text-[11px] text-muted-foreground">Total Collected</p>
          </Surface>
          <Surface padding="md" className="text-center">
            <IndianRupee className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">
              {formatINR(items.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0))}
            </p>
            <p className="text-[11px] text-muted-foreground">This page (PAID)</p>
          </Surface>
          <Surface padding="md" className="text-center">
            <IndianRupee className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{pagination?.total ?? '—'}</p>
            <p className="text-[11px] text-muted-foreground">Total Orders</p>
          </Surface>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-10"
          />
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load revenue data.
          </div>
        )}

        <Surface className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['User', 'Email', 'Amount', 'Status', 'Fulfillment', 'NFC URL to Flash', 'Shipping Address', 'Order ID', 'Date', ''].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}><td colSpan={10} className="px-4 py-3"><div className="h-10 bg-muted/50 rounded animate-pulse" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center">
                    <IndianRupee className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No transactions found.</p>
                  </td>
                </tr>
              ) : items.map((r) => {
                const p = r.user.profile;
                const name = p ? `${p.firstName} ${p.lastName}`.trim() : r.user.email.split('@')[0];
                return (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {p ? (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {name[0]?.toUpperCase()}
                          </div>
                        ) : null}
                        <div>
                          <p className="text-sm font-medium text-foreground">{name}</p>
                          {p?.company && <p className="text-[11px] text-muted-foreground">{p.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">{r.user.email}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-foreground">{formatINR(r.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[r.status] ?? STATUS_COLORS.PENDING}`}>
                        {r.status.toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.status === 'PAID' ? (
                        <div className="space-y-1">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-medium ${FULFILLMENT_COLORS[r.fulfillmentStatus]}`}>
                            {r.fulfillmentStatus.toLowerCase()}
                          </span>
                          {r.trackingId && (
                            <p className="text-[10px] text-muted-foreground font-mono">{r.trackingProvider}: {r.trackingId}</p>
                          )}
                          {r.dispatchedAt && (
                            <p className="text-[10px] text-muted-foreground">{new Date(r.dispatchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.user.founderCard?.publicSlug ? (() => {
                        const url = `https://tapbywisein.com/c/${r.user.founderCard.publicSlug}`;
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.user.founderCard.nfcTagId ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              <span className="text-[10px] text-muted-foreground">{r.user.founderCard.nfcTagId ? 'Programmed' : 'Needs programming'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <code className="text-[10px] font-mono text-foreground bg-muted px-1.5 py-0.5 rounded truncate max-w-[160px] block">
                                {url}
                              </code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(url); }}
                                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                                title="Copy URL"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })() : (
                        <span className="text-xs text-muted-foreground/50">No card yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.shippingAddress ? (
                        <div className="text-xs text-foreground leading-relaxed">
                          <p className="font-medium">{r.shippingAddress.fullName}</p>
                          <p className="text-muted-foreground">{r.shippingAddress.addressLine1}{r.shippingAddress.addressLine2 ? `, ${r.shippingAddress.addressLine2}` : ''}</p>
                          <p className="text-muted-foreground">{r.shippingAddress.city}, {r.shippingAddress.state} — {r.shippingAddress.pincode}</p>
                          <p className="text-muted-foreground">{r.shippingAddress.phone}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                      {r.razorpayOrderId ? r.razorpayOrderId.slice(-12) : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {r.status === 'PAID' && r.fulfillmentStatus === 'PENDING' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDispatch(r)}>
                          <Truck className="w-3 h-3 mr-1" /> Dispatch
                        </Button>
                      )}
                      {r.status === 'PAID' && r.fulfillmentStatus === 'DISPATCHED' && (
                        <Button
                          size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => deliveredMutation.mutate(r.id)}
                          disabled={deliveredMutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Delivered
                        </Button>
                      )}
                      {r.fulfillmentStatus === 'DELIVERED' && (
                        <span className="text-[10px] text-emerald-600 font-medium">✓ Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} transactions
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || isLoading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-foreground px-2">{page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= (pagination.totalPages ?? 1) || isLoading}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>

    {/* Dispatch Modal */}
    {dispatchTarget && (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && setDispatchTarget(null)}
      >
        <div className="w-full max-w-md">
          <Surface className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Dispatch Order</p>
                  <p className="text-[11px] text-muted-foreground">
                    {dispatchTarget.user.profile
                      ? `${dispatchTarget.user.profile.firstName} ${dispatchTarget.user.profile.lastName}`
                      : dispatchTarget.user.email}
                  </p>
                </div>
              </div>
              <button onClick={() => setDispatchTarget(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shipping address recap */}
            {dispatchTarget.shippingAddress && (
              <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                <div className="flex items-center gap-1.5 mb-1 text-foreground font-medium">
                  <Package className="w-3 h-3" /> Ship to
                </div>
                <p>{dispatchTarget.shippingAddress.fullName} · {dispatchTarget.shippingAddress.phone}</p>
                <p>{dispatchTarget.shippingAddress.addressLine1}{dispatchTarget.shippingAddress.addressLine2 ? `, ${dispatchTarget.shippingAddress.addressLine2}` : ''}</p>
                <p>{dispatchTarget.shippingAddress.city}, {dispatchTarget.shippingAddress.state} — {dispatchTarget.shippingAddress.pincode}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="courier">Courier *</Label>
                <select
                  id="courier"
                  value={trackingProvider}
                  onChange={(e) => setTrackingProvider(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COURIER_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tracking-id">Tracking ID *</Label>
                <Input
                  id="tracking-id"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="nfc-tag">NFC Tag ID <span className="text-muted-foreground">(optional — marks card as programmed)</span></Label>
                <Input
                  id="nfc-tag"
                  value={nfcTagId}
                  onChange={(e) => setNfcTagId(e.target.value)}
                  placeholder="Tag serial number"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDispatchTarget(null)} disabled={dispatchMutation.isPending}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleDispatch}
                disabled={!trackingId.trim() || dispatchMutation.isPending}
              >
                <Truck className="w-4 h-4 mr-1.5" />
                {dispatchMutation.isPending ? 'Dispatching…' : 'Confirm Dispatch'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Customer will receive an email with tracking details.</p>
          </Surface>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminRevenuePage;
