import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { messagesService } from '@/services/messages.service';

export const messageKeys = {
  conversations: () => ['messages', 'list'] as const,
  conversation: (id: string) => ['messages', 'thread', id] as const,
  unread: () => ['messages', 'unread'] as const,
};

export function useConversations() {
  return useQuery({
    queryKey: messageKeys.conversations(),
    queryFn: () => messagesService.listConversations(),
    select: (res) => res.data,
    // Socket drives instant updates via refetchQueries on message:new.
    // Keep a long fallback poll only for tab-switch / reconnect recovery.
    refetchInterval: 60_000,
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: conversationId ? messageKeys.conversation(conversationId) : ['messages', 'thread', 'noop'],
    queryFn: () => messagesService.listMessages(conversationId!),
    select: (res) => res.data,
    enabled: !!conversationId,
    refetchInterval: 5_000,
  });
}

export function useStartConversation() {
  return useMutation({
    mutationFn: (targetUserId: string) => messagesService.startConversation(targetUserId),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSendMessage(conversationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => messagesService.send(conversationId!, body),
    onSuccess: () => {
      if (conversationId) {
        qc.invalidateQueries({ queryKey: messageKeys.conversation(conversationId) });
      }
      qc.invalidateQueries({ queryKey: messageKeys.conversations() });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId: string) => messagesService.markRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: messageKeys.conversations() });
      qc.invalidateQueries({ queryKey: messageKeys.unread() });
    },
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: messageKeys.unread(),
    queryFn: () => messagesService.unreadCount(),
    select: (res) => res.data.count,
    // Socket refetches this on every message:new event.
    refetchInterval: 60_000,
  });
}
