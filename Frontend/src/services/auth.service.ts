import { apiFetch } from './api';
import type { User, UserRole, UserTier, CardStatus } from '@/store/appStore';

// ─── Backend shapes ───────────────────────────────────────────────────────────

export interface BackendUser {
  id: string;
  email: string;
  role: 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';
  tier: 'FREE' | 'FOUNDER';
  isActive: boolean;
  isEmailVerified: boolean;
  profile: {
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string | null;
    position?: string | null;
    bio?: string | null;
    location?: string | null;
    linkedin?: string | null;
    twitter?: string | null;
    website?: string | null;
    skills?: string[];
    interests?: string[];
    lookingFor?: string[];
  } | null;
  founderCard?: {
    id: string;
    status: string;
    qrCodeUrl: string | null;
    memberId?: string | null;
  } | null;
  username?: string | null;
  gamification?: {
    fkScore: number;
    level: number;
  } | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapCardStatus(status?: string): CardStatus {
  if (!status) return 'none';
  const map: Record<string, CardStatus> = {
    PENDING: 'pending',
    ACTIVE: 'active',
    DEACTIVATED: 'deactivated',
    APPROVED: 'active',
  };
  return map[status] ?? 'none';
}

export function mapBackendUser(bu: BackendUser): User {
  const firstName = bu.profile?.firstName ?? '';
  const lastName = bu.profile?.lastName ?? '';
  const name = [firstName, lastName].filter(Boolean).join(' ') || bu.email;
  const cardStatus = mapCardStatus(bu.founderCard?.status);

  return {
    id: bu.id,
    email: bu.email,
    role: bu.role.toLowerCase() as UserRole,
    tier: bu.tier.toLowerCase() as UserTier,
    name,
    avatar: bu.profile?.avatar ?? undefined,
    designation: bu.profile?.position ?? undefined,
    company: bu.profile?.company ?? undefined,
    bio: bu.profile?.bio ?? undefined,
    location: bu.profile?.location ?? undefined,
    linkedin: bu.profile?.linkedin ?? undefined,
    twitter: bu.profile?.twitter ?? undefined,
    website: bu.profile?.website ?? undefined,
    skills: bu.profile?.skills ?? [],
    interests: bu.profile?.interests ?? [],
    lookingFor: bu.profile?.lookingFor ?? [],
    fkScore: bu.gamification?.fkScore ?? 0,
    hasFounderCard: !!bu.founderCard,
    cardStatus,
    cardQR: bu.founderCard?.qrCodeUrl ?? undefined,
    memberId: bu.founderCard?.memberId ?? undefined,
    isEmailVerified: bu.isEmailVerified,
    username: bu.username ?? undefined,
    connectionsCount: 0,
    eventsAttended: 0,
  };
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function apiGetMe(): Promise<User> {
  const res = await apiFetch<ApiEnvelope<BackendUser>>('/auth/me');
  return mapBackendUser(res.data);
}

export interface ClaimTokenInfo {
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export async function apiValidateClaim(token: string): Promise<ClaimTokenInfo> {
  const res = await apiFetch<ApiEnvelope<ClaimTokenInfo>>(
    `/auth/claim/${encodeURIComponent(token)}`
  );
  return res.data;
}

export async function apiClaimAccount(
  token: string,
  password: string
): Promise<{ user: User }> {
  const res = await apiFetch<ApiEnvelope<{ user: BackendUser }>>(
    `/auth/claim/${encodeURIComponent(token)}`,
    {
      method: 'POST',
      body: JSON.stringify({ password }),
    }
  );
  return { user: mapBackendUser(res.data.user) };
}
