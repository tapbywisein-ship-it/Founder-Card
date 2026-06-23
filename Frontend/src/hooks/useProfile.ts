import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService, UpdateProfilePayload } from '@/services/profile.service';
import { toast } from 'sonner';

export const profileKeys = {
  mine: () => ['profile', 'mine'] as const,
  public: (userId: string) => ['profile', 'public', userId] as const,
};

export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.mine(),
    queryFn: () => profileService.getMyProfile(),
    select: (res) => res.data,
  });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.public(userId),
    queryFn: () => profileService.getPublicProfile(userId),
    select: (res) => res.data,
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => profileService.updateProfile(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profileKeys.mine() });
      toast.success('Profile updated!');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
