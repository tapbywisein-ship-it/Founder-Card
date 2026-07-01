import { useState } from 'react';
import { motion } from 'framer-motion';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Bell, BellRing, UserPlus, Calendar, Trophy, Zap, CheckCheck, AlertCircle } from 'lucide-react';
import { useNotifications, useMarkRead, useMarkAllRead } from '@/hooks/useNotifications';
import {
  enablePushNotifications,
  getPushPermissionState,
  type PushPermissionState,
} from '@/services/notifications.service';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS: Record<string, React.ElementType> = {
  CONNECTION_REQUEST: UserPlus,
  CONNECTION_ACCEPTED: UserPlus,
  EVENT_REMINDER: Calendar,
  FOUNDER_CARD_APPROVED: Trophy,
  FOUNDER_CARD_REJECTED: Trophy,
  NEW_EVENT: Calendar,
  BADGE_EARNED: Trophy,
  LEVEL_UP: Zap,
  SYSTEM: Bell,
};

const NOTIF_COLORS: Record<string, string> = {
  CONNECTION_REQUEST: 'bg-blue-500/10 text-blue-400',
  CONNECTION_ACCEPTED: 'bg-emerald-500/10 text-emerald-400',
  EVENT_REMINDER: 'bg-amber-500/10 text-amber-400',
  FOUNDER_CARD_APPROVED: 'bg-emerald-500/10 text-emerald-400',
  FOUNDER_CARD_REJECTED: 'bg-rose-500/10 text-rose-400',
  NEW_EVENT: 'bg-purple-500/10 text-purple-400',
  BADGE_EARNED: 'bg-yellow-500/10 text-yellow-400',
  LEVEL_UP: 'bg-orange-500/10 text-orange-400',
  SYSTEM: 'bg-muted text-muted-foreground',
};

const PushBanner = () => {
  const [state, setState] = useState<PushPermissionState>(() => getPushPermissionState());
  const [busy, setBusy] = useState(false);

  if (state === 'unsupported' || state === 'granted') return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      await enablePushNotifications();
      setState('granted');
      toast.success('Push notifications enabled');
    } catch (err) {
      setState(getPushPermissionState());
      toast.error(err instanceof Error ? err.message : 'Could not enable push notifications');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'denied') {
    return (
      <Surface className="flex items-start gap-3 border-amber-500/20">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
          <BellRing className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Push notifications are blocked</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable notifications for this site in your browser settings to get event reminders and connection alerts.
          </p>
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="flex items-center gap-3 border-primary/20">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <BellRing className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Get notified in real time</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Turn on browser push for event reminders, connection requests, and check-in alerts — even when the tab is closed.
        </p>
      </div>
      <Button size="sm" onClick={handleEnable} disabled={busy} className="flex-shrink-0">
        {busy ? 'Enabling…' : 'Enable'}
      </Button>
    </Surface>
  );
};

const NotificationsPage = () => {
  const { data, isLoading, isError, refetch } = useNotifications(1, 50);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        <PushBanner />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <span className="w-6 h-6 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark all read
            </Button>
          )}
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load notifications. Check your connection and try again.
            </span>
            <button onClick={() => refetch()} className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Surface key={i} className="h-16 animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const Icon = NOTIF_ICONS[n.type] ?? Bell;
              const colorClass = NOTIF_COLORS[n.type] ?? 'bg-muted text-muted-foreground';
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Surface
                    className={`flex items-start gap-3 cursor-pointer transition-all ${!n.isRead ? 'border-primary/20' : ''}`}
                    onClick={() => !n.isRead && markRead.mutate(n.id)}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-snug ${n.isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    </div>
                    {!n.isRead && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </Surface>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
};

export default NotificationsPage;
