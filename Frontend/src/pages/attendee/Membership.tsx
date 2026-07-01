import { motion } from 'framer-motion';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Crown, Check, Bell, Search, BarChart3, Sparkles, AlertCircle } from 'lucide-react';
import { useMembership, useSubscribe, useCancelMembership } from '@/hooks/useMembership';
import type { PlanKey } from '@/services/membership.service';

const PERK_ICONS = [Bell, Search, BarChart3];

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

const MembershipPage = () => {
  const { data: membership, isLoading, isError } = useMembership();
  const subscribe = useSubscribe();
  const cancel = useCancelMembership();

  const isActive = membership?.isActive ?? false;
  const status = membership?.status ?? 'NONE';
  const plans = membership?.plans ?? [];
  const perks = membership?.perks ?? [];

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8 max-w-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Founder Membership</h1>
            <p className="text-sm text-muted-foreground">Get more out of your network.</p>
          </div>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Couldn't load membership. Please refresh.
          </div>
        )}

        {/* Active / cancelled status card */}
        {isActive && (
          <Surface className="border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="font-semibold text-foreground">
                    {status === 'CANCELLED' ? 'Membership ending' : "You're a Founder member"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {status === 'CANCELLED'
                      ? `Access until ${fmtDate(membership?.currentPeriodEnd ?? null)}`
                      : `Renews ${fmtDate(membership?.currentPeriodEnd ?? null)} · ${membership?.plan === 'annual' ? 'Annual' : 'Monthly'} plan`}
                  </p>
                </div>
              </div>
              {status === 'ACTIVE' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-rose-400"
                  onClick={() => {
                    if (window.confirm('Cancel membership? You keep access until the end of your billing period.')) {
                      cancel.mutate();
                    }
                  }}
                  disabled={cancel.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </Surface>
        )}

        {status === 'HALTED' && (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Your last membership payment failed. Re-subscribe below to restore your perks.
          </div>
        )}

        {/* Perks */}
        <Surface>
          <h2 className="text-sm font-semibold text-foreground mb-3">What you get</h2>
          <div className="space-y-3">
            {perks.map((perk, i) => {
              const Icon = PERK_ICONS[i] ?? Check;
              return (
                <div key={perk} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-foreground">{perk}</p>
                </div>
              );
            })}
          </div>
        </Surface>

        {/* Plans — hidden when already active */}
        {!isActive && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {isLoading ? (
              [...Array(2)].map((_, i) => <Surface key={i} className="h-44 animate-pulse" />)
            ) : (
              plans.map((plan, i) => {
                const isAnnual = plan.key === 'annual';
                const monthlyEquiv = isAnnual ? Math.round(plan.amountInr / 12) : plan.amountInr;
                return (
                  <motion.div key={plan.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Surface className={isAnnual ? 'border-amber-500/40 relative overflow-hidden' : ''}>
                      {isAnnual && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full">
                          Best value
                        </span>
                      )}
                      <p className="text-sm font-medium text-muted-foreground">{plan.label}</p>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-foreground">₹{plan.amountInr.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-muted-foreground">/{isAnnual ? 'yr' : 'mo'}</span>
                      </div>
                      {isAnnual && (
                        <p className="text-[11px] text-emerald-500 mt-0.5">≈ ₹{monthlyEquiv}/mo · 2 months free</p>
                      )}
                      <Button
                        className="w-full mt-4"
                        variant={isAnnual ? 'default' : 'outline'}
                        onClick={() => subscribe.mutate(plan.key as PlanKey)}
                        disabled={subscribe.isPending}
                      >
                        {subscribe.isPending ? 'Opening…' : 'Subscribe'}
                      </Button>
                    </Surface>
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Secure recurring payment via Razorpay. Cancel anytime — you keep access until your period ends.
        </p>
      </div>
    </PortalLayout>
  );
};

export default MembershipPage;
