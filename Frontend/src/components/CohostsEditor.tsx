import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Users } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { organizerService } from '@/services/organizer.service';

interface CohostsEditorProps {
  eventId: string;
}

export const CohostsEditor = ({ eventId }: CohostsEditorProps) => {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['organizer', 'cohosts', eventId],
    queryFn: () => organizerService.listCohosts(eventId),
    select: (res) => res.data,
  });

  const add = useMutation({
    mutationFn: () => organizerService.addCohost(eventId, email.trim()),
    onSuccess: () => {
      setEmail('');
      qc.invalidateQueries({ queryKey: ['organizer', 'cohosts', eventId] });
      toast.success('Co-host added');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not add co-host'),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => organizerService.removeCohost(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer', 'cohosts', eventId] });
    },
  });

  return (
    <Surface>
      <h3 className="mb-3 inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
        <Users className="h-4 w-4" /> Co-hosts
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Co-hosts can manage attendees, speakers, agenda, and questions for this event.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && data.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {data.map((c) => {
            const name = c.user.profile
              ? `${c.user.profile.firstName} ${c.user.profile.lastName}`.trim()
              : c.user.email;
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-card border border-border bg-card/40 px-3 py-2"
              >
                {c.user.profile?.avatar ? (
                  <img
                    src={c.user.profile.avatar}
                    alt={name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.user.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                  onClick={() => remove.mutate(c.userId)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cohost@example.com"
        />
        <Button
          size="sm"
          disabled={!email.trim() || add.isPending}
          onClick={() => add.mutate()}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </Surface>
  );
};
