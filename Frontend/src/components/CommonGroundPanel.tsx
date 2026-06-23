import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  Handshake,
  Sparkles,
  Tag,
  Target,
} from 'lucide-react';
import { Surface } from '@/components/Surface';
import {
  connectionsService,
  type ConnectionContext,
} from '@/services/connections.service';

interface CommonGroundPanelProps {
  targetUserId: string;
  /** Hide entirely until the page knows the viewer is logged-in + not self. */
  enabled?: boolean;
}

/**
 * "Common ground" panel for the FounderCard page. Renders only the sections
 * that have content — empty states are suppressed so the panel disappears
 * quietly for a brand-new connection where you share nothing yet.
 */
export const CommonGroundPanel = ({ targetUserId, enabled = true }: CommonGroundPanelProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ['connection-context', targetUserId],
    queryFn: () => connectionsService.getContextWith(targetUserId),
    select: (res) => res.data as ConnectionContext,
    enabled,
    staleTime: 5 * 60_000,
  });

  if (!enabled || isLoading || !data) return null;

  const {
    connection,
    commonEvents,
    commonSkills,
    commonInterests,
    commonLookingFor,
    theyWantYourSkills,
    youWantTheirSkills,
  } = data;

  const hasMetadata = !!connection;
  const hasCommonEvents = commonEvents.length > 0;
  const hasSkills = commonSkills.length > 0;
  const hasInterests = commonInterests.length > 0;
  const hasLookingFor = commonLookingFor.length > 0;
  const hasReverseSignal = theyWantYourSkills.length > 0 || youWantTheirSkills.length > 0;

  if (
    !hasMetadata &&
    !hasCommonEvents &&
    !hasSkills &&
    !hasInterests &&
    !hasLookingFor &&
    !hasReverseSignal
  ) {
    return null;
  }

  return (
    <Surface>
      <h3 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" /> Common ground
      </h3>

      <div className="space-y-3 text-sm">
        {/* Connection metadata */}
        {connection && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Handshake className="h-4 w-4 text-primary/70" />
            <span>
              Connected{' '}
              <span className="font-medium text-foreground">
                {formatDistanceToNow(new Date(connection.createdAt), { addSuffix: true })}
              </span>
              {connection.event && (
                <>
                  {' '}at{' '}
                  <Link
                    to={`/event/${connection.event.id}`}
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    {connection.event.title}
                  </Link>
                </>
              )}
            </span>
          </div>
        )}

        {/* Reverse-direction signal — strongest icebreaker fuel */}
        {hasReverseSignal && (
          <div className="rounded-card border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="mb-1 inline-flex items-center gap-1.5 font-semibold text-primary">
              <Target className="h-3.5 w-3.5" /> Why you should talk
            </div>
            {theyWantYourSkills.length > 0 && (
              <p className="text-foreground">
                <span className="text-muted-foreground">They're looking for:</span>{' '}
                {theyWantYourSkills.join(', ')}{' '}
                <span className="text-muted-foreground">— that's you.</span>
              </p>
            )}
            {youWantTheirSkills.length > 0 && (
              <p className="text-foreground">
                <span className="text-muted-foreground">You're looking for:</span>{' '}
                {youWantTheirSkills.join(', ')}{' '}
                <span className="text-muted-foreground">— that's them.</span>
              </p>
            )}
          </div>
        )}

        {/* Common events */}
        {hasCommonEvents && (
          <div>
            <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" /> Both attended
            </div>
            <ul className="space-y-1">
              {commonEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    to={`/event/${e.id}`}
                    className="text-sm text-foreground underline-offset-2 hover:underline"
                  >
                    {e.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {format(new Date(e.startDate), 'PP')}
                    {e.city && ` · ${e.city}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skill / interest / lookingFor chips */}
        {(hasSkills || hasInterests || hasLookingFor) && (
          <div className="space-y-2">
            {hasSkills && (
              <ChipRow label="Shared skills" icon={Tag} items={commonSkills} />
            )}
            {hasInterests && (
              <ChipRow label="Shared interests" icon={Sparkles} items={commonInterests} />
            )}
            {hasLookingFor && (
              <ChipRow label="Both looking for" icon={Target} items={commonLookingFor} />
            )}
          </div>
        )}
      </div>
    </Surface>
  );
};

const ChipRow = ({
  label,
  icon: Icon,
  items,
}: {
  label: string;
  icon: typeof Calendar;
  items: string[];
}) => (
  <div>
    <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <div className="flex flex-wrap gap-1">
      {items.map((s) => (
        <span key={s} className="chip-primary">
          {s}
        </span>
      ))}
    </div>
  </div>
);
