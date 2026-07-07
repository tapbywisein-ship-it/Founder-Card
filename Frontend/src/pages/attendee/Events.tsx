import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useEvents, useRegisterForEvent, useMyRegistrations, useSavedEvents, useEventQuestions } from '@/hooks/useEvents';
import { SaveEventButton } from '@/components/SaveEventButton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/components/ui/select';
import { getTheme } from '@/lib/eventThemes';
import { getRegistrationPricing } from '@/lib/ticketPricing';
import { QRCodeSVG } from 'qrcode.react';
import type { Event } from '@/services/events.service';
import {
  Calendar, Users, MapPin, CheckCircle2, X,
  Clock, Tag, Ticket, Search, AlertCircle,
} from 'lucide-react';

const CATEGORIES = ['All', 'Tech', 'Business', 'Design', 'Health', 'Social', 'Arts', 'Sports', 'Food', 'Startup', 'AI'];

const EventsPage = () => {
  const user = useAppStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [savedOnly, setSavedOnly] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const withUser = searchParams.get('withUser') ?? undefined;
  const [registerModal, setRegisterModal] = useState<Event | null>(null);
  const [regStep, setRegStep] = useState<'confirm' | 'success'>('confirm');
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useEvents({
    q: search || undefined,
    category: category !== 'All' ? category : undefined,
    status: 'PUBLISHED',
    limit: 50,
    withUser,
  });

  const { data: myRegsData } = useMyRegistrations();
  const { data: savedData } = useSavedEvents(1, 100);
  const savedIdSet = new Set(savedData?.events.map((e) => e.id) ?? []);

  const registerMutation = useRegisterForEvent();
  const allEvents = data?.events ?? [];
  const events = savedOnly ? allEvents.filter((e) => savedIdSet.has(e.id)) : allEvents;

  // Build a set of registered event IDs from the user's registrations
  const registeredEventIds = new Set(
    (myRegsData?.registrations ?? [])
      .filter((r) => r.status === 'REGISTERED' || r.status === 'ATTENDED' || r.status === 'WAITLISTED')
      .map((r) => r.eventId)
  );
  const waitlistedEventIds = new Set(
    (myRegsData?.registrations ?? [])
      .filter((r) => r.status === 'WAITLISTED')
      .map((r) => r.eventId)
  );

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { data: modalQuestions } = useEventQuestions(
    registerModal?.id ?? '',
    !!registerModal
  );

  const handleRegister = async () => {
    if (!registerModal) return;
    const answerArr = Object.entries(answers)
      .filter(([, v]) => v.trim())
      .map(([questionId, answer]) => ({ questionId, answer }));
    const res = await registerMutation.mutateAsync({
      eventId: registerModal.id,
      answers: answerArr.length > 0 ? answerArr : undefined,
    });
    const regId = (res as { data?: { registration?: { id?: string } } })?.data?.registration?.id ?? null;
    setRegistrationId(regId);
    setAnswers({});
    setRegStep('success');
  };

  const openModal = (e: Event) => { setRegisterModal(e); setRegStep('confirm'); setRegistrationId(null); };
  const closeModal = () => setRegisterModal(null);

  const qrValue = registrationId
    ? `tapbywisein://registration/${registrationId}`
    : `tapbywisein://event/${registerModal?.id}/user/${user?.id}`;

  return (
    <PortalLayout>
      <div className="space-y-6 pb-24 md:pb-8">
        {/* Filter active banner: comes from /card/:id → "Find at events" link.
            Tells the user the list has been narrowed to events they and the
            target person are BOTH registered for. */}
        {withUser && (
          <Surface className="flex items-center gap-2 border-primary/30 bg-primary/5 py-2.5">
            <span className="text-xs text-foreground">
              Showing events you and this person are{' '}
              <span className="font-semibold">both registered for</span>.
            </span>
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('withUser');
                setSearchParams(next, { replace: true });
              }}
              className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear filter
            </button>
          </Surface>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-semibold text-foreground">Events</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSavedOnly((s) => !s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                savedOnly
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {savedOnly ? 'Saved only' : 'Show saved'}
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events..."
                className="pl-9 h-8 text-sm w-48"
              />
            </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                category === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border rounded-card shadow-card-xs text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Events grid */}
        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <span className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Failed to load events. Check your connection and try again.
            </span>
            <button onClick={() => refetch()} className="shrink-0 text-xs font-medium underline underline-offset-2 hover:opacity-80">
              Retry
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Surface key={i} className="h-48 animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-1/3 mb-3" />
                <div className="h-6 bg-muted/50 rounded w-2/3 mb-2" />
                <div className="h-3 bg-muted/50 rounded w-1/2" />
              </Surface>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No events found.</p>
            {search || category !== 'All' ? (
              <Button variant="ghost" size="sm" className="mt-3"
                onClick={() => { setSearch(''); setCategory('All'); }}>
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((e, i) => {
              const theme = getTheme(e.theme);
              // Prefer backend registrationStatus, fall back to local registration data
              const isRegistered =
                e.registrationStatus === 'REGISTERED' || e.registrationStatus === 'ATTENDED' ||
                (e.registrationStatus == null && registeredEventIds.has(e.id) && !waitlistedEventIds.has(e.id));
              const isWaitlisted =
                e.registrationStatus === 'WAITLISTED' ||
                (e.registrationStatus == null && waitlistedEventIds.has(e.id));
              const { topLabel: price } = getRegistrationPricing(e);
              const isFull = e.registeredCount !== undefined && e.registeredCount >= e.capacity;

              // "Posted by" — prefer the organizer's company, else their name.
              const org = e.organizer;
              const organizerName =
                org?.profile?.company ||
                (org?.profile ? `${org.profile.firstName} ${org.profile.lastName}`.trim() : org?.username) ||
                null;

              // Days left to register — no registrationDeadline in the list
              // payload, so count down to the event start.
              const daysLeft = Math.ceil((new Date(e.startDate).getTime() - Date.now()) / 86_400_000);
              const registrationClosed = daysLeft < 0;
              const daysLeftLabel =
                daysLeft > 1 ? `${daysLeft} days left` :
                daysLeft === 1 ? '1 day left' :
                daysLeft === 0 ? 'Last day' :
                'Ended';
              const daysLeftUrgent = daysLeft >= 0 && daysLeft <= 3;

              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Surface hover className="h-full flex flex-col overflow-hidden p-0">
                    {/* Cover image (falls back to the event theme gradient) */}
                    <Link to={`/event/${e.id}`} className="relative block">
                      {e.coverImage ? (
                        <img
                          src={e.coverImage}
                          alt={e.title}
                          loading="lazy"
                          className="w-full aspect-[16/9] object-cover"
                        />
                      ) : (
                        <div className="w-full aspect-[16/9]" style={{ background: theme.gradient }} aria-hidden />
                      )}
                      {e.category && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-background/85 text-foreground backdrop-blur-sm border border-border">
                          {e.category}
                        </span>
                      )}
                      {isRegistered && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3" /> Registered
                        </span>
                      )}
                      {!isRegistered && isWaitlisted && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white flex items-center gap-1 shadow-sm">
                          Waitlisted
                        </span>
                      )}
                    </Link>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-lg font-semibold text-foreground leading-tight flex-1 min-w-0">
                          <Link to={`/event/${e.id}`} className="hover:text-primary transition-colors line-clamp-2">
                            {e.title}
                          </Link>
                        </h3>
                        <SaveEventButton eventId={e.id} />
                      </div>

                      {organizerName && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">By {organizerName}</p>
                      )}

                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        {new Date(e.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {(e.city || e.address) && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{e.locationType === 'VIRTUAL' ? 'Online' : (e.city || e.address)}</span>
                        </p>
                      )}

                      {/* Guests + days left to register */}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {e.registeredCount ?? 0}/{e.capacity} going
                        </span>
                        <span className={`flex items-center gap-1 ml-auto ${daysLeftUrgent ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                          <Clock className="w-3 h-3" /> {daysLeftLabel}
                        </span>
                      </div>

                      {/* Price + register / registered */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                        <span className="text-sm font-medium text-primary flex items-center gap-1">
                          <Tag className="w-3 h-3" /> {price}
                        </span>
                        {isRegistered ? (
                          <Button variant="outline" size="sm" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:text-emerald-600" asChild>
                            <Link to={`/event/${e.id}`}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Registered
                            </Link>
                          </Button>
                        ) : isWaitlisted ? (
                          <Button variant="ghost" size="sm" disabled>
                            <Clock className="w-3 h-3 mr-1" /> Waitlisted
                          </Button>
                        ) : registrationClosed ? (
                          <Button variant="ghost" size="sm" disabled>Closed</Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isFull && !e.waitlistEnabled}
                            onClick={() => openModal(e)}
                          >
                            <Ticket className="w-3 h-3 mr-1" />
                            {isFull ? (e.waitlistEnabled ? 'Waitlist' : 'Full') : 'Register'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Surface>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {registerModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && !registerMutation.isPending && closeModal()}
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md">
              <Surface className="relative">
                {!registerMutation.isPending && (
                  <button onClick={closeModal} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                )}

                <AnimatePresence mode="wait">
                  {regStep === 'confirm' && (
                    <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Ticket className="w-8 h-8 text-primary mb-4" />
                      <h2 className="text-2xl font-semibold text-foreground mb-1">Register for Event</h2>
                      <p className="text-muted-foreground text-sm mb-5">{registerModal.title}</p>
                      <div className="space-y-2 mb-6">
                        {[
                          { icon: Calendar, text: new Date(registerModal.startDate).toLocaleString() },
                          { icon: MapPin, text: registerModal.locationType === 'VIRTUAL' ? 'Online' : (registerModal.city || registerModal.address || 'Venue TBD') },
                          { icon: Tag, text: `Price: ${getRegistrationPricing(registerModal).topLabel}` },
                          { icon: Users, text: `${registerModal.registeredCount ?? 0} of ${registerModal.capacity} registered` },
                        ].map(({ icon: Icon, text }, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                            {text}
                          </div>
                        ))}
                      </div>
                      {modalQuestions && modalQuestions.length > 0 && (
                        <div className="mb-5 space-y-3 rounded-card border border-border bg-card/40 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            A few questions from the host
                          </p>
                          {modalQuestions.map((q) => (
                            <div key={q.id} className="space-y-1">
                              <label className="text-xs font-medium text-foreground">
                                {q.prompt}
                                {q.required && <span className="ml-0.5 text-rose-500">*</span>}
                              </label>
                              {q.type === 'TEXTAREA' ? (
                                <Textarea
                                  rows={2}
                                  value={answers[q.id] ?? ''}
                                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                                  required={q.required}
                                />
                              ) : q.type === 'SELECT' && (q.options?.length ?? 0) > 0 ? (
                                <UiSelect
                                  value={answers[q.id] ?? ''}
                                  onValueChange={(v) =>
                                    setAnswers((a) => ({ ...a, [q.id]: v }))
                                  }
                                >
                                  <UiSelectTrigger>
                                    <UiSelectValue placeholder="Choose…" />
                                  </UiSelectTrigger>
                                  <UiSelectContent>
                                    {(q.options ?? []).map((opt) => (
                                      <UiSelectItem key={opt} value={opt}>
                                        {opt}
                                      </UiSelectItem>
                                    ))}
                                  </UiSelectContent>
                                </UiSelect>
                              ) : (
                                <Input
                                  value={answers[q.id] ?? ''}
                                  onChange={(e) =>
                                    setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                                  }
                                  required={q.required}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <Button className="w-full" size="lg" onClick={handleRegister} disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                              className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                            Processing...
                          </span>
                        ) : 'Confirm Registration'}
                      </Button>
                    </motion.div>
                  )}

                  {regStep === 'success' && (
                    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                        className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
                      </motion.div>
                      <h2 className="text-2xl font-semibold text-foreground mb-1">You're registered!</h2>
                      <p className="text-sm text-muted-foreground mb-4">Show your QR code at the gate.</p>
                      <div className="bg-white p-4 rounded-2xl inline-block mb-5">
                        <QRCodeSVG
                          value={qrValue}
                          size={140}
                          bgColor="#ffffff"
                          fgColor="#0D0D0D"
                          level="M"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-5">
                        Registration ID: {registrationId ?? 'saved'}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="ghost" className="flex-1" onClick={closeModal}>Close</Button>
                        <Button className="flex-1" asChild>
                          <Link to={`/event/${registerModal.id}`}>View Ticket</Link>
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PortalLayout>
  );
};

export default EventsPage;
