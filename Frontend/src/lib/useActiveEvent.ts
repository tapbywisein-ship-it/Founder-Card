import { create } from 'zustand';
import { useLocation } from 'react-router-dom';
import { useEffect, useMemo } from 'react';

interface ActiveEventState {
  /** Last URL-derived event id (null when not on an event-scoped route). */
  urlEventId: string | null;
  /** Last "active check-in" event id, if the user is checked in to a live event. */
  checkedInEventId: string | null;
  setUrlEventId: (id: string | null) => void;
  setCheckedInEventId: (id: string | null) => void;
}

const useStore = create<ActiveEventState>((set) => ({
  urlEventId: null,
  checkedInEventId: null,
  setUrlEventId: (id) => set({ urlEventId: id }),
  setCheckedInEventId: (id) => set({ checkedInEventId: id }),
}));

const URL_PATTERNS = [
  /^\/event\/([0-9a-f-]{8,})/i,
  /^\/e\/([0-9a-f-]{8,})/i,
  /^\/organizer\/events\/([0-9a-f-]{8,})/i,
];

function deriveEventIdFromPath(pathname: string): string | null {
  for (const pat of URL_PATTERNS) {
    const m = pathname.match(pat);
    if (m) return m[1];
  }
  return null;
}

/**
 * Read the current active event id, preferring URL-derived over check-in
 * derived. Mount once near the router root via {@link useSyncActiveEventFromUrl}
 * so any consumer can read the resolved value without prop-drilling.
 */
export function useActiveEventId(): string | null {
  const urlEventId = useStore((s) => s.urlEventId);
  const checkedInEventId = useStore((s) => s.checkedInEventId);
  return urlEventId ?? checkedInEventId;
}

/**
 * Mount once at the app root. Watches `location.pathname` and writes the
 * URL-derived event id into the Zustand slice so all consumers stay in sync
 * without listening to router state themselves.
 */
export function useSyncActiveEventFromUrl(): void {
  const { pathname } = useLocation();
  const setUrlEventId = useStore((s) => s.setUrlEventId);
  const id = useMemo(() => deriveEventIdFromPath(pathname), [pathname]);
  useEffect(() => {
    setUrlEventId(id);
  }, [id, setUrlEventId]);
}

/** Setter for the check-in derived event id (called from registration hooks). */
export function useSetCheckedInEventId() {
  return useStore((s) => s.setCheckedInEventId);
}
