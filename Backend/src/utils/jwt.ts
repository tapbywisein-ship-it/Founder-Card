// JWT utils removed — authentication is now handled entirely by Supabase Auth.
// This file is kept as a stub so any remaining imports compile without error.

import { JwtPayload } from '@appTypes/index';

export const signAccessToken = (_payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  throw new Error('JWT signing removed — use Supabase Auth');
};

export const signRefreshToken = (_payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  throw new Error('JWT signing removed — use Supabase Auth');
};

export const verifyAccessToken = (_token: string): JwtPayload => {
  throw new Error('JWT verification removed — use Supabase Auth');
};

export const verifyRefreshToken = (_token: string): JwtPayload => {
  throw new Error('JWT verification removed — use Supabase Auth');
};

export const decodeToken = (_token: string): JwtPayload | null => null;

export const getTokenExpiry = (expiresIn: string): Date => {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return now;
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === 's') now.setSeconds(now.getSeconds() + value);
  if (unit === 'm') now.setMinutes(now.getMinutes() + value);
  if (unit === 'h') now.setHours(now.getHours() + value);
  if (unit === 'd') now.setDate(now.getDate() + value);
  return now;
};
