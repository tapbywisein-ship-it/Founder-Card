import { AdminLayout } from '@/components/AdminLayout';
import { Surface } from '@/components/Surface';
import { Users, Calendar, Zap, CreditCard, TrendingUp } from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdmin';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminDashboard();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-foreground">Platform Overview</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bento-stagger">
          {isLoading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-xl animate-pulse" />)
          ) : (
            [
              { label: 'Total Users', value: stats?.totalUsers?.toLocaleString() ?? '—', icon: Users },
              { label: 'Total Events', value: stats?.totalEvents?.toLocaleString() ?? '—', icon: Calendar },
              { label: 'Connections', value: stats?.totalConnections?.toLocaleString() ?? '—', icon: Zap },
              { label: 'Founder Cards', value: stats?.totalFounderCards?.toLocaleString() ?? '—', icon: CreditCard },
            ].map((s) => (
              <Surface key={s.label} hover>
                <div className="flex items-center justify-between mb-2">
                  <s.icon className="w-5 h-5 text-primary" />
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Surface>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Surface>
            <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" />)}</div>
            ) : (stats?.recentActivity as string[] | undefined)?.length ? (
              <div className="space-y-3">
                {(stats!.recentActivity as string[]).map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <p className="text-sm text-foreground">{a}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
            )}
          </Surface>

          <Surface>
            <h2 className="text-xl font-semibold text-foreground mb-4">Quick Stats</h2>
            <div className="space-y-3">
              {[
                { label: 'Active Users (30d)', value: stats?.activeUsers?.toLocaleString() ?? '—' },
                { label: 'Founder Cards Issued', value: stats?.totalFounderCards?.toLocaleString() ?? '—' },
                { label: 'Total Events', value: stats?.totalEvents?.toLocaleString() ?? '—' },
                { label: 'Total Connections', value: stats?.totalConnections?.toLocaleString() ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
