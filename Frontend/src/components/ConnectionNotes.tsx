import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { NotebookPen, Plus, Trash2, X, Check, Tag, CalendarClock } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  connectionsService,
  type ConnectionNote,
} from '@/services/connections.service';

interface ConnectionNotesProps {
  /** The other party's user id; we resolve the connection id from it. */
  targetUserId: string;
}

/**
 * Private notes you keep on a connection (only you see them).
 * Shows nothing if no connection exists between you and the target — the UI
 * encourages connecting first via the page's primary CTA.
 */
export const ConnectionNotes = ({ targetUserId }: ConnectionNotesProps) => {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);

  const conn = useQuery({
    queryKey: ['connection-with', targetUserId],
    queryFn: () => connectionsService.findConnectionWith(targetUserId),
    select: (res) => res.data,
  });

  const connectionId = conn.data?.id;
  const isAccepted = conn.data?.status === 'ACCEPTED';

  const notes = useQuery({
    queryKey: ['connection-notes', connectionId],
    queryFn: () => connectionsService.listNotes(connectionId!),
    select: (res) => res.data,
    enabled: !!connectionId,
  });

  const create = useMutation({
    mutationFn: () => connectionsService.createNote(connectionId!, draft),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['connection-notes', connectionId] });
      toast.success('Note saved');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save'),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      connectionsService.updateNote(id, body),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['connection-notes', connectionId] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => connectionsService.deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connection-notes', connectionId] });
      toast.success('Note deleted');
    },
  });

  // ── CRM metadata: tags + follow-up reminder ──
  const [tagDraft, setTagDraft] = useState('');
  const meta = useQuery({
    queryKey: ['connection-meta', connectionId],
    queryFn: () => connectionsService.getMeta(connectionId!),
    select: (res) => res.data,
    enabled: !!connectionId,
  });
  const tags = meta.data?.tags ?? [];
  const followUpAt = meta.data?.followUpAt ?? null;
  const followUpDone = meta.data?.followUpDone ?? false;

  const setMeta = useMutation({
    mutationFn: (input: { tags?: string[]; followUpAt?: string | null; followUpDone?: boolean }) =>
      connectionsService.setMeta(connectionId!, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connection-meta', connectionId] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not save'),
  });

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) {
      setTagDraft('');
      return;
    }
    setMeta.mutate({ tags: [...tags, t] });
    setTagDraft('');
  };
  const removeTag = (t: string) => setMeta.mutate({ tags: tags.filter((x) => x !== t) });

  if (conn.isLoading) return null;
  if (!connectionId || !isAccepted) {
    return (
      <Surface className="text-sm text-muted-foreground">
        <NotebookPen className="mr-1.5 inline h-4 w-4" />
        Connect first to save private notes about this person.
      </Surface>
    );
  }

  const list: ConnectionNote[] = notes.data ?? [];

  return (
    <Surface>
      {/* Tags */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Tags</h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                onClick={() => removeTag(t)}
                className="rounded-full hover:bg-primary/20"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <Input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add tag (e.g. investor)…"
            className="h-7 w-40 text-xs"
          />
        </div>
      </div>

      {/* Follow-up reminder */}
      <div className="mb-4 border-t border-border pt-4">
        <div className="mb-2 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Follow-up reminder</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={followUpAt ? followUpAt.slice(0, 10) : ''}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) =>
              setMeta.mutate({ followUpAt: e.target.value ? new Date(e.target.value).toISOString() : null })
            }
            className="h-8 w-[150px] text-xs"
          />
          {followUpAt && !followUpDone && (
            <Button size="sm" variant="ghost" onClick={() => setMeta.mutate({ followUpDone: true })}>
              <Check className="mr-1 h-3.5 w-3.5" /> Mark done
            </Button>
          )}
          {followUpAt && (
            <span className="text-xs text-muted-foreground">
              {followUpDone ? 'Done' : `Reminds on ${format(new Date(followUpAt), 'PP')}`}
            </span>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 border-t border-border pt-4">
        <NotebookPen className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Private notes</h3>
        <span className="text-xs text-muted-foreground">— only you see these</span>
      </div>

      {/* New-note input */}
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="e.g. met at coffee — follow up about Series A"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => create.mutate()}
            disabled={!draft.trim() || create.isPending}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add note
          </Button>
        </div>
      </div>

      {/* Note list */}
      {list.length > 0 && (
        <ul className="mt-4 space-y-2">
          {list.map((n) => (
            <li key={n.id} className="rounded-card border border-border bg-card/60 p-3">
              {editing?.id === n.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editing.body}
                    onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => update.mutate({ id: n.id, body: editing.body })}
                      disabled={!editing.body.trim() || update.isPending}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      <X className="mr-1 h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-foreground">{n.body}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {format(new Date(n.createdAt), 'PP')}
                      {n.updatedAt !== n.createdAt && ' · edited'}
                    </span>
                    <div className="flex gap-1">
                      <button
                        className="hover:text-foreground"
                        onClick={() => setEditing({ id: n.id, body: n.body })}
                      >
                        Edit
                      </button>
                      <span>·</span>
                      <button
                        className="hover:text-destructive"
                        onClick={() => {
                          if (window.confirm('Delete this note?')) remove.mutate(n.id);
                        }}
                      >
                        <Trash2 className="inline h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
};
