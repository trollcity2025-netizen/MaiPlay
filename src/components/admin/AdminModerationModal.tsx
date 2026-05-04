import { useState } from 'react'
import { X, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card } from '../ui/card'

interface AdminModerationModalProps {
  video: any
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
}

export function AdminModerationModal({
  video,
  onClose,
  onApprove,
  onReject,
  onDelete,
}: AdminModerationModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return
    setIsDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-2xl border-red-500/30 bg-black/90 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-red-300">Moderation Actions</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Video: {video.title || 'Untitled'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Info */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Creator</span>
                  <span className="text-white">{video.creator?.username || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-yellow-300">{video.moderation_status || 'pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Uploaded</span>
                  <span className="text-white">
                    {video.created_at ? new Date(video.created_at).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={onApprove}
            className="w-full rounded-xl bg-green-600 font-black text-white hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Approve & Make Public
          </Button>

          <Button
            onClick={onReject}
            variant="outline"
            className="w-full rounded-xl border-orange-500/50 text-orange-300 hover:bg-orange-500/20"
          >
            <XCircle className="mr-2 h-5 w-5" />
            Reject Content
          </Button>

          {/* Delete Section */}
          <div className="mt-4 border-t border-red-500/30 pt-4">
            <p className="mb-3 flex items-center gap-2 text-red-300">
              <AlertCircle className="h-4 w-4" />
              Danger Zone: Permanent Action
            </p>

            {!isDeleting ? (
              <>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="mb-3 w-full rounded-lg border border-red-500/30 bg-black/50 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-red-500 focus:outline-none"
                />
                <Button
                  onClick={handleDelete}
                  disabled={confirmText !== 'DELETE'}
                  className="w-full rounded-xl bg-red-600 font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  Delete Permanently from Mux & Database
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-red-300">
                <Trash2 className="h-5 w-5 animate-pulse" />
                Deleting from Mux and database...
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
