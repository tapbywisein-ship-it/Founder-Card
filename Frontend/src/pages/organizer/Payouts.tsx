import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Wallet, Clock, CheckCircle2, Percent } from 'lucide-react';
import { OrganizerLayout } from '@/components/OrganizerLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { payoutsService, type PayoutAccount } from '@/services/payouts.service';
import { useMyProfile } from '@/hooks/useProfile';
import { formatINR } from '@/lib/currency';

const Payouts = () => {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['payouts', 'me'],
    queryFn: () => payoutsService.getMySummary(),
    select: (r) => r.data,
  });
  const { data: profileData } = useMyProfile();

  const [acct, setAcct] = useState<PayoutAccount>({});
  useEffect(() => {
    const p = profileData?.profile as PayoutAccount | undefined;
    if (p) {
      setAcct({
        payoutUpiId: p.payoutUpiId ?? '',
        payoutAccountName: p.payoutAccountName ?? '',
        payoutBankName: p.payoutBankName ?? '',
        payoutAccountNumber: p.payoutAccountNumber ?? '',
        payoutIfsc: p.payoutIfsc ?? '',
      });
    }
  }, [profileData]);

  const saveAcct = useMutation({
    mutationFn: () => payoutsService.updatePayoutAccount(acct),
    onSuccess: () => toast.success('Payout account saved'),
    onError: (e: Error) => toast.error(e.message),
  });

  const stat = (label: string, value: string, Icon: typeof Wallet, accent = 'text-foreground') => (
    <Surface className="text-center py-6">
      <Icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Surface>
  );

  return (
    <OrganizerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Payouts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your ticket earnings after platform fees. Settlements are paid out to the account below.
          </p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8">Loading earnings…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stat('Net earnings', formatINR(summary?.totalEarnings ?? 0), Wallet)}
              {stat('Pending payout', formatINR(summary?.pending ?? 0), Clock, 'text-amber-600')}
              {stat('Settled', formatINR(summary?.settled ?? 0), CheckCircle2, 'text-emerald-600')}
              {stat('Platform fee', formatINR(summary?.platformFee ?? 0), Percent, 'text-muted-foreground')}
            </div>

            <Surface>
              <h2 className="text-lg font-semibold text-foreground mb-3">Earnings by event</h2>
              {(summary?.events ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No paid ticket sales yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="py-2">Event</th>
                        <th className="py-2 text-right">Sales</th>
                        <th className="py-2 text-right">Gross</th>
                        <th className="py-2 text-right">Fee</th>
                        <th className="py-2 text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary!.events.map((e) => (
                        <tr key={e.eventId} className="border-b border-border/60">
                          <td className="py-2 text-foreground">{e.title}</td>
                          <td className="py-2 text-right">{e.sales}</td>
                          <td className="py-2 text-right">{formatINR(e.gross)}</td>
                          <td className="py-2 text-right text-muted-foreground">−{formatINR(e.fee)}</td>
                          <td className="py-2 text-right font-medium text-foreground">{formatINR(e.earning)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Surface>

            <Surface>
              <h2 className="text-lg font-semibold text-foreground mb-1">Payout account</h2>
              <p className="text-xs text-muted-foreground mb-4">Where we send your settlements. UPI is fastest.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>UPI ID</Label>
                  <Input value={acct.payoutUpiId ?? ''} onChange={(e) => setAcct({ ...acct, payoutUpiId: e.target.value })} placeholder="name@bank" />
                </div>
                <div className="space-y-1.5">
                  <Label>Account holder name</Label>
                  <Input value={acct.payoutAccountName ?? ''} onChange={(e) => setAcct({ ...acct, payoutAccountName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bank name</Label>
                  <Input value={acct.payoutBankName ?? ''} onChange={(e) => setAcct({ ...acct, payoutBankName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Account number</Label>
                  <Input value={acct.payoutAccountNumber ?? ''} onChange={(e) => setAcct({ ...acct, payoutAccountNumber: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>IFSC</Label>
                  <Input value={acct.payoutIfsc ?? ''} onChange={(e) => setAcct({ ...acct, payoutIfsc: e.target.value })} />
                </div>
              </div>
              <Button className="mt-4" onClick={() => saveAcct.mutate()} disabled={saveAcct.isPending}>
                {saveAcct.isPending ? 'Saving…' : 'Save payout account'}
              </Button>
            </Surface>
          </>
        )}
      </div>
    </OrganizerLayout>
  );
};

export default Payouts;
