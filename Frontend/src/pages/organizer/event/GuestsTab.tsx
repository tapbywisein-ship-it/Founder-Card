import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEventGuests, useCheckInAttendee } from '@/hooks/useOrganizer';
import { useEventContext } from '@/components/OrganizerEventLayout';
import { organizerService } from '@/services/organizer.service';
import { RoleBadge } from '@/components/RoleBadge';
import { CsvImportDialog } from '@/components/CsvImportDialog';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle2, Clock, Users, Mail, Upload, UserCheck, UserX } from 'lucide-react';

type EventRole = 'ATTENDEE' | 'VIP' | 'SPEAKER' | 'STAFF' | 'SPONSOR';
const ROLE_OPTIONS: EventRole[] = ['ATTENDEE', 'VIP', 'SPEAKER', 'STAFF', 'SPONSOR'];

const GuestsTab = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'registered'>('name');
  const [importOpen, setImportOpen] = useState(false);

  const { isLoading: contextLoading } = useEventContext();
  const { data: guestsData, isLoading } = useEventGuests(id!, { search: search || undefined });
  const checkInMutation = useCheckInAttendee(id!);
  const qc = useQueryClient();
  const setRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: EventRole }) =>
      organizerService.setEventRole(id!, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer', 'event-guests', id] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not update role'),
  });
  const refundMutation = useMutation({
    mutationFn: (userId: string) => organizerService.refundAttendee(id!, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizer', 'event-guests', id] });
      toast.success('Refunded — attendee notified');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not refund'),
  });

  const pending = useQuery({
    queryKey: ['organizer', 'pending-approvals', id],
    queryFn: () => organizerService.listPendingApprovals(id!),
    select: (res) => res.data,
    enabled: !!id,
  });

  const action = useMutation({
    mutationFn: ({ regId, act }: { regId: string; act: 'APPROVE' | 'DENY' }) =>
      organizerService.actionPendingApproval(id!, regId, act),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['organizer', 'pending-approvals', id] });
      qc.invalidateQueries({ queryKey: ['organizer', 'event-guests', id] });
      toast.success(vars.act === 'APPROVE' ? 'Approved' : 'Denied');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Could not action'),
  });

  const guests = guestsData?.guests ?? [];

  const sorted = [...guests].sort((a, b) => {
    if (sortBy === 'name') {
      const nameA = a.profile ? `${a.profile.firstName} ${a.profile.lastName}` : a.email;
      const nameB = b.profile ? `${b.profile.firstName} ${b.profile.lastName}` : b.email;
      return nameA.localeCompare(nameB);
    }
    if (sortBy === 'status') {
      return (a.status ?? '').localeCompare(b.status ?? '');
    }
    // registered — fall back to id order (no registeredAt in Guest type)
    return 0;
  });

  const checkedInCount = guests.filter((g) => g.checkedIn).length;
  const waitlistCount  = guests.filter((g) => g.status === 'WAITLISTED').length;

  if (contextLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-muted/40 rounded" />
        <div className="h-64 bg-muted/40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Registered', value: guests.length,   icon: Users },
          { label: 'Checked In', value: checkedInCount,  icon: CheckCircle2 },
          { label: 'Waitlisted', value: waitlistCount,   icon: Clock },
        ].map(({ label, value, icon: Icon }) => (
          <Surface key={label} padding="md" className="text-center">
            <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Surface>
        ))}
      </div>

      {/* Pending approvals panel */}
      {pending.data && pending.data.length > 0 && (
        <Surface className="border-amber-500/30 bg-amber-500/5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-foreground">
              {pending.data.length} pending approval{pending.data.length === 1 ? '' : 's'}
            </h3>
          </div>
          <div className="space-y-2">
            {pending.data.map((p) => {
              const name = p.user.profile
                ? `${p.user.profile.firstName} ${p.user.profile.lastName}`.trim()
                : p.user.email;
              return (
                <div
                  key={p.id}
                  className="flex items-start gap-3 rounded-card border border-border bg-card p-3"
                >
                  {p.user.profile?.avatar ? (
                    <img src={p.user.profile.avatar} alt={name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    {(p.user.profile?.position || p.user.profile?.company) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {[p.user.profile?.position, p.user.profile?.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {p.answers.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5 text-xs">
                        {p.answers.slice(0, 3).map((a) => (
                          <li key={a.id} className="text-muted-foreground">
                            <span className="font-medium text-foreground">{a.question.prompt}: </span>
                            {a.answer}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      onClick={() => action.mutate({ regId: p.id, act: 'APPROVE' })}
                      disabled={action.isPending}
                    >
                      <UserCheck className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() => action.mutate({ regId: p.id, act: 'DENY' })}
                      disabled={action.isPending}
                    >
                      <UserX className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>
      )}

      {/* Top action row */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Import CSV
        </Button>
      </div>
      <CsvImportDialog eventId={id!} open={importOpen} onOpenChange={setImportOpen} />

      {/* Search + sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(['name', 'status', 'registered'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                sortBy === key
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Guest table */}
      <Surface>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No guests match your search.' : 'No registrations yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_140px_auto_auto] gap-2 px-3 py-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/60 mb-1">
              <span>Name</span>
              <span>Email</span>
              <span>Role</span>
              <span>Status</span>
              <span className="w-20 text-right">Actions</span>
            </div>
            <div className="space-y-px">
              {sorted.map((g) => {
                const name = g.profile
                  ? `${g.profile.firstName} ${g.profile.lastName}`.trim()
                  : g.email;
                return (
                  <div
                    key={g.id}
                    className="grid grid-cols-[1fr_1fr_140px_auto_auto] gap-2 items-center px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {g.profile?.avatar ? (
                        <img
                          src={g.profile.avatar}
                          alt={name}
                          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                      )}
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">{g.email}</span>
                    </div>

                    {/* Role dropdown */}
                    <div className="flex items-center gap-1.5">
                      <Select
                        value={g.eventRole ?? 'ATTENDEE'}
                        onValueChange={(v) =>
                          setRoleMutation.mutate({ userId: g.userId, role: v as EventRole })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r} className="text-xs">
                              {r === 'ATTENDEE' ? 'Attendee' : r.charAt(0) + r.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {g.eventRole && g.eventRole !== 'ATTENDEE' && (
                        <RoleBadge role={g.eventRole} />
                      )}
                    </div>

                    {/* Status badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border whitespace-nowrap ${
                      g.checkedIn
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : g.status === 'WAITLISTED'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                          : 'border-border text-muted-foreground'
                    }`}>
                      {g.checkedIn ? 'Checked In' : g.status}
                    </span>

                    {/* Actions */}
                    <div className="flex justify-end gap-1.5">
                      {!g.checkedIn && g.status === 'REGISTERED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => checkInMutation.mutate(g.userId)}
                          disabled={checkInMutation.isPending}
                        >
                          Check In
                        </Button>
                      )}
                      {g.paymentStatus === 'PAID' && g.status !== 'CANCELLED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700"
                          onClick={() => {
                            if (confirm('Refund and cancel this attendee\'s paid ticket?')) refundMutation.mutate(g.userId);
                          }}
                          disabled={refundMutation.isPending}
                        >
                          Refund
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Surface>
    </div>
  );
};

export default GuestsTab;
