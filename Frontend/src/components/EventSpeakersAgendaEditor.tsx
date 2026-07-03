import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Trash2, Mic, Calendar } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/services/api';
import {
  eventsService,
  type EventAgendaItem,
  type EventSpeaker,
} from '@/services/events.service';

interface Props {
  eventId: string;
}

const createSpeaker = (eventId: string, body: Partial<EventSpeaker>) =>
  apiFetch<{ data: EventSpeaker }>(`/organizer/events/${eventId}/speakers`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
const deleteSpeaker = (eventId: string, speakerId: string) =>
  apiFetch<{ data: null }>(`/organizer/events/${eventId}/speakers/${speakerId}`, {
    method: 'DELETE',
  });
const createAgenda = (eventId: string, body: Partial<EventAgendaItem>) =>
  apiFetch<{ data: EventAgendaItem }>(`/organizer/events/${eventId}/agenda`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
const deleteAgenda = (eventId: string, itemId: string) =>
  apiFetch<{ data: null }>(`/organizer/events/${eventId}/agenda/${itemId}`, {
    method: 'DELETE',
  });

export const EventSpeakersAgendaEditor = ({ eventId }: Props) => {
  const qc = useQueryClient();

  const speakers = useQuery({
    queryKey: ['events', 'speakers', eventId],
    queryFn: () => eventsService.listSpeakers(eventId),
    select: (r) => r.data,
  });
  const agenda = useQuery({
    queryKey: ['events', 'agenda', eventId],
    queryFn: () => eventsService.listAgenda(eventId),
    select: (r) => r.data,
  });

  // Speaker draft state
  const [sName, setSName] = useState('');
  const [sTitle, setSTitle] = useState('');
  const [sCompany, setSCompany] = useState('');
  const [sBio, setSBio] = useState('');

  const addSpeaker = useMutation({
    mutationFn: () =>
      createSpeaker(eventId, {
        name: sName,
        title: sTitle || null,
        company: sCompany || null,
        bio: sBio || null,
      }),
    onSuccess: () => {
      setSName('');
      setSTitle('');
      setSCompany('');
      setSBio('');
      qc.invalidateQueries({ queryKey: ['events', 'speakers', eventId] });
      toast.success('Speaker added');
    },
  });
  const removeSpeaker = useMutation({
    mutationFn: (id: string) => deleteSpeaker(eventId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events', 'speakers', eventId] });
      qc.invalidateQueries({ queryKey: ['events', 'agenda', eventId] });
    },
  });

  // Agenda draft state
  const [aTitle, setATitle] = useState('');
  const [aStarts, setAStarts] = useState('');
  const [aEnds, setAEnds] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aSpeaker, setASpeaker] = useState('');

  const addItem = useMutation({
    mutationFn: () =>
      createAgenda(eventId, {
        title: aTitle,
        description: aDesc || null,
        startsAt: aStarts,
        endsAt: aEnds || null,
        speakerId: aSpeaker || null,
      }),
    onSuccess: () => {
      setATitle('');
      setAStarts('');
      setAEnds('');
      setADesc('');
      setASpeaker('');
      qc.invalidateQueries({ queryKey: ['events', 'agenda', eventId] });
      toast.success('Item added');
    },
  });
  const removeItem = useMutation({
    mutationFn: (id: string) => deleteAgenda(eventId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events', 'agenda', eventId] }),
  });

  return (
    <div className="space-y-4">
      <Surface>
        <h3 className="mb-3 inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
          <Mic className="h-4 w-4" /> Speakers
        </h3>

        {(speakers.data?.length ?? 0) > 0 && (
          <ul className="mb-4 space-y-1.5">
            {speakers.data!.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-card border border-border bg-card/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{s.name}</p>
                  {(s.title || s.company) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[s.title, s.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                  onClick={() => removeSpeaker.mutate(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-card border border-dashed border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={sName} onChange={(e) => setSName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={sTitle} onChange={(e) => setSTitle(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Company</Label>
              <Input value={sCompany} onChange={(e) => setSCompany(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Bio</Label>
              <Textarea
                rows={2}
                value={sBio}
                onChange={(e) => setSBio(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={!sName.trim() || addSpeaker.isPending}
            onClick={() => addSpeaker.mutate()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add speaker
          </Button>
        </div>
      </Surface>

      <Surface>
        <h3 className="mb-3 inline-flex items-center gap-1.5 text-base font-semibold text-foreground">
          <Calendar className="h-4 w-4" /> Agenda
        </h3>

        {(agenda.data?.length ?? 0) > 0 && (
          <ul className="mb-4 space-y-1.5">
            {agenda.data!.map((it) => (
              <li
                key={it.id}
                className="flex items-start justify-between rounded-card border border-border bg-card/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {format(new Date(it.startsAt), 'PP p')} - {it.title}
                  </p>
                  {it.description && (
                    <p className="text-xs text-muted-foreground">{it.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                  onClick={() => removeItem.mutate(it.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-card border border-dashed border-border p-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Starts</Label>
              <Input type="datetime-local" value={aStarts} onChange={(e) => setAStarts(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ends (optional)</Label>
              <Input type="datetime-local" value={aEnds} onChange={(e) => setAEnds(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Speaker (optional)</Label>
            <select
              value={aSpeaker}
              onChange={(e) => setASpeaker(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">- None -</option>
              {(speakers.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea rows={2} value={aDesc} onChange={(e) => setADesc(e.target.value)} />
          </div>
          <Button
            size="sm"
            disabled={!aTitle.trim() || !aStarts || addItem.isPending}
            onClick={() => addItem.mutate()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add agenda item
          </Button>
        </div>
      </Surface>
    </div>
  );
};
