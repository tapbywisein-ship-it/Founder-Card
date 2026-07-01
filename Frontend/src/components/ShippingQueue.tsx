import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, X, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAdminRevenue, useDispatchOrder } from '@/hooks/useAdmin';

interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface Order {
  id: string;
  status: string;
  createdAt: string;
  shippingAddress: ShippingAddress | null;
  fulfillmentStatus: 'PENDING' | 'DISPATCHED' | 'DELIVERED';
  trackingId: string | null;
  trackingProvider: string | null;
  user: {
    email: string;
    profile: { firstName: string; lastName: string; company: string | null } | null;
    founderCard: { publicSlug: string | null; nfcTagId: string | null } | null;
  };
}

const COURIER_OPTIONS = ['Delhivery', 'Shiprocket', 'India Post', 'DTDC', 'BlueDart', 'Ekart', 'Other'];

/**
 * Shipping queue for the Tap Cards admin section — lists paid orders awaiting
 * dispatch (with their shipping address) and drives the dispatch + delivery flow.
 */
export const ShippingQueue = ({ search }: { search?: string }) => {
  const { data, isLoading, isError } = useAdminRevenue({ search: search || undefined, limit: 100 });
  const dispatchMutation = useDispatchOrder();

  const [target, setTarget] = useState<Order | null>(null);
  const [trackingId, setTrackingId] = useState('');
  const [trackingProvider, setTrackingProvider] = useState('Delhivery');
  const [nfcTagId, setNfcTagId] = useState('');

  const items = (data?.items as Order[] | undefined) ?? [];
  // The queue = paid orders not yet dispatched. Delivered/dispatched drop off.
  const toShip = items.filter((o) => o.status === 'PAID' && o.fulfillmentStatus === 'PENDING');

  const openDispatch = (o: Order) => {
    setTarget(o);
    setTrackingId('');
    setTrackingProvider('Delhivery');
    setNfcTagId('');
  };

  const confirmDispatch = () => {
    if (!target || !trackingId.trim()) return;
    dispatchMutation.mutate(
      { id: target.id, trackingId: trackingId.trim(), trackingProvider, nfcTagId: nfcTagId.trim() || undefined },
      { onSuccess: () => setTarget(null) }
    );
  };

  if (isError) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Failed to load orders. Try refreshing the page.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (toShip.length === 0) {
    return (
      <Surface className="text-center py-12">
        <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No cards waiting to ship — all clear.</p>
      </Surface>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {toShip.map((o) => {
          const p = o.user.profile;
          const name = p ? `${p.firstName} ${p.lastName}`.trim() : o.user.email;
          const a = o.shippingAddress;
          return (
            <Surface key={o.id} className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{name}</p>
                  {p?.company && <span className="text-xs text-muted-foreground">· {p.company}</span>}
                </div>
                <p className="text-xs text-muted-foreground">{o.user.email}</p>

                {a ? (
                  <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2 text-xs leading-relaxed">
                    <div className="mb-0.5 flex items-center gap-1.5 font-medium text-foreground">
                      <Package className="h-3 w-3" /> Ship to
                    </div>
                    <p className="text-foreground">{a.fullName} · {a.phone}</p>
                    <p className="text-muted-foreground">
                      {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}
                    </p>
                    <p className="text-muted-foreground">{a.city}, {a.state} — {a.pincode}</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-600">⚠ No shipping address on file</p>
                )}

                {o.user.founderCard?.publicSlug && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    NFC URL: <code className="font-mono text-foreground">tapbywisein.com/c/{o.user.founderCard.publicSlug}</code>
                    {' · '}
                    {o.user.founderCard.nfcTagId ? 'programmed' : 'needs programming'}
                  </p>
                )}
              </div>

              <div className="flex-shrink-0">
                <Button size="sm" onClick={() => openDispatch(o)}>
                  <Truck className="mr-1.5 h-3.5 w-3.5" /> Dispatch
                </Button>
              </div>
            </Surface>
          );
        })}
      </div>

      {/* Dispatch modal */}
      {target && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setTarget(null)}
        >
          <div className="w-full max-w-md">
            <Surface className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Dispatch Order</p>
                    <p className="text-[11px] text-muted-foreground">
                      {target.user.profile
                        ? `${target.user.profile.firstName} ${target.user.profile.lastName}`
                        : target.user.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setTarget(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {target.shippingAddress && (
                <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
                    <Package className="h-3 w-3" /> Ship to
                  </div>
                  <p>{target.shippingAddress.fullName} · {target.shippingAddress.phone}</p>
                  <p>{target.shippingAddress.addressLine1}{target.shippingAddress.addressLine2 ? `, ${target.shippingAddress.addressLine2}` : ''}</p>
                  <p>{target.shippingAddress.city}, {target.shippingAddress.state} — {target.shippingAddress.pincode}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="sq-courier">Courier *</Label>
                  <select
                    id="sq-courier"
                    value={trackingProvider}
                    onChange={(e) => setTrackingProvider(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {COURIER_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sq-tracking">Tracking ID *</Label>
                  <Input
                    id="sq-tracking"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sq-nfc">
                    NFC Tag ID <span className="text-muted-foreground">(optional — marks card programmed)</span>
                  </Label>
                  <Input
                    id="sq-nfc"
                    value={nfcTagId}
                    onChange={(e) => setNfcTagId(e.target.value)}
                    placeholder="Tag serial number"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setTarget(null)} disabled={dispatchMutation.isPending}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={confirmDispatch} disabled={!trackingId.trim() || dispatchMutation.isPending}>
                  <Truck className="mr-1.5 h-4 w-4" />
                  {dispatchMutation.isPending ? 'Dispatching…' : 'Confirm Dispatch'}
                </Button>
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Customer receives an email with tracking details.
              </p>
            </Surface>
          </div>
        </div>
      )}
    </>
  );
};
