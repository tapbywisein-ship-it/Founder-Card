import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, CalendarPlus, MapPin, QrCode, Ticket as TicketIcon, FileText, AlertCircle } from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMyRegistrations, useCancelRegistration } from '@/hooks/useEvents';
import type { EventRegistration } from '@/services/events.service';
import { formatINR } from '@/lib/currency';
import { downloadIcs } from '@/lib/calendar';
import { openInvoice } from '@/services/payments.service';
import { toast } from 'sonner';

type Tab = 'upcoming' | 'attended' | 'cancelled';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  REGISTERED: { label: 'Registered', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  WAITLISTED: { label: 'Waitlisted', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  PENDING_APPROVAL: { label: 'Pending approval', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  ATTENDED: { label: 'Attended', className: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  CANCELLED: { label: 'Cancelled', className: 'bg-muted text-muted-foreground' },
};

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
    : 'TBD';

const MyTickets = () => {
  const { data, isLoading, isError, refetch } = useMyRegistrations(1, 100);
  const cancel = useCancelRegistration();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [qrFor, setQrFor] = useState<EventRegistration | null>(null);

  const registrations = data?.registrations ?? [];

  const grouped = useMemo(() => {
    const upcoming: EventRegistration[] = [];
    const attended: EventRegistration[] = [];
    const cancelled: EventRegistration[] = [];
    for (const r of registrations) {
      if (r.status === 'CANCELLED') cancelled.push(r);
      else if (r.status === 'ATTENDED' || r.checkedIn) attended.push(r);
      else upcoming.push(r);
    }
    return { upcoming, attended, cancelled };
  }, [registrations]);

  const list = grouped[tab];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
    { key: 'attended', label: 'Attended', count: grouped.attended.length },
    { key: 'cancelled', label: 'Cancelled', count: grouped.cancelled.length },
  ];

  return (
    <PortalLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">My Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Every event you've registered for, with your QR ticket ready anytime.
          </p>
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load tickets. Check your connection and try again.
            </span>
            <button onClick={() => refetch()} className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading your tickets…</p>
        ) : list.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <TicketIcon className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">No {tab} tickets.</p>
            {tab === 'upcoming' && (
              <Button asChild variant="outline">
                <Link to="/discover">Discover events</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const ev = r.event;
              const status = STATUS_LABEL[r.status] ?? { label: r.status, className: 'bg-muted text-muted-foreground' };
              const paid = r.amountPaid && Number(r.amountPaid) > 0;
              return (
                <div
                  key={r.id}
                  className="rounded-xl border border-border bg-card p-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={ev ? `/e/${ev.id}` : '#'}
                        className="font-semibold text-foreground hover:underline truncate"
                      >
                        {ev?.title ?? 'Event'}
                      </Link>
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {fmtDate(ev?.startDate)}
                    </p>
                    {ev && (ev.city || ev.address) && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" /> {ev.city || ev.address}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {r.ticketTierName ? `${r.ticketTierName} · ` : ''}
                      {paid ? formatINR(Number(r.amountPaid)) : 'Free'}
                      {r.paymentStatus === 'REFUNDED' ? ' · Refunded' : ''}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {tab !== 'cancelled' && (
                      <Button size="sm" variant="outline" onClick={() => setQrFor(r)}>
                        <QrCode className="w-4 h-4 mr-1.5" /> Ticket
                      </Button>
                    )}
                    {tab === 'upcoming' && ev && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          downloadIcs(
                            {
                              title: ev.title,
                              description: ev.description ?? undefined,
                              start: ev.startDate,
                              end: ev.endDate,
                              location:
                                ev.locationType === 'VIRTUAL'
                                  ? ev.meetingUrl ?? 'Online'
                                  : [ev.address, ev.city, ev.country].filter(Boolean).join(', ') || undefined,
                              url: `${window.location.origin}/e/${ev.id}`,
                            },
                            `${ev.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`
                          )
                        }
                      >
                        <CalendarPlus className="w-4 h-4 mr-1.5" /> Calendar
                      </Button>
                    )}
                    {paid && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          openInvoice(r.id).catch((e) =>
                            toast.error(e instanceof Error ? e.message : 'Could not open invoice')
                          )
                        }
                      >
                        <FileText className="w-4 h-4 mr-1.5" /> Invoice
                      </Button>
                    )}
                    {tab === 'upcoming' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel this registration?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {paid
                                ? 'Your paid ticket will be refunded to the original payment method. This frees your spot for the waitlist.'
                                : 'This frees your spot for anyone on the waitlist. You can register again later if seats remain.'}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => ev && cancel.mutate(ev.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Cancel registration
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR ticket dialog — encodes reg:<id> exactly as the organizer scanner expects. */}
      <Dialog open={!!qrFor} onOpenChange={(o) => !o && setQrFor(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>{qrFor?.event?.title ?? 'Your ticket'}</DialogTitle>
            <DialogDescription>Show this at check-in to be marked attended.</DialogDescription>
          </DialogHeader>
          {qrFor && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-lg">
                <QRCodeSVG value={`reg:${qrFor.id}`} size={200} />
              </div>
              <p className="text-xs text-muted-foreground">{fmtDate(qrFor.event?.startDate)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
};

export default MyTickets;
