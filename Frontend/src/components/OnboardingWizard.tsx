import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChipInput } from '@/components/ChipInput';
import { HowItWorks } from '@/components/HowItWorks';
import { useUpdateProfile, useMyProfile } from '@/hooks/useProfile';
import { apiUpload } from '@/services/api';
import { profileService } from '@/services/profile.service';
import { useAppStore } from '@/store/appStore';

const SKILL_SUGGESTIONS = [
  'Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Fundraising',
  'Growth', 'Operations', 'Data', 'AI/ML', 'Hardware', 'Community',
];
const INTEREST_SUGGESTIONS = [
  'AI', 'Climate', 'FinTech', 'HealthTech', 'DevTools', 'Open source',
  'Web3', 'Robotics', 'Education', 'Biotech', 'Hardware', 'B2B SaaS',
];
const LOOKING_FOR_SUGGESTIONS = [
  'Co-founders', 'Engineers', 'Designers', 'Investors', 'Mentors',
  'Customers', 'Partners', 'Advisors', 'Employees', 'Friends',
];

interface OnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'intro' | 'avatar' | 'skills' | 'interests' | 'lookingFor' | 'card';

const STEPS: { id: Step; title: string; subtitle: string }[] = [
  { id: 'intro', title: 'Welcome to FounderKey', subtitle: 'Networking at events, in three taps.' },
  { id: 'avatar', title: 'Set up your profile', subtitle: 'A photo, your role and company help founders recognize you.' },
  { id: 'skills', title: 'What do you do?', subtitle: 'Add 3+ skills so other founders can find you.' },
  { id: 'interests', title: 'What are you into?', subtitle: 'Pick a few topics you love talking about.' },
  { id: 'lookingFor', title: "Who're you here to meet?", subtitle: 'We\'ll match you with attendees that fit.' },
  { id: 'card', title: 'Your Founder Card is ready', subtitle: 'We\'ve issued your verified card with a unique member ID.' },
];

/**
 * First-run onboarding modal. Walks new users through the fields that drive
 * matchmaking (skills, interests, lookingFor) plus an avatar. Closes itself
 * after the last step and never re-opens (set localStorage flag).
 */
export const OnboardingWizard = ({ open, onOpenChange }: OnboardingWizardProps) => {
  const { data: profileData, refetch } = useMyProfile();
  const updateMutation = useUpdateProfile();
  const activateCard = useAppStore((s) => s.activateCard);
  const updateUser = useAppStore((s) => s.updateUser);
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Hydrate from existing profile so re-running the wizard preserves values.
  useEffect(() => {
    if (!profileData) return;
    const p = profileData.profile;
    if (!p) return;
    if (p.avatar) setAvatar(p.avatar);
    if (p.bio) setBio(p.bio);
    if (p.company) setCompany(p.company);
    if (p.position) setPosition(p.position);
    if (p.skills?.length) setSkills(p.skills);
    if (p.interests?.length) setInterests(p.interests);
    if (p.lookingFor?.length) setLookingFor(p.lookingFor);
  }, [profileData]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await apiUpload<{ data: { url: string } }>('/media/upload', file);
      setAvatar(res.data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: () =>
      updateMutation.mutateAsync({ avatar, bio, company, position, skills, interests, lookingFor }),
    onSuccess: () => {
      refetch();
    },
  });

  const [issuing, setIssuing] = useState(false);

  const next = async () => {
    // Save progressively so partial completion sticks.
    await save.mutateAsync().catch(() => {});
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      finish();
    }
  };

  // Finishing onboarding auto-issues the user's ACTIVE Founder Card (FK-XXXXX).
  const finish = async () => {
    setIssuing(true);
    try {
      const res = await profileService.completeOnboarding();
      activateCard();
      if (res.data?.memberId) updateUser({ memberId: res.data.memberId });
      toast.success('Your Founder Card is ready!');
    } catch {
      // Even if card issuance hiccups, don't trap the user in onboarding.
      toast.success("You're all set");
    } finally {
      setIssuing(false);
      localStorage.setItem('fk:onboarded', '1');
      onOpenChange(false);
    }
  };

  const skip = () => {
    localStorage.setItem('fk:onboarded', '1');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {step.title}
          </DialogTitle>
          <DialogDescription>{step.subtitle}</DialogDescription>
        </DialogHeader>

        {/* Step body */}
        {step.id === 'intro' && <HowItWorks compact />}

        {step.id === 'avatar' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 h-4 w-4" />
                  )}
                  {avatar ? 'Change photo' : 'Upload photo'}
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Role / title</label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Founder & CEO"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Company</label>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Inc."
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Quick bio (optional)</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="One sentence about what you're building."
              />
            </div>
          </div>
        )}

        {step.id === 'skills' && (
          <ChipInput
            value={skills}
            onChange={setSkills}
            suggestions={SKILL_SUGGESTIONS}
            placeholder="e.g. Engineering, Fundraising"
          />
        )}

        {step.id === 'interests' && (
          <ChipInput
            value={interests}
            onChange={setInterests}
            suggestions={INTEREST_SUGGESTIONS}
            placeholder="e.g. AI, FinTech"
          />
        )}

        {step.id === 'lookingFor' && (
          <ChipInput
            value={lookingFor}
            onChange={setLookingFor}
            suggestions={LOOKING_FOR_SUGGESTIONS}
            placeholder="e.g. Co-founders, Engineers"
          />
        )}

        {step.id === 'card' && (
          <div className="rounded-card border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Founder Card
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap "Finish" and we'll instantly issue your verified Founder Card with a unique
              FK member ID, your QR code, and a shareable public profile.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  i <= stepIdx ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={skip} disabled={issuing}>
              Skip
            </Button>
            {step.id === 'card' ? (
              <Button size="sm" onClick={finish} disabled={issuing}>
                {issuing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Finish
              </Button>
            ) : (
              <Button onClick={next} size="sm" disabled={save.isPending}>
                {save.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5 order-1" />
                )}
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
