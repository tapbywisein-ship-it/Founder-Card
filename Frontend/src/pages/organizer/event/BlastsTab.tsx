import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSendBlast, useEventBlasts } from '@/hooks/useOrganizer';
import { useEventContext } from '@/components/OrganizerEventLayout';
import { Mail, Send, Users } from 'lucide-react';

const AUDIENCES = [
  { value: 'all',        label: 'All'        },
  { value: 'registered', label: 'Registered' },
  { value: 'waitlist',   label: 'Waitlist'   },
] as const;

type Audience = (typeof AUDIENCES)[number]['value'];

const BlastsTab = () => {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject]     = useState('');
  const [body, setBody]           = useState('');
  const [audience, setAudience]   = useState<Audience>('all');

  const { isLoading: contextLoading } = useEventContext();
  const blastMutation = useSendBlast(id!);
  const { data: pastBlasts } = useEventBlasts(id!);

  const handleSend = async () => {
    await blastMutation.mutateAsync({ subject, body, audience });
    setSubject('');
    setBody('');
    setAudience('all');
  };

  if (contextLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-64 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Compose form */}
      <Surface>
        <div className="flex items-center gap-2 mb-5">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Send Email Blast</h2>
        </div>

        <div className="space-y-4">
          {/* Audience selector */}
          <div>
            <Label className="mb-2 block">Audience</Label>
            <div className="flex gap-2">
              {AUDIENCES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAudience(value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    audience === value
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="blast-subject" className="mb-1.5 block">Subject</Label>
            <Input
              id="blast-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line…"
            />
          </div>

          {/* Message */}
          <div>
            <Label htmlFor="blast-body" className="mb-1.5 block">Message</Label>
            <textarea
              id="blast-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Write your message to attendees…"
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <Button
            className="w-full"
            disabled={!subject.trim() || !body.trim() || blastMutation.isPending}
            onClick={handleSend}
          >
            <Send className="w-4 h-4 mr-2" />
            {blastMutation.isPending ? 'Sending…' : 'Send Blast'}
          </Button>
        </div>
      </Surface>

      {/* Past blasts */}
      <Surface>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-medium text-foreground">Past Blasts</h2>
        </div>
        {(pastBlasts?.length ?? 0) === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No blasts sent yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pastBlasts!.map((b) => (
              <div key={b.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {b.audience} · {new Date(b.sentAt ?? b.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    b.status === 'failed' ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/15 text-emerald-700'
                  }`}>
                    {b.status === 'failed' ? 'Failed' : `Sent to ${b.sent}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
};

export default BlastsTab;
