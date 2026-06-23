import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEventGuests, useCheckInAttendee } from '@/hooks/useOrganizer';
import { useEventContext } from '@/components/OrganizerEventLayout';
import { Search, CheckCircle2, Clock, Users } from 'lucide-react';

const EventManagePage = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');

  const { event } = useEventContext();
  const { data: guestsData, isLoading } = useEventGuests(id!, { search: search || undefined });
  const checkInMutation = useCheckInAttendee(id!);

  const guests = guestsData?.guests ?? [];
  const checkedInCount = guests.filter((g) => g.checkedIn).length;

  return (
    <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: guests.length, icon: Users },
            { label: 'Checked In', value: checkedInCount, icon: CheckCircle2 },
            { label: 'Capacity', value: event?.capacity ?? 0, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </div>

        {/* Guest list */}
        <Surface>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-semibold text-foreground flex-1">Guest List</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guests..." className="pl-9 h-8 text-sm w-44" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : guests.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No guests yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {guests.map((g) => {
                const name = g.profile ? `${g.profile.firstName} ${g.profile.lastName}` : g.email;
                return (
                  <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                      {name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {g.profile?.company ?? g.email}
                      </p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                      g.checkedIn ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                      g.status === 'WAITLISTED' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                      'border-border text-muted-foreground'
                    }`}>
                      {g.checkedIn ? 'Checked In' : g.status}
                    </span>
                    {!g.checkedIn && g.status === 'REGISTERED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => checkInMutation.mutate(g.userId)}
                        disabled={checkInMutation.isPending}
                      >
                        Check In
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
    </div>
  );
};

export default EventManagePage;
