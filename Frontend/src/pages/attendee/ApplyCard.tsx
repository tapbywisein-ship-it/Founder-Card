import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/AppLayout';
import { Logo } from '@/components/Logo';
import { CreditCard, CheckCircle2, XCircle, Zap, Package, MapPin, ChevronRight, ChevronLeft, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyCard, useBuyCard } from '@/hooks/useFounderCard';
import { useMyProfile } from '@/hooks/useProfile';
import { useAppStore } from '@/store/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import type { ShippingAddress } from '@/services/payments.service';

const CARD_PRICE = 499;

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
  'West Bengal','Delhi','Jammu & Kashmir','Ladakh','Chandigarh','Puducherry',
];

const empty: ShippingAddress = {
  fullName: '', phone: '', addressLine1: '', addressLine2: '',
  city: '', state: '', pincode: '',
};

function validateAddress(a: ShippingAddress): Partial<Record<keyof ShippingAddress, string>> {
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};
  if (!a.fullName.trim()) errors.fullName = 'Required';
  if (!/^[6-9]\d{9}$/.test(a.phone)) errors.phone = 'Enter a valid 10-digit mobile number';
  if (!a.addressLine1.trim()) errors.addressLine1 = 'Required';
  if (!a.city.trim()) errors.city = 'Required';
  if (!a.state) errors.state = 'Required';
  if (!/^\d{6}$/.test(a.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code';
  return errors;
}

const ApplyCardPage = () => {
  const { data: card, isLoading } = useMyCard();
  const { data: profileData } = useMyProfile();
  // Use store snapshot to skip skeleton — show page immediately, card detail loads in background.
  const storeUser = useAppStore((s) => s.user);
  const hasCardInStore = storeUser?.hasFounderCard ?? false;
  const profile = profileData?.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
  const buyMutation = useBuyCard({ name: fullName, email: profileData?.email });

  const [step, setStep] = useState<'benefits' | 'address'>('benefits');
  const [address, setAddress] = useState<ShippingAddress>({ ...empty, fullName });
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleProceed = () => {
    const errs = validateAddress(address);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    buyMutation.mutate(address);
  };

  // Only block on skeleton if we have no store hint and card data hasn't arrived yet.
  if (isLoading && !hasCardInStore) {
    return (
      <AppLayout>
        <div className="max-w-content mx-auto space-y-4 pb-24 md:pb-8">
          <div className="h-8 w-48 bg-muted/50 rounded animate-pulse" />
          <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (card && (card.status === 'DEACTIVATED' || card.status === 'REJECTED')) {
    const isRejected = card.status === 'REJECTED';
    return (
      <AppLayout>
        <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-8">
          <h1 className="text-3xl font-semibold text-foreground">Tap Card</h1>
          <Surface className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20">
              <XCircle className="w-7 h-7 text-rose-400" />
            </div>
            <p className="text-lg font-semibold text-foreground">{isRejected ? 'Not Approved' : 'Deactivated'}</p>
            <p className="text-sm text-muted-foreground">
              {isRejected ? (card.reason ?? 'Your application was not approved at this time.') : 'Your card has been deactivated. Contact support for help.'}
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </Surface>
        </div>
      </AppLayout>
    );
  }

  if (card?.physicalCardOrdered && !card.nfcTagId) {
    const isDispatched = card.fulfillmentStatus === 'DISPATCHED' || card.fulfillmentStatus === 'DELIVERED';
    return (
      <AppLayout>
        <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-8">
          <h1 className="text-3xl font-semibold text-foreground">Tap Card</h1>
          <Surface className="text-center space-y-4">
            <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full ${isDispatched ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'} border`}>
              {isDispatched
                ? <Truck className="w-7 h-7 text-blue-400" />
                : <Package className="w-7 h-7 text-amber-400" />
              }
            </div>
            <p className="text-lg font-semibold text-foreground">
              {isDispatched ? 'On its way!' : 'Order Confirmed'}
            </p>
            <p className={`text-sm font-medium ${isDispatched ? 'text-blue-500' : 'text-amber-500'}`}>
              {isDispatched ? 'Dispatched' : 'Being Prepared'}
            </p>

            {isDispatched && card.trackingId ? (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-left space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Tracking Info</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Courier</span>
                  <span className="text-xs font-semibold text-foreground">{card.trackingProvider}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Tracking ID</span>
                  <span className="text-xs font-mono font-semibold text-foreground">{card.trackingId}</span>
                </div>
                {card.dispatchedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Dispatched on</span>
                    <span className="text-xs text-foreground">{new Date(card.dispatchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Your physical NFC card is being prepared and will be shipped soon. We'll notify you once it's on the way.
              </p>
            )}

            <p className="text-xs text-muted-foreground">Estimated delivery: 5–7 working days from dispatch.</p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </Surface>
        </div>
      </AppLayout>
    );
  }

  if (card?.nfcTagId) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-8">
          <h1 className="text-3xl font-semibold text-foreground">Tap Card</h1>
          <Surface className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Your physical NFC card is live</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <Logo size="sm" />
                <div>
                  <p className="font-bold text-foreground">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{profileData?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Founder Card</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Tap your card against any phone to instantly open your verified founder profile — no app needed.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </Surface>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto space-y-6 pb-24 md:pb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Get your Tap Card</h1>
          <p className="text-sm text-muted-foreground mt-1">A physical NFC card that shares your profile with a single tap.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {['Benefits', 'Delivery Address'].map((label, i) => {
            const current = step === 'benefits' ? 0 : 1;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className={`flex-1 h-px w-8 ${current >= i ? 'bg-primary' : 'bg-border'}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${current >= i ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${current >= i ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>{i + 1}</span>
                  {label}
                </div>
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {step === 'benefits' && (
            <motion.div key="benefits" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              <Surface className="space-y-5">
                <div className="space-y-3">
                  {[
                    { title: 'Tap to share — no app needed', desc: 'Works on any NFC-enabled iPhone or Android. One tap shares your full profile instantly.' },
                    { title: 'QR code on every card', desc: 'Scan-friendly fallback for phones without NFC or in low-connectivity venues.' },
                    { title: 'Verified founder badge', desc: 'Your profile gets a Founder badge — signals credibility at events and on your public card.' },
                    { title: 'Your profile, always up to date', desc: 'Edit your details anytime. The card always points to your latest profile — no reprinting.' },
                    { title: 'Built-in lead capture', desc: 'Visitors can leave their details on your card page even without signing up.' },
                    { title: 'Priority event access & exclusive perks', desc: 'Early RSVP windows, founder-only events, and higher FK Score multipliers.' },
                    { title: 'Free shipping across India', desc: 'Delivered to your doorstep. Usually within 5–7 business days.' },
                  ].map(({ title, desc }) => (
                    <div key={title} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-4 flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-foreground">₹{CARD_PRICE}</span>
                  <span className="text-sm text-muted-foreground">one-time + free shipping</span>
                </div>
                <Button className="w-full" size="lg" onClick={() => setStep('address')}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">Secure payment via Razorpay.</p>
              </Surface>
            </motion.div>
          )}

          {step === 'address' && (
            <motion.div key="address" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.2 }}>
              <Surface className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">Delivery Address</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="fullName">Full name *</Label>
                    <Input id="fullName" value={address.fullName} onChange={(e) => handleChange('fullName', e.target.value)} placeholder="As on courier" />
                    {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="phone">Mobile number *</Label>
                    <Input id="phone" type="tel" maxLength={10} value={address.phone} onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" />
                    {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="addressLine1">Address line 1 *</Label>
                    <Input id="addressLine1" value={address.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} placeholder="Flat / House no., Building, Street" />
                    {errors.addressLine1 && <p className="text-xs text-destructive">{errors.addressLine1}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="addressLine2">Address line 2 <span className="text-muted-foreground">(optional)</span></Label>
                    <Input id="addressLine2" value={address.addressLine2} onChange={(e) => handleChange('addressLine2', e.target.value)} placeholder="Area, Locality, Landmark" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" value={address.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="City" />
                      {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="pincode">PIN code *</Label>
                      <Input id="pincode" maxLength={6} value={address.pincode} onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))} placeholder="6 digits" />
                      {errors.pincode && <p className="text-xs text-destructive">{errors.pincode}</p>}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="state">State *</Label>
                    <select
                      id="state"
                      value={address.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
                  </div>
                </div>

                <div className="border-t border-border pt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Order total</span>
                  <span className="font-bold text-foreground">₹{CARD_PRICE} + free delivery</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" onClick={() => setStep('benefits')} disabled={buyMutation.isPending}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button className="flex-1" size="lg" onClick={handleProceed} disabled={buyMutation.isPending}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {buyMutation.isPending ? 'Opening payment…' : `Pay ₹${CARD_PRICE}`}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground text-center">Secure payment via Razorpay. Card ships within 5–7 working days.</p>
              </Surface>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default ApplyCardPage;
