import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, Zap, Calendar, CreditCard, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useAdminDashboard, useAdminAnalytics } from '@/hooks/useAdmin';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-primary/20 rounded-xl p-3 text-xs">
        <p className="text-foreground font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' && p.value > 1000 ? p.value.toLocaleString() : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const TIER_COLORS = ['#6B7280', '#D4A853'];

const AdminAnalyticsPage = () => {
  const { data: stats, isError: statsError } = useAdminDashboard();
  const { data: analytics, isError: analyticsError } = useAdminAnalytics();
  const hasError = statsError || analyticsError;

  // Use real data if available, otherwise show placeholder structure
  const signupData = (analytics as any)?.signupsByMonth ?? [
    { month: 'Oct', users: 0 }, { month: 'Nov', users: 0 },
    { month: 'Dec', users: 0 }, { month: 'Jan', users: 0 },
    { month: 'Feb', users: 0 }, { month: 'Mar', users: 0 },
  ];
  const connectionData = (analytics as any)?.connectionsByDay ?? [
    { day: 'Mon', connections: 0 }, { day: 'Tue', connections: 0 },
    { day: 'Wed', connections: 0 }, { day: 'Thu', connections: 0 },
    { day: 'Fri', connections: 0 }, { day: 'Sat', connections: 0 }, { day: 'Sun', connections: 0 },
  ];
  const categoryData = (analytics as any)?.eventsByCategory ?? [];
  const tierData = [
    { name: 'Free', value: (stats?.totalUsers ?? 0) - (stats?.totalFounderCards ?? 0) },
    { name: 'FounderCard', value: stats?.totalFounderCards ?? 0 },
  ];
  const tierTotal = tierData.reduce((s, t) => s + t.value, 0);

  const kpis = [
    { label: 'Total Users', value: stats?.totalUsers?.toLocaleString() ?? '—', icon: Users },
    { label: 'Active Users (30d)', value: stats?.activeUsers?.toLocaleString() ?? '—', icon: TrendingUp },
    { label: 'Total Connections', value: stats?.totalConnections?.toLocaleString() ?? '—', icon: Zap },
    { label: 'Active Events', value: stats?.totalEvents?.toLocaleString() ?? '—', icon: Calendar },
    { label: 'Tap Cards', value: stats?.totalFounderCards?.toLocaleString() ?? '—', icon: CreditCard },
    { label: 'Events Created', value: stats?.totalEvents?.toLocaleString() ?? '—', icon: Calendar },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Platform Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time platform data</p>
        </div>

        {hasError && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Failed to load analytics data. Some metrics may be unavailable.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map(({ label, value, icon: Icon }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Surface hover className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-primary/5 -translate-y-6 translate-x-6" />
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <Icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                </div>
                <p className={`text-2xl font-bold ${statsError ? 'text-muted-foreground/50' : 'text-foreground'}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </Surface>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Surface>
            <h3 className="text-lg font-semibold text-foreground mb-4">User Signups by Month</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={signupData}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A853" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4A853" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="users" stroke="#D4A853" fill="url(#usersGrad)" strokeWidth={2} name="Users" />
              </AreaChart>
            </ResponsiveContainer>
          </Surface>

          <Surface>
            <h3 className="text-lg font-semibold text-foreground mb-4">Daily Connections This Week</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={connectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="connections" fill="#D4A853" opacity={0.8} radius={[4, 4, 0, 0]} name="Connections" />
              </BarChart>
            </ResponsiveContainer>
          </Surface>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Surface>
            <h3 className="text-lg font-semibold text-foreground mb-4">User Tier Distribution</h3>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={tierData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {tierData.map((_, i) => <Cell key={i} fill={TIER_COLORS[i]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {tierData.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: TIER_COLORS[i] }} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.value.toLocaleString()} users · {tierTotal > 0 ? Math.round((t.value / tierTotal) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Surface>

          {categoryData.length > 0 && (
            <Surface>
              <h3 className="text-lg font-semibold text-foreground mb-4">Events by Category</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="events" fill="#D4A853" opacity={0.75} radius={[0, 4, 4, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </Surface>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalyticsPage;
