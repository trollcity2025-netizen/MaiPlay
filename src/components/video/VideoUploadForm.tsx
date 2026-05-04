import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Upload, AlertCircle, CheckCircle } from 'lucide-react'

interface VideoUploadFormProps {
  onUploadComplete?: (videoId: string) => void
  uploadType?: 'short' | 'music-video' | 'movie'
}

type UploadStatus = 'idle' | 'creating' | 'uploading' | 'processing' | 'error' | 'success'

interface CreateMuxUploadResponse {
  uploadId: string
  uploadUrl: string
}

export function VideoUploadForm({ onUploadComplete, uploadType = 'short' }: VideoUploadFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const resolvedVideoType =
    uploadType === 'music-video' ? 'music_video' :
    uploadType === 'movie' ? 'movie' :
    'short'

  const maxSize =
    uploadType === 'short'
      ? 500 * 1024 * 1024
      : 4 * 1024 * 1024 * 1024

  const maxSizeLabel = uploadType === 'short' ? '500MB' : '4GB'

  const createMuxUpload = async (): Promise<CreateMuxUploadResponse> => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('You must be signed in to upload a video.')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mux-upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        category,
        video_type: resolvedVideoType,
        type: resolvedVideoType,
      }),
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.message || data?.error || 'Failed to create Mux upload.')
    }

    const uploadId = data?.upload_id ?? data?.uploadId
    const uploadUrl = data?.upload_url ?? data?.uploadUrl

    if (!uploadId || !uploadUrl) {
      throw new Error('Mux upload URL was not returned.')
    }

    return { uploadId, uploadUrl }
  }

  const uploadFileToMux = async (muxUploadUrl: string): Promise<void> => {
    if (!file) {
      throw new Error('No video file selected.')
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100))
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
          return
        }

        reject(new Error(`Mux upload failed with status ${xhr.status}.`))
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error while uploading to Mux.'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled.'))
      })

      xhr.open('PUT', muxUploadUrl)
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')
      xhr.send(file)
    })
  }

   const handleSubmit = async (event: React.FormEvent) => {
     event.preventDefault()

     if (!title.trim()) {
       setError('Title is required.')
       return
     }

     if (!category) {
       setError('Category is required.')
       return
     }

     if (!file) {
       setError('Video file is required.')
       return
     }

     setLoading(true)
     setError(null)
     setProgress(0)

     try {
       setStatus('creating')
       const { uploadId, uploadUrl } = await createMuxUpload()

       setStatus('uploading')
       await uploadFileToMux(uploadUrl)

       setProgress(100)
       setStatus('processing')

       // Insert into appropriate table based on uploadType
       let videoData: any = null
       const { data: { user } } = await supabase.auth.getUser()
       const { data: profile } = await supabase
         .from('profiles')
         .select('id')
         .eq('user_id', user.id)
         .single()

       if (!profile?.id) {
         throw new Error('Creator profile not found.')
       }

       const insertData = {
         creator_id: profile.id,
         title: title.trim(),
         description: description.trim() || null,
         category,
         // Mux fields (will be populated after upload completes)
         mux_upload_id: uploadId,
       }

       if (uploadType === 'short') {
         const { data, error } = await supabase
           .from('shorts')
           .insert(insertData)
           .select()
           .single()

         if (error) throw error
         videoData = data
       } else if (uploadType === 'movie') {
         const { data, error } = await supabase
           .from('movies')
           .insert(insertData)
           .select()
           .single()

         if (error) throw error
         videoData = data
       } else if (uploadType === 'music-video') {
         // Music videos also go to shorts table for now
         const { data, error } = await supabase
           .from('shorts')
           .insert(insertData)
           .select()
           .single()

         if (error) throw error
         videoData = data
       }

       onUploadComplete?.(videoData.id)
     } catch (err) {
       console.error('Video upload failed:', err)
       setError(err instanceof Error ? err.message : 'Upload failed.')
       setStatus('error')
     } finally {
       setLoading(false)
     }
   }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]

    if (!selectedFile) return

    if (selectedFile.size > maxSize) {
      setFile(null)
      setError(`File too large. Max: ${maxSizeLabel}.`)
      return
    }

    setFile(selectedFile)
    setError(null)
    setStatus('idle')
    setProgress(0)
  }

  if (status === 'processing') {
    return (
      <div className="rounded-2xl border border-yellow-400/20 bg-black/40 p-8 text-center">
        <CheckCircle className="mx-auto mb-4 h-10 w-10 text-yellow-400" />
        <h3 className="mb-2 text-xl font-black text-white">Upload Complete</h3>
        <p className="text-sm text-zinc-400">
          Your video has been sent to Mux and is now processing.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-semibold text-zinc-300">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Enter video title"
          className="w-full rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-yellow-400"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-semibold text-zinc-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Video description"
          rows={3}
          className="w-full rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-yellow-400"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-semibold text-zinc-300">
          Category *
        </label>
        <select
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-yellow-400/20 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-yellow-400"
          required
          disabled={loading}
        >
          <option value="">Select category</option>
          <option value="music">Music</option>
          <option value="cars">Cars</option>
          <option value="business">Business</option>
          <option value="gaming">Gaming</option>
          <option value="education">Education</option>
          <option value="entertainment">Entertainment</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-zinc-300">
          Video File *
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={loading}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-yellow-400/30 bg-yellow-400/5 px-6 py-8 text-center transition hover:border-yellow-400/60 hover:bg-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          <Upload className="mx-auto mb-3 h-9 w-9 text-yellow-400" />
          <p className="text-sm font-bold text-yellow-300">
            {file ? file.name : 'Click to select video file'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            MP4 or video file up to {maxSizeLabel}
          </p>
        </button>
      </div>

      {status === 'creating' && (
        <div className="flex items-center gap-2 text-sm text-yellow-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Creating secure Mux upload...
        </div>
      )}

      {status === 'uploading' && (
        <div>
          <div className="mb-2 flex justify-between text-sm text-zinc-300">
            <span>Uploading to Mux...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full rounded-xl bg-gradient-to-r from-yellow-400 to-red-500 py-3 font-black text-black transition hover:from-yellow-300 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </span>
        ) : (
          'Upload Video'
        )}
      </button>
    </form>
  )
}