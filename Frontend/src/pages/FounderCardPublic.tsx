import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  Globe,
  Linkedin,
  MapPin,
  MessageSquare,
  Sparkles,
  Twitter,
  UserPlus,
  Zap,
} from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { SignInModal } from '@/components/SignInModal';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ReportButton } from '@/components/ReportButton';
import { ConnectionNotes } from '@/components/ConnectionNotes';
import { CardActionRow } from '@/components/CardActionRow';
import { CommonGroundPanel } from '@/components/CommonGroundPanel';
import { useAppStore } from '@/store/appStore';
import { useActiveEventId } from '@/lib/useActiveEvent';
import { founderCardService, type PublicCard } from '@/services/founderCard.service';
import { useJsonLd } from '@/lib/useJsonLd';
import { WhatIsFounderKey } from '@/components/WhatIsFounderKey';
import { connectionsService } from '@/services/connections.service';
import { useStartConversation } from '@/hooks/useMessages';

interface FounderCardPublicProps {
  /**
   * 'app' — full chrome (top nav), assumes signed-in user.
   * 'public' — minimal chrome, used for /c/:slug shareable URLs.
   */
  mode: 'app' | 'public';
}

/**
 * Public FounderCard page — the destination for QR scans and NFC taps.
 *
 * Two modes share one component:
 *   - /card/:userId  → mode="app", in-app, signed-in viewers
 *   - /c/:slug       → mode="public", shareable, may be unauthenticated
 *
 * Anonymous viewers can still see the card but get a SignInModal overlay when
 * they try to "Save contact" / "Connect" — same Luma pattern as Phase 2.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FounderCardPublic = ({ mode }: FounderCardPublicProps) => {
  const params = useParams<{ userId?: string; slug?: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const currentUser = useAppStore((s) => s.user);
  const activeEventId = useActiveEventId();
  const [signInOpen, setSignInOpen] = useState(false);

  const queryKey = useMemo(
    () => ['public-card', mode, params.userId ?? params.slug],
    [mode, params.userId, params.slug]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      if (mode === 'public' && params.slug) {
        const res = await founderCardService.getPublicCardBySlug(params.slug);
        return res.data;
      }
      if (params.userId) {
        // Smart: UUID → fetch by user id; otherwise treat as username.
        const isUuid = UUID_RE.test(params.userId);
        const res = isUuid
          ? await founderCardService.getPublicCardByUserId(params.userId)
          : await founderCardService.getPublicCardByUsername(params.userId);
        return res.data;
      }
      throw new Error('Missing card identifier');
    },
    enabled: Boolean(params.userId ?? params.slug),
  });

  const connect = useMutation({
    mutationFn: async (card: PublicCard) =>
      connectionsService.connectViaScan({
        targetUserId: card.userId,
        eventId: activeEventId ?? undefined,
        method: 'QR',
      }),
    onSuccess: () => {
      toast.success('Saved to your network');
      navigate('/connections');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not connect');
    },
  });

  const startConvo = useStartConversation();
  const handleMessage = () => {
    if (!data) return;
    startConvo.mutate(data.userId, {
      onSuccess: ({ data: convo }) => navigate(`/messages/${convo.id}`),
    });
  };

  // Existing-connection lookup so the hero shows "Connected" instead of an
  // already-redundant "Save to network" button.
  const connectionQuery = useQuery({
    queryKey: ['connection-with', data?.userId],
    queryFn: () =>
      connectionsService.findConnectionWith(data!.userId),
    enabled: !!data?.userId && isAuthenticated && data!.userId !== currentUser?.id,
    select: (res) => res.data,
  });
  const isConnected = connectionQuery.data?.status === 'ACCEPTED';
  const isPending = connectionQuery.data?.status === 'PENDING';

  const handleConnect = () => {
    if (!isAuthenticated) {
      setSignInOpen(true);
      return;
    }
    if (!data) return;
    if (data.userId === currentUser?.id) {
      toast.info("That's you!");
      return;
    }
    connect.mutate(data);
  };

  // Normalize page-content rendering (used by both modes)
  const card = data;
  const profile = card?.user.profile;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : card?.user.email;
  const initial = fullName?.charAt(0)?.toUpperCase() ?? '?';

  const cardUrl =
    typeof window !== 'undefined' && card?.slug
      ? `${window.location.origin}/c/${card.slug}`
      : '';

  // Schema.org Person structured data for the public founder card.
  useJsonLd(
    card && profile
      ? {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: fullName,
          jobTitle: profile.position ?? undefined,
          worksFor: profile.company ? { '@type': 'Organization', name: profile.company } : undefined,
          image: profile.avatar ?? undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        }
      : null
  );

  const body = (
    <div className="space-y-6">
      <WhatIsFounderKey />
      {isLoading && (
        <Surface padding="lg" className="text-center">
          <p className="text-sm text-muted-foreground">Loading card…</p>
        </Surface>
      )}

      {isError && (
        <Surface padding="lg" className="text-center">
          <p className="text-sm text-foreground">Card not found.</p>
        </Surface>
      )}

      {card && (
        <>
          {/* Hero */}
          <Surface padding="lg" className="relative text-center">
            <div className="flex flex-col items-center gap-4">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt={fullName ?? 'Avatar'}
                  className="h-20 w-20 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-2xl font-semibold text-foreground">
                  {initial}
                </div>
              )}
              <div>
                <div className="flex items-center justify-center gap-2">
                  <h1 className="text-2xl font-semibold text-foreground">{fullName}</h1>
                  {card.status === 'ACTIVE' && (
                    <BadgeCheck className="h-5 w-5 text-primary" aria-label="Verified" />
                  )}
                </div>
                {(profile?.position || profile?.company) && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {[profile?.position, profile?.company].filter(Boolean).join(' · ')}
                  </p>
                )}
                {profile?.location && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {profile.location}
                  </p>
                )}
                {card.memberId && (
                  <p className="mt-1.5 font-mono text-xs font-semibold tracking-wider text-primary">
                    {card.memberId}
                  </p>
                )}
              </div>

              {profile?.bio && (
                <p className="max-w-md text-sm text-muted-foreground">{profile.bio}</p>
              )}

              {isAuthenticated && card.userId !== currentUser?.id && (
                <div className="absolute right-3 top-3">
                  <ReportButton
                    targetType="USER"
                    targetId={card.userId}
                    targetLabel={fullName ?? undefined}
                    blockUserId={card.userId}
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {/* Connect / Connected state — hide the connect button once
                    the relationship is ACCEPTED. PENDING shows an "awaiting
                    response" chip. */}
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-500">
                    <BadgeCheck className="h-4 w-4" /> Connected
                  </span>
                ) : isPending ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-500">
                    Request sent
                  </span>
                ) : (
                  <Button onClick={handleConnect} disabled={connect.isPending}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    {connect.isPending
                      ? 'Connecting…'
                      : isAuthenticated
                        ? 'Save to network'
                        : 'Sign in to connect'}
                  </Button>
                )}
                {isAuthenticated && card.userId !== currentUser?.id && (
                  <Button
                    variant="outline"
                    onClick={handleMessage}
                    disabled={startConvo.isPending}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {startConvo.isPending ? 'Opening…' : 'Message'}
                  </Button>
                )}
                {cardUrl && navigator.share && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator
                        .share({ title: `${fullName} on FounderKey`, url: cardUrl })
                        .catch(() => {});
                    }}
                  >
                    Share
                  </Button>
                )}
              </div>
            </div>
          </Surface>

          {/* Skills / interests / lookingFor */}
          {profile && (profile.skills.length || profile.interests.length || profile.lookingFor.length) > 0 && (
            <div className="grid gap-4 md:grid-cols-3">
              {profile.skills.length > 0 && (
                <Surface>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </Surface>
              )}
              {profile.interests.length > 0 && (
                <Surface>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Interests
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </Surface>
              )}
              {profile.lookingFor.length > 0 && (
                <Surface>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Looking for
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.lookingFor.map((s) => (
                      <span key={s} className="chip">
                        {s}
                      </span>
                    ))}
                  </div>
                </Surface>
              )}
            </div>
          )}

          {/* Socials */}
          {profile && (profile.linkedin || profile.twitter || profile.website) && (
            <Surface>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Connect online
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.linkedin && (
                  <SocialLink href={profile.linkedin} icon={<Linkedin className="h-4 w-4" />}>
                    LinkedIn
                  </SocialLink>
                )}
                {profile.twitter && (
                  <SocialLink href={profile.twitter} icon={<Twitter className="h-4 w-4" />}>
                    Twitter
                  </SocialLink>
                )}
                {profile.website && (
                  <SocialLink href={profile.website} icon={<Globe className="h-4 w-4" />}>
                    Website
                  </SocialLink>
                )}
              </div>
            </Surface>
          )}

          {/* Quick actions row + Common ground — only when viewing someone else
              while signed in. Owners viewing their own card don't need either. */}
          {isAuthenticated && card.userId !== currentUser?.id && (
            <>
              <CardActionRow card={card} cardUrl={cardUrl} showPersonal={mode === 'app'} />
              <CommonGroundPanel targetUserId={card.userId} enabled={isAuthenticated} />
            </>
          )}

          {/* Private notes (only for signed-in users viewing someone else's card) */}
          {isAuthenticated && card.userId !== currentUser?.id && (
            <ConnectionNotes targetUserId={card.userId} />
          )}

          {/* FK score + QR */}
          <div className="grid gap-4 md:grid-cols-2">
            <Surface className="flex flex-col items-start gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                FK Score
              </p>
              <div className="flex items-baseline gap-2">
                <p className="font-mono text-5xl font-semibold tabular-nums text-foreground">
                  {card.user.gamification?.fkScore ?? 0}
                </p>
                <span className="text-sm text-muted-foreground">
                  · L{card.user.gamification?.level ?? 1}
                </span>
              </div>
              {card.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1 chip-primary">
                  <Sparkles className="h-3 w-3" /> Founder Card active
                </span>
              )}
            </Surface>

            {cardUrl && (
              <Surface className="flex items-center justify-center">
                <QRCodeSVG
                  value={cardUrl}
                  size={160}
                  fgColor="#0D0D0D"
                  bgColor="transparent"
                  level="M"
                />
              </Surface>
            )}
          </div>
        </>
      )}
    </div>
  );

  // Layout chrome differs by mode — but unauthenticated visitors landing
  // on the in-app route (e.g. /card/some-username) get the public chrome.
  if (mode === 'app' && isAuthenticated) {
    return (
      <AppLayout>
        <div className="space-y-6 pb-24 md:pb-8">{body}</div>
        <SignInModal
          open={signInOpen}
          onOpenChange={setSignInOpen}
          intendedRoute={
            params.userId ? `/card/${params.userId}` : params.slug ? `/c/${params.slug}` : undefined
          }
          title="Sign in to connect"
          description="Save this card to your network in one click."
        />
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-xwide items-center justify-between px-6 py-5">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {isAuthenticated ? 'Dashboard' : 'Home'}
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-6 pb-16">
        <div className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Zap className="h-3 w-3" /> FounderKey card
        </div>
        {body}
      </main>
      <SignInModal
        open={signInOpen}
        onOpenChange={setSignInOpen}
        intendedRoute={params.slug ? `/c/${params.slug}` : undefined}
        title="Sign in to connect"
        description="Save this card to your network in one click."
      />
    </div>
  );
};

const SocialLink = ({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <a
    href={href.startsWith('http') ? href : `https://${href}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-secondary"
  >
    {icon}
    {children}
    <ExternalLink className="h-3 w-3 text-muted-foreground" />
  </a>
);

export default FounderCardPublic;
