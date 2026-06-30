import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Check, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { founderCardService } from '@/services/founderCard.service';

/** "Leave your details" form shown on someone's public card. */
export const CardLeadForm = ({ ownerId, ownerName }: { ownerId: string; ownerName?: string }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () => founderCardService.captureLead(ownerId, { name, email, message: message || undefined }),
    onSuccess: () => {
      setDone(true);
      toast.success('Your details were shared');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not send'),
  });

  if (done) {
    return (
      <div className="flex w-full max-w-md items-center gap-2 rounded-card border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">
        <Check className="h-4 w-4 flex-shrink-0" />
        Thanks! {ownerName ? `${ownerName} has` : 'They have'} your details.
      </div>
    );
  }

  if (!open) {
    return (
      <Button variant="outline" className="w-full max-w-md" onClick={() => setOpen(true)}>
        <Mail className="mr-1.5 h-4 w-4" /> Leave your details
      </Button>
    );
  }

  return (
    <div className="w-full max-w-md space-y-2 rounded-card border border-border bg-card p-4 text-left">
      <p className="text-sm font-semibold text-foreground">
        Share your details{ownerName ? ` with ${ownerName}` : ''}
      </p>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Your email" />
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Message (optional)"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => submit.mutate()}
          disabled={!name.trim() || !email.trim() || submit.isPending}
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {submit.isPending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  );
};
