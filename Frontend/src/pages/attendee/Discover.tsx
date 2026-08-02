import { type ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { PortalLayout } from '@/components/PortalLayout';
import { PublicNav } from '@/components/PublicNav';
import { useAppStore } from '@/store/appStore';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useSearchParams } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { getTheme } from '@/lib/eventThemes';
import { getRegistrationPricing } from '@/lib/ticketPricing';
import { registrationCountdown } from '@/lib/eventCountdown';
import { Calendar, MapPin, Users, Tag, Search, Sparkles, AlertCircle, CheckCircle2, Clock, Cpu, TrendingUp, Palette, Heart, PartyPopper, Music, Dumbbell, UtensilsCrossed } from 'lucide-react';

const CATEGORIES = [
  { id: 'tech',     label: 'Tech',     icon: Cpu },
  { id: 'business', label: 'Business', icon: TrendingUp },
  { id: 'design',   label: 'Design',   icon: Palette },
  { id: 'health',   label: 'Health',   icon: Heart },
  { id: 'social',   label: 'Social',   icon: PartyPopper },
  { id: 'arts',     label: 'Arts',     icon: Music },
  { id: 'sports',   label: 'Sports',   icon: Dumbbell },
  { id: 'food',     label: 'Food',     icon: UtensilsCrossed },
];

const DiscoverPage = () => {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? '');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [priceFilter, setPriceFilter] = useState<'' | 'free' | 'paid'>('');

  const { data, isLoading, isError, refetch } = useEvents({
    q: search || undefined,
    category: selectedCategory || undefined,
    city: city || undefined,
    price: priceFilter || undefined,
    startDate: dateFrom ? new Date(dateFrom).toISOString() : undefined,
    status: 'PUBLISHED',
    limit: 30,
    orderBy: 'startDate',
    orderDir: 'asc',
  });

  const events = data?.events ?? [];
  const hasFilters = Boolean(selectedCategory || search || city || dateFrom || priceFilter);
  const clearAll = () => {
    setSelectedCategory('');
    setSearch('');
    setCity('');
    setDateFrom('');
    setPriceFilter('');
  };

  // Public browsing: logged-out visitors get the minimal PublicNav shell; signed-in
  // users keep their portal chrome. Registering still routes through /login.
  const wrap = (children: ReactNode) =>
    isAuthenticated ? (
      <PortalLayout>{children}</PortalLayout>
    ) : (
      <div className="min-h-screen bg-background">
        <PublicNav />
        <main className="max-w-content mx-auto px-4 py-6 md:py-10">{children}</main>
      </div>
    );

  return wrap(
      <div className="space-y-6 pb-24 md:pb-8">
        <div className="flex items-center gap-3 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-3xl font-semibold text-foreground">Discover</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, topics, venues..."
            className="pl-10"
          />
        </div>

        {/* Filters: city, date, free/paid */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[140px]">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="pl-9 h-9"
            />
          </div>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-[150px]"
            aria-label="On or after date"
          />
          <div className="inline-flex rounded-lg border border-border overflow-hidden">
            {(['', 'free', 'paid'] as const).map((p) => (
              <button
                key={p || 'all'}
                onClick={() => setPriceFilter(p)}
                className={`px-3 h-9 text-sm font-medium transition-colors ${
                  priceFilter === p ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === '' ? 'All' : p === 'free' ? 'Free' : 'Paid'}
              </button>
            ))}
          </div>
        </div>

        {/* Category grid */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Browse by Category</p>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all bg-card ${
                  selectedCategory === cat.id
                    ? 'border-primary scale-95'
                    : 'border-border hover:border-primary/40 hover:scale-95'
                }`}
              >
                <cat.icon className="w-5 h-5 text-foreground/70" />
                <span className="text-[10px] font-medium text-foreground">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Events */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {selectedCategory
                ? `${CATEGORIES.find((c) => c.id === selectedCategory)?.label ?? selectedCategory} Events`
                : 'All Events'}
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="text-xs h-6 px-2" onClick={clearAll}>
                Clear
              </Button>
            )}
          </div>

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
              {[...Array(4)].map((_, i) => (
                <Surface key={i} className="h-40 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No events found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((e, i) => {
                const theme = getTheme(e.theme);
                const { topLabel: price } = getRegistrationPricing(e);
                const org = e.organizer;
                const organizerName =
                  org?.profile?.company ||
                  (org?.profile ? `${org.profile.firstName ?? ''} ${org.profile.lastName ?? ''}`.trim() : org?.username) ||
                  null;
                const isRegistered = e.registrationStatus === 'REGISTERED' || e.registrationStatus === 'ATTENDED';
                const isWaitlisted = e.registrationStatus === 'WAITLISTED';
                const { label: daysLeftLabel, urgent: daysLeftUrgent } =
                  registrationCountdown(e.startDate, e.registrationDeadline);
                return (
                  <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/event/${e.id}`} className="block group h-full">
                      <Surface hover className="h-full flex flex-col p-0 overflow-hidden">
                        {/* Cover image (falls back to the event theme gradient) */}
                        <div className="relative">
                          {e.coverImage ? (
                            <img src={e.coverImage} alt={e.title} loading="lazy" className="w-full aspect-[16/9] object-cover" />
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
                            <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white shadow-sm">
                              Waitlisted
                            </span>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">{e.title}</h3>
                          {organizerName && <p className="text-xs text-muted-foreground mt-1 truncate">By {organizerName}</p>}
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {(e.city || e.address) && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{e.locationType === 'VIRTUAL' ? 'Online' : (e.city || e.address)}</span>
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {e.registeredCount ?? 0}/{e.capacity} going</span>
                            <span className={`flex items-center gap-1 ml-auto ${daysLeftUrgent ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}`}>
                              <Clock className="w-3 h-3" /> {daysLeftLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
                            <span className="text-sm font-medium text-primary flex items-center gap-1"><Tag className="w-3 h-3" /> {price}</span>
                            {typeof e.spotsLeft === 'number' && e.spotsLeft <= 20 && (
                              <span className={`text-[10px] font-medium ${e.spotsLeft === 0 ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                                {e.spotsLeft === 0 ? 'Full' : `${e.spotsLeft} left`}
                              </span>
                            )}
                          </div>
                        </div>
                      </Surface>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
};

export default DiscoverPage;
