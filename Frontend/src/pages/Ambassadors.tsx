import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, MapPin, Search, Check, Clock, X, Loader2, Copy, Gift } from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { PublicNav } from '@/components/PublicNav';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';
import {
  ambassadorsService,
  type AmbassadorStatus,
  type MyAmbassador,
  type AmbassadorReward,
  type ShippingAddress,
  AMBASSADOR_LEVEL_ORDER,
  LEVEL_LABELS,
  LEVEL_REWARDS,
} from '@/services/ambassadors.service';

const STEPS: { key: AmbassadorStatus; label: string }[] = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'INTERVIEW', label: 'Interview' },
  { key: 'ACTIVE', label: 'Active' },
];

const fullName = (p?: { firstName?: string | null; lastName?: string | null } | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim();

const AmbassadorsPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [city, setCity] = useState('');

  const { data: directory, isLoading } = useQuery({
    queryKey: ['ambassadors', 'active', city],
    queryFn: () => ambassadorsService.listActive(city || undefined),
    select: (r) => r.data,
    staleTime: 60_000,
  });

  const { data: mine } = useQuery({
    queryKey: ['ambassadors', 'me'],
    queryFn: () => ambassadorsService.getMine(),
    select: (r) => r.data,
    enabled: isAuthenticated,
  });

  const wrap = (children: ReactNode) =>
    isAuthenticated ? (
      <PortalLayout>{children}</PortalLayout>
    ) : (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="max-w-xwide mx-auto px-4 py-6 md:py-10">{children}</main>
      </div>
    );

  return wrap(
    <div className="space-y-6 pb-24 md:pb-8">
      <div className="flex items-center gap-3">
        <Award className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Community Ambassadors</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Local leaders who host, welcome newcomers, and grow the community in their city.
          </p>
        </div>
      </div>

      {/* Apply / status panel */}
      <ApplyPanel
        isAuthenticated={isAuthenticated}
        mine={mine ?? null}
        onSignIn={() => navigate('/login', { state: { from: { pathname: '/ambassadors' } } })}
        onApplied={() => qc.invalidateQueries({ queryKey: ['ambassadors'] })}
      />

      {/* Directory */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-foreground">Active ambassadors</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Filter by city…"
            className="pl-9 h-8 text-sm w-56"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : !directory?.length ? (
        <Surface className="text-center py-10">
          <p className="text-sm text-muted-foreground">
            {city ? `No ambassadors in “${city}” yet.` : 'No active ambassadors yet - apply to be the first.'}
          </p>
        </Surface>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {directory.map((a) => {
            const name = fullName(a.user.profile) || a.user.username || 'Ambassador';
            const sub = [a.user.profile?.position, a.user.profile?.company].filter(Boolean).join(' · ');
            return (
              <Surface key={a.id} className="flex items-center gap-3">
                {a.user.profile?.avatar ? (
                  <img src={a.user.profile.avatar} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                    {name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      {LEVEL_LABELS[a.level]}
                    </span>
                  </div>
                  {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
                  <p className="text-[11px] text-primary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {a.city}{a.region ? `, ${a.region}` : ''}
                  </p>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Apply / status panel ──────────────────────────────────────────────────────
function ApplyPanel({
  isAuthenticated,
  mine,
  onSignIn,
  onApplied,
}: {
  isAuthenticated: boolean;
  mine: (MyAmbassador & { rewards?: AmbassadorReward[] }) | null;
  onSignIn: () => void;
  onApplied: () => void;
}) {
  const qc = useQueryClient();
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [motivation, setMotivation] = useState('');

  const apply = useMutation({
    mutationFn: () => ambassadorsService.apply({ city, region: region || undefined, motivation }),
    onSuccess: () => {
      toast.success('Application submitted!');
      qc.invalidateQueries({ queryKey: ['ambassadors', 'me'] });
      onApplied();
    },
    onError: (e: Error) => toast.error(e.message || 'Could not submit'),
  });

  if (!isAuthenticated) {
    return (
      <Surface className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground">Want to lead your city? Apply to become an ambassador.</p>
        <Button size="sm" onClick={onSignIn}>Sign in to apply</Button>
      </Surface>
    );
  }

  // ACTIVE → show the referral link + level ladder instead of the pipeline tracker.
  if (mine && mine.status === 'ACTIVE') {
    return <LevelPanel mine={mine} />;
  }

  // Applied / interview → show status tracker.
  if (mine && mine.status !== 'REJECTED') {
    const activeIdx = STEPS.findIndex((s) => s.key === mine.status);
    return (
      <Surface className="space-y-3">
        <p className="text-sm font-semibold text-foreground">Your application</p>
        <div className="flex items-center">
          {STEPS.map((s, i) => {
            const done = i <= activeIdx;
            return (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i < activeIdx ? <Check className="w-3.5 h-3.5" /> : i === activeIdx ? <Clock className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className={`text-[11px] ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 mx-1 ${i < activeIdx ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            );
          })}
        </div>
        {mine.reviewNote && <p className="text-xs text-muted-foreground">Note: {mine.reviewNote}</p>}
      </Surface>
    );
  }

  // Rejected or never applied → show the form. (Rejected users may re-apply.)
  return (
    <Surface className="space-y-3">
      <p className="text-sm font-semibold text-foreground">
        {mine?.status === 'REJECTED' ? 'Re-apply to be an ambassador' : 'Become an ambassador'}
      </p>
      {mine?.status === 'REJECTED' && (
        <p className="text-xs text-amber-600 flex items-center gap-1"><X className="w-3 h-3" /> Previous application wasn’t approved{mine.reviewNote ? `: ${mine.reviewNote}` : ''}.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City *" className="h-9 text-sm" />
        <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region (optional)" className="h-9 text-sm" />
      </div>
      <textarea
        value={motivation}
        onChange={(e) => setMotivation(e.target.value)}
        placeholder="Why do you want to lead your city's community? (20+ chars)"
        rows={4}
        className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
      />
      <Button
        size="sm"
        disabled={apply.isPending || city.trim().length < 2 || motivation.trim().length < 20}
        onClick={() => apply.mutate()}
      >
        {apply.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Submit application'}
      </Button>
    </Surface>
  );
}

// ── Level ladder + referral link (shown once ACTIVE) ──────────────────────────
function LevelPanel({ mine }: { mine: MyAmbassador & { rewards?: AmbassadorReward[] } }) {
  const level = mine.level ?? 'INSIDER';
  const bookingCount = mine.bookingCount ?? 0;
  const referralLink = mine.referralCode
    ? `${window.location.origin}/discover?ref=${mine.referralCode}`
    : null;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied');
  };

  return (
    <div className="space-y-4">
      <Surface className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">
              You're an ambassador — Level: <span className="text-primary">{LEVEL_LABELS[level]}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bookingCount} booking{bookingCount === 1 ? '' : 's'} attributed to you
              {mine.nextLevel ? ` · ${mine.nextLevel.remaining} more to ${LEVEL_LABELS[mine.nextLevel.level]}` : ' · top level reached'}
            </p>
          </div>
        </div>

        {referralLink && (
          <div className="flex items-center gap-2">
            <Input value={referralLink} readOnly className="h-9 text-xs" />
            <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0">
              <Copy className="w-3.5 h-3.5" /> Copy
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AMBASSADOR_LEVEL_ORDER.map((l, i) => {
            const reached = AMBASSADOR_LEVEL_ORDER.indexOf(level) >= i;
            return (
              <div
                key={l}
                className={`rounded-xl border p-3 text-center ${reached ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'}`}
              >
                <Gift className={`w-4 h-4 mx-auto mb-1 ${reached ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className={`text-xs font-semibold ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>{LEVEL_LABELS[l]}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{LEVEL_REWARDS[l]}</p>
              </div>
            );
          })}
        </div>
      </Surface>

      {mine.rewards && mine.rewards.length > 0 && (
        <Surface className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Your rewards</p>
          <div className="space-y-3">
            {mine.rewards.map((r) => (
              <RewardCard key={r.id} reward={r} />
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}

const emptyAddress: ShippingAddress = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '',
};

const FULFILLMENT_LABEL: Record<AmbassadorReward['fulfillmentStatus'], string> = {
  PENDING: 'Awaiting address',
  DISPATCHED: 'Shipped',
  DELIVERED: 'Delivered',
};

function RewardCard({ reward }: { reward: AmbassadorReward }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(!reward.shippingAddress);
  const [address, setAddress] = useState<ShippingAddress>(reward.shippingAddress ?? emptyAddress);

  const submit = useMutation({
    mutationFn: () => ambassadorsService.submitShippingAddress(reward.id, address),
    onSuccess: () => {
      toast.success('Shipping address saved');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['ambassadors', 'me'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Could not save address'),
  });

  const valid =
    address.fullName.trim().length > 0 &&
    address.phone.trim().length >= 6 &&
    address.addressLine1.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length > 0 &&
    /^\d{6}$/.test(address.pincode);

  const statusColor =
    reward.fulfillmentStatus === 'DELIVERED'
      ? 'bg-emerald-500/10 text-emerald-600'
      : reward.fulfillmentStatus === 'DISPATCHED'
        ? 'bg-blue-500/10 text-blue-600'
        : 'bg-amber-500/10 text-amber-600';

  return (
    <div className="rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-foreground">
          {LEVEL_LABELS[reward.level]} <span className="text-xs font-normal text-muted-foreground">· {LEVEL_REWARDS[reward.level]}</span>
        </p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
          {FULFILLMENT_LABEL[reward.fulfillmentStatus]}
        </span>
      </div>

      {reward.fulfillmentStatus !== 'PENDING' && (
        <p className="text-xs text-muted-foreground">
          {reward.trackingProvider && reward.trackingId ? `${reward.trackingProvider}: ${reward.trackingId}` : null}
        </p>
      )}

      {reward.fulfillmentStatus === 'PENDING' && !editing && reward.shippingAddress && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Address on file — {reward.shippingAddress.city}, {reward.shippingAddress.pincode}. Waiting to ship.
          </p>
          <Button size="sm" variant="ghost" className="h-6 text-xs shrink-0" onClick={() => setEditing(true)}>Edit</Button>
        </div>
      )}

      {reward.fulfillmentStatus === 'PENDING' && editing && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Full name *" value={address.fullName} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, fullName: e.target.value }))} />
            <Input placeholder="Phone *" value={address.phone} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} />
          </div>
          <Input placeholder="Address line 1 *" value={address.addressLine1} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, addressLine1: e.target.value }))} />
          <Input placeholder="Address line 2" value={address.addressLine2 ?? ''} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, addressLine2: e.target.value }))} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="City *" value={address.city} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} />
            <Input placeholder="State *" value={address.state} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))} />
            <Input placeholder="PIN code *" value={address.pincode} maxLength={6} className="h-8 text-xs" onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, '') }))} />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs" disabled={!valid || submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save address'}
            </Button>
            {reward.shippingAddress && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setAddress(reward.shippingAddress!); setEditing(false); }}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AmbassadorsPage;
