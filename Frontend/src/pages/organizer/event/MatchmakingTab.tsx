import { useParams } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { useMatchmaking } from '@/hooks/useOrganizer';
import type { MatchAttendee } from '@/services/organizer.service';
import { Sparkles, ArrowLeftRight, AlertCircle, Users, Check } from 'lucide-react';

const initials = (a: MatchAttendee) =>
  `${a.firstName?.[0] ?? ''}${a.lastName?.[0] ?? ''}`.toUpperCase() || '?';
const fullName = (a: MatchAttendee) =>
  [a.firstName, a.lastName].filter(Boolean).join(' ') || 'Attendee';

const Person = ({ a }: { a: MatchAttendee }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    {a.avatar ? (
      <img src={a.avatar} alt="" className="h-9 w-9 rounded-full object-cover shrink-0" />
    ) : (
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
        {initials(a)}
      </div>
    )}
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{fullName(a)}</p>
      <p className="text-xs text-muted-foreground truncate">
        {[a.position, a.company].filter(Boolean).join(' · ') || '—'}
      </p>
    </div>
  </div>
);

const MatchmakingTab = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useMatchmaking(id!);

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/40" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <AlertCircle className="w-4 h-4 shrink-0" /> Couldn't load matchmaking suggestions.
      </div>
    );
  }

  const pairs = data?.pairs ?? [];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Curated intros</h2>
          <p className="text-sm text-muted-foreground">
            The highest-overlap attendee pairs to introduce — ranked by shared skills, interests,
            and what each is looking for.
          </p>
        </div>
      </div>

      {pairs.length === 0 ? (
        <Surface className="text-center py-12">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No strong matches yet. Suggestions appear once attendees fill in skills & interests.
          </p>
          {data && (
            <p className="text-xs text-muted-foreground/70 mt-1">{data.attendeeCount} attendees so far.</p>
          )}
        </Surface>
      ) : (
        <div className="space-y-3">
          {pairs.map((p, i) => (
            <Surface key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1"><Person a={p.a} /></div>
                <ArrowLeftRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 flex justify-end"><Person a={p.b} /></div>
              </div>
              <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-border">
                {p.alreadyConnected && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <Check className="w-3 h-3" /> Already connected
                  </span>
                )}
                {p.reasons.map((r) => (
                  <span key={r} className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {r}
                  </span>
                ))}
                {p.reasons.length === 0 && !p.alreadyConnected && (
                  <span className="text-[11px] text-muted-foreground">Strong overall fit</span>
                )}
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatchmakingTab;
