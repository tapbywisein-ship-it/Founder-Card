import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { founderCardService } from '@/services/founderCard.service';
import { toast } from 'sonner';

export const cardKeys = {
  mine: () => ['founder-card', 'mine'] as const,
  public: (userId: string) => ['founder-card', 'public', userId] as const,
};

export function useMyCard() {
  return useQuery({
    queryKey: cardKeys.mine(),
    queryFn: () => founderCardService.getMyCard(),
    select: (res) => res.data,
  });
}

export function usePublicCard(userId: string) {
  return useQuery({
    queryKey: cardKeys.public(userId),
    queryFn: () => founderCardService.getPublicCard(userId),
    select: (res) => res.data,
    enabled: !!userId,
  });
}

export function useApplyForCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => founderCardService.applyForCard(message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cardKeys.mine() });
      toast.success('Application submitted! We\'ll review it shortly.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
