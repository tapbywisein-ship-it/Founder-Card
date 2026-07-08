import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { connectionsService } from '@/services/connections.service';
import { Handshake, Check, Loader2 } from 'lucide-react';

/**
 * "Ask for an intro": pick one of your mutual connections with the target and
 * we notify them to make the introduction. Renders nothing until `open`.
 */
export const IntroRequestDialog = ({
  targetId,
  targetName,
  eventId,
  open,
  onOpenChange,
}: {
  targetId: string;
  targetName: string;
  eventId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [viaId, setViaId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { data: mutuals, isLoading } = useQuery({
    queryKey: ['connections', 'mutuals', targetId],
    queryFn: () => connectionsService.listMutuals(targetId),
    select: (res) => res.data,
    enabled: open && !!targetId,
    staleTime: 60_000,
  });

  const request = useMutation({
    mutationFn: () =>
      connectionsService.requestIntro({
        targetId,
        viaId: viaId as string,
        eventId,
        message: message.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Intro requested — your connection has been notified');
      onOpenChange(false);
      setViaId(null);
      setMessage('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-primary" /> Ask for an intro
          </DialogTitle>
          <DialogDescription>
            Pick a mutual connection to introduce you to {targetName}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (mutuals ?? []).length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground text-center">
            You don't share any mutual connections with {targetName} yet — try
            connecting with them directly instead.
          </p>
        ) : (
          <>
            <div className="max-h-56 overflow-y-auto space-y-1 -mx-1 px-1">
              {(mutuals ?? []).map((m) => {
                const name = m.profile
                  ? `${m.profile.firstName} ${m.profile.lastName}`.trim()
                  : 'Connection';
                const selected = viaId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViaId(selected ? null : m.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg border text-left transition-colors ${
                      selected ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted'
                    }`}
                  >
                    {m.profile?.avatar ? (
                      <img src={m.profile.avatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      {(m.profile?.position || m.profile?.company) && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[m.profile?.position, m.profile?.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border'}`}>
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={`Why do you want to meet ${targetName}? (optional — shown to your connection)`}
            />

            <Button
              className="w-full"
              onClick={() => request.mutate()}
              disabled={!viaId || request.isPending}
            >
              {request.isPending ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Sending…</span>
              ) : (
                'Request intro'
              )}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
