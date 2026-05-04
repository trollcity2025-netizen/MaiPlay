import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useAuthAccount } from '../auth/AuthAccountProvider'

export function MessagesPage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthAccount()
  const [messageText, setMessageText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: authSession } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error
      return data.user
    },
    enabled: Boolean(user),
  })

  const { data: currentAccount } = useQuery({
    queryKey: ['mai-account', authSession?.id],
    queryFn: async () => {
      if (!authSession?.id) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('user_id', authSession.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(authSession?.id),
  })

  const { data: recipient } = useQuery({
    queryKey: ['message-recipient', username],
    queryFn: async () => {
      if (!username) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name')
        .eq('username', username)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(username),
  })

  const { data: activeVipPerk } = useQuery({
    queryKey: ['user-perk', authSession?.id],
    queryFn: async () => {
      if (!authSession?.id) return null
      const { data, error } = await supabase
        .from('user_perks')
        .select('id, perk_name, expires_at')
        .eq('user_id', authSession.id)
        .eq('perk_key', 'mai_vip_offline_monthly')
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: Boolean(authSession?.id),
  })

  const hasVipChat = Boolean(activeVipPerk)

  const { data: messages } = useQuery({
    queryKey: ['direct-messages', currentAccount?.id, recipient?.id],
    queryFn: async () => {
      if (!currentAccount?.id || !recipient?.id) return []

      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, recipient_id, message, created_at, sender:sender_id (id, username, display_name), recipient:recipient_id (id, username, display_name)')
        .or(`and(sender_id.eq.${currentAccount.id},recipient_id.eq.${recipient.id}),and(sender_id.eq.${recipient.id},recipient_id.eq.${currentAccount.id})`)
        .order('created_at', { ascending: true })

      if (error) throw error
      return data ?? []
    },
    enabled: Boolean(currentAccount?.id && recipient?.id),
  })

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!currentAccount?.id || !recipient?.id) {
        throw new Error('Unable to send message yet.')
      }

      if (!messageText.trim()) {
        throw new Error('Enter a message to send.')
      }

      const { error } = await supabase.from('direct_messages').insert({
        sender_id: currentAccount.id,
        recipient_id: recipient.id,
        message: messageText.trim(),
      })

      if (error) throw error
    },
    onSuccess: () => {
      setMessageText('')
      setErrorMessage(null)
      queryClient.invalidateQueries(['direct-messages', currentAccount?.id, recipient?.id])
    },
    onError: (error: any) => {
      setErrorMessage(error?.message || 'Failed to send message.')
    },
  })

  const { data: suggestedCreators } = useQuery({
    queryKey: ['suggested-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('is_creator', true)
        .limit(8)
      if (error) throw error
      return data ?? []
    },
    enabled: !username,
  })

  const recipientName = recipient?.username || username || 'Creator'
  const chatTitle = username ? `Chat with @${recipientName}` : 'Messages'
  const chatIntro = username
    ? `Send a direct creator message${hasVipChat ? '' : ' after purchasing VIP Creator DMs.'}`
    : 'Select a creator to message or unlock VIP Creator DMs in the store.'

  const canSendMessage = Boolean(username && hasVipChat && recipient?.id)

  return (
    <div className="min-h-screen bg-background text-white">
      <AppHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-yellow-400/20 bg-black/60 p-6 shadow-2xl shadow-yellow-950/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black">{chatTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">{chatIntro}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/store')}>
                Buy VIP DMs
              </Button>
              <Button variant="outline" onClick={() => navigate('/watch-later')}>
                My Offline Vault
              </Button>
            </div>
          </div>

          {!username && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(suggestedCreators || []).map((creator: any) => (
                <Link
                  key={creator.username}
                  to={`/messages/${creator.username}`}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-yellow-400/30 hover:bg-yellow-400/10"
                >
                  <p className="font-black text-yellow-300">@{creator.username}</p>
                  <p className="mt-1 text-sm text-zinc-400">{creator.display_name || 'Creator'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {username ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <section className="rounded-[2rem] border border-white/10 bg-black/55 p-6 shadow-2xl shadow-yellow-950/10">
              {hasVipChat ? (
                <>
                  <div className="mb-4 max-h-[540px] overflow-y-auto rounded-2xl border border-white/10 bg-black/70 p-4">
                    {(messages || []).length > 0 ? (
                      messages.map((message: any) => {
                        const isOutgoing = message.sender_id === currentAccount?.id
                        return (
                          <div
                            key={message.id}
                            className={`mb-3 rounded-2xl p-4 ${isOutgoing ? 'bg-yellow-400/10 text-white self-end' : 'bg-white/5 text-zinc-200'}`}
                          >
                            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.24em] text-zinc-500">
                              <span>{isOutgoing ? 'You' : `@${message.sender?.username || recipient?.username}`}</span>
                              <span>·</span>
                              <span>{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p>{message.message}</p>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-zinc-400">No messages yet. Start the conversation.</p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {errorMessage && (
                      <p className="text-sm text-red-300">{errorMessage}</p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <Input
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[52px] rounded-2xl border-yellow-400/20 bg-black/60 text-white placeholder:text-zinc-500"
                      />
                      <Button
                        disabled={!canSendMessage || sendMessageMutation.isLoading}
                        onClick={() => sendMessageMutation.mutate()}
                        className="h-14 rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300"
                      >
                        Send
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-6 text-zinc-200">
                  <h2 className="text-xl font-black text-yellow-300">VIP Creator DMs Required</h2>
                  <p className="mt-3 text-sm text-zinc-400">
                    Unlock the VIP Creator DMs perk in the Mai Store to message creators directly. Perks last 30 days and include offline download access.
                  </p>
                  <Button
                    className="mt-5 rounded-2xl bg-yellow-400 font-black text-black hover:bg-yellow-300"
                    onClick={() => navigate('/store')}
                  >
                    Unlock VIP Creator DMs
                  </Button>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-white/10 bg-black/55 p-6 shadow-2xl shadow-yellow-950/10">
                <h2 className="text-xl font-black text-yellow-300">Creator Chat Rules</h2>
                <ul className="mt-4 space-y-3 text-sm text-zinc-400">
                  <li>• VIP chat access is valid for 30 days per purchase.</li>
                  <li>• Message up to 5 creators monthly with active access.</li>
                  <li>• Creators can pause DMs at any time for safety and boundaries.</li>
                  <li>• Offline downloads are included with the VIP perk.</li>
                </ul>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-black/55 p-6 shadow-2xl shadow-yellow-950/10">
                <h2 className="text-xl font-black text-yellow-300">Need Support?</h2>
                <p className="mt-3 text-sm text-zinc-400">
                  If your chat fails or you need creator support, open an admin ticket or contact support from your profile menu.
                </p>
                <Button
                  variant="outline"
                  className="mt-5 border-yellow-400/30 text-yellow-300"
                  onClick={() => navigate('/admin/support')}
                >
                  Open Support Ticket
                </Button>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-black/55 p-6 shadow-2xl shadow-yellow-950/10">
            <p className="text-sm text-zinc-400">
              Select a creator from the list above to begin a paid VIP creator chat once you unlock access.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
