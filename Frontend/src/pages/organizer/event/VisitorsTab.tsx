import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Surface } from '@/components/Surface';
import { Eye, UserCheck, Users as UsersIcon, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/services/api';

interface VisitorPayload {
  totalViews: number;
  uniqueAuthedVisitors: number;
  uniqueAnonVisitors: number;
  authedVisitors: Array<{
    id: string;
    email: string;
    username: string | null;
    registered: boolean;
    profile: {
      firstName: string | null;
      lastName: string | null;
      avatar: string | null;
      company: string | null;
      position: string | null;
    } | null;
  }>;
}

const VisitorsTab = () => {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['org-visitors', id],
    queryFn: () => apiFetch<{ data: VisitorPayload }>(`/events/${id}/visitors`),
    enabled: !!id,
  });

  const v = data?.data;
  const notRegistered = (v?.authedVisitors ?? []).filter((x) => !x.registered);

  return (
    <div className="space-y-6">
      {isError && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Failed to load visitor data. Try refreshing.
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total views', value: v?.totalViews ?? 0, icon: Eye },
          { label: 'Logged-in visitors', value: v?.uniqueAuthedVisitors ?? 0, icon: UserCheck },
          { label: 'Anonymous', value: v?.uniqueAnonVisitors ?? 0, icon: UsersIcon },
        ].map(({ label, value, icon: Icon }) => (
          <Surface key={label} padding="md" className="text-center">
            <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </Surface>
        ))}
      </div>

      <Surface>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Viewed but not registered ({notRegistered.length})
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notRegistered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No untapped visitors yet.
          </p>
        ) : (
          <div className="space-y-1">
            {notRegistered.map((u) => {
              const name = u.profile
                ? `${u.profile.firstName ?? ''} ${u.profile.lastName ?? ''}`.trim() || u.email
                : u.email;
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-foreground flex-shrink-0 overflow-hidden">
                    {u.profile?.avatar ? (
                      <img src={u.profile.avatar} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      name[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {[u.profile?.position, u.profile?.company].filter(Boolean).join(' · ') || u.email}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-600">
                    Visited
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Surface>
    </div>
  );
};

export default VisitorsTab;
