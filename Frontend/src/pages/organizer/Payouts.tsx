import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Clock, CheckCircle2, Percent, ChevronRight, ChevronDown,
  Building2, AlertCircle, RefreshCw, Info, ArrowRight, X,
} from 'lucide-react';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { payoutsService, type OnboardingInput } from '@/services/payouts.service';
import { formatINR } from '@/lib/currency';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
  'West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry',
];

const STATUS_META: Record<string, { label: string; color: string; description: string }> = {
  created:   { label: 'Pending KYC',  color: 'text-amber-600',   description: 'Razorpay is reviewing your details. This takes 2–5 business days.' },
  activated: { label: 'Active',       color: 'text-emerald-600', description: 'Your account is verified. Payments are automatically split.' },
  suspended: { label: 'Suspended',    color: 'text-red-600',     description: 'Your account has been suspended. Contact Razorpay support.' },
};

const TRANSFER_STATUS: Record<string, { label: string; color: string }> = {
  processed: { label: 'Transferred', color: 'text-emerald-600' },
  pending:   { label: 'Pending',     color: 'text-amber-600' },
  failed:    { label: 'Failed',      color: 'text-red-500' },
};

const emptyForm: OnboardingInput = {
  legalBusinessName: '', pan: '', contactName: '', contactEmail: '',
  contactPhone: '', street: '', city: '', state: '', postalCode: '',
  beneficiaryName: '', accountNumber: '', ifscCode: '',
};

const Payouts = () => {
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organizer', 'payouts', 'account'],
    queryFn: () => payoutsService.getRouteAccount(),
    select: (r) => r.data,
  });

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<OnboardingInput>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OnboardingInput, string>>>({});

  const onboard = useMutation({
    mutationFn: () => payoutsService.onboard(form),
    onSuccess: () => {
      toast.success('Account created, pending KYC verification from Razorpay');
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ['organizer', 'payouts', 'account'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const refresh = useMutation({
    mutationFn: () => payoutsService.refreshStatus(),
    onSuccess: (r) => {
      toast.success(`Status: ${r.data.status}`);
      qc.invalidateQueries({ queryKey: ['organizer', 'payouts', 'account'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (field: keyof OnboardingInput, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (formErrors[field]) setFormErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof OnboardingInput, string>> = {};
    if (!form.legalBusinessName.trim()) e.legalBusinessName = 'Required';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(form.pan)) e.pan = 'Enter a valid 10-char PAN';
    if (!form.contactName.trim()) e.contactName = 'Required';
    if (!form.contactEmail.includes('@')) e.contactEmail = 'Enter a valid email';
    if (!/^[6-9]\d{9}$/.test(form.contactPhone)) e.contactPhone = 'Enter a valid 10-digit mobile';
    if (!form.street.trim()) e.street = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state) e.state = 'Required';
    if (!/^\d{6}$/.test(form.postalCode)) e.postalCode = '6-digit PIN required';
    if (!form.beneficiaryName.trim()) e.beneficiaryName = 'Required';
    if (!form.accountNumber.trim()) e.accountNumber = 'Required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode)) e.ifscCode = 'Enter a valid IFSC code';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const account  = data?.account;
  const summary  = data?.summary;
  const transfers = data?.recentTransfers ?? [];
  const statusMeta = account?.razorpayAccountStatus
    ? STATUS_META[account.razorpayAccountStatus] ?? STATUS_META.created
    : null;

  return (
    <OrganizerLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automated via Razorpay Route, your share is transferred instantly when a ticket is sold.
          </p>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> Failed to load payout data.
          </div>
        )}

        {/* Earnings summary */}
        {!isLoading && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total earned',   value: formatINR(summary.totalEarnings), icon: Wallet,        accent: '' },
              { label: 'Transferred',    value: formatINR(summary.transferred),   icon: CheckCircle2,  accent: 'text-emerald-600' },
              { label: 'Pending',        value: formatINR(summary.pending),       icon: Clock,         accent: 'text-amber-600' },
              { label: 'Platform fee',   value: formatINR(summary.platformFee),   icon: Percent,       accent: 'text-muted-foreground' },
            ].map(({ label, value, icon: Icon, accent }, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                <Surface className="text-center py-5">
                  <Icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className={`text-2xl font-bold ${accent || 'text-foreground'}`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </Surface>
              </motion.div>
            ))}
          </div>
        )}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted/50 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {/* Route account status */}
        <Surface>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-base font-semibold text-foreground">Razorpay Route Account</h2>
            </div>
            {account?.razorpayAccountId && (
              <Button size="sm" variant="ghost" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refresh.isPending ? 'animate-spin' : ''}`} />
                Refresh status
              </Button>
            )}
          </div>

          {!account?.razorpayAccountId ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground">
                  <p className="font-medium">Set up automated payouts</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Connect a Razorpay Route account. Once verified, <strong>95% of every ticket sale</strong> is automatically transferred to your bank, no manual requests needed.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
                <ArrowRight className="w-4 h-4 mr-2" /> Connect bank account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-2 h-2 rounded-full ${account.razorpayAccountStatus === 'activated' ? 'bg-emerald-500' : account.razorpayAccountStatus === 'suspended' ? 'bg-red-500' : 'bg-amber-400'}`} />
                <span className={`text-sm font-semibold ${statusMeta?.color ?? 'text-foreground'}`}>{statusMeta?.label}</span>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{account.razorpayAccountId}</span>
              </div>
              {statusMeta && (
                <p className="text-xs text-muted-foreground">{statusMeta.description}</p>
              )}
              {account.razorpayAccountStatus === 'activated' && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Automatic split is live: 95% goes to your bank, 5% stays on the platform.
                </div>
              )}
            </div>
          )}
        </Surface>

        {/* Earnings by event */}
        {summary && summary.events.length > 0 && (
          <Surface>
            <h2 className="text-base font-semibold text-foreground mb-3">Earnings by event</h2>
            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border text-xs">
                    <th className="py-2 pr-4">Event</th>
                    <th className="py-2 text-right">Sales</th>
                    <th className="py-2 text-right">Gross</th>
                    <th className="py-2 text-right">Fee (5%)</th>
                    <th className="py-2 text-right">Your share</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.events.map((e) => (
                    <tr key={e.eventId} className="border-b border-border/50">
                      <td className="py-2.5 pr-4 text-foreground font-medium">{e.title}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{e.sales}</td>
                      <td className="py-2.5 text-right text-muted-foreground">{formatINR(e.gross)}</td>
                      <td className="py-2.5 text-right text-muted-foreground">−{formatINR(e.fee)}</td>
                      <td className="py-2.5 text-right font-semibold text-foreground">{formatINR(e.earning)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked cards — no horizontal scroll */}
            <div className="md:hidden space-y-2">
              {summary.events.map((e) => (
                <div key={e.eventId} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground min-w-0 truncate">{e.title}</p>
                    <p className="text-sm font-semibold text-foreground flex-shrink-0">{formatINR(e.earning)}</p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Sales</p>
                      <p className="text-foreground font-medium">{e.sales}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gross</p>
                      <p className="text-foreground font-medium">{formatINR(e.gross)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fee (5%)</p>
                      <p className="text-foreground font-medium">−{formatINR(e.fee)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        )}

        {/* Recent transfers */}
        {transfers.length > 0 && (
          <Surface>
            <h2 className="text-base font-semibold text-foreground mb-3">Recent transfers</h2>
            <div className="space-y-2">
              {transfers.map((t) => {
                const ts = TRANSFER_STATUS[t.transferStatus ?? 'pending'] ?? TRANSFER_STATUS.pending;
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm text-foreground font-medium">{t.event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatINR(Number(t.organizerEarning ?? 0))}</p>
                      <p className={`text-xs font-medium ${ts.color}`}>{ts.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        )}
      </div>

      {/* Onboarding modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg my-8"
            >
              <Surface className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Connect Razorpay Route Account</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Details used for KYC verification by Razorpay</p>
                  </div>
                  <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Business details */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Business Details</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Legal business / full name *" error={formErrors.legalBusinessName}>
                      <Input value={form.legalBusinessName} onChange={(e) => set('legalBusinessName', e.target.value)} placeholder="As per PAN card" />
                    </Field>
                    <Field label="PAN number *" error={formErrors.pan}>
                      <Input value={form.pan} onChange={(e) => set('pan', e.target.value.toUpperCase())} maxLength={10} placeholder="ABCDE1234F" className="font-mono uppercase" />
                    </Field>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contact Info</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Contact name *" error={formErrors.contactName}>
                      <Input value={form.contactName} onChange={(e) => set('contactName', e.target.value)} />
                    </Field>
                    <Field label="Mobile number *" error={formErrors.contactPhone}>
                      <Input type="tel" maxLength={10} value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit" />
                    </Field>
                    <Field label="Email *" error={formErrors.contactEmail} className="sm:col-span-2">
                      <Input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
                    </Field>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Registered Address</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Street *" error={formErrors.street}>
                      <Input value={form.street} onChange={(e) => set('street', e.target.value)} placeholder="Building, area, street" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="City *" error={formErrors.city}>
                        <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
                      </Field>
                      <Field label="PIN code *" error={formErrors.postalCode}>
                        <Input maxLength={6} value={form.postalCode} onChange={(e) => set('postalCode', e.target.value.replace(/\D/g, ''))} />
                      </Field>
                    </div>
                    <Field label="State *" error={formErrors.state}>
                      <select value={form.state} onChange={(e) => set('state', e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Bank account */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bank Account</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label="Account holder name *" error={formErrors.beneficiaryName}>
                      <Input value={form.beneficiaryName} onChange={(e) => set('beneficiaryName', e.target.value)} placeholder="As per bank records" />
                    </Field>
                    <Field label="Account number *" error={formErrors.accountNumber}>
                      <Input value={form.accountNumber} onChange={(e) => set('accountNumber', e.target.value)} className="font-mono" />
                    </Field>
                    <Field label="IFSC code *" error={formErrors.ifscCode}>
                      <Input value={form.ifscCode} onChange={(e) => set('ifscCode', e.target.value.toUpperCase())} maxLength={11} className="font-mono uppercase" placeholder="HDFC0001234" />
                    </Field>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-700">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  Razorpay will verify your details. Activation takes 2–5 business days. You'll receive an email once it's live.
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={onboard.isPending}>Cancel</Button>
                  <Button className="flex-1" onClick={() => validate() && onboard.mutate()} disabled={onboard.isPending}>
                    <ChevronRight className="w-4 h-4 mr-1" />
                    {onboard.isPending ? 'Submitting…' : 'Submit for verification'}
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </OrganizerLayout>
  );
};

// Small helper to keep form field markup DRY
const Field = ({
  label, error, children, className = '',
}: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) => (
  <div className={`space-y-1 ${className}`}>
    <Label className="text-xs">{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

export default Payouts;
