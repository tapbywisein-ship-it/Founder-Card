import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, ShieldOff, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Ban } from 'lucide-react';
import { useAdminUsers, useUpdateUserRole, useToggleUserActive, useBanUser } from '@/hooks/useAdmin';
import { useAppStore } from '@/store/appStore';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt?: string;
  profile?: { firstName: string; lastName: string; avatar?: string | null; company?: string } | null;
  _count?: { registrations?: number; connections?: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLES = ['ATTENDEE', 'ORGANIZER', 'ADMIN'];

const AdminUsersPage = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState('');

  const { data, isLoading, isError } = useAdminUsers({
    search: search || undefined,
    role: roleFilter || undefined,
    page,
    limit: 20,
  });
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  const banUser = useBanUser();
  const currentUserId = useAppStore((s) => s.user?.id);

  const users = (data?.data as AdminUser[]) ?? [];
  const pagination = data?.pagination as Pagination | undefined;

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };
  const handleRoleChange = (v: string) => { setRoleFilter(v); setPage(1); };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Users</h1>
            {pagination && (
              <p className="text-sm text-muted-foreground mt-0.5">{pagination.total.toLocaleString()} total users</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, email, or company..."
              className="pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="h-10 px-3 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load users. Try refreshing the page.
          </div>
        )}

        <Surface className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['User', 'Email', 'Role', 'Registered', 'Joined', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-10 bg-muted/50 rounded animate-pulse" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No users found.</td></tr>
              ) : users.map((u) => {
                const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email.split('@')[0];
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {u.profile?.avatar ? (
                          <img src={u.profile.avatar} alt={name} loading="lazy" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                            {name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <Link
                            to={`/admin/users/${u.id}`}
                            className="font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            {name}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </Link>
                          {u.profile?.company && <p className="text-[11px] text-muted-foreground">{u.profile.company}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => updateRole.mutate({ userId: u.id, role: e.target.value })}
                        disabled={isSelf}
                        title={isSelf ? 'You cannot change your own role' : undefined}
                        className="text-xs bg-muted/30 border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">{u._count?.registrations ?? 0}</td>
                    <td className="py-3 px-4 text-muted-foreground text-xs whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-500' : 'text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                      {isSelf && <span className="ml-1 text-[10px] text-muted-foreground">(You)</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 px-2 text-xs ${u.isActive ? 'text-amber-400' : 'text-emerald-400'}`}
                          onClick={() => toggleActive.mutate({ userId: u.id, isActive: !u.isActive })}
                          disabled={toggleActive.isPending || isSelf}
                          title={isSelf ? 'You cannot suspend your own account' : undefined}
                        >
                          {u.isActive ? <ShieldOff className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                          <span className="ml-1">{u.isActive ? 'Suspend' : 'Restore'}</span>
                        </Button>
                        {u.isActive && !isSelf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-400"
                            onClick={() => { setBanTarget({ id: u.id, name }); setBanReason(''); }}
                          >
                            <Ban className="w-3 h-3" />
                            <span className="ml-1">Ban</span>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-foreground px-2">{page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (pagination.totalPages ?? 1) || isLoading}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Ban with reason modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                <Ban className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Ban User</h3>
                <p className="text-xs text-muted-foreground">{banTarget.name}</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This will immediately deactivate the account, revoke all sessions, and notify the user with your reason.
            </p>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">Reason <span className="text-red-400">*</span></label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g. Repeated violation of community guidelines"
                rows={3}
                className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setBanTarget(null)}
                disabled={banUser.isPending}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={() => {
                  if (!banReason.trim()) return;
                  banUser.mutate(
                    { userId: banTarget.id, reason: banReason.trim() },
                    { onSuccess: () => setBanTarget(null) }
                  );
                }}
                disabled={banUser.isPending || !banReason.trim()}
              >
                {banUser.isPending ? 'Banning…' : 'Ban User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsersPage;
