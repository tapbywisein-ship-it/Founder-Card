import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCoupons, useCreateCoupon, useDeleteCoupon } from '@/hooks/useCoupons';
import { Ticket, Plus, Trash2, AlertCircle } from 'lucide-react';

const CouponsTab = () => {
  const { id } = useParams<{ id: string }>();
  const { data: coupons, isLoading, isError } = useCoupons(id!);
  const createMutation = useCreateCoupon(id!);
  const deleteMutation = useDeleteCoupon(id!);

  const [code, setCode] = useState('');
  const [discountPct, setDiscountPct] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const submit = async () => {
    const pct = Number(discountPct);
    if (!code.trim() || pct < 1 || pct > 100) return;
    await createMutation.mutateAsync({
      code: code.trim(),
      discountPct: pct,
      maxUses: maxUses ? Number(maxUses) : undefined,
    });
    setCode(''); setDiscountPct(''); setMaxUses('');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Ticket className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Coupons</h2>
          <p className="text-sm text-muted-foreground">Percentage discount codes attendees apply at checkout.</p>
        </div>
      </div>

      {/* Create */}
      <Surface>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label htmlFor="c-code">Code</Label>
            <Input id="c-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EARLYBIRD" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-pct">% off</Label>
            <Input id="c-pct" type="number" min={1} max={100} value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} placeholder="20" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-max">Max uses</Label>
            <Input id="c-max" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="∞" />
          </div>
          <Button
            onClick={submit}
            disabled={!code.trim() || !(Number(discountPct) >= 1 && Number(discountPct) <= 100) || createMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add
          </Button>
        </div>
      </Surface>

      {/* List */}
      {isError ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" /> Couldn't load coupons.
        </div>
      ) : isLoading ? (
        <Surface className="h-24 animate-pulse" />
      ) : (coupons?.length ?? 0) === 0 ? (
        <Surface className="text-center py-10">
          <Ticket className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No coupons yet.</p>
        </Surface>
      ) : (
        <Surface className="divide-y divide-border">
          {coupons!.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="font-mono font-semibold text-foreground">{c.code}</p>
                <p className="text-xs text-muted-foreground">
                  {c.discountPct}% off · used {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate(c.id)}
                disabled={deleteMutation.isPending}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </Surface>
      )}
    </div>
  );
};

export default CouponsTab;
