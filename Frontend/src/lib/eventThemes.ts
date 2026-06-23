/**
 * Event theme system — Luma-style per-event accent tinting.
 *
 * Phase 2 (12 light-friendly themes):
 * Each event's chosen theme provides:
 *   • `accent` / `accentHover` — used by primary buttons, links, chips on the
 *     event-detail and event-manage pages.
 *   • `bannerGradient` — fallback for the cover-image area when no image is set.
 *   • `gradient` — a 2-color brand gradient used by some legacy components.
 *   • `cssVars` — injected onto the event-page wrapper so the global
 *     `[data-event-theme]` selector in `src/index.css` can mix 6 % of
 *     `--event-accent` into the page background, giving each event its own
 *     subtle wash without breaking the system's neutral-and-indigo defaults.
 */

export interface EventTheme {
  id: string;
  label: string;
  accent: string;
  accentHover: string;
  /** 2-color gradient for buttons / progress bars / branding accents. */
  gradient: string;
  /** 3-stop gradient used as cover-image fallback on event cards & detail pages. */
  bannerGradient: string;
  /** CSS custom properties to inject onto the page wrapper. */
  cssVars: { '--event-accent': string };
}

const make = (
  id: string,
  label: string,
  light: string,
  accent: string,
  hover: string
): EventTheme => ({
  id,
  label,
  accent,
  accentHover: hover,
  gradient: `linear-gradient(135deg, ${accent} 0%, ${hover} 100%)`,
  bannerGradient: `linear-gradient(135deg, ${light} 0%, ${accent} 55%, ${hover} 100%)`,
  cssVars: { '--event-accent': accent },
});

export const EVENT_THEMES: Record<string, EventTheme> = {
  indigo:  make('indigo',  'Indigo',  '#a5b4fc', '#4f46e5', '#4338ca'),
  sky:     make('sky',     'Sky',     '#7dd3fc', '#0ea5e9', '#0284c7'),
  rose:    make('rose',    'Rose',    '#fda4af', '#e11d48', '#be123c'),
  amber:   make('amber',   'Amber',   '#fcd34d', '#f59e0b', '#d97706'),
  emerald: make('emerald', 'Emerald', '#6ee7b7', '#10b981', '#059669'),
  violet:  make('violet',  'Violet',  '#c4b5fd', '#8b5cf6', '#7c3aed'),
  slate:   make('slate',   'Slate',   '#94a3b8', '#64748b', '#475569'),
  pink:    make('pink',    'Pink',    '#f9a8d4', '#ec4899', '#db2777'),
  cyan:    make('cyan',    'Cyan',    '#67e8f9', '#06b6d4', '#0891b2'),
  stone:   make('stone',   'Stone',   '#a8a29e', '#78716c', '#57534e'),
  sunset:  make('sunset',  'Sunset',  '#fdba74', '#f97316', '#ea580c'),
  forest:  make('forest',  'Forest',  '#86efac', '#16a34a', '#15803d'),
};

/**
 * Display-ordered theme IDs. Use this for any UI that iterates themes
 * (theme picker on CreateEvent, etc.) to control the visible order.
 */
export const THEME_IDS = [
  'indigo', 'sky', 'rose', 'amber',
  'emerald', 'violet', 'slate', 'pink',
  'cyan', 'stone', 'sunset', 'forest',
] as const;

/**
 * Resolve a theme ID to an EventTheme. Falls back to Indigo for unknown or
 * legacy IDs (existing events created with `theme: 'default'` map to Indigo).
 */
export const getTheme = (themeId?: string | null): EventTheme => {
  if (!themeId || themeId === 'default') return EVENT_THEMES.indigo;
  return EVENT_THEMES[themeId] ?? EVENT_THEMES.indigo;
};

/**
 * Inject the theme's CSS custom properties onto an element so the global
 * `[data-event-theme]` selector can pick them up.
 */
export const injectThemeVars = (
  el: HTMLElement | null,
  themeId?: string | null
): void => {
  if (!el) return;
  const theme = getTheme(themeId);
  Object.entries(theme.cssVars).forEach(([key, value]) => {
    el.style.setProperty(key, value);
  });
};
