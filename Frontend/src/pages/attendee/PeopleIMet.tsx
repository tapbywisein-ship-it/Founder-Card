import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Users, AlertCircle, NotebookPen } from 'lucide-react';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { ConnectionCRMDrawer } from '@/components/ConnectionCRMDrawer';
import { connectionsService, type Connection } from '@/services/connections.service';

interface ConnectionRow {
  id: string;
  status: string;
  createdAt: string;
  event?: { id: string; title: string; startDate: string; endDate: string } | null;
  user?: { id: string; email: string; profile?: { firstName: string; lastName: string; avatar?: string; company?: string; position?: string } };
}

const PeopleIMetPage = () => {
  const navigate = useNavigate();
  const [crmTarget, setCrmTarget] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['connections', 'people-i-met'],
    queryFn: () => connectionsService.getConnections(1, 100),
  });

  const groups = useMemo(() => {
    // Service returns { data: Connection[], pagination }; pull rows off `data`.
    const conns = ((data?.data ?? []) as unknown as ConnectionRow[]);
    const byEvent = new Map<string, { event: ConnectionRow['event']; rows: ConnectionRow[] }>();
    const noEvent: ConnectionRow[] = [];

    for (const c of conns) {
      if (c.event && c.event.id) {
        const existing = byEvent.get(c.event.id);
        if (existing) existing.rows.push(c);
        else byEvent.set(c.event.id, { event: c.event, rows: [c] });
      } else {
        noEvent.push(c);
      }
    }

    const eventGroups = Array.from(byEvent.values()).sort((a, b) => {
      const aDate = a.event?.startDate ?? '';
      const bDate = b.event?.startDate ?? '';
      return bDate.localeCompare(aDate);
    });

    return { eventGroups, noEvent };
  }, [data]);

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Profile
        </Button>

        <header>
          <h1 className="text-2xl font-semibold text-foreground">
            <Users className="mr-2 inline h-6 w-6" />
            People I met
          </h1>
          <p className="text-sm text-muted-foreground">
            Your network, grouped by where you connected.
          </p>
        </header>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load connections. Try refreshing the page.
          </div>
        )}

        {isLoading && (
          <Surface className="text-center">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Surface>
        )}

        {groups.eventGroups.map(({ event, rows }) =>
          event ? (
            <section key={event.id} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-foreground">
                  Met at {event.title}
                </h2>
                <p className="text-xs text-muted-foreground">
                  <Calendar className="mr-1 inline h-3 w-3" />
                  {format(new Date(event.startDate), 'PP')}
                </p>
              </div>
              <div className="grid gap-2">
                {rows.map((c) => (
                  <PersonRow key={c.id} c={c} onNotes={setCrmTarget} />
                ))}
              </div>
            </section>
          ) : null
        )}

        {groups.noEvent.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">Other connections</h2>
            <div className="grid gap-2">
              {groups.noEvent.map((c) => (
                <PersonRow key={c.id} c={c} onNotes={setCrmTarget} />
              ))}
            </div>
          </section>
        )}

        {!isLoading &&
          groups.eventGroups.length === 0 &&
          groups.noEvent.length === 0 && (
            <Surface className="text-center">
              <p className="text-sm text-muted-foreground">
                You haven't connected with anyone yet. Start by scanning a card.
              </p>
              <Button className="mt-3" onClick={() => navigate('/connect')}>
                Open scanner
              </Button>
            </Surface>
          )}
      </div>

      <ConnectionCRMDrawer
        connectionId={crmTarget?.id ?? null}
        name={crmTarget?.name ?? ''}
        onClose={() => setCrmTarget(null)}
      />
    </PortalLayout>
  );
};

const PersonRow = ({ c, onNotes }: { c: ConnectionRow; onNotes: (t: { id: string; name: string }) => void }) => {
  const navigate = useNavigate();
  const p = c.user?.profile;
  const name = p ? `${p.firstName} ${p.lastName}`.trim() : c.user?.email ?? '-';
  return (
    <div className="flex w-full items-center gap-3 rounded-card border border-border bg-card p-3 transition-colors hover:bg-secondary">
      <button
        onClick={() => c.user?.id && navigate(`/card/${c.user.id}`)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {p?.avatar ? (
          <img src={p.avatar} alt={name} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {(p?.position || p?.company) && (
            <p className="truncate text-xs text-muted-foreground">
              {[p?.position, p?.company].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0"
        title="Notes & follow-up"
        onClick={() => onNotes({ id: c.id, name })}
      >
        <NotebookPen className="h-4 w-4" />
      </Button>
      <p className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
        {format(new Date(c.createdAt), 'PP')}
      </p>
    </div>
  );
};

export default PeopleIMetPage;
