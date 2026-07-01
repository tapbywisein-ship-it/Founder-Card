import { useState } from 'react';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Search, Clock, MapPin, ScanLine, Pencil, Share2, ChevronRight,
} from 'lucide-react';
import { useMyOrgEvents } from '@/hooks/useOrganizer';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'CANCELLED';

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    PUBLISHED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    DRAFT:     'bg-amber-500/10 text-amber-600 border-amber-500/20',
    CANCELLED: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    COMPLETED: 'bg-muted text-muted-foreground border-border',
  };
  return map[status] ?? map.DRAFT;
};

const EventsList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading } = useMyOrgEvents(1, 100);
  const allEvents = data?.events ?? [];

  const filtered = allEvents.filter((e) => {
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    const matchesSearch = !search || e.title.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleShare = (ev: React.MouseEvent, id: string) => {
    ev.preventDefault();
    ev.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/e/${id}`)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Could not copy'));
  };

  const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Cancelled', value: 'CANCELLED' },
  ];

  return (
    <OrganizerLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">My Events</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{allEvents.length} event{allEvents.length !== 1 ? 's' : ''} total</p>
          </div>
          <Button asChild>
            <Link to="/organizer/events/create">
              <Plus className="w-4 h-4 mr-1.5" /> New Event
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="pl-10"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_FILTERS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 text-xs rounded-xl border transition-colors ${
                  statusFilter === value
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <Surface className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="space-y-px p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/30 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">
                {search || statusFilter !== 'all' ? 'No events match your filters.' : 'No events yet.'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button asChild size="sm">
                  <Link to="/organizer/events/create">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Event
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map((e) => {
                const registered = e.registeredCount ?? 0;
                const capacity   = (e as { capacity?: number }).capacity ?? 100;
                const pct        = Math.min(Math.round((registered / capacity) * 100), 100);
                const capColor   = pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';

                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    {e.coverImage ? (
                      <img src={e.coverImage} alt={e.title} loading="lazy"
                        className="w-12 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={`/organizer/events/${e.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
                          {e.title}
                        </Link>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${statusPill(e.status)}`}>
                          {e.status.toLowerCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {(e as { city?: string }).city && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {(e as { city?: string }).city}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Capacity bar */}
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0 w-36">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${capColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{registered}/{capacity}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={(ev) => handleShare(ev, e.id)} title="Copy link"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => navigate(`/organizer/events/${e.id}/checkin`)} title="Check-in"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                        <ScanLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => navigate(`/organizer/events/${e.id}/manage`)} title="Edit"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <Link to={`/organizer/events/${e.id}`} title="View"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      </div>
    </OrganizerLayout>
  );
};

export default EventsList;
