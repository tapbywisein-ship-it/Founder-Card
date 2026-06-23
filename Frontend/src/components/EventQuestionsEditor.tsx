import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/services/api';
import type { EventQuestion } from '@/services/events.service';

const create = (
  eventId: string,
  body: { prompt: string; type?: string; required?: boolean; options?: string[] }
) =>
  apiFetch<{ data: EventQuestion }>(`/organizer/events/${eventId}/questions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });

const remove = (eventId: string, questionId: string) =>
  apiFetch<{ data: null }>(`/organizer/events/${eventId}/questions/${questionId}`, {
    method: 'DELETE',
  });

interface EventQuestionsEditorProps {
  eventId: string;
}

/**
 * Inline editor for the event's custom registration questions. Lives on the
 * organizer's settings tab. Supports add + delete; in-place edit can come
 * later if organizers ask for it.
 */
export const EventQuestionsEditor = ({ eventId }: EventQuestionsEditorProps) => {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'TEXT' | 'TEXTAREA' | 'SELECT'>('TEXT');
  const [required, setRequired] = useState(false);
  const [optionsText, setOptionsText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['events', 'questions', eventId],
    queryFn: () =>
      apiFetch<{ data: EventQuestion[] }>(`/events/${eventId}/questions`),
    select: (res) => res.data,
  });

  const add = useMutation({
    mutationFn: () => {
      const opts = type === 'SELECT' ? optionsText.split(',').map((s) => s.trim()).filter(Boolean) : undefined;
      return create(eventId, { prompt, type, required, options: opts });
    },
    onSuccess: () => {
      setPrompt('');
      setOptionsText('');
      setRequired(false);
      qc.invalidateQueries({ queryKey: ['events', 'questions', eventId] });
      toast.success('Question added');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not add'),
  });

  const del = useMutation({
    mutationFn: (questionId: string) => remove(eventId, questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'questions', eventId] });
      toast.success('Question removed');
    },
  });

  return (
    <Surface>
      <h3 className="mb-3 text-base font-semibold text-foreground">Registration questions</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Ask attendees up to a few quick questions when they register — answers show up in the
        guests tab and the pending-approval queue.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {data && data.length > 0 && (
        <ul className="mb-4 space-y-1.5">
          {data.map((q) => (
            <li
              key={q.id}
              className="flex items-center gap-2 rounded-card border border-border bg-card/40 px-3 py-2"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {q.prompt}
                  {q.required && <span className="ml-1 text-rose-500">*</span>}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {q.type.toLowerCase()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                onClick={() => {
                  if (window.confirm('Delete this question?')) del.mutate(q.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2 rounded-card border border-dashed border-border p-3">
        <Label className="text-xs">Prompt</Label>
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="What's your company stage?"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'TEXT' | 'TEXTAREA' | 'SELECT')}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="TEXT">Short text</option>
              <option value="TEXTAREA">Long text</option>
              <option value="SELECT">Dropdown</option>
            </select>
          </div>
          <label className="mt-6 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="rounded border-border"
            />
            Required
          </label>
        </div>
        {type === 'SELECT' && (
          <div className="space-y-1">
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Pre-seed, Seed, Series A"
            />
          </div>
        )}
        <Button
          size="sm"
          onClick={() => add.mutate()}
          disabled={!prompt.trim() || add.isPending}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add question
        </Button>
      </div>
    </Surface>
  );
};
