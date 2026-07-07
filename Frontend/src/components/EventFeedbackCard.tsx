import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { eventsService } from '@/services/events.service';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

/**
 * Post-event feedback for attendees: 1–5 stars, optional NPS 0–10 and a
 * comment. Shown on the event page once the event has started/ended for
 * people who attended. Editable — resubmitting updates the earlier answer.
 */
export const EventFeedbackCard = ({ eventId }: { eventId: string }) => {
  const qc = useQueryClient();
  const { data: mine, isLoading } = useQuery({
    queryKey: ['events', 'feedback', 'mine', eventId],
    queryFn: () => eventsService.getMyFeedback(eventId),
    select: (res) => res.data,
  });

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [nps, setNps] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const submit = useMutation({
    mutationFn: () =>
      eventsService.submitFeedback(eventId, {
        rating,
        nps: nps ?? undefined,
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'feedback', 'mine', eventId] });
      setEditing(false);
      toast.success('Thanks for the feedback!');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return null;

  // Already submitted and not editing → compact thanks state.
  if (mine && !editing) {
    return (
      <Surface className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Thanks for your feedback!</p>
          <p className="text-xs text-muted-foreground">
            You rated this event {mine.rating}/5{mine.nps !== null ? ` · NPS ${mine.nps}/10` : ''}.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRating(mine.rating);
            setNps(mine.nps);
            setComment(mine.comment ?? '');
            setEditing(true);
          }}
        >
          Edit
        </Button>
      </Surface>
    );
  }

  return (
    <Surface className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">How was this event?</p>
        <p className="text-xs text-muted-foreground">Your feedback helps the organizer improve.</p>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n !== 1 ? 's' : ''}`}>
            <Star
              className={`w-6 h-6 transition-colors ${
                n <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40'
              }`}
            />
          </button>
        ))}
      </div>

      {/* NPS 0–10 */}
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">
          How likely are you to recommend it? <span className="text-muted-foreground/60">(0–10, optional)</span>
        </p>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNps(nps === n ? null : n)}
              className={`w-7 h-7 rounded-md text-xs font-medium border transition-colors ${
                nps === n
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Anything the organizer should know? (optional)"
      />

      <Button className="w-full" onClick={() => submit.mutate()} disabled={rating === 0 || submit.isPending}>
        {submit.isPending ? (
          <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending…</span>
        ) : (
          'Submit feedback'
        )}
      </Button>
    </Surface>
  );
};
