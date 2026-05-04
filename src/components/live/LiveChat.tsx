import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Heart, Gift, Pin, Shield, Coins, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthAccount } from '../../auth/AuthAccountProvider'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface LiveChatProps {
  liveSessionId: string
  creatorId: string
  isBroadOfficer?: boolean
}

interface ChatUser {
  id: string
  user_id?: string | null
  username?: string | null
  display_name?: string | null
  avatar_url?: string | null
}

type MessageType = 'standard' | 'chat' | 'gift' | 'system' | 'priority' | 'pinned' | 'moderator' | 'moderation'

interface ChatMessage {
  id: string
  content: string
  message?: string | null
  created_at: string
  user_id?: string | null
  user?: ChatUser | null
  message_type: MessageType
  metadata?: Record<string, any> | null
  is_pinned?: boolean
  is_deleted?: boolean
}

const MAX_MESSAGES = 150

function normalizeMessage(raw: any): ChatMessage {
  const content = raw.content ?? raw.message ?? ''

  return {
    id: raw.id,
    content,
    message: raw.message ?? content,
    created_at: raw.created_at ?? new Date().toISOString(),
    user_id: raw.user_id ?? null,
    user: raw.user ?? null,
    message_type: raw.message_type ?? 'standard',
    metadata: raw.metadata ?? null,
    is_pinned: !!raw.is_pinned,
    is_deleted: !!raw.is_deleted,
  }
}

function getDisplayName(msg: ChatMessage) {
  return msg.user?.display_name || msg.user?.username || 'Mai User'
}

function getInitial(msg: ChatMessage) {
  return getDisplayName(msg).charAt(0).toUpperCase()
}

function formatGiftAmount(value: any) {
  const amount = Number(value || 0)
  if (!amount) return ''
  return `${amount.toLocaleString()} coins`
}

export function LiveChat({
  liveSessionId,
  creatorId,
  isBroadOfficer = false,
}: LiveChatProps) {
  const { user, account } = useAuthAccount()
  const queryClient = useQueryClient()

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isAtBottom, setIsAtBottom] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const currentChatUserId = account?.id || user?.id || null

  const hydrateUsers = useCallback(async (rows: ChatMessage[]) => {
    const ids = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))) as string[]

    if (ids.length === 0) return rows

    const { data: profilesRes } = await supabase
      .from('profiles')
      .select('id,user_id,username,display_name,avatar_url')
      .in('id', ids)

    const users = new Map<string, ChatUser>()

    for (const item of profilesRes ?? []) {
      users.set(item.id, item)
      if (item.user_id) users.set(item.user_id, item)
    }

    if (account) {
      users.set(account.id, {
        id: account.id,
        user_id: user?.id ?? null,
        username: account.username,
        display_name: account.display_name,
        avatar_url: account.avatar_url,
      })
    }

    return rows.map((row) => ({
      ...row,
      user: row.user_id ? users.get(row.user_id) ?? row.user ?? null : row.user ?? null,
    }))
  }, [account, user?.id])

  const appendMessage = useCallback((nextMessage: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((msg) => msg.id === nextMessage.id)) return prev

      const next = [...prev, nextMessage]
        .filter((msg) => !msg.is_deleted)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next
    })
  }, [])

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    setMessages((prev) => {
      const map = new Map<string, ChatMessage>()

      for (const msg of [...prev, ...incoming]) {
        if (!msg.is_deleted) map.set(msg.id, msg)
      }

      const next = Array.from(map.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      )

      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next
    })
  }, [])

  const initialMessagesQuery = useQuery({
    queryKey: ['live-chat-messages', liveSessionId],
    enabled: !!liveSessionId,
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select(
          `
          id,
          live_session_id,
          user_id,
          message,
          content,
          created_at,
          message_type,
          metadata,
          is_pinned,
          is_deleted
        `,
        )
        .eq('live_session_id', liveSessionId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        console.error('[LiveChat] Failed to load messages:', error)
        return []
      }

      const normalized = (data ?? []).reverse().map(normalizeMessage)
      return hydrateUsers(normalized)
    },
  })

  useEffect(() => {
    if (!initialMessagesQuery.data) return
    mergeMessages(initialMessagesQuery.data)
  }, [initialMessagesQuery.data, mergeMessages])

  useEffect(() => {
    if (!liveSessionId) return

    const channel = supabase
      .channel(`live-chat:${liveSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `live_session_id=eq.${liveSessionId}`,
        },
        async (payload) => {
          const [hydrated] = await hydrateUsers([normalizeMessage(payload.new)])
          appendMessage(hydrated)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `live_session_id=eq.${liveSessionId}`,
        },
        async (payload) => {
          const [updated] = await hydrateUsers([normalizeMessage(payload.new)])

          setMessages((prev) => {
            if (updated.is_deleted) return prev.filter((msg) => msg.id !== updated.id)
            return prev.map((msg) => (msg.id === updated.id ? { ...msg, ...updated } : msg))
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `live_session_id=eq.${liveSessionId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id
          if (!deletedId) return
          setMessages((prev) => prev.filter((msg) => msg.id !== deletedId))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [appendMessage, hydrateUsers, liveSessionId])

  useEffect(() => {
    const el = messagesContainerRef.current
    if (!el) return

    const handleScroll = () => {
      const threshold = 80
      setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < threshold)
    }

    el.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!isAtBottom) return

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }, [messages, isAtBottom])

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!currentChatUserId) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('live_chat_messages')
        .insert({
          live_session_id: liveSessionId,
          user_id: currentChatUserId,
          message: content,
          content,
          message_type: 'standard',
          metadata: {},
          is_pinned: false,
          is_deleted: false,
        })
        .select(
          `
          id,
          live_session_id,
          user_id,
          message,
          content,
          created_at,
          message_type,
          metadata,
          is_pinned,
          is_deleted
        `,
        )
        .single()

      if (error) throw error

      const [hydrated] = await hydrateUsers([normalizeMessage(data)])
      return hydrated
    },
    onMutate: async (content) => {
      if (!currentChatUserId) return

      const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        user_id: currentChatUserId,
        content,
        message: content,
        created_at: new Date().toISOString(),
        message_type: 'standard',
        metadata: {},
        is_pinned: false,
        is_deleted: false,
        user: {
          id: currentChatUserId,
          user_id: user?.id ?? null,
          username: account?.username || 'you',
          display_name: account?.display_name || 'You',
          avatar_url: account?.avatar_url || null,
        },
      }

      appendMessage(optimisticMessage)
      return { tempId: optimisticMessage.id }
    },
    onSuccess: (savedMessage, _content, context) => {
      setMessage('')

      setMessages((prev) => {
        const withoutTemp = context?.tempId
          ? prev.filter((msg) => msg.id !== context.tempId)
          : prev

        if (withoutTemp.some((msg) => msg.id === savedMessage.id)) return withoutTemp

        return [...withoutTemp, savedMessage].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
      })
    },
    onError: (error, _content, context) => {
      console.error('[LiveChat] Failed to send message:', error)

      if (context?.tempId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== context.tempId))
      }
    },
  })

  const pinMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!isBroadOfficer) throw new Error('Not authorized')

      const { data, error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: true, message_type: 'pinned' })
        .eq('id', messageId)
        .eq('live_session_id', liveSessionId)
        .select(
          `
          id,
          live_session_id,
          user_id,
          message,
          content,
          created_at,
          message_type,
          metadata,
          is_pinned,
          is_deleted
        `,
        )
        .single()

      if (error) throw error

      const [hydrated] = await hydrateUsers([normalizeMessage(data)])
      return hydrated
    },
    onSuccess: (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg)),
      )

      queryClient.invalidateQueries({
        queryKey: ['live-chat-messages', liveSessionId],
      })
    },
  })

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      if (!isBroadOfficer) throw new Error('Not authorized')

      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('live_session_id', liveSessionId)

      if (error) throw error

      return messageId
    },
    onSuccess: (deletedId) => {
      setMessages((prev) => prev.filter((msg) => msg.id !== deletedId))
    },
    onError: (error) => {
      console.error('[LiveChat] Failed to delete message:', error)
    },
  })

  const handleSendMessage = useCallback(() => {
    const trimmed = message.trim()
    if (!trimmed || sendMessageMutation.isPending || !currentChatUserId) return
    sendMessageMutation.mutate(trimmed)
  }, [currentChatUserId, message, sendMessageMutation])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    handleSendMessage()
  }

  const sortedMessages = useMemo(() => {
    return [...messages].sort(
      (a, b) =>
        Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
  }, [messages])

  const renderMessage = (msg: ChatMessage) => {
    const isOwnMessage = msg.user_id === currentChatUserId || msg.user?.id === currentChatUserId
    const isSystemMessage = msg.message_type === 'system'
    const isGiftMessage = msg.message_type === 'gift'
    const isModeratorMessage = msg.message_type === 'moderator' || msg.message_type === 'moderation'
    const displayName = getDisplayName(msg)
    const giftAmount = msg.metadata?.giftAmount ?? msg.metadata?.amountCoins ?? msg.metadata?.amount

    return (
      <div
        key={msg.id}
        className={`group flex gap-2 rounded-2xl p-3 transition ${
          isSystemMessage
            ? 'border border-blue-500/30 bg-blue-950/20'
            : isGiftMessage
              ? 'border border-yellow-500/30 bg-gradient-to-r from-yellow-500/15 via-red-500/10 to-black/30'
              : isOwnMessage
                ? 'border border-yellow-500/15 bg-yellow-500/10'
                : 'border border-white/10 bg-white/[0.04]'
        } ${msg.is_pinned ? 'ring-2 ring-yellow-500/50' : ''}`}
      >
        <div className="shrink-0">
          {msg.user?.avatar_url ? (
            <img
              src={msg.user.avatar_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/40 to-red-700/50 text-sm font-black text-white">
              {getInitial(msg)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-black text-white">{displayName}</span>

            {msg.is_pinned && <Pin className="h-3 w-3 text-yellow-400" />}
            {isSystemMessage && <Shield className="h-3 w-3 text-blue-400" />}
            {isGiftMessage && <Gift className="h-3 w-3 text-yellow-300" />}
            {isModeratorMessage && <Shield className="h-3 w-3 text-red-400" />}

            <span className="shrink-0 text-xs text-zinc-500">
              {new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {isGiftMessage ? (
            <div className="rounded-xl border border-yellow-400/20 bg-black/30 p-2">
              <div className="flex items-center gap-2 text-sm font-bold text-yellow-100">
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span>{msg.content || 'sent a gift'}</span>
              </div>

              {giftAmount && (
                <div className="mt-1 flex items-center gap-1 text-xs font-black text-yellow-300">
                  <Coins className="h-3 w-3" />
                  {formatGiftAmount(giftAmount)}
                </div>
              )}
            </div>
          ) : (
            <div className="break-words text-sm text-zinc-200">{msg.content}</div>
          )}
        </div>

        {isBroadOfficer && !isSystemMessage && !msg.id.startsWith('temp-') && (
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            {!msg.is_pinned && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-yellow-400 hover:text-yellow-300"
                disabled={pinMessageMutation.isPending}
                onClick={() => pinMessageMutation.mutate(msg.id)}
              >
                <Pin className="h-3 w-3" />
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
              disabled={deleteMessageMutation.isPending}
              onClick={() => deleteMessageMutation.mutate(msg.id)}
            >
              ×
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-[520px] min-h-0 flex-col overflow-hidden rounded-2xl border border-yellow-500/20 bg-black/60 text-white shadow-[0_0_40px_rgba(185,28,28,0.16)] backdrop-blur-xl lg:h-[calc(100vh-7rem)]">
      <div className="border-b border-white/10 bg-gradient-to-r from-black via-red-950/30 to-black p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-white">Live Chat</h3>
            <p className="text-xs text-zinc-500">Talk, gift, react, and support the creator.</p>
          </div>

          {isBroadOfficer && (
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs font-black text-yellow-300">
              BroadOfficer
            </span>
          )}
        </div>
      </div>

      <div ref={messagesContainerRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {initialMessagesQuery.isLoading && messages.length === 0 ? (
          <p className="text-sm text-zinc-400">Loading chat...</p>
        ) : sortedMessages.length > 0 ? (
          sortedMessages.map(renderMessage)
        ) : (
          <p className="text-sm text-zinc-400">No messages yet. Start the conversation.</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-white/10 bg-black/70 p-3">
        {!currentChatUserId ? (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-200">
            Sign in to chat.
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="min-w-0 flex-1 border-white/10 bg-white/5 text-white placeholder:text-zinc-500"
              maxLength={500}
              disabled={sendMessageMutation.isPending}
            />

            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending}
              size="sm"
              className="shrink-0 bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 font-black text-black hover:scale-105"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}