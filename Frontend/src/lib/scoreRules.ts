export const SCORE_RULES = [
  { action: 'Complete your profile', points: 50, icon: '📝' },
  { action: 'Register for an event', points: 20, icon: '🎟️' },
  { action: 'Attend an event (check-in)', points: 50, icon: '✅' },
  { action: 'Make a connection', points: 10, icon: '🤝' },
  { action: 'Activate your Founder Card', points: 100, icon: '💳' },
  { action: 'Scan a QR code', points: 5, icon: '📷' },
  { action: 'Earn a badge', points: 25, icon: '🏆' },
  { action: 'First login', points: 10, icon: '👋' },
  { action: 'Add a profile photo', points: 15, icon: '🖼️' },
] as const;

export const LEVEL_THRESHOLDS = [
  { level: 1, minScore: 0, label: 'Newcomer' },
  { level: 2, minScore: 100, label: 'Explorer' },
  { level: 3, minScore: 250, label: 'Networker' },
  { level: 4, minScore: 500, label: 'Connector' },
  { level: 5, minScore: 1000, label: 'Influencer' },
  { level: 6, minScore: 1500, label: 'Builder' },
  { level: 7, minScore: 2500, label: 'Innovator' },
  { level: 8, minScore: 4000, label: 'Visionary' },
  { level: 9, minScore: 6000, label: 'Pioneer' },
  { level: 10, minScore: 10000, label: 'Legend' },
] as const;
