import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, FileText, Video, CalendarClock, Briefcase, Link as LinkIcon, Layers } from 'lucide-react';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { founderCardService } from '@/services/founderCard.service';

export const BLOCK_TYPES = [
  { id: 'deck', label: 'Pitch deck', icon: FileText },
  { id: 'video', label: 'Demo video', icon: Video },
  { id: 'booking', label: 'Book a call', icon: CalendarClock },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'link', label: 'Link', icon: LinkIcon },
] as const;

export const blockIcon = (type: string) =>
  BLOCK_TYPES.find((t) => t.id === type)?.icon ?? LinkIcon;

export const CardBlocksEditor = () => {
  const qc = useQueryClient();
  const [type, setType] = useState<string>('deck');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const blocks = useQuery({
    queryKey: ['card-blocks'],
    queryFn: () => founderCardService.listBlocks(),
    select: (res) => res.data,
  });

  const create = useMutation({
    mutationFn: () => founderCardService.createBlock({ type, label, url }),
    onSuccess: () => {
      setLabel('');
      setUrl('');
      qc.invalidateQueries({ queryKey: ['card-blocks'] });
      toast.success('Block added');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not add'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => founderCardService.deleteBlock(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-blocks'] });
      toast.success('Block removed');
    },
  });

  const list = blocks.data ?? [];

  return (
    <Surface>
      <div className="mb-3 flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Card blocks</h2>
        <span className="text-xs text-muted-foreground">e.g. pitch deck, video, booking link…</span>
      </div>

      {list.length > 0 && (
        <ul className="mb-4 space-y-2">
          {list.map((b) => {
            const Icon = blockIcon(b.type);
            return (
              <li
                key={b.id}
                className="flex items-center gap-3 rounded-card border border-border bg-card/60 px-3 py-2.5"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{b.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{b.url}</p>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => remove.mutate(b.id)}
                  aria-label="Remove block"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add new block */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {BLOCK_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                type === t.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-3 w-3" /> {t.label}
            </button>
          ))}
        </div>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. View our deck)" maxLength={80} />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => create.mutate()}
            disabled={!label.trim() || !url.trim() || create.isPending}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add block
          </Button>
        </div>
      </div>
    </Surface>
  );
};
