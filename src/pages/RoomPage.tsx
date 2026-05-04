import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Send } from 'lucide-react'
import { useState } from 'react'
import type { Profile, RoomMessage } from '../types'
import { AppHeader } from '../components/layout/AppHeader'
import { DEFAULT_AVATAR } from '../config/placeholders'

export function RoomPage() {
  const { creatorId } = useParams<{ creatorId: string }>()
  const [message, setMessage] = useState('')

  const { data: creator } = useQuery({
    queryKey: ['profile', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creatorId)
        .single()
      if (error) throw error
      return data as Profile
    }
  })

  const { data: messages } = useQuery({
    queryKey: ['room-messages', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('room_messages')
        .select(`*, profiles:user_id(*)`)
        .eq('room_id', creatorId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as RoomMessage[]
    }
  })

  const sendMessage = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !message) return

    await supabase.from('room_messages').insert({
      room_id: creatorId,
      user_id: user.id,
      content: message
    })
    setMessage('')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 bg-surface border-r border-border">
          <div className="p-4">
            <h2 className="font-bold text-lg mb-4">Rooms</h2>
            {creator && (
              <div className="flex items-center gap-3 p-2 bg-primary-green/10 rounded-lg">
                 <img 
                   src={creator.avatar_url || DEFAULT_AVATAR} 
                   alt={creator.username}
                   className="w-10 h-10 rounded-full"
                 />
                <div>
                  <p className="font-semibold">{creator.display_name}</p>
                  <p className="text-xs text-gray-400">Live now</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <header className="bg-surface border-b border-border p-4">
            <h1 className="font-bold">{creator?.display_name || 'Creator'} Room</h1>
          </header>

          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {messages?.map(msg => (
                <div key={msg.id} className="text-sm">
                  <span className="font-semibold text-primary-green">
                    {msg.profiles?.username}:
                  </span>{' '}
                  {msg.content}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}