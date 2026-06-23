import { apiFetch } from './api';

export interface PayoutEventRow {
  eventId: string;
  title: string;
  sales: number;
  gross: number;
  fee: number;
  earning: number;
}

export interface PayoutSummary {
  totalGross: number;
  platformFee: number;
  totalEarnings: number;
  settled: number;
  pending: number;
  events: PayoutEventRow[];
}

export interface PayoutAccount {
  payoutUpiId?: string | null;
  payoutAccountName?: string | null;
  payoutBankName?: string | null;
  payoutAccountNumber?: string | null;
  payoutIfsc?: string | null;
}

export interface AdminPayoutOrganizer {
  organizerId: string;
  email: string;
  name: string;
  earned: number;
  settled: number;
  pending: number;
  payoutAccount: {
    upiId: string | null;
    accountName: string | null;
    bankName: string | null;
    accountNumber: string | null;
    ifsc: string | null;
  } | null;
}

export const payoutsService = {
  async getMySummary() {
    return apiFetch<{ data: PayoutSummary }>('/payouts/me');
  },

  async updatePayoutAccount(account: PayoutAccount) {
    return apiFetch<{ data: PayoutAccount }>('/users/me/payout-account', {
      method: 'PUT',
      body: JSON.stringify(account),
    });
  },

  async adminList() {
    return apiFetch<{ data: { organizers: AdminPayoutOrganizer[]; recentPayouts: unknown[] } }>(
      '/payouts/admin'
    );
  },

  async settle(organizerId: string, amount: number, reference?: string, note?: string) {
    return apiFetch<{ data: unknown }>('/payouts/admin/settle', {
      method: 'POST',
      body: JSON.stringify({ organizerId, amount, reference, note }),
    });
  },
};
