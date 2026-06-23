interface ProfileLike {
  avatar?: string | null;
  bio?: string | null;
  position?: string | null;
  company?: string | null;
  skills?: string[] | null;
  interests?: string[] | null;
  lookingFor?: string[] | null;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;
}

/**
 * Score a profile 0–100 based on what fields are filled. Weights skewed toward
 * the fields that drive matchmaking (skills/interests/lookingFor).
 */
export function profileCompletion(p: ProfileLike | null | undefined): number {
  if (!p) return 0;
  let score = 0;
  if (p.avatar) score += 15;
  if (p.bio && p.bio.trim().length >= 20) score += 10;
  if (p.position || p.company) score += 15;
  if ((p.skills?.length ?? 0) >= 3) score += 20;
  else if ((p.skills?.length ?? 0) > 0) score += 10;
  if ((p.interests?.length ?? 0) >= 2) score += 15;
  else if ((p.interests?.length ?? 0) > 0) score += 8;
  if ((p.lookingFor?.length ?? 0) >= 1) score += 15;
  if (p.linkedin || p.twitter || p.website) score += 10;
  return Math.min(100, score);
}

/** True when the profile is so empty matchmaking won't return anything useful. */
export function profileNeedsOnboarding(p: ProfileLike | null | undefined): boolean {
  if (!p) return true;
  return (p.skills?.length ?? 0) === 0 && (p.interests?.length ?? 0) === 0;
}
