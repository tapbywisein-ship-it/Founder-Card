import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, Clock, FileText, Users, Mail, BadgeCheck, Activity,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/services/api';

interface UserDetail {
  id: string;
  email: string;
  role: string;
  tier: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  profile: {
    firstName: string;
    lastName: string;
    avatar: string | null;
    company: string | null;
    position: string | null;
    location: string | null;
  } | null;
  founderCard: { status: string } | null;
  gamification: { fkScore: number; level: number } | null;
  _count?: {
    sentConnections: number;
    receivedConnections: number;
    registrations: number;
  };
}

interface ActivityResponse {
  audits: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    metadata: unknown;
    createdAt: string;
  }>;
  registrations: Array<{
    id: string;
    status: string;
    eventRole?: string;
    checkedIn: boolean;
    registeredAt: string;
    event: { id: string; title: string; startDate: string };
  }>;
  connections: Array<{
    id: string;
    status: string;
    createdAt: string;
    event: { id: string; title: string } | null;
    other: {
      id: string;
      email: string;
      profile: { firstName: string; lastName: string } | null;
    };
  }>;
}

const AdminUserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const userQ = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => apiFetch<{ data: UserDetail }>(`/admin/users/${id}`),
    select: (r) => r.data,
    enabled: !!id,
  });
  const actQ = useQuery({
    queryKey: ['admin', 'user-activity', id],
    queryFn: () => apiFetch<{ data: ActivityResponse }>(`/admin/users/${id}/activity`),
    select: (r) => r.data,
    enabled: !!id,
  });

  if (!id) return null;
  const u = userQ.data;
  const a = actQ.data;
  const name = u?.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : u?.email;

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="mr-1 h-4 w-4" /> All users
        </Button>

        {userQ.isLoading && (
          <Surface className="text-center">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Surface>
        )}

        {u && (
          <>
            <Surface elevated padding="lg">
              <div className="flex flex-wrap items-start gap-4">
                {u.profile?.avatar ? (
                  <img
                    src={u.profile.avatar}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-xl font-semibold">
                    {(name ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">{name}</h1>
                    {u.founderCard?.status === 'ACTIVE' && (
                      <BadgeCheck className="h-5 w-5 text-primary" />
                    )}
                    {!u.isActive && (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-400">
                        BANNED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <Mail className="mr-1 inline h-3.5 w-3.5" /> {u.email}
                  </p>
                  {(u.profile?.position || u.profile?.company) && (
                    <p className="text-sm text-muted-foreground">
                      {[u.profile?.position, u.profile?.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-card px-2 py-0.5">
                      {u.role}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5">
                      {u.tier}
                    </span>
                    <span className="rounded-full border border-border bg-card px-2 py-0.5">
                      Joined {format(new Date(u.createdAt), 'PP')}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Stat label="FK Score" value={u.gamification?.fkScore ?? 0} />
                  <Stat label="Connections" value={(u._count?.sentConnections ?? 0) + (u._count?.receivedConnections ?? 0)} />
                  <Stat label="Events" value={u._count?.registrations ?? 0} />
                </div>
              </div>
            </Surface>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Audit log */}
              <Surface className="lg:col-span-2">
                <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Activity className="h-4 w-4" /> Recent activity
                </h2>
                {a?.audits.length === 0 && (
                  <p className="text-sm text-muted-foreground">No audit log entries yet.</p>
                )}
                <ul className="space-y-2">
                  {a?.audits.map((row) => (
                    <li key={row.id} className="flex items-start gap-3 rounded-card border border-border bg-card/40 p-2.5">
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          <span className="font-medium">{row.action}</span>
                          <span className="text-muted-foreground"> on {row.resource}{row.resourceId ? ` ${row.resourceId.slice(0, 8)}` : ''}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          <Clock className="mr-0.5 inline h-3 w-3" />
                          {format(new Date(row.createdAt), 'PP p')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Surface>

              {/* Registrations + connections */}
              <div className="space-y-4">
                <Surface>
                  <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Calendar className="h-4 w-4" /> Recent events
                  </h2>
                  {a?.registrations.length === 0 && (
                    <p className="text-sm text-muted-foreground">None yet.</p>
                  )}
                  <ul className="space-y-1.5 text-sm">
                    {a?.registrations.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-foreground">{r.event.title}</span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {r.checkedIn ? 'Attended' : r.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Surface>

                <Surface>
                  <h2 className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <Users className="h-4 w-4" /> Recent connections
                  </h2>
                  {a?.connections.length === 0 && (
                    <p className="text-sm text-muted-foreground">None yet.</p>
                  )}
                  <ul className="space-y-1.5 text-sm">
                    {a?.connections.map((c) => {
                      const other = c.other.profile
                        ? `${c.other.profile.firstName} ${c.other.profile.lastName}`.trim()
                        : c.other.email;
                      return (
                        <li key={c.id} className="flex items-center justify-between gap-2">
                          <span className="truncate text-foreground">{other}</span>
                          <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {c.event ? `at ${c.event.title}` : c.status}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </Surface>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-card border border-border bg-card px-3 py-2">
    <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
  </div>
);

export default AdminUserDetailPage;
