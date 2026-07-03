import { useState } from 'react';
import { motion } from 'framer-motion';
import { PortalLayout } from '@/components/PortalLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useSearchParams } from 'react-router-dom';
import { useEvents } from '@/hooks/useEvents';
import { getTheme } from '@/lib/eventThemes';
import { getRegistrationPricing } from '@/lib/ticketPricing';
import { Calendar, MapPin, Users, Tag, Search, Sparkles, AlertCircle, Cpu, TrendingUp, Palette, Heart, PartyPopper, Music, Dumbbell, UtensilsCrossed } from 'lucide-react';

const CATEGORIES = [
  { id: 'tech',     label: 'Tech',     icon: Cpu,             color: 'from-blue-600/30 to-blue-800/10' },
  { id: 'business', label: 'Business', icon: TrendingUp,      color: 'from-amber-600/30 to-amber-800/10' },
  { id: 'design',   label: 'Design',   icon: Palette,         color: 'from-purple-600/30 to-purple-800/10' },
  { id: 'health',   label: 'Health',   icon: Heart,           color: 'from-emerald-600/30 to-emerald-800/10' },
  { id: 'social',   label: 'Social',   icon: PartyPopper,     color: 'from-rose-600/30 to-rose-800/10' },
  { id: 'arts',     label: 'Arts',     icon: Music,           color: 'from-pink-600/30 to-pink-800/10' },
  { id: 'sports',   label: 'Sports',   icon: Dumbbell,        color: 'from-orange-600/30 to-orange-800/10' },
  { id: 'food',     label: 'Food',     icon: UtensilsCrossed, color: 'from-yellow-600/30 to-yellow-800/10' },
];

const DiscoverPage = () => {
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

  return (
    <PortalLayout>
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
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all bg-gradient-to-br ${cat.color} ${
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
                return (
                  <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={`/event/${e.id}`}>
                      <Surface hover className="h-full flex flex-col p-0 overflow-hidden">
                        <div className="h-1.5 w-full" style={{ background: theme.gradient }} />
                        <div className="p-4 flex flex-col flex-1">
                          {e.category && (
                            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{e.category}</span>
                          )}
                          <h3 className="text-base font-semibold text-foreground leading-tight mb-2">{e.title}</h3>
                          {e.organizer?.profile && (
                            <p className="text-xs text-muted-foreground mb-2">
                              by {[e.organizer.profile.firstName, e.organizer.profile.lastName].filter(Boolean).join(' ')}
                              {e.organizer.profile.company ? ` · ${e.organizer.profile.company}` : ''}
                            </p>
                          )}
                          <div className="space-y-1 mb-3 flex-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 flex-shrink-0" />
                              {new Date(e.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {(e.city || e.address) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {e.locationType === 'VIRTUAL' ? 'Online' : (e.city || e.address)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" /> {e.registeredCount ?? 0}
                            </span>
                            {typeof e.spotsLeft === 'number' && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                e.spotsLeft === 0
                                  ? 'bg-red-500/15 text-red-600'
                                  : e.spotsLeft < 10
                                  ? 'bg-amber-500/15 text-amber-700'
                                  : 'bg-emerald-500/15 text-emerald-700'
                              }`}>
                                {e.spotsLeft === 0 ? 'Full' : `${e.spotsLeft} spots left`}
                              </span>
                            )}
                            <span className="text-xs font-medium text-primary">{price}</span>
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
    </PortalLayout>
  );
};

export default DiscoverPage;
