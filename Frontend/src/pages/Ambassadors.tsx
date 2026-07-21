import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Award, MapPin, Search, Check, Clock, X, Loader2 } from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { PublicNav } from '@/components/PublicNav';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store/appStore';
import { ambassadorsService, type AmbassadorStatus } from '@/services/ambassadors.service';

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
        <main className="max-w-content mx-auto px-4 py-6 md:py-10">{children}</main>
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
            {city ? `No ambassadors in “${city}” yet.` : 'No active ambassadors yet — apply to be the first.'}
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
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{name}</p>
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
  mine: { status: AmbassadorStatus; reviewNote?: string | null } | null;
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

  // Already applied → show status tracker.
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

export default AmbassadorsPage;
