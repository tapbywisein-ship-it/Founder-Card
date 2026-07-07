import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePublicCommunities, useJoinLeaveCommunity } from '@/hooks/useCommunities';
import { useConnections } from '@/hooks/useConnections';
import { getTheme } from '@/lib/eventThemes';
import { communitiesService, type PublicCommunity } from '@/services/communities.service';
import {
  Boxes, Users, Search, Share2, UserPlus, Check, Calendar, X, Send, Loader2, AlertCircle,
} from 'lucide-react';

const communityUrl = (slug: string) => `${window.location.origin}/community/${slug}`;

const CommunitiesPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { data: communities, isLoading, isError, refetch } = usePublicCommunities(search);
  const joinLeave = useJoinLeaveCommunity();

  // Category chips derived from the loaded set; filtering is client-side so
  // switching categories is instant (no refetch).
  const categories = [...new Set((communities ?? []).map((c) => c.category).filter(Boolean))] as string[];
  const shown = category ? (communities ?? []).filter((c) => c.category === category) : (communities ?? []);

  // Invite-connections modal state
  const [inviteTarget, setInviteTarget] = useState<PublicCommunity | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const { data: connData } = useConnections(1, 100);
  const connections = connData?.connections ?? [];

  const share = (c: PublicCommunity) => {
    const url = communityUrl(c.slug);
    if (navigator.share) {
      navigator.share({ title: c.name, text: `Join ${c.name} on TapByWisein`, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url).then(
        () => toast.success('Community link copied'),
        () => toast.error('Copy failed'),
      );
    }
  };

  const openInvite = (c: PublicCommunity) => { setInviteTarget(c); setSelected(new Set()); };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const sendInvites = async () => {
    if (!inviteTarget || selected.size === 0) return;
    setSending(true);
    try {
      const res = await communitiesService.invite(inviteTarget.id, [...selected]);
      const n = res.data.invited;
      toast.success(n > 0 ? `Invited ${n} connection${n !== 1 ? 's' : ''}` : 'Those connections were already invited or joined');
    } catch {
      toast.error('Could not send invites');
    }
    setSending(false);
    setInviteTarget(null);
    setSelected(new Set());
  };

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Communities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Discover and join communities. Share them or invite your connections.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search communities..."
              className="pl-9 h-8 text-sm w-56"
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setCategory('')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                category === '' ? 'bg-primary text-primary-foreground' : 'bg-card border border-border shadow-card-xs text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  category === cat ? 'bg-primary text-primary-foreground' : 'bg-card border border-border shadow-card-xs text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load communities. Check your connection and try again.
            </span>
            <button onClick={() => refetch()} className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Surface key={i} className="h-56 animate-pulse" />)}
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-16">
            <Boxes className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium">No communities yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {search || category ? 'Try a different search or category.' : 'New communities will show up here as organizers create them.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shown.map((c, i) => {
              const theme = getTheme(undefined);
              const org = c.organizer;
              const orgName =
                org?.profile?.company ||
                (org?.profile ? `${org.profile.firstName ?? ''} ${org.profile.lastName ?? ''}`.trim() : org?.username) ||
                null;
              const pending = joinLeave.isPending && joinLeave.variables?.id === c.id;
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Surface hover className="h-full flex flex-col overflow-hidden p-0">
                    {/* Cover */}
                    <button type="button" onClick={() => navigate(`/community/${c.slug}`)} className="relative block text-left">
                      {c.coverImage ? (
                        <img src={c.coverImage} alt={c.name} loading="lazy" className="w-full aspect-[16/9] object-cover" />
                      ) : (
                        <div className="w-full aspect-[16/9]" style={{ background: theme.gradient }} aria-hidden />
                      )}
                      {c.category && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background/85 text-foreground backdrop-blur-sm border border-border">
                          {c.category}
                        </span>
                      )}
                      {c.isMember && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                          <Check className="w-3 h-3" /> Joined
                        </span>
                      )}
                    </button>

                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center gap-2.5">
                        {c.avatar ? (
                          <img src={c.avatar} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                            {c.name[0]?.toUpperCase() ?? 'C'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <button type="button" onClick={() => navigate(`/community/${c.slug}`)} className="block text-left">
                            <h3 className="text-sm font-semibold text-foreground leading-tight truncate hover:text-primary transition-colors">{c.name}</h3>
                          </button>
                          {orgName && <p className="text-[11px] text-muted-foreground truncate">By {orgName}</p>}
                        </div>
                      </div>

                      {c.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-2 flex-1">{c.description}</p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {c.memberCount} members</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.eventCount} events</span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-border">
                        {c.isMember ? (
                          <Button
                            variant="outline" size="sm" className="flex-1"
                            disabled={pending}
                            onClick={() => joinLeave.mutate({ id: c.id, join: false })}
                          >
                            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Joined'}
                          </Button>
                        ) : (
                          <Button
                            size="sm" className="flex-1"
                            disabled={pending}
                            onClick={() => joinLeave.mutate({ id: c.id, join: true })}
                          >
                            {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Join'}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0" title="Share" onClick={() => share(c)}>
                          <Share2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0" title="Invite connections" onClick={() => openInvite(c)}>
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Surface>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite connections modal */}
      <AnimatePresence>
        {inviteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && !sending && setInviteTarget(null)}
          >
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }} className="w-full max-w-md">
              <Surface className="relative">
                {!sending && (
                  <button onClick={() => setInviteTarget(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                )}
                <h2 className="text-lg font-semibold text-foreground">Invite to {inviteTarget.name}</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  We'll send the community link as a message to the connections you pick.
                </p>

                {connections.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    You have no connections yet. Connect with people first, then invite them.
                  </p>
                ) : (
                  <div className="max-h-72 overflow-y-auto -mx-1 px-1 space-y-1">
                    {connections.map((conn) => {
                      const u = conn.user;
                      if (!u) return null;
                      const p = u.profile;
                      const name = p ? `${p.firstName} ${p.lastName}`.trim() : u.email;
                      const checked = selected.has(u.id);
                      return (
                        <button
                          key={conn.id}
                          type="button"
                          onClick={() => toggleSelect(u.id)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${
                            checked ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted'
                          }`}
                        >
                          {p?.avatar ? (
                            <img src={p.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                              {name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{name}</p>
                            {(p?.position || p?.company) && (
                              <p className="text-[11px] text-muted-foreground truncate">
                                {[p?.position, p?.company].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                            {checked && <Check className="w-3.5 h-3.5" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2 mt-5">
                  <Button variant="ghost" className="flex-1" onClick={() => setInviteTarget(null)} disabled={sending}>
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={sendInvites} disabled={sending || selected.size === 0}>
                    {sending ? (
                      <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending…</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Send className="w-4 h-4" /> Invite {selected.size > 0 ? `(${selected.size})` : ''}</span>
                    )}
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
};

export default CommunitiesPage;
