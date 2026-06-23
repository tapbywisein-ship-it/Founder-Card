import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAdminUsers, useUpdateUserRole, useToggleUserActive } from '@/hooks/useAdmin';
import { useAppStore } from '@/store/appStore';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  profile?: { firstName: string; lastName: string; company?: string } | null;
  _count?: { registrations?: number; connections?: number };
}

const ROLES = ['ATTENDEE', 'ORGANIZER', 'ADMIN'];

const AdminUsersPage = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useAdminUsers({ search: search || undefined, role: roleFilter || undefined });
  const updateRole = useUpdateUserRole();
  const toggleActive = useToggleUserActive();
  // The signed-in admin cannot demote or suspend their own account (server
  // enforces this too); disable those controls on their own row.
  const currentUserId = useAppStore((s) => s.user?.id);

  const users = (data?.data as AdminUser[]) ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-foreground">Users</h1>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-10" />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 text-sm bg-muted/30 border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <Surface className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['User', 'Email', 'Role', 'Registrations', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-3 px-4 text-xs text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-8 bg-muted/50 rounded animate-pulse" /></td></tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</td></tr>
              ) : users.map((u) => {
                const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : u.email.split('@')[0];
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground flex-shrink-0">
                          {name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{name}</p>
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
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                      {isSelf && <span className="ml-2 text-[10px] text-muted-foreground">(You)</span>}
                    </td>
                    <td className="py-3 px-4">
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Surface>
      </div>
    </AdminLayout>
  );
};

export default AdminUsersPage;
