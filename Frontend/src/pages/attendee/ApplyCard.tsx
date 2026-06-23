import { useState } from 'react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { CreditCard, CheckCircle2, Clock, XCircle, ArrowLeft, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMyCard, useApplyForCard } from '@/hooks/useFounderCard';
import { useMyProfile } from '@/hooks/useProfile';
import { motion } from 'framer-motion';

const ApplyCardPage = () => {
  const [message, setMessage] = useState('');
  const { data: card, isLoading } = useMyCard();
  const { data: profileData } = useMyProfile();
  const applyMutation = useApplyForCard();

  const profile = profileData?.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : '';

  const statusConfig = {
    PENDING: { icon: Clock, label: 'Under Review', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', desc: 'Your application is being reviewed. We\'ll notify you soon.' },
    ACTIVE: { icon: CheckCircle2, label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', desc: 'Your FounderKey card is active! Share it with your network.' },
    REJECTED: { icon: XCircle, label: 'Not Approved', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', desc: card?.reason ?? 'Your application was not approved at this time.' },
    DEACTIVATED: { icon: XCircle, label: 'Deactivated', color: 'text-muted-foreground', bg: 'bg-muted/50', desc: 'Your card has been deactivated.' },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="w-10 h-10 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // If card exists, show status
  if (card) {
    const cfg = statusConfig[card.status];
    const Icon = cfg.icon;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 self-start max-w-md w-full">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="w-full max-w-md">
          <Surface className="text-center">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${cfg.bg} border mb-4`}>
              <Icon className={`w-8 h-8 ${cfg.color}`} />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">FounderKey Card</h2>
            <p className={`text-sm font-medium mb-3 ${cfg.color}`}>{cfg.label}</p>
            <p className="text-sm text-muted-foreground mb-6">{cfg.desc}</p>

            {card.status === 'ACTIVE' && (
              <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Logo size="sm" />
                  <div className="text-left">
                    <p className="text-lg font-bold text-foreground">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{profileData?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground font-medium">FOUNDER CARD</span>
                </div>
              </div>
            )}

            <Button className="w-full" asChild>
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </Surface>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 self-start max-w-md w-full">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Surface>
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-8 h-8 text-primary-foreground" />
            </div>

            <h1 className="text-3xl font-bold text-foreground text-center mb-2">Apply for FounderKey Card</h1>
            <p className="text-muted-foreground text-sm text-center mb-8">
              The FounderKey card unlocks premium networking, exclusive events, and verifies your founder status.
            </p>

            <div className="space-y-4 mb-6">
              {[
                'Verified founder profile',
                'Priority event access',
                'NFC-powered networking',
                'Exclusive founder community',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{benefit}</span>
                </div>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-foreground block mb-1.5">Message to reviewers (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your startup and why you'd like a FounderKey card..."
                rows={3}
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => applyMutation.mutate(message || undefined)}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending ? 'Submitting...' : 'Apply Now'}
            </Button>
          </Surface>
        </motion.div>
      </div>
    </div>
  );
};

export default ApplyCardPage;
