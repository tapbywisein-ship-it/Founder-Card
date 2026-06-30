import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export type UserRole = 'attendee' | 'organizer' | 'admin';
export type UserTier = 'free' | 'founder';
export type CardStatus = 'none' | 'pending' | 'active' | 'deactivated';
export type AccountType = 'company' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  photoUrl?: string;
  designation?: string;
  company?: string;
  accountType?: AccountType;
  phone?: string;
  gender?: string;
  age?: number;
  bio?: string;
  industry?: string;
  skills: string[];
  interests: string[];
  lookingFor: string[];
  linkedin?: string;
  twitter?: string;
  website?: string;
  location?: string;
  fkScore: number;
  tier: UserTier;
  hasFounderCard: boolean;
  cardStatus: CardStatus;
  cardQR?: string;
  memberId?: string;
  isEmailVerified?: boolean;
  username?: string;
  connectionsCount: number;
  eventsAttended: number;
  registeredEvents?: string[];
  walletAdded?: boolean;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  activeRole: UserRole;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setActiveRole: (role: UserRole) => void;
  login: (user: User) => void;
  logout: () => void;
  activateCard: () => void;
  deactivateCard: () => void;
  registerForEvent: (eventId: string) => void;
}

const STORAGE_KEY = 'tapbywisein-auth';

const loadFromStorage = (): Partial<AppState> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
};

const saveToStorage = (state: Partial<AppState>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, isAuthenticated: state.isAuthenticated, activeRole: state.activeRole }));
  } catch {}
};

const persisted = loadFromStorage();

export const useAppStore = create<AppState>((set, get) => ({
  user: persisted.user ?? null,
  isAuthenticated: persisted.isAuthenticated ?? false,
  activeRole: persisted.activeRole ?? 'attendee',
  setUser: (user) => { set({ user }); saveToStorage(get()); },
  updateUser: (updates) => {
    const current = get().user;
    if (current) { set({ user: { ...current, ...updates } }); saveToStorage(get()); }
  },
  setActiveRole: (role) => { set({ activeRole: role }); saveToStorage(get()); },
  login: (user) => { set({ user, isAuthenticated: true, activeRole: user.role }); saveToStorage({ user, isAuthenticated: true, activeRole: user.role }); },
  logout: () => { supabase.auth.signOut().catch(() => {}); set({ user: null, isAuthenticated: false, activeRole: 'attendee' }); saveToStorage({ user: null, isAuthenticated: false, activeRole: 'attendee' }); },
  activateCard: () => {
    const user = get().user;
    if (user) { const updated = { ...user, hasFounderCard: true, cardStatus: 'active' as const, tier: 'founder' as const, cardQR: `tapbywisein://card/${user.id}` }; set({ user: updated }); saveToStorage({ ...get(), user: updated }); }
  },
  deactivateCard: () => {
    const user = get().user;
    if (user) { const updated = { ...user, cardStatus: 'deactivated' as const }; set({ user: updated }); saveToStorage({ ...get(), user: updated }); }
  },
  registerForEvent: (eventId: string) => {
    const user = get().user;
    if (user) {
      const registered = user.registeredEvents || [];
      if (!registered.includes(eventId)) {
        const updated = { ...user, registeredEvents: [...registered, eventId] };
        set({ user: updated });
        saveToStorage({ ...get(), user: updated });
      }
    }
  },
}));

export const mockAttendee: User = {
  id: 'att-1',
  name: 'Alex Chen',
  email: 'alex@tapbywisein.com',
  role: 'attendee',
  avatar: '',
  photoUrl: '',
  designation: 'Founder & CEO',
  company: 'NexusAI',
  accountType: 'company',
  phone: '+91 9876543210',
  gender: 'Male',
  age: 29,
  bio: 'Building the future of AI-powered networking. Previously at Google and YC W22.',
  industry: 'AI / Machine Learning',
  skills: ['Product Strategy', 'Fundraising', 'AI/ML', 'Go-to-Market'],
  interests: ['B2B SaaS', 'Deep Tech', 'Climate Tech', 'Web3'],
  lookingFor: ['Co-founder', 'Investors', 'Advisors'],
  linkedin: 'https://linkedin.com/in/alexchen',
  twitter: '@alexchen',
  website: 'https://alexchen.dev',
  location: 'San Francisco, CA',
  fkScore: 87,
  tier: 'founder',
  hasFounderCard: true,
  cardStatus: 'active',
  cardQR: 'tapbywisein://card/att-1',
  connectionsCount: 142,
  eventsAttended: 23,
  registeredEvents: ['1'],
  walletAdded: false,
};

export const mockOrganizer: User = {
  id: 'org-1',
  name: 'Priya Sharma',
  email: 'priya@events.com',
  role: 'organizer',
  avatar: '',
  designation: 'Event Director',
  company: 'EventsPro',
  accountType: 'company',
  phone: '+91 9123456789',
  gender: 'Female',
  age: 34,
  bio: '10+ years running premium founder events across India and SE Asia.',
  industry: 'Events & Hospitality',
  skills: ['Event Management', 'Sponsorships', 'Community Building'],
  interests: ['Startups', 'Networking', 'Technology'],
  lookingFor: ['Sponsors', 'Speakers', 'Partners'],
  linkedin: 'https://linkedin.com/in/priyasharma',
  location: 'Bangalore, India',
  fkScore: 74,
  tier: 'founder',
  hasFounderCard: true,
  cardStatus: 'active',
  cardQR: 'tapbywisein://card/org-1',
  connectionsCount: 310,
  eventsAttended: 58,
};

export const mockAdmin: User = {
  id: 'adm-1',
  name: 'Rahul Nair',
  email: 'admin@tapbywisein.com',
  role: 'admin',
  avatar: '',
  designation: 'Platform Administrator',
  company: 'TapByWisein',
  accountType: 'company',
  phone: '+91 9000000001',
  gender: 'Male',
  age: 32,
  bio: 'Keeping TapByWisein secure, scalable, and growing.',
  industry: 'Platform & Infrastructure',
  skills: ['Platform Management', 'Security', 'Analytics', 'Policy'],
  interests: ['Startups', 'Policy', 'Security'],
  lookingFor: [],
  location: 'Mumbai, India',
  fkScore: 95,
  tier: 'founder',
  hasFounderCard: true,
  cardStatus: 'active',
  cardQR: 'tapbywisein://card/adm-1',
  connectionsCount: 0,
  eventsAttended: 0,
};

export const mockUser = mockAttendee;
