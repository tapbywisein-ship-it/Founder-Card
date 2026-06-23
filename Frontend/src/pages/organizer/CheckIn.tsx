import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEventGuests, useCheckInAttendee } from '@/hooks/useOrganizer';
import { CheckCircle2, Search, QrCode, Users, ScanLine, X } from 'lucide-react';
import { toast } from 'sonner';
import { QrScanner } from '@/components/QrScanner';
import { founderCardService } from '@/services/founderCard.service';

const CheckInPage = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [scanOpen, setScanOpen] = useState(false);
  const [scanBusy, setScanBusy] = useState(false);

  const { data: guestsData, isLoading } = useEventGuests(id!, { search: search || undefined });
  const checkInMutation = useCheckInAttendee(id!);

  const guests = guestsData?.guests ?? [];
  const notCheckedIn = guests.filter((g) => !g.checkedIn && g.status !== 'CANCELLED');
  const checkedIn = guests.filter((g) => g.checkedIn);

  const handleCheckIn = async (userId: string, name: string) => {
    await checkInMutation.mutateAsync(userId);
    toast.success(`${name} checked in!`);
  };

  const extractSlug = (raw: string): string | null => {
    try {
      const url = new URL(raw);
      const match = url.pathname.match(/\/(?:c|card)\/([^/]+)/);
      if (match) return decodeURIComponent(match[1]);
    } catch {
      // not a URL — treat as slug directly
    }
    return raw.trim() || null;
  };

  const checkInGuestById = async (registrationId: string): Promise<boolean> => {
    const guest = guests.find((g) => g.id === registrationId);
    if (!guest) {
      toast.error('This ticket is not for this event.');
      return true; // handled (don't fall through to card lookup)
    }
    if (guest.checkedIn) {
      toast.info('Already checked in.');
      return true;
    }
    const name = guest.profile ? `${guest.profile.firstName} ${guest.profile.lastName}` : guest.email;
    await checkInMutation.mutateAsync(guest.userId);
    toast.success(`${name} checked in via QR!`);
    return true;
  };

  const handleScan = async (value: string) => {
    if (scanBusy) return;
    setScanBusy(true);
    try {
      // Ticket QRs (from My Tickets / confirmation email) encode `reg:<id>`.
      const regMatch = value.trim().match(/^reg:(.+)$/);
      if (regMatch) {
        await checkInGuestById(regMatch[1]);
        return;
      }

      // Otherwise treat it as a Founder Card slug/URL.
      const slug = extractSlug(value);
      if (!slug) {
        toast.error('Could not read QR code.');
        return;
      }
      const { data: card } = await founderCardService.getPublicCardBySlug(slug);
      const userId = card.user.id;
      const guest = guests.find((g) => g.userId === userId);
      if (!guest) {
        toast.error('This attendee is not registered for this event.');
        return;
      }
      if (guest.checkedIn) {
        toast.info('Already checked in.');
        return;
      }
      const name = guest.profile ? `${guest.profile.firstName} ${guest.profile.lastName}` : guest.email;
      await checkInMutation.mutateAsync(userId);
      toast.success(`${name} checked in via QR!`);
    } catch {
      toast.error('Could not check in via QR.');
    } finally {
      setScanBusy(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: guests.length, icon: Users },
            { label: 'Checked In', value: checkedIn.length, icon: CheckCircle2 },
            { label: 'Remaining', value: notCheckedIn.length, icon: QrCode },
          ].map(({ label, value, icon: Icon }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </div>

        {/* Scan + Search */}
        <div className="space-y-3">
          {scanOpen ? (
            <Surface>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-foreground">Scan attendee QR</p>
                <Button size="sm" variant="ghost" onClick={() => setScanOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <QrScanner onResult={handleScan} />
              {scanBusy && <p className="text-xs text-muted-foreground mt-2 text-center">Checking in…</p>}
            </Surface>
          ) : (
            <Button onClick={() => setScanOpen(true)} variant="outline" className="w-full">
              <ScanLine className="w-4 h-4 mr-2" /> Scan QR to check in
            </Button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Guest list */}
        <Surface>
          <h2 className="text-sm font-medium text-foreground mb-3">Awaiting Check-in ({notCheckedIn.length})</h2>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : notCheckedIn.length === 0 && !search ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Everyone is checked in!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notCheckedIn.map((g) => {
                const name = g.profile ? `${g.profile.firstName} ${g.profile.lastName}` : g.email;
                return (
                  <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0">
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {g.profile?.company ?? g.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="flex-shrink-0"
                      onClick={() => handleCheckIn(g.userId, name)}
                      disabled={checkInMutation.isPending}
                    >
                      Check In
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {checkedIn.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Checked In ({checkedIn.length})
              </h3>
              <div className="space-y-1">
                {checkedIn.map((g) => {
                  const name = g.profile ? `${g.profile.firstName} ${g.profile.lastName}` : g.email;
                  return (
                    <div key={g.id} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-60">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{name}</p>
                      {g.checkedInAt && (
                        <span className="text-[10px] text-muted-foreground/60 ml-auto">
                          {new Date(g.checkedInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Surface>
    </div>
  );
};

export default CheckInPage;
