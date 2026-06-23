import { useQuery } from '@tanstack/react-query';
import { gamificationService } from '@/services/gamification.service';

export const gamKeys = {
  myScore: () => ['gamification', 'my-score'] as const,
  leaderboard: (page: number) => ['gamification', 'leaderboard', page] as const,
  myBadges: () => ['gamification', 'my-badges'] as const,
  allBadges: () => ['gamification', 'all-badges'] as const,
  history: (page: number) => ['gamification', 'history', page] as const,
};

export function useMyScore() {
  return useQuery({
    queryKey: gamKeys.myScore(),
    queryFn: () => gamificationService.getMyScore(),
    select: (res) => res.data,
  });
}

export function useLeaderboard(page = 1, limit = 20) {
  return useQuery({
    queryKey: gamKeys.leaderboard(page),
    queryFn: () => gamificationService.getLeaderboard(page, limit),
    select: (res) => res.data,
  });
}

export function useMyBadges() {
  return useQuery({
    queryKey: gamKeys.myBadges(),
    queryFn: () => gamificationService.getMyBadges(),
    select: (res) => res.data,
  });
}

export function useAllBadges() {
  return useQuery({
    queryKey: gamKeys.allBadges(),
    queryFn: () => gamificationService.getAllBadges(),
    select: (res) => res.data,
  });
}

export function useScoreHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: gamKeys.history(page),
    queryFn: () => gamificationService.getScoreHistory(page, limit),
    select: (res) => res.data,
  });
}
