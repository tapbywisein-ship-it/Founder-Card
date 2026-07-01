import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Input } from '@/components/ui/input';
import { Search, AlertCircle, Building2, Briefcase, Tag, CalendarDays, User } from 'lucide-react';
import { useNetworkSearch } from '@/hooks/useConnections';

const MATCH_META: Record<string, { label: string; icon: React.ElementType }> = {
  name: { label: 'Name', icon: User },
  company: { label: 'Company', icon: Building2 },
  role: { label: 'Role', icon: Briefcase },
  skills: { label: 'Skills', icon: Tag },
  event: { label: 'Event', icon: CalendarDays },
};

const NetworkSearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { data, isFetching, error } = useNetworkSearch(query);

  const results = data?.results ?? [];

  return (
    <AppLayout>
      <div className="space-y-6 pb-24 md:pb-8 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Search className="w-5 h-5" /> Network Search
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Find anyone in your network by name, company, role, skill, or event you met at.
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Stripe, designer, fintech, react…"
            className="pl-10 h-11"
            autoFocus
          />
        </div>

        {/* Errors */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Search failed. Please try again.
          </div>
        )}

        {/* Prompt before typing */}
        {query.trim().length < 2 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Type at least 2 characters to search your network.
          </div>
        )}

        {/* Loading */}
        {query.trim().length >= 2 && isFetching && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Surface key={i} className="h-16 animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!isFetching && query.trim().length >= 2 && results.length === 0 && !error && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            No one in your network matches “{query.trim()}”.
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{results.length} match{results.length === 1 ? '' : 'es'}</p>
            {results.map((r, i) => {
              const p = r.user.profile;
              const name = p ? `${p.firstName} ${p.lastName}`.trim() : r.user.email;
              return (
                <motion.div key={r.connectionId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <Surface
                    hover
                    className="flex items-center gap-3 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/card/${r.user.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(`/card/${r.user.id}`); }}
                  >
                    {p?.avatar ? (
                      <img src={p.avatar} alt={name} loading="lazy" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold flex-shrink-0">
                        {name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      {(p?.position || p?.company) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[p?.position, p?.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.matchedOn.map((m) => {
                          const meta = MATCH_META[m];
                          if (!meta) return null;
                          const Icon = meta.icon;
                          return (
                            <span key={m} className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              <Icon className="w-2.5 h-2.5" /> {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </Surface>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default NetworkSearchPage;
