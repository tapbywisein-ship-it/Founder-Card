import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MapPin, Linkedin, Twitter, Globe, Mail, Edit3, Check, X, Camera,
  Calendar, BadgeCheck, Loader2, Phone, AtSign, Crown,
} from 'lucide-react';
import { useMembership } from '@/hooks/useMembership';
import { PortalLayout } from '@/components/PortalLayout';
import { CardBlocksEditor } from '@/components/CardBlocksEditor';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMyProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useMyRegistrations } from '@/hooks/useEvents';
import { useMyOrgEvents } from '@/hooks/useOrganizer';
import { useAppStore } from '@/store/appStore';
import { apiUpload } from '@/services/api';
import { profileService } from '@/services/profile.service';

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
  const { data: hostedData } = useMyOrgEvents(1, 5);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
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
    });
    setEditing(true);
  };

  const saveEditWithPhone = async () => {
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (k === 'phone') continue;
      // firstName/lastName have a min(2) backend constraint — omit if empty
      if ((k === 'firstName' || k === 'lastName') && !v.trim()) continue;
      payload[k] = v;
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
  const { data: membership } = useMembership();

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
                    placeholder="Live status — e.g. Raising a seed round, Hiring engineers"
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

            {/* Edit / Save / Cancel */}
            <div className="flex gap-2">
              {!editing ? (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(false)}
                    disabled={updateMutation.isPending}
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveEdit}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="w-3.5 h-3.5" />{' '}
                    {updateMutation.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </>
              )}
            </div>
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
                tapbywisein.com/card/{currentUsername}
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
                <span className="text-sm text-muted-foreground">tapbywisein.com/card/</span>
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
                  { key: 'linkedin', placeholder: 'LinkedIn URL', icon: Linkedin },
                  { key: 'twitter', placeholder: 'Twitter / X handle', icon: Twitter },
                  { key: 'website', placeholder: 'Website URL', icon: Globe },
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
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      placeholder={placeholder}
                      className="pl-9"
                    />
                  </div>
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
        />

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

        {/* Founder membership — quick link / status */}
        <Link to="/membership" className="block">
          <Surface hover className="border-amber-500/25 bg-amber-500/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Founder Membership</h2>
                  <p className="text-xs text-muted-foreground">
                    {membership?.isActive
                      ? `Active · ${membership.plan === 'annual' ? 'Annual' : 'Monthly'} plan`
                      : 'Unlimited follow-ups, network search & more'}
                  </p>
                </div>
              </div>
              <span className="text-xs text-primary whitespace-nowrap">
                {membership?.isActive ? 'Manage →' : 'Upgrade →'}
              </span>
            </div>
          </Surface>
        </Link>

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
};

function TagListSurface({ title, editing, values, onChange, chipClass = 'chip' }: TagListSurfaceProps) {
  const [draft, setDraft] = useState('');

  if (!editing && values.length === 0) return null;

  const addTag = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft('');
      return;
    }
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
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={`Add a ${title.toLowerCase().replace(/s$/, '')}…`}
          />
          <Button size="sm" variant="outline" onClick={addTag} disabled={!draft.trim()}>
            Add
          </Button>
        </div>
      )}
    </Surface>
  );
}

export default ProfilePage;
