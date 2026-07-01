import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState, useMemo } from 'react';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { useMyScore, useMyBadges, useAllBadges, useLeaderboard, useScoreHistory } from '@/hooks/useGamification';
import { useAppStore } from '@/store/appStore';
import {
  Trophy, Zap, Lock, Crown, Star, Users, Medal, Info, AlertCircle, Sparkles,
  UserCircle, Ticket, CalendarCheck, UserPlus, CreditCard, QrCode, LogIn, Camera,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { SCORE_RULES } from '@/lib/scoreRules';

const ICON_MAP: Record<string, React.ElementType> = {
  Users, Trophy, Star, Zap, Medal, Crown,
  UserCircle, Ticket, CalendarCheck, UserPlus, CreditCard, QrCode, LogIn, Camera,
};

const GamificationPage = () => {
  const user = useAppStore((s) => s.user);
  const { data: gamification, isLoading: scoreLoading, isError: scoreError, refetch: refetchScore } = useMyScore();
  const { data: badges, isLoading: badgesLoading } = useMyBadges();
  const { data: allBadges } = useAllBadges();
  const { data: leaderboardData } = useLeaderboard(1, 10);
  const { data: historyData } = useScoreHistory(1, 10);

  const score = gamification?.fkScore ?? 0;
  const level = gamification?.level ?? 1;
  const earnedBadges = useMemo(() => badges ?? [], [badges]);
  const earnedIds = new Set(earnedBadges.map((b) => b.id));
  // Locked badges = all definitions the user hasn't earned yet. Their description
  // doubles as the unlock condition.
  const lockedBadges = (allBadges ?? []).filter((b) => !earnedIds.has(b.id));
  const leaderboard = leaderboardData?.leaderboard ?? [];
  const history = historyData?.history ?? [];
  const myRank = leaderboard.findIndex((e) => e.userId === user?.id);
  const myRankDisplay = myRank >= 0 ? myRank + 1 : null;

  // Track newly earned badges for the celebration animation
  const prevBadgeIdsRef = useRef<Set<string>>(new Set());
  const [newBadgeIds, setNewBadgeIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (earnedBadges.length === 0) return;
    const prev = prevBadgeIdsRef.current;
    const freshIds = earnedBadges.filter((b) => !prev.has(b.id)).map((b) => b.id);
    if (freshIds.length > 0 && prev.size > 0) {
      setNewBadgeIds(new Set(freshIds));
      const t = setTimeout(() => setNewBadgeIds(new Set()), 3000);
      return () => clearTimeout(t);
    }
    prevBadgeIdsRef.current = new Set(earnedBadges.map((b) => b.id));
  }, [earnedBadges]);

  const nextLevelScore = level * 200;
  const progressPct = Math.min(100, (score / nextLevelScore) * 100);

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <h1 className="text-3xl font-semibold text-foreground">FK Score & Badges</h1>
        {scoreError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load score data. Check your connection and try again.
            </span>
            <button onClick={() => refetchScore()} className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        {/* Score card */}
        <Surface className="text-center py-8">
          {scoreLoading ? (
            <div className="h-24 animate-pulse" />
          ) : (
            <>
              <div className="relative w-28 h-28 mx-auto mb-4">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
                  <motion.circle
                    cx="20" cy="20" r="16"
                    fill="none"
                    stroke="hsl(var(--gold-primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray="0 100.5"
                    animate={{ strokeDasharray: `${progressPct * 1.005} 100.5` }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground leading-none">{score}</span>
                  <span className="text-[9px] text-muted-foreground">FK Score</span>
                </div>
              </div>
              <p className="text-xl font-semibold text-foreground mb-1">Level {level}</p>
              <p className="text-sm text-muted-foreground mb-3">{score} / {nextLevelScore} pts to Level {level + 1}</p>
              <div className="h-2 rounded-full bg-muted/50 max-w-xs mx-auto">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.2, delay: 0.3 }}
                />
              </div>
            </>
          )}
        </Surface>

        {/* Score rules */}
        <Surface>
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">How to earn points</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SCORE_RULES.map((rule) => {
              const RuleIcon = ICON_MAP[rule.icon] ?? Trophy;
              return (
                <div
                  key={rule.action}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border border-border"
                >
                  <span className="flex items-center gap-2 text-sm text-foreground">
                    <RuleIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    {rule.action}
                  </span>
                  <span className="text-sm font-semibold text-primary">+{rule.points}</span>
                </div>
              );
            })}
          </div>
        </Surface>

        {/* Score history */}
        {history.length > 0 && (
          <Surface>
            <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {history.slice(0, 5).map((h, i) => (
                <div key={h.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{h.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary">+{h.points}</span>
                </div>
              ))}
            </div>
          </Surface>
        )}

        {/* Badges */}
        <Surface>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">My Badges</h2>
            <span className="text-xs text-muted-foreground">{earnedBadges.length} earned</span>
          </div>
          {badgesLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : earnedBadges.length === 0 ? (
            <div className="text-center py-8">
              <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No badges yet. Start attending events!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {earnedBadges.map((badge, i) => {
                const Icon = ICON_MAP[badge.icon] ?? Trophy;
                const isNew = newBadgeIds.has(badge.id);
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={isNew
                      ? { opacity: 1, scale: [1, 1.15, 0.95, 1.05, 1], transition: { duration: 0.6, times: [0, 0.3, 0.5, 0.7, 1] } }
                      : { opacity: 1, scale: 1, transition: { delay: i * 0.07 } }
                    }
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${isNew ? 'bg-primary/15 border-primary/50 ring-2 ring-primary/30' : 'bg-primary/5 border-primary/20'}`}
                  >
                    {isNew && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: [1, 1, 0], scale: [0.5, 1.4, 1.4] }}
                        transition={{ duration: 1.2 }}
                        className="absolute -top-2 -right-2"
                      >
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                      </motion.div>
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isNew ? 'bg-primary shadow-lg shadow-primary/40' : 'bg-primary'}`}>
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground text-center leading-tight">{badge.name}</p>
                    <p className="text-[10px] text-muted-foreground/70 text-center leading-tight">{badge.description}</p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Locked badges with unlock conditions */}
          {lockedBadges.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Locked — how to unlock
                </p>
              </div>
              <div className="space-y-2">
                {lockedBadges.map((badge) => {
                  const Icon = ICON_MAP[badge.icon] ?? Trophy;
                  return (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border"
                    >
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                      </div>
                      {badge.points > 0 && (
                        <span className="text-xs font-semibold text-muted-foreground">+{badge.points}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Surface>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <Surface>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Leaderboard</h2>
              <Trophy className="w-4 h-4 text-muted-foreground" />
            </div>

            {/* Your rank banner */}
            {myRankDisplay !== null && (
              <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Your rank</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{score} pts</span>
                  <span className="text-lg font-bold text-primary">#{myRankDisplay}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {leaderboard.map((entry, i) => {
                const isMe = entry.userId === user?.id;
                const name = entry.profile
                  ? `${entry.profile.firstName} ${entry.profile.lastName}`
                  : 'User';
                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${isMe ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/40'}`}
                  >
                    <span className={`w-6 text-center text-sm font-bold ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name} {isMe && '(you)'}</p>
                      {entry.profile?.company && (
                        <p className="text-[11px] text-muted-foreground truncate">{entry.profile.company}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{entry.fkScore}</p>
                      <p className="text-[10px] text-muted-foreground">Lv.{entry.level}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Surface>
        )}
      </div>
    </PortalLayout>
  );
};

export default GamificationPage;
