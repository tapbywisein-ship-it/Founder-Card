import { apiFetch } from './api';

export type ReportTargetType = 'USER' | 'EVENT' | 'CONNECTION' | 'COMMENT';
export type ReportCategory =
  | 'SPAM'
  | 'HARASSMENT'
  | 'IMPERSONATION'
  | 'INAPPROPRIATE'
  | 'OTHER';
export type ReportStatus = 'OPEN' | 'REVIEWING' | 'ACTIONED' | 'DISMISSED';
export type AdminAction =
  | 'DISMISS'
  | 'ACTION_USER_BAN'
  | 'ACTION_USER_WARN'
  | 'ACTION_EVENT_REMOVE'
  | 'MARK_REVIEWING';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategory;
  reason: string;
  status: ReportStatus;
  reviewerId: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  reporter?: {
    id: string;
    email: string;
    profile?: { firstName: string; lastName: string; avatar: string | null } | null;
  };
  reviewer?: {
    id: string;
    email: string;
    profile?: { firstName: string; lastName: string } | null;
  } | null;
}

export const reportsService = {
  async fileReport(input: {
    targetType: ReportTargetType;
    targetId: string;
    category: ReportCategory;
    reason: string;
  }) {
    return apiFetch<{ data: Report }>('/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async listAdmin(params: { status?: ReportStatus; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return apiFetch<{ data: Report[]; pagination: unknown }>(`/reports/admin${query}`);
  },

  async actionAdmin(reportId: string, action: AdminAction, resolution?: string) {
    return apiFetch<{ data: Report }>(`/reports/admin/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, resolution }),
    });
  },
};
