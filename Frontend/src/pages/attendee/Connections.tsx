import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Check, X, Users, MessageSquare, ChevronRight, AlertCircle, NotebookPen, Bell, Clock, Sparkles } from 'lucide-react';
import { useStartConversation } from '@/hooks/useMessages';
import {
  useConnections, useConnectionRequests,
  useAcceptRequest, useRejectRequest, useRemoveConnection,
  useFollowUps,
} from '@/hooks/useConnections';
import { ConnectionCRMDrawer } from '@/components/ConnectionCRMDrawer';
import type { Connection } from '@/services/connections.service';

/**
 * Resolve the "other" user on a connection row.
 *  - For accepted-list rows the backend pre-resolves it into `conn.user`.
 *  - For pending-request rows the backend populates `conn.requester`
 *    (the receiver is always you).
 */
const getOtherUser = (conn: Connection) =>
  conn.user ?? conn.requester ?? conn.receiver;

const getDisplayName = (conn: Connection) => {
  const other = getOtherUser(conn);
  if (other?.profile) return `${other.profile.firstName} ${other.profile.lastName}`.trim();
  return other?.email ?? 'Unknown';
};

const ConnectionsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'pending' | 'followups'>('all');
  const [crmTarget, setCrmTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: connData, isLoading, isError, refetch } = useConnections();
  const { data: pendingData } = useConnectionRequests();
  const { data: followUps } = useFollowUps();
  const acceptMutation = useAcceptRequest();
  const rejectMutation = useRejectRequest();
  const removeMutation = useRemoveConnection();
  const startConvo = useStartConversation();

  const openCard = (userId?: string) => {
    if (userId) navigate(`/card/${userId}`);
  };

  const openMessage = (userId?: string) => {
    if (!userId) return;
    startConvo.mutate(userId, {
      onSuccess: ({ data: convo }) => navigate(`/messages/${convo.id}`),
    });
  };

  const connections = (connData?.connections ?? []).filter((c) => {
    if (!search) return true;
    return getDisplayName(c).toLowerCase().includes(search.toLowerCase());
  });

  const received = pendingData?.received ?? [];
  const pendingCount = received.length;
  const followUpList = followUps ?? [];
  const dueCount = followUpList.filter((f) => f.overdue).length;

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load connections. Check your connection and try again.
            </span>
            <button onClick={() => refetch()} className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80">
              Retry
            </button>
          </div>
        )}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Connections</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/network-search')}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:border-primary/40 hover:text-primary transition-colors"
              title="Search across your whole network"
            >
              <Sparkles className="w-3.5 h-3.5" /> Network search
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 h-8 text-sm w-44"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-card border border-border rounded-card shadow-card-xs rounded-xl">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            My Connections ({connections.length})
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'pending' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Requests
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-[9px] text-primary-foreground flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('followups')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${tab === 'followups' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Follow-ups
            {dueCount > 0 && (
              <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-bold ${tab === 'followups' ? 'bg-primary-foreground text-primary' : 'bg-amber-500 text-white'}`}>
                {dueCount}
              </span>
            )}
          </button>
        </div>

        {tab === 'all' && (
          <>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Surface key={i} className="h-16 animate-pulse" />)}
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-foreground font-medium">No connections yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                  Scan a founder's QR or browse events to start building your network.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" onClick={() => navigate('/connect')}>Scan to connect</Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/discover')}>Discover events</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {connections.map((conn, i) => {
                  const name = getDisplayName(conn);
                  const other = getOtherUser(conn);
                  const profile = other?.profile;
                  return (
                    <motion.div key={conn.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Surface
                        hover
                        className="flex items-center gap-3 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => openCard(other?.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') openCard(other?.id);
                        }}
                      >
                        {profile?.avatar ? (
                          <img
                            src={profile.avatar}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                            {name[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          {(profile?.position || profile?.company) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[profile?.position, profile?.company].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Notes & follow-up"
                            onClick={() => setCrmTarget({ id: conn.id, name })}
                          >
                            <NotebookPen className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Message"
                            onClick={() => openMessage(other?.id)}
                            disabled={startConvo.isPending}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-rose-400"
                            onClick={() => {
                              if (window.confirm(`Remove ${name} from your connections?`)) {
                                removeMutation.mutate(conn.id);
                              }
                            }}
                            disabled={removeMutation.isPending}
                          >
                            Remove
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </Surface>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'pending' && (
          <>
            {received.length === 0 ? (
              <div className="text-center py-16">
                <UserPlus className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No pending requests.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {received.map((conn, i) => {
                  const name = getDisplayName(conn);
                  const profile = conn.requester?.profile;
                  return (
                    <motion.div key={conn.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Surface className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                          {name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          {profile?.position && profile?.company && (
                            <p className="text-xs text-muted-foreground truncate">{profile.position} · {profile.company}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => acceptMutation.mutate(conn.id)}
                            disabled={acceptMutation.isPending}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => rejectMutation.mutate(conn.id)}
                            disabled={rejectMutation.isPending}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </Surface>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
        {tab === 'followups' && (
          <>
            {followUpList.length === 0 ? (
              <div className="text-center py-16">
                <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-foreground font-medium">No follow-ups scheduled</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Open any connection's notes to set a reminder — it'll show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {followUpList.map((f, i) => {
                  const p = f.user.profile;
                  const fname = p ? `${p.firstName} ${p.lastName}`.trim() : f.user.email;
                  const due = f.followUpAt
                    ? new Date(f.followUpAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
                    : '';
                  return (
                    <motion.div key={f.connectionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Surface
                        hover
                        className="flex items-center gap-3 cursor-pointer"
                        role="button"
                        tabIndex={0}
                        onClick={() => setCrmTarget({ id: f.connectionId, name: fname })}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setCrmTarget({ id: f.connectionId, name: fname }); }}
                      >
                        {p?.avatar ? (
                          <img src={p.avatar} alt={fname} loading="lazy" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                            {fname[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{fname}</p>
                          {(p?.position || p?.company) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {[p?.position, p?.company].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${f.overdue ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{f.overdue ? 'Due' : due}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </Surface>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <ConnectionCRMDrawer
        connectionId={crmTarget?.id ?? null}
        name={crmTarget?.name ?? ''}
        onClose={() => setCrmTarget(null)}
      />
    </AppLayout>
  );
};

export default ConnectionsPage;
