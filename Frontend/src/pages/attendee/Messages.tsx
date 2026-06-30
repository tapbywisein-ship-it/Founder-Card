import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { ArrowLeft, MessageSquare, Send, Check, CheckCheck } from 'lucide-react';
import { AppLayout } from '@/components/AppLayout';
import { Surface } from '@/components/Surface';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/appStore';
import { requireVerifiedEmail } from '@/components/VerifyEmailBanner';
import {
  useConversation,
  useConversations,
  useMarkRead,
  useSendMessage,
} from '@/hooks/useMessages';
import type { ConversationItem } from '@/services/messages.service';

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'p');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
};

const otherName = (c: ConversationItem) => {
  const p = c.otherUser.profile;
  return p ? `${p.firstName} ${p.lastName}`.trim() : c.otherUser.email;
};

const MessagesPage = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const me = useAppStore((s) => s.user);
  const { data: convos = [], isLoading } = useConversations();
  const { data: messages = [] } = useConversation(id);
  const send = useSendMessage(id);
  const markRead = useMarkRead();
  const [draft, setDraft] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom on new messages — immediate on own send, smooth on receive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Auto-mark read whenever the active thread changes.
  useEffect(() => {
    if (id) markRead.mutate(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Simulate typing indicator: show for 2s after each incoming message from other user
  const lastMsg = messages[messages.length - 1];
  useEffect(() => {
    if (!lastMsg || lastMsg.senderId === me?.id) return;
    setIsTyping(false);
  }, [lastMsg, me?.id]);

  const handleDraftChange = useCallback((v: string) => {
    setDraft(v);
    // show "typing" feedback to self (local only — no backend event needed for MVP)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (v.trim()) {
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 2000);
    }
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = draft.trim();
    if (!v || !id) return;
    if (!requireVerifiedEmail(me)) return;
    send.mutate(v, {
      onSuccess: () => { setDraft(''); bottomRef.current?.scrollIntoView({ behavior: 'instant' }); },
    });
  };

  const activeConvo = convos.find((c) => c.id === id);

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-12rem)] gap-4 pb-24 md:pb-8">
        {/* Sidebar */}
        <aside
          className={`${
            id ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 shrink-0 flex-col rounded-card border border-border bg-card`}
        >
          <div className="border-b border-border p-3">
            <h1 className="text-lg font-semibold text-foreground">
              <MessageSquare className="mr-1.5 inline h-4 w-4" /> Messages
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            )}
            {!isLoading && convos.length === 0 && (
              <div className="p-6 text-center">
                <p className="text-sm font-medium text-foreground">No messages yet</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">
                  You can message founders once you're connected.
                </p>
                <Button size="sm" variant="outline" onClick={() => navigate('/connections')}>
                  View connections
                </Button>
              </div>
            )}
            {convos.map((c) => {
              const name = otherName(c);
              const initial = name.charAt(0).toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/messages/${c.id}`)}
                  className={`flex w-full items-center gap-3 border-b border-border/60 p-3 text-left transition-colors hover:bg-secondary ${
                    c.id === id ? 'bg-secondary' : ''
                  }`}
                >
                  {c.otherUser.profile?.avatar ? (
                    <img
                      src={c.otherUser.profile.avatar}
                      alt={name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                      {initial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {name}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTimestamp(c.lastMessageAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.lastMessage
                        ? `${c.lastMessage.isMine ? 'You: ' : ''}${c.lastMessage.body}`
                        : 'No messages yet'}
                    </p>
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={`${
            id ? 'flex' : 'hidden md:flex'
          } flex-1 flex-col rounded-card border border-border bg-card`}
        >
          {!id && (
            <div className="flex flex-1 items-center justify-center">
              <Surface className="text-center" padding="lg">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Pick a conversation from the left to start chatting.
                </p>
              </Surface>
            </div>
          )}

          {id && (
            <>
              <div className="flex items-center gap-2 border-b border-border p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => navigate('/messages')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                {activeConvo && (
                  <button
                    onClick={() => navigate(`/card/${activeConvo.otherUser.id}`)}
                    className="flex items-center gap-2 text-left"
                  >
                    {activeConvo.otherUser.profile?.avatar ? (
                      <img
                        src={activeConvo.otherUser.profile.avatar}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                        {otherName(activeConvo).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {otherName(activeConvo)}
                      </p>
                      {activeConvo.otherUser.profile?.position && (
                        <p className="text-xs text-muted-foreground">
                          {activeConvo.otherUser.profile.position}
                        </p>
                      )}
                    </div>
                  </button>
                )}
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m, idx) => {
                  const mine = m.senderId === me?.id;
                  const isLast = idx === messages.length - 1;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                          mine
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.body}</p>
                        <div className={`mt-1 flex items-center gap-1 justify-end text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          <span>{format(new Date(m.createdAt), 'p')}</span>
                          {mine && isLast && (
                            m.readAt
                              ? <CheckCheck className="w-3 h-3" />
                              : <Check className="w-3 h-3 opacity-60" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-2xl px-4 py-3 flex items-center gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={submit} className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit(e as unknown as FormEvent);
                      }
                    }}
                    rows={1}
                    placeholder="Write a message…"
                    className="min-h-[2.5rem] flex-1 resize-none"
                  />
                  <Button type="submit" disabled={!draft.trim() || send.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </AppLayout>
  );
};

export default MessagesPage;
