import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { blocksService } from '@/services/blocks.service';

export const blockKeys = {
  list: () => ['blocks', 'list'] as const,
};

export function useBlockedUsers() {
  return useQuery({
    queryKey: blockKeys.list(),
    queryFn: () => blocksService.list(),
    select: (res) => res.data,
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blocksService.block(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blockKeys.list() });
      qc.invalidateQueries({ queryKey: ['connections'] });
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('User blocked');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blocksService.unblock(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: blockKeys.list() });
      toast.success('User unblocked');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
