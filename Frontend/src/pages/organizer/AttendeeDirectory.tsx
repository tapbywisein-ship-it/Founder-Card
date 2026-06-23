import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, Eye, Mail, Users, Star, Crown } from 'lucide-react';
import { useOrgAttendees } from '@/hooks/useOrganizer';
import type { AttendeeItem } from '@/services/organizer.service';

const statusConfig: Record<string, { label: string; color: string }> = {
  REGISTERED: { label: 'Registered', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ATTENDED:   { label: 'Checked In', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  WAITLISTED: { label: 'Waitlisted', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  CANCELLED:  { label: 'Cancelled',  color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const AttendeeDirectoryPage = () => {
  const [search, setSearch] = useState('');
  const [selectedAttendee, setSelectedAttendee] = useState<AttendeeItem | null>(null);

  const { data, isLoading } = useOrgAttendees({ search: search || undefined });
  const attendees = data?.attendees ?? [];

  const checkedInCount  = attendees.filter((a) => a.checkedIn).length;
  const founderCount    = attendees.filter((a) => a.user?.founderCard?.status === 'ACTIVE').length;
  const avgScore        = attendees.length
    ? Math.round(attendees.reduce((s, a) => s + (a.user?.gamification?.fkScore ?? 0), 0) / attendees.length)
    : 0;

  const handleExport = () => {
    const csv = ['Name,Company,Position,Event,Tier,FK Score,Email,Status']
      .concat(
        attendees.map((a) => {
          const name = a.user?.profile ? `${a.user.profile.firstName} ${a.user.profile.lastName}` : a.email;
          return `${name},${a.user?.profile?.company ?? ''},${a.user?.profile?.position ?? ''},${a.event?.title ?? ''},${a.user?.founderCard?.status === 'ACTIVE' ? 'FounderCard' : 'Free'},${a.user?.gamification?.fkScore ?? 0},${a.email},${a.status}`;
        })
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const el   = document.createElement('a');
    el.href     = url;
    el.download = 'attendee-directory.csv';
    el.click();
  };

  return (
    <OrganizerLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Attendee Directory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{attendees.length} attendees across all events</p>
          </div>
          <Button size="sm" onClick={handleExport} disabled={attendees.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Registered', value: attendees.length, icon: Users },
            { label: 'Checked In',       value: checkedInCount,   icon: Star  },
            { label: 'FounderCard',      value: founderCount,     icon: Crown },
            { label: 'Avg FK Score',     value: avgScore,         icon: Star  },
          ].map(({ label, value, icon: Icon }, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Surface className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  {isLoading ? (
                    <div className="h-5 w-10 bg-muted/50 rounded animate-pulse mb-1" />
                  ) : (
                    <p className="text-xl font-bold text-foreground">{value}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </Surface>
            </motion.div>
          ))}
        </div>

        {/* Search */}
        <Surface className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 pl-10 text-sm bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Search by name or company..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{attendees.length} results</span>
          </div>
        </Surface>

        {/* Table */}
        <Surface className="overflow-hidden p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : attendees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No attendees match your search.' : 'No attendees yet. Create and publish an event to get registrations.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {['Attendee', 'Company', 'Event', 'Tier', 'FK Score', 'Status', ''].map((h) => (
                      <th key={h} className="text-left text-xs text-muted-foreground font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {attendees.map((a, i) => {
                      const name = a.user?.profile
                        ? `${a.user.profile.firstName} ${a.user.profile.lastName}`.trim()
                        : a.email;
                      const isFounder = a.user?.founderCard?.status === 'ACTIVE';
                      const sc = statusConfig[a.status] ?? statusConfig['REGISTERED'];
                      return (
                        <motion.tr
                          key={a.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {a.user?.profile?.avatar ? (
                                <img src={a.user.profile.avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                                  {name[0]?.toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="text-sm font-medium text-foreground whitespace-nowrap">{name}</p>
                                <p className="text-[11px] text-muted-foreground">{a.user?.profile?.position ?? a.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {a.user?.profile?.company ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="chip text-[10px] whitespace-nowrap">{a.event?.title ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            {isFounder ? (
                              <span className="flex items-center gap-1 text-[10px] text-primary"><Crown className="w-3 h-3" /> FounderCard</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Free</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-bold text-foreground">
                              {a.user?.gamification?.fkScore ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${sc.color}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedAttendee(a)}>
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      </div>

      {/* Attendee Detail Modal */}
      <AnimatePresence>
        {selectedAttendee && (() => {
          const a = selectedAttendee;
          const name = a.user?.profile
            ? `${a.user.profile.firstName} ${a.user.profile.lastName}`.trim()
            : a.email;
          const sc = statusConfig[a.status] ?? statusConfig['REGISTERED'];
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={(e) => e.target === e.currentTarget && setSelectedAttendee(null)}
            >
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm">
                <Surface className="relative">
                  <button onClick={() => setSelectedAttendee(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground text-xs">✕</button>
                  <div className="text-center mb-5">
                    {a.user?.profile?.avatar ? (
                      <img src={a.user.profile.avatar} alt={name} className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-primary/30" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold mx-auto mb-3">
                        {name[0]?.toUpperCase()}
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-foreground">{name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {a.user?.profile?.position ?? ''}{a.user?.profile?.company ? ` · ${a.user.profile.company}` : ''}
                    </p>
                    <div className="flex justify-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${sc.color}`}>{sc.label}</span>
                      {a.user?.founderCard?.status === 'ACTIVE' && (
                        <span className="flex items-center gap-1 text-[10px] text-primary chip"><Crown className="w-3 h-3" /> FounderCard</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {[
                      { label: 'Email',    value: a.email },
                      { label: 'Event',    value: a.event?.title ?? '—' },
                      { label: 'FK Score', value: a.user?.gamification?.fkScore ?? 0 },
                      { label: 'Registered', value: new Date(a.registeredAt).toLocaleDateString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-border/50">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="text-foreground font-medium text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <a href={`mailto:${a.email}`}>
                      <Button variant="ghost" size="sm" className="text-xs"><Mail className="w-3 h-3 mr-1" /> Email</Button>
                    </a>
                  </div>
                </Surface>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </OrganizerLayout>
  );
};

export default AttendeeDirectoryPage;
