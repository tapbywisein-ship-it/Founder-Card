import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MapPin, Linkedin, Twitter, Globe, Mail, Edit3, Check, X, Camera,
  Calendar, BadgeCheck, Loader2, Phone, AtSign, Eye,
} from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { CardBlocksEditor } from '@/components/CardBlocksEditor';
import { Surface } from '@/components/Surface';
import { PlanSection } from '@/components/PlanSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useMyRegistrations } from '@/hooks/useEvents';
import { useMyOrgEvents } from '@/hooks/useOrganizer';
import { useAppStore } from '@/store/appStore';
import { apiUpload } from '@/services/api';
import { profileService } from '@/services/profile.service';

/** Social/website link fields — validated as URLs (backend requires a full URL). */
const LINK_KEYS = ['linkedin', 'twitter', 'website', 'pitchUrl'] as const;

/** Backend caps each skill/interest/looking-for tag at 50 chars (`z.string().max(50)`). */
const MAX_TAG_LEN = 50;

/** Pitch-stage options for the spotlight block. */
const PITCH_STAGES = ['Idea', 'MVP', 'Pre-seed', 'Seed', 'Series A+', 'Revenue', 'Profitable'] as const;

/** "Open to" badge options — tokens must match the backend enum. */
const OPEN_TO_OPTIONS = [
  { value: 'HIRING', label: 'Hiring' },
  { value: 'INVESTING', label: 'Investing' },
  { value: 'COFOUNDER', label: 'Looking for a co-founder' },
  { value: 'MENTORING', label: 'Mentoring' },
] as const;

/** Prepend https:// when the user omits a scheme so "example.com" is treated as a URL. */
function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return '';
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

/** Empty is allowed; otherwise must parse to an http(s) URL — mirrors the backend `.url()` rule. */
function isValidUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  try {
    const u = new URL(normalizeUrl(v));
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Profile — Posh-style oversized FK Score numeric display, graphite Tap Card chip,
 * Events Hosted (organizers only) and Events Attending lists.
 */
const ProfilePage = () => {
  const user = useAppStore((s) => s.user);
  const { data: profileData, isLoading: profileLoading } = useMyProfile();
  const updateMutation = useUpdateProfile();
  const { data: regsData } = useMyRegistrations(1, 5);
  const isOrganizer = user?.role === 'organizer';
  // Only fetch hosted events for organizers; attendees won't have any.
  const { data: hostedData } = useMyOrgEvents(1, 5, isOrganizer);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const onAvatarPick = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar must be under 5 MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const res = await apiUpload<{ data: { url: string } }>('/media/upload', file);
      await updateMutation.mutateAsync({ avatar: res.data.url });
      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const profile = profileData?.profile;
  const email = profileData?.email ?? user?.email ?? '';
  const fkScore = user?.fkScore ?? 0;
  const cardActive = user?.cardStatus === 'active';
  const currentUsername = profileData?.username ?? null;
  const [usernameDraft, setUsernameDraft] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    { state: 'idle' | 'checking' | 'ok' | 'taken' | 'invalid'; reason?: string }
  >({ state: 'idle' });
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    if (!usernameDraft || usernameDraft === currentUsername) {
      setUsernameStatus({ state: 'idle' });
      return;
    }
    setUsernameStatus({ state: 'checking' });
    const handle = setTimeout(async () => {
      try {
        const { data } = await profileService.checkUsernameAvailable(usernameDraft);
        if (data.available) {
          setUsernameStatus({ state: 'ok' });
        } else if (data.reason && /taken/i.test(data.reason)) {
          setUsernameStatus({ state: 'taken', reason: data.reason });
        } else {
          setUsernameStatus({ state: 'invalid', reason: data.reason });
        }
      } catch {
        setUsernameStatus({ state: 'idle' });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [usernameDraft, currentUsername]);

  const handleClaimUsername = async () => {
    if (usernameStatus.state !== 'ok' || savingUsername) return;
    setSavingUsername(true);
    try {
      await profileService.claimUsername(usernameDraft);
      toast.success(`@${usernameDraft} is yours!`);
      setUsernameDraft('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not claim username');
    } finally {
      setSavingUsername(false);
    }
  };

  const startEdit = () => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName ?? '',
      lastName: profile.lastName ?? '',
      bio: profile.bio ?? '',
      status: profile.status ?? '',
      company: profile.company ?? '',
      position: profile.position ?? '',
      location: profile.location ?? '',
      phone: (profile.phone ?? '').replace(/^\+?91\s?/, ''),
      linkedin: profile.linkedin ?? '',
      twitter: profile.twitter ?? '',
      website: profile.website ?? '',
      pitchName: profile.pitchName ?? '',
      pitchTagline: profile.pitchTagline ?? '',
      pitchStage: profile.pitchStage ?? '',
      pitchUrl: profile.pitchUrl ?? '',
    });
    setLinkErrors({});
    setEditing(true);
  };

  const saveEditWithPhone = async () => {
    // Inline URL validation — surface errors under each link field instead of
    // letting the backend reject with a generic "website: Invalid url" toast.
    const nextLinkErrors: Record<string, string> = {};
    for (const key of LINK_KEYS) {
      if (!isValidUrl(form[key] ?? '')) {
        nextLinkErrors[key] = 'Enter a valid URL, e.g. https://example.com';
      }
    }
    setLinkErrors(nextLinkErrors);
    if (Object.keys(nextLinkErrors).length > 0) {
      toast.error('Please fix the highlighted links.');
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (k === 'phone') continue;
      // firstName/lastName have a min(2) backend constraint — omit if empty
      if ((k === 'firstName' || k === 'lastName') && !v.trim()) continue;
      payload[k] = v;
    }
    // Normalize link URLs (prepend https:// when the scheme was omitted).
    for (const key of LINK_KEYS) {
      const val = (form[key] ?? '').trim();
      payload[key] = val ? normalizeUrl(val) : '';
    }
    const phoneRaw = form.phone ?? '';
    if (phoneRaw) {
      const digits = phoneRaw.replace(/\D/g, '');
      payload.phone = digits ? `+91${digits.slice(-10)}` : '';
    }
    await updateMutation.mutateAsync(payload as Parameters<typeof updateMutation.mutateAsync>[0]);
    setEditing(false);
  };

  const saveEdit = saveEditWithPhone;

  if (profileLoading) {
    return (
      <PortalLayout>
        <div className="space-y-4 animate-pulse max-w-content mx-auto">
          <div className="h-32 rounded-card bg-muted" />
          <div className="h-24 rounded-card bg-muted" />
        </div>
      </PortalLayout>
    );
  }

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : user?.name || 'Member';

  const registrations = regsData?.registrations ?? [];
  const hosted = hostedData?.events ?? [];

  return (
    <PortalLayout>
      <div className="space-y-8 max-w-content mx-auto">
        {/* Hero — avatar + name + FK Score */}
        <Surface elevated padding="lg">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-muted border border-border flex items-center justify-center text-foreground text-3xl font-semibold overflow-hidden">
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  displayName[0]?.toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card-xs disabled:opacity-50"
                aria-label="Change avatar"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onAvatarPick(f);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Identity */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {editing ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={form.firstName ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, firstName: e.target.value }))
                      }
                      placeholder="First name"
                    />
                    <Input
                      value={form.lastName ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lastName: e.target.value }))
                      }
                      placeholder="Last name"
                    />
                  </div>
                  <Input
                    value={form.position ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, position: e.target.value }))
                    }
                    placeholder="Job title"
                  />
                  <Input
                    value={form.company ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, company: e.target.value }))
                    }
                    placeholder="Company"
                  />
                  <Input
                    value={form.status ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    maxLength={80}
                    placeholder="Live status - e.g. Raising a seed round, Hiring engineers"
                  />
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-xs rounded-md bg-muted text-muted-foreground border border-border">+91</span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={form.phone ?? ''}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setForm((f) => ({ ...f, phone: digits }));
                      }}
                      placeholder="10-digit phone (optional)"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {displayName}
                  </h1>
                  {(profile?.position || profile?.company) && (
                    <p className="text-sm text-muted-foreground">
                      {[profile?.position, profile?.company]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {profile?.status && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary mt-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      {profile.status}
                    </span>
                  )}
                  <div className="flex items-center gap-3 pt-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /> {email}
                    </span>
                    {profile?.phone && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {profile.phone}
                      </span>
                    )}
                    {profile?.location && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {profile.location}
                      </span>
                    )}
                    {cardActive && (
                      <span className="inline-flex items-center gap-1 chip">
                        <BadgeCheck className="w-3 h-3" /> Tap Card · Active
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Enter edit mode here; Save/Cancel live at the bottom of the form
                so users can review everything before saving. */}
            {!editing && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
                {/* See the card exactly as a stranger does (contact locked) */}
                {user?.id && (
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`/card/${currentUsername ?? user.id}?preview=visitor`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View as visitor
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* FK Score — Posh-style oversized mono numeral */}
          <div className="mt-8 pt-6 border-t border-border flex items-end justify-between gap-6 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                FK Score
              </p>
              <div className="font-mono text-6xl font-semibold tracking-tight text-foreground tabular-nums leading-none">
                {fkScore}
              </div>
            </div>
            <Link
              to="/gamification"
              className="text-sm text-primary hover:underline whitespace-nowrap"
            >
              View leaderboard →
            </Link>
          </div>
        </Surface>

        {/* Username — vanity card URL */}
        <Surface>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5" /> Your card URL
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Share a short link to your Tap Card.
              </p>
            </div>
            <Link to="/card-analytics" className="text-xs text-primary hover:underline whitespace-nowrap">
              View analytics →
            </Link>
          </div>
          {currentUsername ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
              <code className="text-sm font-mono text-foreground truncate">
                {window.location.host}/card/{currentUsername}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/card/${currentUsername}`);
                  toast.success('URL copied');
                }}
              >
                Copy
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{window.location.host}/card/</span>
                <Input
                  value={usernameDraft}
                  onChange={(e) => setUsernameDraft(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 30))}
                  placeholder="your-handle"
                  className="font-mono"
                />
                <Button
                  size="sm"
                  onClick={handleClaimUsername}
                  disabled={usernameStatus.state !== 'ok' || savingUsername}
                >
                  {savingUsername ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                </Button>
              </div>
              {usernameStatus.state === 'checking' && (
                <p className="text-xs text-muted-foreground">Checking…</p>
              )}
              {usernameStatus.state === 'ok' && (
                <p className="text-xs text-emerald-600">Available!</p>
              )}
              {usernameStatus.state === 'taken' && (
                <p className="text-xs text-red-600">{usernameStatus.reason ?? 'Taken'}</p>
              )}
              {usernameStatus.state === 'invalid' && (
                <p className="text-xs text-amber-600">{usernameStatus.reason ?? 'Invalid'}</p>
              )}
            </div>
          )}
        </Surface>

        {/* Plan — in-app upgrade / manage entry point */}
        <PlanSection />

        {/* Bio */}
        <Surface>
          <h2 className="text-sm font-semibold text-foreground mb-2">About</h2>
          {editing ? (
            <textarea
              value={form.bio ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell your story…"
              rows={4}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background resize-none"
            />
          ) : (
            <p className="text-sm text-foreground leading-relaxed">
              {profile?.bio || (
                <span className="text-muted-foreground">No bio yet.</span>
              )}
            </p>
          )}
        </Surface>

        {/* Links */}
        <Surface>
          <h2 className="text-sm font-semibold text-foreground mb-3">Links</h2>
          {editing ? (
            <div className="space-y-3">
              {(
                [
                  { key: 'linkedin', placeholder: 'https://linkedin.com/in/you', icon: Linkedin },
                  { key: 'twitter', placeholder: 'https://x.com/you', icon: Twitter },
                  { key: 'website', placeholder: 'https://example.com', icon: Globe },
                ] as const
              ).map(({ key, placeholder, icon: Icon }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`link-${key}`} className="capitalize">
                    {key}
                  </Label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id={`link-${key}`}
                      value={form[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({ ...f, [key]: val }));
                        // Clear a stale error as soon as the value becomes valid.
                        if (linkErrors[key] && isValidUrl(val)) {
                          setLinkErrors((prev) => {
                            const { [key]: _, ...rest } = prev;
                            return rest;
                          });
                        }
                      }}
                      placeholder={placeholder}
                      aria-invalid={Boolean(linkErrors[key])}
                      className={`pl-9 ${linkErrors[key] ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {linkErrors[key] && (
                    <p className="text-xs text-red-600">{linkErrors[key]}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(
                [
                  { value: profile?.linkedin, icon: Linkedin, label: 'LinkedIn' },
                  { value: profile?.twitter, icon: Twitter, label: 'Twitter' },
                  { value: profile?.website, icon: Globe, label: 'Website' },
                ] as const
              )
                .filter((l) => l.value)
                .map(({ value, icon: Icon, label }) => (
                  <a
                    key={label}
                    href={value!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <Icon className="w-4 h-4" />
                    {value}
                  </a>
                ))}
              {!profile?.linkedin && !profile?.twitter && !profile?.website && (
                <p className="text-sm text-muted-foreground">
                  No links added yet.
                </p>
              )}
            </div>
          )}
        </Surface>

        {/* Card blocks — pitch deck, video, booking link */}
        <CardBlocksEditor />

        {/* Skills + Interests + Looking for */}
        <TagListSurface
          title="Skills"
          editing={editing}
          values={profile?.skills ?? []}
          onChange={(next) => updateMutation.mutate({ skills: next })}
        />
        <TagListSurface
          title="Interests"
          editing={editing}
          values={profile?.interests ?? []}
          onChange={(next) => updateMutation.mutate({ interests: next })}
          chipClass="chip-primary"
        />
        <TagListSurface
          title="Looking for"
          editing={editing}
          values={profile?.lookingFor ?? []}
          onChange={(next) => updateMutation.mutate({ lookingFor: next })}
          maxItems={10}
        />

        {/* Pitch spotlight — the featured "what I'm building" block on the card */}
        {(editing || profile?.pitchName || profile?.pitchTagline) && (
          <Surface>
            <h2 className="text-sm font-semibold text-foreground mb-1">Pitch spotlight</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Featured on your card — what you're building, in one glance.
            </p>
            {editing ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="pitch-name">Startup / product</Label>
                    <Input
                      id="pitch-name"
                      value={form.pitchName ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, pitchName: e.target.value }))}
                      placeholder="e.g. TapByWisein"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pitch-stage">Stage</Label>
                    <select
                      id="pitch-stage"
                      value={form.pitchStage ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, pitchStage: e.target.value }))}
                      className="w-full h-9 px-2 text-sm bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select stage…</option>
                      {PITCH_STAGES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pitch-tagline">One-liner</Label>
                  <Input
                    id="pitch-tagline"
                    value={form.pitchTagline ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, pitchTagline: e.target.value }))}
                    placeholder="What it does, in one sentence"
                    maxLength={140}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pitch-url">Demo / deck link</Label>
                  <Input
                    id="pitch-url"
                    value={form.pitchUrl ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({ ...f, pitchUrl: val }));
                      if (linkErrors.pitchUrl && isValidUrl(val)) {
                        setLinkErrors((prev) => {
                          const { pitchUrl: _, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    placeholder="https://your-demo-or-deck.com"
                    aria-invalid={Boolean(linkErrors.pitchUrl)}
                    className={linkErrors.pitchUrl ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {linkErrors.pitchUrl && (
                    <p className="text-xs text-red-600">{linkErrors.pitchUrl}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{profile?.pitchName}</p>
                  {profile?.pitchStage && <span className="chip">{profile.pitchStage}</span>}
                </div>
                {profile?.pitchTagline && (
                  <p className="text-sm text-muted-foreground">{profile.pitchTagline}</p>
                )}
                {profile?.pitchUrl && (
                  <a
                    href={profile.pitchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View demo / deck →
                  </a>
                )}
              </div>
            )}
          </Surface>
        )}

        {/* Open to — badge toggles shown prominently on the public card */}
        {(editing || (profile?.openTo?.length ?? 0) > 0) && (
          <Surface>
            <h2 className="text-sm font-semibold text-foreground mb-1">Open to</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Shown as badges on your card — the 5-second read that starts conversations.
            </p>
            <div className="flex flex-wrap gap-2">
              {OPEN_TO_OPTIONS.map(({ value, label }) => {
                const active = (profile?.openTo ?? []).includes(value);
                if (!editing) {
                  return active ? (
                    <span key={value} className="chip-primary">{label}</span>
                  ) : null;
                }
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      const current = profile?.openTo ?? [];
                      const next = active
                        ? current.filter((v) => v !== value)
                        : [...current, value];
                      updateMutation.mutate({ openTo: next });
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Surface>
        )}

        {/* Save / Cancel — anchored at the bottom so the whole form can be
            reviewed before saving. Sticky so it stays reachable while scrolling. */}
        {editing && (
          <div className="sticky bottom-4 z-10">
            <Surface className="flex items-center justify-end gap-2 shadow-card">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  setLinkErrors({});
                }}
                disabled={updateMutation.isPending}
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                <Check className="w-3.5 h-3.5" />{' '}
                {updateMutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </Surface>
          </div>
        )}

        {/* Events Hosted — organizers only */}
        {isOrganizer && (
          <Surface>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                Events Hosted
              </h2>
              <Link
                to="/organizer/dashboard"
                className="text-xs text-primary hover:underline"
              >
                View all →
              </Link>
            </div>
            {hosted.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events hosted yet.{' '}
                <Link
                  to="/organizer/events/create"
                  className="text-primary hover:underline"
                >
                  Create your first event →
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {hosted.map((ev) => (
                  <li key={ev.id}>
                    <Link
                      to={`/organizer/events/${ev.id}`}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {ev.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ev.startDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {ev.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        )}

        {/* People I met — quick link */}
        <Surface>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">People I met</h2>
              <p className="text-xs text-muted-foreground">
                Connections grouped by event you attended together.
              </p>
            </div>
            <Link to="/people-i-met" className="text-xs text-primary hover:underline">
              Open →
            </Link>
          </div>
        </Surface>

        {/* Events Attending */}
        <Surface>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">
              Events Attending
            </h2>
            <Link to="/events" className="text-xs text-primary hover:underline">
              Browse events →
            </Link>
          </div>
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't registered for any events yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {registrations.map((reg) => (
                <li key={reg.id}>
                  <Link
                    to={`/event/${reg.eventId}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {reg.event?.title ?? 'Event'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reg.event?.startDate
                          ? new Date(reg.event.startDate).toLocaleDateString(
                              'en-US',
                              { month: 'short', day: 'numeric', year: 'numeric' }
                            )
                          : ''}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {reg.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </PortalLayout>
  );
};

type TagListSurfaceProps = {
  title: string;
  editing: boolean;
  values: string[];
  onChange: (next: string[]) => void;
  chipClass?: string;
  /** Max number of tags allowed (backend caps skills/interests at 20, looking-for at 10). */
  maxItems?: number;
};

function TagListSurface({ title, editing, values, onChange, chipClass = 'chip', maxItems = 20 }: TagListSurfaceProps) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const singular = title.toLowerCase().replace(/s$/, '');

  if (!editing && values.length === 0) return null;

  const addTag = () => {
    const v = draft.trim();
    if (!v) return;
    // Validate inline here, at the section — before onChange fires a save the
    // backend would reject with a generic toast.
    if (v.length > MAX_TAG_LEN) {
      setError(`Keep each ${singular} under ${MAX_TAG_LEN} characters (${v.length}/${MAX_TAG_LEN}).`);
      return;
    }
    if (values.length >= maxItems) {
      setError(`You can add up to ${maxItems} ${title.toLowerCase()}.`);
      return;
    }
    if (values.includes(v)) {
      setDraft('');
      return;
    }
    setError('');
    onChange([...values, v]);
    setDraft('');
  };

  const removeTag = (tag: string) => onChange(values.filter((t) => t !== tag));

  return (
    <Surface>
      <h2 className="text-sm font-semibold text-foreground mb-3">{title}</h2>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((tag) => (
          <span key={tag} className={`${chipClass} ${editing ? 'pr-1' : ''} flex items-center gap-1`}>
            {tag}
            {editing && (
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                onClick={() => removeTag(tag)}
                className="rounded-full hover:bg-foreground/10 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {!editing && values.length === 0 && (
          <p className="text-sm text-muted-foreground">None yet.</p>
        )}
      </div>
      {editing && (
        <>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={`Add a ${singular}…`}
              aria-invalid={Boolean(error)}
              className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            <Button size="sm" variant="outline" onClick={addTag} disabled={!draft.trim()}>
              Add
            </Button>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        </>
      )}
    </Surface>
  );
}

export default ProfilePage;
