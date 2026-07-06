import { io, Socket } from 'socket.io-client';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string) || 'http://localhost:3000';

let socket: Socket | null = null;

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await getToken();
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

export function useSocket() {
  const qc = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let mounted = true;

    getToken().then((token) => {
      if (!token || !mounted) return;

      connectSocket().then((s) => {
        if (!mounted) return;
        socketRef.current = s;

        // Notifications — refetch active queries immediately so badge updates now,
        // not after the 30-60s polling interval.
        s.on('notification:new', (notif: { title: string; message: string }) => {
          qc.refetchQueries({ queryKey: ['notifications'], type: 'active' });
          toast.info(notif.title, { description: notif.message });
        });

        // Messages — refetch active conversation + list so chat updates instantly.
        const onMessage = (payload: { conversationId: string }) => {
          qc.refetchQueries({ queryKey: ['messages', 'list'], type: 'active' });
          qc.refetchQueries({ queryKey: ['messages', 'thread', payload.conversationId], type: 'active' });
          qc.refetchQueries({ queryKey: ['messages', 'unread'], type: 'active' });
        };
        s.on('message:new', onMessage);
        s.on('message:sent', onMessage);

        // Connections — refetch every connections query (requests, sent, list,
        // suggestions) whenever the other party sends / accepts / declines /
        // cancels, so both sides stay in sync with no manual refresh.
        const onConnection = () => {
          qc.refetchQueries({ queryKey: ['connections'], type: 'active' });
        };
        s.on('connection:request', onConnection);
        s.on('connection:accepted', onConnection);
        s.on('connection:rejected', onConnection);
        s.on('connection:withdrawn', onConnection);

        // Re-fetch unread counts when socket reconnects in case events were missed.
        s.on('connect', () => {
          qc.refetchQueries({ queryKey: ['notifications', 'unread-count'], type: 'active' });
          qc.refetchQueries({ queryKey: ['messages', 'unread'], type: 'active' });
        });
      });
    });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.off('notification:new');
        socketRef.current.off('message:new');
        socketRef.current.off('message:sent');
        socketRef.current.off('connection:request');
        socketRef.current.off('connection:accepted');
        socketRef.current.off('connection:rejected');
        socketRef.current.off('connection:withdrawn');
        socketRef.current.off('connect');
      }
    };
  }, [qc]);

  return socketRef.current;
}
