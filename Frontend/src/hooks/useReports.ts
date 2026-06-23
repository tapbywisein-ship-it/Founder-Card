import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  reportsService,
  type AdminAction,
  type ReportStatus,
} from '@/services/reports.service';

const reportKeys = {
  list: (filters: { status?: ReportStatus }) => ['reports', 'admin', filters] as const,
};

export function useAdminReports(filters: { status?: ReportStatus } = {}) {
  return useQuery({
    queryKey: reportKeys.list(filters),
    queryFn: () => reportsService.listAdmin(filters),
    select: (res) => ({ reports: res.data, pagination: res.pagination }),
    staleTime: 30_000,
  });
}

export function useActionReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      action,
      resolution,
    }: {
      reportId: string;
      action: AdminAction;
      resolution?: string;
    }) => reportsService.actionAdmin(reportId, action, resolution),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports', 'admin'] });
      toast.success('Report actioned');
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not action report'),
  });
}
