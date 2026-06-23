import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '@/services/api';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:3000';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

/** Hook: connect on mount, disconnect on unmount, invalidate notifications on new notification */
export function useSocket() {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const s = connectSocket();
    socketRef.current = s;

    s.on('connect', () => {
      // socket connected
    });

    s.on('notification:new', (notif: { title: string; message: string }) => {
      // Invalidate notification queries so the badge/list refreshes
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.info(notif.title, { description: notif.message });
    });

    const onMessage = (payload: { conversationId: string }) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      qc.invalidateQueries({ queryKey: ['conversation', payload.conversationId] });
      qc.invalidateQueries({ queryKey: ['messages', 'unread'] });
    };
    s.on('message:new', onMessage);
    s.on('message:sent', onMessage);

    s.on('connect_error', () => {
      // Silently handle — socket is optional
    });

    return () => {
      s.off('notification:new');
      s.off('message:new', onMessage);
      s.off('message:sent', onMessage);
    };
  }, [qc]);

  return socketRef.current;
}
