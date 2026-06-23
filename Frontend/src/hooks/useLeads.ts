import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsService } from '@/services/leads.service';
import { toast } from 'sonner';

export const leadKeys = {
  list: (params?: object) => ['leads', 'list', params] as const,
};

export function useLeads(params: { status?: string; eventId?: string; search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: leadKeys.list(params),
    queryFn: () => leadsService.getLeads(params),
    select: (res) => res,
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, status, notes }: { leadId: string; status: string; notes?: string }) =>
      leadsService.updateLeadStatus(leadId, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
