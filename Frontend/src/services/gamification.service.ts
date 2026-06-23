import { apiFetch } from './api';

export interface GamificationData {
  id: string;
  userId: string;
  fkScore: number;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fkScore: number;
  level: number;
  profile?: {
    firstName: string;
    lastName: string;
    avatar?: string;
    company?: string;
  };
}

export interface ScoreHistoryEntry {
  id: string;
  action: string;
  points: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export const gamificationService = {
  async getMyScore() {
    return apiFetch<{ data: GamificationData }>('/gamification/me');
  },

  async getLeaderboard(page = 1, limit = 20) {
    return apiFetch<{ data: { leaderboard: LeaderboardEntry[]; pagination: unknown } }>(
      `/gamification/leaderboard?page=${page}&limit=${limit}`
    );
  },

  async getMyBadges() {
    return apiFetch<{ data: Badge[] }>('/gamification/badges/me');
  },

  async getAllBadges() {
    return apiFetch<{ data: Badge[] }>('/gamification/badges');
  },

  async getScoreHistory(page = 1, limit = 20) {
    return apiFetch<{ data: { history: ScoreHistoryEntry[]; pagination: unknown } }>(
      `/gamification/history?page=${page}&limit=${limit}`
    );
  },
};
