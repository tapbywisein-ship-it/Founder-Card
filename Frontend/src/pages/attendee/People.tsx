import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConnectionSuggestions, useSendConnectionRequest } from '@/hooks/useConnections';
import { Users, Search } from 'lucide-react';

/** Full member directory — "See more" from Dashboard's People You May Know. */
const PeopleDirectory = () => {
  const { data: people, isLoading } = useConnectionSuggestions(100);
  const sendRequest = useSendConnectionRequest();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');

  const handleConnect = (userId: string) => {
    setSentIds((prev) => new Set(prev).add(userId));
    sendRequest.mutate(userId);
  };

  const q = query.trim().toLowerCase();
  const filtered = (people ?? []).filter((s) => {
    if (!q) return true;
    const p = s.profile;
    const haystack = [p?.firstName, p?.lastName, p?.company, p?.position, ...(p?.skills ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">People on TapByWisein</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, role, or skill..."
            className="pl-9"
          />
        </div>

        <Surface>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-10">Loading people...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No people found.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filtered.map((s) => {
                const p = s.profile;
                const name = p ? `${p.firstName} ${p.lastName}`.trim() : 'User';
                const sent = sentIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border hover:bg-muted/50 transition-colors"
                  >
                    {p?.avatar ? (
                      <img src={p.avatar} alt={name} loading="lazy" className="w-12 h-12 rounded-full object-cover mb-2" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold mb-2">
                        {name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className="text-sm font-semibold text-foreground leading-tight mb-0.5 truncate w-full">{name}</p>
                    {(p?.position || p?.company) && (
                      <p className="text-[11px] text-muted-foreground truncate w-full mb-2">
                        {[p?.position, p?.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {p?.skills && p.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mb-2">
                        {p.skills.slice(0, 2).map((sk) => (
                          <span key={sk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{sk}</span>
                        ))}
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant={sent ? 'outline' : 'default'}
                      className="w-full text-xs h-7"
                      disabled={sent || sendRequest.isPending}
                      onClick={() => handleConnect(s.id)}
                    >
                      {sent ? 'Sent ✓' : 'Connect'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>
      </div>
    </AppLayout>
  );
};

export default PeopleDirectory;
