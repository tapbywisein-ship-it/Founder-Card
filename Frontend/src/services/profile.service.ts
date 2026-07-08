import { apiFetch } from './api';

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string | null;
  status?: string | null;
  company?: string | null;
  position?: string | null;
  location?: string | null;
  avatar?: string | null;
  skills: string[];
  interests: string[];
  lookingFor?: string[];
  /** "Open to" card badges: HIRING / INVESTING / COFOUNDER / MENTORING */
  openTo?: string[];
  phone?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  website?: string | null;
  instagram?: string | null;
  email?: string | null;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  status?: string;
  company?: string;
  position?: string;
  location?: string;
  avatar?: string;
  skills?: string[];
  interests?: string[];
  lookingFor?: string[];
  openTo?: string[];
  phone?: string;
  twitter?: string;
  linkedin?: string;
  website?: string;
  instagram?: string;
}

export const profileService = {
  async getMyProfile() {
    return apiFetch<{ data: { profile: Profile; email: string; role: string; tier: string; username?: string | null } }>('/users/me');
  },

  async updateProfile(payload: UpdateProfilePayload) {
    return apiFetch<{ data: Profile }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getPublicProfile(userId: string) {
    return apiFetch<{ data: unknown }>(`/users/${userId}/profile`);
  },

  async checkUsernameAvailable(u: string) {
    const params = new URLSearchParams({ u });
    return apiFetch<{ data: { available: boolean; reason?: string } }>(
      `/users/username-available?${params.toString()}`
    );
  },

  async claimUsername(username: string) {
    return apiFetch<{ data: { id: string; username: string } }>(
      `/users/me/username`,
      { method: 'PUT', body: JSON.stringify({ username }) }
    );
  },

  /** Mark onboarding complete — auto-issues the user's ACTIVE Founder Card. */
  async completeOnboarding() {
    return apiFetch<{ data: { id: string; memberId: string | null; status: string; qrCodeUrl: string | null } }>(
      '/users/me/complete-onboarding',
      { method: 'POST' }
    );
  },
};
