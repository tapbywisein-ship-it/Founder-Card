import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  ContactRound,
  Lock,
  Star,
  ThumbsUp,
} from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { SignInModal } from '@/components/SignInModal';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ReportButton } from '@/components/ReportButton';
import { blockIcon } from '@/components/CardBlocksEditor';
import { CardLeadForm } from '@/components/CardLeadForm';
import { ConnectionNotes } from '@/components/ConnectionNotes';
import { CardActionRow } from '@/components/CardActionRow';
import { CommonGroundPanel } from '@/components/CommonGroundPanel';
import { useAppStore } from '@/store/appStore';
import { useActiveEventId } from '@/lib/useActiveEvent';
import { apiDownload } from '@/services/api';
import { founderCardService, type PublicCard } from '@/services/founderCard.service';
import { useJsonLd } from '@/lib/useJsonLd';
import { useSeo } from '@/lib/useSeo';
import { WhatIsTapByWisein } from '@/components/WhatIsTapByWisein';
import { connectionsService } from '@/services/connections.service';
import { useStartConversation } from '@/hooks/useMessages';

/** Display labels for the profile "openTo" badge tokens. */
const OPEN_TO_LABELS: Record<string, string> = {
  HIRING: 'Hiring',
  INVESTING: 'Investing',
  COFOUNDER: 'Looking for a co-founder',
  MENTORING: 'Mentoring',
};

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

  // Endorse / withdraw an endorsement on a skill chip. Connections only —
  // the server enforces the same gate; refetch the card so counts update.
  const qc = useQueryClient();
  const endorseMutation = useMutation({
    mutationFn: ({ skill, endorse }: { skill: string; endorse: boolean }) =>
      founderCardService.endorseSkill(data!.userId, skill, endorse),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err: Error) => toast.error(err.message),
  });
  const canEndorse = isAuthenticated && isConnected && data?.userId !== currentUser?.id;

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

  // "View as visitor" — owners preview exactly what a stranger sees
  // (contact locked, no owner shortcuts). Entered via ?preview=visitor.
  const [searchParams] = useSearchParams();
  const isOwner = !!card && card.userId === currentUser?.id;
  const previewAsVisitor = isOwner && searchParams.get('preview') === 'visitor';
  const contactUnlocked = previewAsVisitor ? false : !!card?.contactUnlocked;
  const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : (card?.user.email ?? undefined);

  // Save contact — must go through an authenticated fetch (a plain <a href>
  // can't send the auth header, so the server would treat connections as
  // strangers and strip phone/email from the vCard).
  const [savingContact, setSavingContact] = useState(false);
  const handleSaveContact = async () => {
    if (!card?.slug) return;
    setSavingContact(true);
    try {
      const blob = await apiDownload(
        `/founder-cards/public/slug/${encodeURIComponent(card.slug)}/vcard.vcf`
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(fullName ?? 'contact').replace(/\s+/g, '-').toLowerCase()}.vcf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download contact');
    } finally {
      setSavingContact(false);
    }
  };
  const initial = fullName?.charAt(0)?.toUpperCase() ?? '?';

  const cardUrl =
    typeof window !== 'undefined' && card?.slug
      ? `${window.location.origin}/c/${card.slug}`
      : '';

  // Schema.org Person structured data for the public tap card.
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

  // Per-route SEO meta for the public tap card.
  useSeo(
    card && profile
      ? {
          title: `${fullName}${profile.company ? ` · ${profile.company}` : ''}`,
          description:
            (profile.bio ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
            `${fullName}${profile.position ? `, ${profile.position}` : ''}${
              profile.company ? ` at ${profile.company}` : ''
            } - connect on TapByWisein.`,
          canonical: card.slug ? `/c/${card.slug}` : undefined,
          image: profile.avatar ?? undefined,
          type: 'profile',
        }
      : {}
  );

  const body = (
    <div className="space-y-6">
      <WhatIsTapByWisein />
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
          {/* Visitor-preview banner — owner is seeing the stranger view */}
          {previewAsVisitor && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0" />
                Viewing as a visitor - this is what people see before connecting.
              </span>
              <button
                type="button"
                onClick={() => navigate(window.location.pathname, { replace: true })}
                className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80"
              >
                Exit preview
              </button>
            </div>
          )}

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
                {profile?.status && (
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    {profile.status}
                  </span>
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

              {card.blocks && card.blocks.length > 0 && (
                <div className="flex w-full max-w-md flex-col gap-2 pt-1">
                  {card.blocks.map((b) => {
                    const Icon = blockIcon(b.type);
                    return (
                      <a
                        key={b.id}
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-card border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-secondary"
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                        <span className="flex-1 truncate text-sm font-medium text-foreground">{b.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      </a>
                    );
                  })}
                </div>
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
                        .share({ title: `${fullName} on TapByWisein`, url: cardUrl })
                        .catch(() => {});
                    }}
                  >
                    Share
                  </Button>
                )}
                {/* .vcf download — contact details unlock by connecting */}
                {card.slug && contactUnlocked && (
                  <Button variant="outline" onClick={handleSaveContact} disabled={savingContact}>
                    <ContactRound className="mr-2 h-4 w-4" />
                    {savingContact ? 'Downloading…' : 'Save contact'}
                  </Button>
                )}
              </div>

              {/* Contact gate — the nudge that makes people hit Connect */}
              {!contactUnlocked && (card.userId !== currentUser?.id || previewAsVisitor) && (
                <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Connect with {profile?.firstName || 'them'} to unlock contact details and save
                  them to your phone.
                </p>
              )}

              {/* Lead capture — visitors (not the owner) can leave their details */}
              {currentUser?.id !== card.userId && (
                <div className="pt-3">
                  <CardLeadForm ownerId={card.userId} ownerName={fullName ?? undefined} />
                </div>
              )}
            </div>
          </Surface>

          {/* Pitch spotlight — the memorable "what I'm building" block */}
          {profile?.pitchName && (
            <Surface className="border-primary/25" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.08), transparent)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                    Building
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{profile.pitchName}</h2>
                    {profile.pitchStage && <span className="chip">{profile.pitchStage}</span>}
                  </div>
                  {profile.pitchTagline && (
                    <p className="mt-1 text-sm text-muted-foreground">{profile.pitchTagline}</p>
                  )}
                </div>
              </div>
              {profile.pitchUrl && (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <a href={profile.pitchUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View demo / deck
                  </a>
                </Button>
              )}
            </Surface>
          )}

          {/* Organizer trust block — host history + ratings turn every card
              share into event marketing */}
          {card.organizerStats && (
            <Surface>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-foreground">Hosts events</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {card.organizerStats.avgRating != null && (
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {card.organizerStats.avgRating}
                      <span className="font-normal text-muted-foreground">
                        ({card.organizerStats.ratingCount})
                      </span>
                    </span>
                  )}
                  <span>{card.organizerStats.eventsHosted} events</span>
                  <span>{card.organizerStats.totalAttendees} attendees</span>
                </div>
              </div>
              {card.organizerStats.upcomingEvents.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Upcoming events
                  </p>
                  {card.organizerStats.upcomingEvents.map((e) => (
                    <a
                      key={e.id}
                      href={`/e/${e.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {e.locationType === 'VIRTUAL' ? ' · Online' : e.city ? ` · ${e.city}` : ''}
                        </p>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
            </Surface>
          )}

          {/* Open to — the 5-second conversation starter */}
          {profile && (profile.openTo?.length ?? 0) > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Open to
              </span>
              {profile.openTo!.map((o) => (
                <span
                  key={o}
                  className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {OPEN_TO_LABELS[o] ?? o}
                </span>
              ))}
            </div>
          )}

          {/* "Why we should talk" — help-with vs looking-for, then interests */}
          {profile && (profile.skills.length > 0 || profile.interests.length > 0 || profile.lookingFor.length > 0) && (
            <div className="grid gap-4 md:grid-cols-3">
              {profile.skills.length > 0 && (
                <Surface>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    I can help with
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((s) => {
                      const count = data.skillEndorsements?.[s] ?? 0;
                      const mine = data.viewerEndorsed?.includes(s) ?? false;
                      const label = (
                        <>
                          {s}
                          {count > 0 && <span className="font-semibold">· {count}</span>}
                        </>
                      );
                      // Connections can tap a chip to endorse (tap again to withdraw).
                      return canEndorse ? (
                        <button
                          key={s}
                          type="button"
                          onClick={() => endorseMutation.mutate({ skill: s, endorse: !mine })}
                          disabled={endorseMutation.isPending}
                          title={mine ? `You endorsed ${s} - tap to withdraw` : `Endorse ${s}`}
                          className={`chip inline-flex items-center gap-1 transition-all ${
                            mine
                              ? 'ring-1 ring-primary text-primary'
                              : 'hover:ring-1 hover:ring-primary/40'
                          }`}
                        >
                          {label}
                          <ThumbsUp className={`h-3 w-3 ${mine ? 'fill-current' : 'opacity-50'}`} />
                        </button>
                      ) : (
                        <span key={s} className="chip inline-flex items-center gap-1">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                  {canEndorse && (
                    <p className="mt-2 text-[10px] text-muted-foreground/70">
                      Tap a skill to endorse it.
                    </p>
                  )}
                </Surface>
              )}
              {profile.lookingFor.length > 0 && (
                <Surface>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    I'm looking for
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.lookingFor.map((s) => (
                      <span key={s} className="chip-primary">
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
                  <Sparkles className="h-3 w-3" /> Tap Card active
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
      <PortalLayout>
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
      </PortalLayout>
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
          <Zap className="h-3 w-3" /> TapByWisein card
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
