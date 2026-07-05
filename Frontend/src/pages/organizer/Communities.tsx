import { useState } from 'react';
import { Link } from 'react-router-dom';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useMyCommunities, useCreateCommunity } from '@/hooks/useCommunities';
import { Boxes, Plus, Users, Calendar, ExternalLink } from 'lucide-react';

const CommunitiesPage = () => {
  const { data: communities, isLoading } = useMyCommunities();
  const createMutation = useCreateCommunity();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const submit = async () => {
    if (name.trim().length < 2) return;
    await createMutation.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || undefined,
    });
    setName(''); setDescription(''); setCategory('');
    setOpen(false);
  };

  return (
    <OrganizerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Communities</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Host recurring events under a community and keep your members across every one.
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New community
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <Surface key={i} className="h-28 animate-pulse" />)}
          </div>
        ) : (communities?.length ?? 0) === 0 ? (
          <Surface className="text-center py-14">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
              <Boxes className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">No communities yet</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Group your recurring events so attendees can follow and never miss the next one.
            </p>
            <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Create your first community
            </Button>
          </Surface>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communities!.map((c) => (
              <Surface key={c.id} hover className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  {c.avatar ? (
                    <img src={c.avatar} alt="" className="h-11 w-11 rounded-xl object-cover" />
                  ) : (
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Boxes className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground truncate">{c.name}</h3>
                    {c.category && <p className="text-xs text-muted-foreground">{c.category}</p>}
                  </div>
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {c.memberCount} members</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {c.eventCount} events</span>
                  </div>
                  <Link
                    to={`/community/${c.slug}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </Surface>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New community</DialogTitle>
            <DialogDescription>Recurring events + a members list that persists across them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bangalore Founders" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-cat">Category (optional)</Label>
              <Input id="c-cat" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Startups" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-desc">Description (optional)</Label>
              <textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this community about?"
                className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
            <Button className="w-full" onClick={submit} disabled={name.trim().length < 2 || createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create community'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
};

export default CommunitiesPage;
