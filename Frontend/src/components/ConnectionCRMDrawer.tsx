import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, Bell, BellOff, StickyNote, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useConnectionNotes, useCreateNote, useDeleteNote,
  useConnectionMeta, useSetConnectionMeta,
} from '@/hooks/useConnections';

interface Props {
  connectionId: string | null;
  name: string;
  onClose: () => void;
}

/** Quick-pick follow-up windows. Each computes an ISO date N days out. */
const FOLLOWUP_PRESETS: { label: string; days: number }[] = [
  { label: 'In 3 days', days: 3 },
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 },
];

const daysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0); // 9am reminder
  return d.toISOString();
};

export const ConnectionCRMDrawer = ({ connectionId, name, onClose }: Props) => {
  const open = !!connectionId;

  const { data: notes, isLoading: notesLoading } = useConnectionNotes(connectionId);
  const { data: meta } = useConnectionMeta(connectionId);
  const createNote = useCreateNote(connectionId ?? '');
  const deleteNote = useDeleteNote(connectionId ?? '');
  const setMeta = useSetConnectionMeta(connectionId ?? '');

  const [noteBody, setNoteBody] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Reset transient input when switching contacts
  useEffect(() => {
    setNoteBody('');
    setTagInput('');
  }, [connectionId]);

  const tags = meta?.tags ?? [];
  const followUpAt = meta?.followUpAt ?? null;
  const followUpDone = meta?.followUpDone ?? false;

  const addNote = () => {
    const body = noteBody.trim();
    if (!body) return;
    createNote.mutate(body, { onSuccess: () => setNoteBody('') });
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || tags.includes(t)) { setTagInput(''); return; }
    setMeta.mutate({ tags: [...tags, t] }, { onSuccess: () => setTagInput('') });
  };

  const removeTag = (t: string) => {
    setMeta.mutate({ tags: tags.filter((x) => x !== t) });
  };

  const setFollowUp = (iso: string | null) => {
    setMeta.mutate({ followUpAt: iso, followUpDone: false });
  };

  const markFollowUpDone = () => {
    setMeta.mutate({ followUpDone: true });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground">Relationship</p>
                <h2 className="text-lg font-semibold text-foreground truncate">{name}</h2>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              {/* Follow-up reminder */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Follow-up reminder</h3>
                </div>

                {followUpAt && !followUpDone ? (
                  <div className="flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(followUpAt).toLocaleDateString('en-IN', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">We'll nudge you in-app</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-emerald-400" onClick={markFollowUpDone} title="Mark done">
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => setFollowUp(null)} title="Clear">
                        <BellOff className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {followUpDone && (
                      <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Followed up. Set a new reminder anytime
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {FOLLOWUP_PRESETS.map((p) => (
                        <button
                          key={p.days}
                          onClick={() => setFollowUp(daysFromNow(p.days))}
                          disabled={setMeta.isPending}
                          className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Tags */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Tags</h3>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-foreground"
                      >
                        {t}
                        <button onClick={() => removeTag(t)} className="hover:text-rose-400">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="e.g. investor, hiring, warm-lead"
                    className="h-9 text-sm"
                  />
                  <Button size="sm" variant="outline" className="h-9" onClick={addTag} disabled={!tagInput.trim() || setMeta.isPending}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </section>

              {/* Notes */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <StickyNote className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Private notes</h3>
                </div>

                <div className="flex flex-col gap-2 mb-3">
                  <textarea
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="What did you talk about? What's the follow-up?"
                    rows={3}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <Button size="sm" className="self-end" onClick={addNote} disabled={!noteBody.trim() || createNote.isPending}>
                    {createNote.isPending ? 'Saving…' : 'Add note'}
                  </Button>
                </div>

                {notesLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />)}
                  </div>
                ) : (notes ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No notes yet. Jot down what you discussed so you remember next time.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(notes ?? []).map((note) => (
                      <div key={note.id} className="group rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{note.body}</p>
                          <button
                            onClick={() => deleteNote.mutate(note.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-rose-400 shrink-0"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {new Date(note.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
