import { useEffect, useState, type MouseEvent } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useToggleSaveEvent, useSavedEvents } from '@/hooks/useEvents';

interface SaveEventButtonProps {
  eventId: string;
  /** Optional initial saved state from the parent (skips a query). */
  initialSaved?: boolean;
  className?: string;
}

/**
 * Small bookmark toggle. Used on event cards everywhere (Events list,
 * EventDetail). Optimistic UI — flips state immediately, reverts on error.
 */
export const SaveEventButton = ({ eventId, initialSaved, className = '' }: SaveEventButtonProps) => {
  const toggle = useToggleSaveEvent();
  const { data: savedData } = useSavedEvents(1, 100);
  const fromQuery = savedData?.events.some((e) => e.id === eventId);
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  useEffect(() => {
    setOptimistic(null);
  }, [fromQuery]);

  const saved = optimistic ?? initialSaved ?? fromQuery ?? false;

  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOptimistic(!saved);
    toggle.mutate(
      { eventId, save: !saved },
      { onError: () => setOptimistic(saved) }
    );
  };

  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <button
      onClick={onClick}
      aria-label={saved ? 'Remove bookmark' : 'Save event'}
      aria-pressed={saved}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
        saved
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      } ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
};
