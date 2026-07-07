import { useParams, Link, useNavigate } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { useCommunity, useToggleCommunityMembership } from '@/hooks/useCommunities';
import { CommunityFeed } from '@/components/CommunityFeed';
import { useAppStore } from '@/store/appStore';
import { Boxes, Users, Calendar, MapPin, Check, Plus, Sparkles, AlertCircle } from 'lucide-react';

const CommunityPublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { data, isLoading, isError } = useCommunity(slug!);
  const toggle = useToggleCommunityMembership(slug!);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl px-6 space-y-4 animate-pulse">
          <div className="h-32 rounded-2xl bg-muted/50" />
          <div className="h-24 rounded-xl bg-muted/50" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-foreground">Community not found</h1>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">Go to TapByWisein →</Link>
        </div>
      </div>
    );
  }

  const { community: c, events, isMember, isOwner } = data;
  const orgName = [c.organizer?.profile?.firstName, c.organizer?.profile?.lastName].filter(Boolean).join(' ');

  const onFollow = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/community/${slug}` } } });
      return;
    }
    toggle.mutate({ id: c.id, join: !isMember });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12 space-y-6">
        <Link to="/" className="flex items-center gap-2 text-foreground font-semibold">
          <Sparkles className="w-4 h-4 text-primary" /> TapByWisein
        </Link>

        {/* Community header */}
        <Surface elevated className="space-y-4">
          <div className="flex items-start gap-4">
            {c.avatar ? (
              <img src={c.avatar} alt="" className="h-16 w-16 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Boxes className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground leading-tight">{c.name}</h1>
              {c.category && <p className="text-xs text-muted-foreground mt-0.5">{c.category}</p>}
              {orgName && <p className="text-sm text-muted-foreground mt-1">by {orgName}</p>}
            </div>
            <Button size="sm" variant={isMember ? 'outline' : 'default'} onClick={onFollow} disabled={toggle.isPending} className="shrink-0">
              {isMember ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Following</> : <><Plus className="w-3.5 h-3.5 mr-1.5" /> Follow</>}
            </Button>
          </div>
          {c.description && <p className="text-sm text-foreground leading-relaxed">{c.description}</p>}
          <div className="flex gap-5 text-sm text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> {c.memberCount} members</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {c.eventCount} events</span>
          </div>
        </Surface>

        {/* Feed — posts, comments, organizer announcements */}
        <CommunityFeed communityId={c.id} isMember={isMember} isOwner={isOwner} />

        {/* Events */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Events</h2>
          {events.length === 0 ? (
            <Surface className="text-center py-10">
              <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No events yet — follow to hear about the next one.</p>
            </Surface>
          ) : (
            <div className="space-y-3">
              {events.map((e) => {
                const upcoming = new Date(e.startDate) >= new Date();
                return (
                  <Link key={e.id} to={`/e/${e.id}`}>
                    <Surface hover className="flex items-center gap-4">
                      <div className="text-center w-12 shrink-0">
                        <p className="text-[10px] uppercase text-muted-foreground">
                          {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-xl font-bold text-foreground leading-none">
                          {new Date(e.startDate).getDate()}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{e.title}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          {(e.city || e.locationType === 'VIRTUAL') && (
                            <><MapPin className="w-3 h-3" /> {e.locationType === 'VIRTUAL' ? 'Online' : e.city}</>
                          )}
                        </p>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${upcoming ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                        {upcoming ? 'Upcoming' : 'Past'}
                      </span>
                    </Surface>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/70">Powered by TapByWisein</p>
      </div>
    </div>
  );
};

export default CommunityPublicPage;
