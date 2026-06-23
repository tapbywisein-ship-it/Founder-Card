import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Check, X, Users, MessageSquare, ChevronRight } from 'lucide-react';
import { useStartConversation } from '@/hooks/useMessages';
import {
  useConnections, useConnectionRequests,
  useAcceptRequest, useRejectRequest, useRemoveConnection,
} from '@/hooks/useConnections';
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
  const [tab, setTab] = useState<'all' | 'pending'>('all');

  const { data: connData, isLoading } = useConnections();
  const { data: pendingData } = useConnectionRequests();
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

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Connections</h1>
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
      </div>
    </AppLayout>
  );
};

export default ConnectionsPage;
