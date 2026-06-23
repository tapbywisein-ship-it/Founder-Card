import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Calendar, Users, Zap, BarChart3, Plus, ChevronRight } from 'lucide-react';
import { useOrgDashboard, useMyOrgEvents } from '@/hooks/useOrganizer';
import { motion } from 'framer-motion';

const OrganizerDashboard = () => {
  const { data: stats, isLoading } = useOrgDashboard();
  const { data: eventsData } = useMyOrgEvents(1, 5);

  const events = eventsData?.events ?? stats?.recentEvents ?? [];

  return (
    <OrganizerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-foreground">Dashboard</h1>
          <Button asChild>
            <Link to="/organizer/events/create"><Plus className="w-4 h-4 mr-1.5" /> New Event</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats?.totalEvents ?? 0, icon: Calendar, loading: isLoading },
            { label: 'Upcoming', value: stats?.upcomingEvents ?? 0, icon: Zap, loading: isLoading },
            { label: 'Total Attendees', value: stats?.totalAttendees ?? 0, icon: Users, loading: isLoading },
            { label: 'Leads', value: stats?.totalLeads ?? 0, icon: BarChart3, loading: isLoading },
          ].map(({ label, value, icon: Icon, loading }) => (
            <Surface key={label} padding="md" className="text-center">
              <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-3" />
              {loading ? (
                <div className="h-8 bg-muted/50 rounded animate-pulse mb-1" />
              ) : (
                <p className="text-3xl font-bold text-foreground mb-0.5">{value}</p>
              )}
              <p className="text-xs text-muted-foreground">{label}</p>
            </Surface>
          ))}
        </div>

        {/* Recent events */}
        <Surface>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Your Events</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/organizer/events/create">
                <Plus className="w-3.5 h-3.5 mr-1" /> Create
              </Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-10">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No events yet.</p>
              <Button size="sm" className="mt-3" asChild>
                <Link to="/organizer/events/create">Create your first event</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                          e.status === 'PUBLISHED' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' :
                          e.status === 'DRAFT' ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' :
                          'border-border text-muted-foreground'
                        }`}>{e.status}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {'registeredCount' in e ? (e as { registeredCount: number }).registeredCount : 0} registered
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/organizer/events/${e.id}`}>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Surface>
      </div>
    </OrganizerLayout>
  );
};

export default OrganizerDashboard;
