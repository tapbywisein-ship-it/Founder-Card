import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSendBlast, useListEventBlasts, useScheduleBlast } from '@/hooks/useOrganizer';
import { useEventContext } from '@/components/OrganizerEventLayout';
import { Mail, Send, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

const AUDIENCES = [
  { value: 'all',        label: 'All' },
  { value: 'registered', label: 'Registered' },
  { value: 'waitlist',   label: 'Waitlist' },
] as const;

type Audience = (typeof AUDIENCES)[number]['value'];
type SendMode = 'now' | 'schedule';

const toLocalDatetimeMin = (d: Date) => {
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
};

const statusIcon = (status: string) => {
  if (status === 'sent')      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (status === 'scheduled') return <Clock className="w-3.5 h-3.5 text-amber-500" />;
  return <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />;
};

const BlastsTab = () => {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [audience, setAudience]     = useState<Audience>('all');
  const [sendMode, setSendMode]     = useState<SendMode>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  const { isLoading: contextLoading } = useEventContext();
  const blastMutation    = useSendBlast(id!);
  const scheduleMutation = useScheduleBlast(id!);
  const { data: blasts, isLoading: blastsLoading } = useListEventBlasts(id!);

  const resetForm = () => {
    setSubject('');
    setBody('');
    setAudience('all');
    setSendMode('now');
    setScheduledAt('');
  };

  const handleSend = async () => {
    if (sendMode === 'schedule') {
      if (!scheduledAt) { return; }
      await scheduleMutation.mutateAsync({ subject, body, audience, scheduledAt: new Date(scheduledAt).toISOString() });
    } else {
      await blastMutation.mutateAsync({ subject, body, audience });
    }
    resetForm();
  };

  const isBusy = blastMutation.isPending || scheduleMutation.isPending;
  const canSubmit = !!subject.trim() && !!body.trim() && (sendMode === 'now' || !!scheduledAt);

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
          {/* Audience */}
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

          {/* Send mode toggle */}
          <div>
            <Label className="mb-2 block">When to send</Label>
            <div className="flex gap-2 mb-3">
              {([
                { value: 'now',      label: 'Send Now',    icon: Send },
                { value: 'schedule', label: 'Schedule',    icon: Calendar },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSendMode(value)}
                  className={`flex items-center gap-1.5 flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                    sendMode === value
                      ? 'bg-primary text-primary-foreground border-transparent'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {sendMode === 'schedule' && (
              <div>
                <Label htmlFor="blast-scheduled-at" className="mb-1.5 block text-xs text-muted-foreground">Scheduled date & time</Label>
                <Input
                  id="blast-scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  min={toLocalDatetimeMin(new Date(Date.now() + 5 * 60_000))}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            )}
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || isBusy}
            onClick={handleSend}
          >
            {sendMode === 'now' ? <Send className="w-4 h-4 mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
            {isBusy
              ? (sendMode === 'now' ? 'Sending…' : 'Scheduling…')
              : (sendMode === 'now' ? 'Send Blast' : 'Schedule Blast')}
          </Button>
        </div>
      </Surface>

      {/* Blast history */}
      <Surface>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Blast History</h2>
        </div>

        {blastsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !blasts || (blasts as unknown[]).length === 0 ? (
          <div className="text-center py-8">
            <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No blasts sent yet.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {(blasts as {
              id: string;
              subject: string;
              audience: string;
              status: string;
              sent: number;
              sentAt?: string;
              scheduledAt?: string;
              createdAt: string;
            }[]).map((b) => (
              <div key={b.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/20 transition-colors">
                <div className="mt-0.5">{statusIcon(b.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{b.subject}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground capitalize">{b.audience}</span>
                    <span className="text-[11px] text-muted-foreground">·</span>
                    {b.status === 'scheduled' && b.scheduledAt ? (
                      <span className="text-[11px] text-amber-500">
                        Scheduled {new Date(b.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    ) : b.sentAt ? (
                      <span className="text-[11px] text-muted-foreground">
                        Sent {new Date(b.sentAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                    b.status === 'sent'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                  }`}>
                    {b.status === 'sent' ? `${b.sent} sent` : 'scheduled'}
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
