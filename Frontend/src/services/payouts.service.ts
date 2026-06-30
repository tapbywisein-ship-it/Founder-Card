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
  totalEarnings: number;
  transferred: number;
  pending: number;
  platformFee: number;
  events: PayoutEventRow[];
}

export interface RouteAccount {
  razorpayAccountId: string | null;
  razorpayAccountStatus: string | null;
  payoutAccountName: string | null;
  payoutBankName: string | null;
  payoutAccountNumber: string | null;
  payoutIfsc: string | null;
}

export interface RecentTransfer {
  id: string;
  amount: number;
  organizerEarning: number | null;
  transferStatus: string | null;
  transferAmount: number | null;
  transferredAt: string | null;
  createdAt: string;
  event: { id: string; title: string };
}

export interface OnboardingInput {
  legalBusinessName: string;
  pan: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  beneficiaryName: string;
  accountNumber: string;
  ifscCode: string;
}

export const payoutsService = {
  async getRouteAccount() {
    return apiFetch<{
      data: {
        account: RouteAccount | null;
        summary: PayoutSummary;
        recentTransfers: RecentTransfer[];
      };
    }>('/organizer/payouts/account');
  },

  async onboard(input: OnboardingInput) {
    return apiFetch<{ data: { accountId: string; status: string } }>(
      '/organizer/payouts/onboard',
      { method: 'POST', body: JSON.stringify(input) }
    );
  },

  async refreshStatus() {
    return apiFetch<{ data: { status: string } }>(
      '/organizer/payouts/refresh-status',
      { method: 'POST' }
    );
  },
};
