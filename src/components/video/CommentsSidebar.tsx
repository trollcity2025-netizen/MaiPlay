import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Send } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { VideoComment } from '../../types'

interface CommentsSidebarProps {
  videoId: string
}

export function CommentsSidebar({ videoId }: CommentsSidebarProps) {
  const [newComment, setNewComment] = useState('')

  const { data: comments } = useQuery({
    queryKey: ['comments', videoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_comments')
        .select(`*, profiles:user_id(*)`)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as VideoComment[]
    },
    enabled: !!videoId
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !newComment) return

    await supabase.from('video_comments').insert({
      video_id: videoId,
      user_id: user.id,
      content: newComment
    })
    setNewComment('')
  }

  return (
    <div className="bg-surface rounded-lg p-4 h-[500px] flex flex-col">
      <h3 className="font-bold mb-4">Comments</h3>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {comments?.map(comment => (
          <div key={comment.id} className="text-sm">
            <span className="font-semibold text-primary-green">
              {comment.profiles?.username}:
            </span>{' '}
            {comment.content}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}