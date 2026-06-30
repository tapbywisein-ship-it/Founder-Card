import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Calendar, Zap, CreditCard, TrendingUp, AlertCircle,
  IndianRupee, ArrowUpRight, UserPlus, ChevronRight,
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { formatINR } from '@/lib/currency';

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
});

const AdminDashboard = () => {
  const { data: stats, isLoading, isError } = useAdminDashboard();
  const trend = stats?.signupTrend ?? [];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Platform Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time platform health and growth</p>
        </div>

        {isError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load dashboard stats. Try refreshing the page.
          </div>
        )}

        {/* Stat cards */}
        <motion.div {...fade(0)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {([
            { label: 'Total Users',    value: stats?.totalUsers,         icon: Users,        fmt: (v: number) => v.toLocaleString() },
            { label: 'Active (30d)',   value: stats?.activeUsers,        icon: TrendingUp,   fmt: (v: number) => v.toLocaleString() },
            { label: 'Total Events',   value: stats?.totalEvents,        icon: Calendar,     fmt: (v: number) => v.toLocaleString() },
            { label: 'Connections',    value: stats?.totalConnections,   icon: Zap,          fmt: (v: number) => v.toLocaleString() },
            { label: 'Tap Cards',      value: stats?.activeFounderCards, icon: CreditCard,   fmt: (v: number) => v.toLocaleString() },
            { label: 'Revenue',        value: stats?.totalRevenue,       icon: IndianRupee,  fmt: (v: number) => formatINR(v) },
          ] as const).map(({ label, value, icon: Icon, fmt }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
              <p className={`text-2xl font-bold mb-0.5 transition-colors ${isLoading ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                {value !== undefined ? fmt(value) : '0'}
              </p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </motion.div>

        {/* Growth badges */}
        {stats?.monthlyGrowth && (
          <motion.div {...fade(0.05)} className="flex flex-wrap gap-2">
            {[
              { label: `+${stats.monthlyGrowth.users}% users`, color: 'bg-emerald-500/10 text-emerald-600' },
              { label: `+${stats.monthlyGrowth.events} events this month`, color: 'bg-blue-500/10 text-blue-600' },
              { label: `+${stats.monthlyGrowth.connections} connections this month`, color: 'bg-purple-500/10 text-purple-600' },
            ].map((b) => (
              <span key={b.label} className={`text-xs px-3 py-1 rounded-full font-medium ${b.color}`}>{b.label}</span>
            ))}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signup trend */}
          <motion.div {...fade(0.07)} className="lg:col-span-2">
            <Surface className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">New Signups — Last 7 Days</h2>
                </div>
                {trend.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {trend.reduce((s, d) => s + d.count, 0)} total
                  </span>
                )}
              </div>
              {isLoading ? (
                <div className="h-32 bg-muted/30 rounded-xl animate-pulse" />
              ) : trend.every((d) => d.count === 0) ? (
                <div className="h-32 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">No signups in the last 7 days</p>
                </div>
              ) : (
                <div className="flex items-end gap-1.5 h-28">
                  {trend.map((d, i) => {
                    const max = Math.max(...trend.map((t) => t.count), 1);
                    const pct = (d.count / max) * 100;
                    const day = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground font-medium">{d.count > 0 ? d.count : ''}</span>
                        <motion.div
                          className="w-full rounded-t-md bg-primary/80"
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(pct, d.count > 0 ? 8 : 0)}%` }}
                          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                          style={{ minHeight: d.count > 0 ? 4 : 0 }}
                        />
                        <span className="text-[10px] text-muted-foreground">{day}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Surface>
          </motion.div>

          {/* Quick links */}
          <motion.div {...fade(0.09)}>
            <Surface className="h-full">
              <h2 className="text-base font-semibold text-foreground mb-3">Admin Quick Links</h2>
              <div className="space-y-1">
                {([
                  { label: 'Manage users',    to: '/admin/users',          icon: Users },
                  { label: 'View events',     to: '/admin/events',         icon: Calendar },
                  { label: 'Tap Cards queue', to: '/admin/founder-cards',  icon: CreditCard },
                  { label: 'Revenue',         to: '/admin/revenue',        icon: IndianRupee },
                  { label: 'Analytics',       to: '/admin/analytics',      icon: TrendingUp },
                  { label: 'Settings',        to: '/admin/settings',       icon: ArrowUpRight },
                ] as const).map(({ label, to, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm text-foreground flex-1">{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </Surface>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent signups */}
          <motion.div {...fade(0.1)}>
            <Surface className="h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-base font-semibold text-foreground">Recent Signups</h2>
                </div>
                <Link to="/admin/users" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/30 rounded-xl animate-pulse" />)}</div>
              ) : !stats?.recentUsers?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No users yet.</p>
              ) : (
                <div className="space-y-1">
                  {stats.recentUsers.map((u) => {
                    const name = u.profile ? `${u.profile.firstName} ${u.profile.lastName}`.trim() : u.email.split('@')[0];
                    return (
                      <Link
                        key={u.id}
                        to={`/admin/users/${u.id}`}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/40 transition-colors group"
                      >
                        {u.profile?.avatar ? (
                          <img src={u.profile.avatar} alt={name} loading="lazy" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {name[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{u.profile?.company ?? u.email}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Surface>
          </motion.div>

          {/* Recent activity */}
          <motion.div {...fade(0.11)}>
            <Surface className="h-full">
              <h2 className="text-base font-semibold text-foreground mb-4">Recent Activity</h2>
              {isLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted/30 rounded animate-pulse" />)}</div>
              ) : stats?.recentActivity?.length ? (
                <div className="space-y-2">
                  {stats.recentActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                      <p className="text-sm text-foreground capitalize">{a}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No recent activity.</p>
              )}
            </Surface>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
