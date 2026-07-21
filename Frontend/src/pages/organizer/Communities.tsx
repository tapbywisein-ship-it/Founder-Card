import { useState } from 'react';
import { Link } from 'react-router-dom';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { CommunityFeed } from '@/components/CommunityFeed';
import { useMyCommunities, useCreateCommunity } from '@/hooks/useCommunities';
import type { CommunitySummary } from '@/services/communities.service';
import { Boxes, Plus, Users, Calendar, Search, ExternalLink, ArrowLeft } from 'lucide-react';

const CommunityAvatar = ({ c, size = 'md' }: { c: CommunitySummary; size?: 'sm' | 'md' }) => {
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-10 w-10';
  return c.avatar ? (
    <img src={c.avatar} alt="" className={`${dim} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0`}>
      {c.name[0]?.toUpperCase() ?? <Boxes className="w-4 h-4" />}
    </div>
  );
};

const CommunitiesPage = () => {
  const { data: communities, isLoading } = useMyCommunities();
  const createMutation = useCreateCommunity();

  // Telegram-style: selecting a community shows its feed. On desktop both panes
  // are always visible (first community shown by default); on mobile the list
  // drills into the feed and back.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const list = (communities ?? []).filter((c) =>
    search.trim() ? c.name.toLowerCase().includes(search.trim().toLowerCase()) : true
  );
  const active = communities?.find((c) => c.id === selectedId) ?? communities?.[0];

  const submit = async () => {
    if (name.trim().length < 2) return;
    const res = await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });
    setName(''); setDescription(''); setCategory('');
    setOpen(false);
    const created = (res as { data?: { id?: string } })?.data;
    if (created?.id) setSelectedId(created.id);
  };

  const empty = !isLoading && (communities?.length ?? 0) === 0;

  return (
    <OrganizerLayout>
      {empty ? (
        <div className="space-y-6">
          <Header onNew={() => setOpen(true)} />
          <Surface className="text-center py-14">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Boxes className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">No communities yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Group your recurring events so attendees can follow and never miss the next one.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create your first community
            </Button>
          </Surface>
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)]">
          <Header onNew={() => setOpen(true)} compact />
          <div className="flex flex-1 min-h-0 mt-3 rounded-2xl border border-border overflow-hidden bg-card">
            {/* ── Left: community list ─────────────────────────────────── */}
            <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 shrink-0 flex-col border-r border-border`}>
              <div className="p-2.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search communities"
                    className="pl-9 h-9 text-sm rounded-full"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  [...Array(4)].map((_, i) => <div key={i} className="h-16 m-2 rounded-lg bg-muted/40 animate-pulse" />)
                ) : list.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center mt-6">No matches.</p>
                ) : (
                  list.map((c) => {
                    const isActive = active?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-l-2 ${
                          isActive
                            ? 'bg-primary/5 border-primary'
                            : 'border-transparent hover:bg-muted/40'
                        }`}
                      >
                        <CommunityAvatar c={c} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {c.category ? `${c.category} · ` : ''}{c.memberCount} members
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* ── Right: selected community feed ───────────────────────── */}
            <section className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
              {active ? (
                <>
                  <div className="flex items-center gap-3 px-3 md:px-4 py-2.5 border-b border-border">
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="md:hidden -ml-1 p-1 text-muted-foreground hover:text-foreground"
                      aria-label="Back to communities"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <CommunityAvatar c={active} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{active.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {active.memberCount}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {active.eventCount} events</span>
                      </p>
                    </div>
                    <Link
                      to={`/community/${active.slug}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                    >
                      View <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 md:p-4">
                    {/* Owner's own community → member + owner privileges. */}
                    <CommunityFeed communityId={active.id} isMember isOwner />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Select a community to view its feed.
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New community</DialogTitle>
            <DialogDescription>Recurring events + a members list that persists across them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bangalore Founders" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cat">Category (optional)</Label>
              <Input id="c-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Startups" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Description (optional)</Label>
              <textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this community about?"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={name.trim().length < 2 || createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create community'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
};

const Header = ({ onNew, compact }: { onNew: () => void; compact?: boolean }) => (
  <div className="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Communities</h1>
      {!compact && (
        <p className="text-sm text-muted-foreground mt-0.5">
          Host recurring events under a community and keep your members across every one.
        </p>
      )}
    </div>
    <Button size="sm" onClick={onNew}>
      <Plus className="w-4 h-4 mr-1.5" /> New community
    </Button>
  </div>
);

export default CommunitiesPage;
