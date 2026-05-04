import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Album,
  Film,
  ImagePlus,
  Loader2,
  Music,
  Plus,
  Trash2,
  Upload,
  Video,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Card } from '../../components/ui/card'

type UploadType = 'music' | 'short' | 'music_video' | 'movie'
type UploadTypeInput = UploadType | 'music-video'
type MusicMode = 'single' | 'album'

type AlbumTrack = {
  file: File
  title: string
}

const COVER_BUCKET = 'music-covers'
const MUSIC_BUCKET = 'music-files'

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase()
}

function stripExtension(name: string) {
  return name.replace(/\.[^/.]+$/, '')
}

function normalizeUploadType(value: UploadTypeInput | null): UploadType {
  if (value === 'short') return 'short'
  if (value === 'music_video' || value === 'music-video') return 'music_video'
  if (value === 'movie') return 'movie'
  return 'music'
}

type UploadVideoProps = {
  fixedType?: UploadTypeInput
}

export function UploadVideo({ fixedType }: UploadVideoProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [uploadType, setUploadType] = useState<UploadType>(
    fixedType ? normalizeUploadType(fixedType) : normalizeUploadType(searchParams.get('type'))
  )
  const [musicMode, setMusicMode] = useState<MusicMode>('single')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('entertainment')

  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [albumTracks, setAlbumTracks] = useState<AlbumTrack[]>([])
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')

  const isMusic = uploadType === 'music'
  const isVideoUpload = uploadType === 'short' || uploadType === 'music_video' || uploadType === 'movie'

  const submitLabel = useMemo(() => {
    if (loading) return statusText || 'Uploading...'
    if (uploadType === 'music') return musicMode === 'album' ? 'Publish Album' : 'Publish MP3 Single'
    if (uploadType === 'music_video') return 'Upload Music Video'
    if (uploadType === 'movie') return 'Upload Movie'
    return 'Upload Short'
  }, [loading, musicMode, statusText, uploadType])

  const uploadCover = async (userId: string) => {
    if (!coverFile) return null

    const path = `${userId}/${Date.now()}-${safeFileName(coverFile.name)}`
    const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, coverFile)

    if (error) throw error

    const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  const handleMusicUpload = async (userId: string, profileId: string) => {
    const coverUrl = await uploadCover(userId)

    if (musicMode === 'single') {
      if (!musicFile) throw new Error('Please select an MP3 file.')

      const trackPath = `${userId}/singles/${Date.now()}-${safeFileName(musicFile.name)}`
      const { error: audioError } = await supabase.storage
        .from(MUSIC_BUCKET)
        .upload(trackPath, musicFile)

        if (audioError) throw audioError

        const { data: audioData, error: urlError } = await supabase.storage.from(MUSIC_BUCKET).createSignedUrl(trackPath, 60 * 60)
        if (urlError || !audioData) throw urlError || new Error('Failed to generate signed URL')

      const { error: insertError } = await supabase.from('videos').insert({
        creator_id: profileId,
        title,
        description,
        category,
        video_type: uploadType,
        cover_url: coverUrl,
        audio_url: audioData.signedUrl,
        file_url: audioData.signedUrl,
        visibility: 'private',
        upload_status: 'processing',
        moderation_status: 'pending',
        mux_status: 'waiting_for_upload',
      })

      if (insertError) throw insertError
      return
    }

    if (albumTracks.length === 0) {
      throw new Error('Please add at least one MP3 file to the album.')
    }

    const uploadedTracks = []

    for (let i = 0; i < albumTracks.length; i += 1) {
      const track = albumTracks[i]

      if (!track.title.trim()) {
        throw new Error(`Track ${i + 1} needs a title.`)
      }

      const trackPath = `${userId}/albums/${Date.now()}-${i + 1}-${safeFileName(track.file.name)}`
      const { error: audioError } = await supabase.storage
        .from(MUSIC_BUCKET)
        .upload(trackPath, track.file)

       if (audioError) throw audioError

        const { data: audioData, error: urlError } = await supabase.storage.from(MUSIC_BUCKET).createSignedUrl(trackPath, 60 * 60)
       if (urlError || !audioData) throw urlError || new Error('Failed to generate signed URL')

       uploadedTracks.push({
         title: track.title.trim(),
         audio_url: audioData.signedUrl,
         file_url: audioData.signedUrl,
        track_number: i + 1,
        original_file_name: track.file.name,
      })
    }

     const { error: insertError } = await supabase.from('videos').insert({
       creator_id: profileId,
       title,
       description,
       category: 'music_album',
       video_type: 'music',
       tracks: uploadedTracks,
       album_cover_url: coverUrl,
       cover_url: coverUrl,
       thumbnail_url: coverUrl,
       visibility: 'private',
       upload_status: 'ready',
       moderation_status: 'pending',
     })

    if (insertError) throw insertError
  }

  const handleMuxUpload = async (userId: string, profileId: string) => {
    if (!videoFile) throw new Error('Please select a video file.')

    const thumbnailUrl = await uploadCover(userId)

    const videoCategory =
      uploadType === 'music_video'
        ? 'music_video'
        : uploadType === 'movie'
          ? 'movie'
          : category

    const { data: contentRow, error: insertError } = await supabase
       .from('videos')
       .insert({
         creator_id: profileId,
         title,
         description,
         category: videoCategory,
         video_type: uploadType,
         thumbnail_url: thumbnailUrl,
         cover_url: thumbnailUrl,
         visibility: 'private',
         upload_status: 'processing',
         moderation_status: 'pending',
         mux_status: 'waiting_for_upload',
       })
      .select('*')
      .single()

    if (insertError) throw insertError

    const { data: muxData, error: muxError } = await supabase.functions.invoke('create-mux-upload', {
      body: {
        title,
        description,
        category,
        video_type: uploadType,
        video_id: contentRow.id,
      },
    })

    if (muxError) throw muxError

    const uploadUrl = muxData?.upload_url ?? muxData?.uploadUrl
    const uploadId = muxData?.upload_id ?? muxData?.uploadId

    if (!uploadUrl) {
      throw new Error('Mux upload URL was not returned.')
    }

    setStatusText('Uploading video to Mux...')

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoFile.type || 'application/octet-stream',
      },
      body: videoFile,
    })

    if (!uploadRes.ok) {
      throw new Error('Mux upload failed.')
    }

    await supabase
      .from('videos')
      .update({
        mux_upload_id: uploadId || muxData.upload_id || null,
        mux_status: 'uploaded_processing',
      })
      .eq('id', contentRow.id)
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setLoading(true)
      setStatusText('Preparing upload...')

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('You must be logged in.')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) throw new Error('Creator profile not found')

      if (!title.trim()) throw new Error('Title is required.')

      if (isMusic) {
        setStatusText('Uploading music files...')
        await handleMusicUpload(user.id, profile.id)
      } else {
        await handleMuxUpload(user.id, profile.id)
      }

      navigate('/creator/uploads')
    } catch (err: any) {
      console.error('Upload failed:', err)
      alert(err.message || 'Upload failed.')
    } finally {
      setLoading(false)
      setStatusText('')
    }
  }

  const handleAlbumFiles = (files: FileList | null) => {
    if (!files) return

    const tracks = Array.from(files).map((file) => ({
      file,
      title: stripExtension(file.name),
    }))

    setAlbumTracks(tracks)
  }

  const updateAlbumTrackTitle = (index: number, value: string) => {
    setAlbumTracks((prev) =>
      prev.map((track, i) => (i === index ? { ...track, title: value } : track))
    )
  }

  const removeAlbumTrack = (index: number) => {
    setAlbumTracks((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-[2rem] border border-yellow-500/20 bg-gradient-to-br from-black via-red-950/30 to-black p-6 shadow-[0_0_70px_rgba(185,28,28,0.22)]">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
            <Upload className="h-3.5 w-3.5" />
            MAI Upload Studio
          </div>

          <h1 className="text-3xl font-black md:text-5xl">Upload Content</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-300">
            Choose music, shorts, music videos, or movies. MP3 music stores in Supabase. Videos stream through Mux.
          </p>
        </div>

        <Card className="border-white/10 bg-black/50 p-5">
          <form onSubmit={handleUpload} className="space-y-6">
            <div className="grid gap-3 md:grid-cols-4">
              <UploadChoice
                active={uploadType === 'music'}
                icon={<Music />}
                title="Music"
                subtitle="MP3 single or album"
                onClick={() => setUploadType('music')}
              />
              <UploadChoice
                active={uploadType === 'short'}
                icon={<Video />}
                title="Short"
                subtitle="Mux short video"
                onClick={() => setUploadType('short')}
              />
              <UploadChoice
                active={uploadType === 'music_video'}
                icon={<Film />}
                title="Music Video"
                subtitle="Mux music video"
                onClick={() => setUploadType('music_video')}
              />
              <UploadChoice
                active={uploadType === 'movie'}
                icon={<Album />}
                title="Movie"
                subtitle="Mux full movie"
                onClick={() => setUploadType('movie')}
              />
            </div>

            {isMusic && (
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMusicMode('single')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    musicMode === 'single'
                      ? 'border-yellow-400 bg-yellow-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Music className="mb-2 h-5 w-5 text-yellow-300" />
                  <p className="font-black">Single MP3 Track</p>
                  <p className="text-sm text-zinc-400">One song with cover photo.</p>
                </button>

                <button
                  type="button"
                  onClick={() => setMusicMode('album')}
                  className={`rounded-2xl border p-4 text-left transition ${
                    musicMode === 'album'
                      ? 'border-yellow-400 bg-yellow-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Album className="mb-2 h-5 w-5 text-yellow-300" />
                  <p className="font-black">Album Upload</p>
                  <p className="text-sm text-zinc-400">Multiple MP3s with editable titles.</p>
                </button>
              </div>
            )}

            <div>
              <Label htmlFor="title">
                {musicMode === 'album' && isMusic ? 'Album Title' : 'Title'}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={musicMode === 'album' && isMusic ? 'Enter album title' : 'Enter title'}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this upload"
                className="min-h-[110px] w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-white outline-none focus:border-yellow-400/50"
              />
            </div>

            {!isMusic && (
              <div>
                <Label>Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-white"
                >
                  <option value="entertainment">Entertainment</option>
                  <option value="music">Music</option>
                  <option value="cars">Cars</option>
                  <option value="business">Business</option>
                  <option value="gaming">Gaming</option>
                  <option value="education">Education</option>
                </select>
              </div>
            )}

            <div>
              <Label htmlFor="cover">
                {isMusic ? 'Cover Photo' : 'Thumbnail / Cover Photo'}
              </Label>
              <Input
                id="cover"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                required={isMusic}
              />
            </div>

            {isMusic && musicMode === 'single' && (
              <div>
                <Label htmlFor="musicFile">MP3 File</Label>
                <Input
                  id="musicFile"
                  type="file"
                  accept="audio/mpeg,audio/mp3,.mp3"
                  onChange={(e) => setMusicFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            )}

            {isMusic && musicMode === 'album' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="albumFiles">Album MP3 Files</Label>
                  <Input
                    id="albumFiles"
                    type="file"
                    accept="audio/mpeg,audio/mp3,.mp3"
                    multiple
                    onChange={(e) => handleAlbumFiles(e.target.files)}
                    required
                  />
                </div>

                {albumTracks.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center gap-2 text-yellow-300">
                      <Plus className="h-4 w-4" />
                      <h3 className="font-black text-white">Edit Album Song Titles</h3>
                    </div>

                    <div className="space-y-3">
                      {albumTracks.map((track, index) => (
                        <div key={`${track.file.name}-${index}`} className="flex gap-2">
                          <Input
                            value={track.title}
                            onChange={(e) => updateAlbumTrackTitle(index, e.target.value)}
                            placeholder={`Track ${index + 1} title`}
                            required
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAlbumTrack(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isVideoUpload && (
              <div>
                <Label htmlFor="videoFile">Video File</Label>
                <Input
                  id="videoFile"
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 py-6 font-black text-black hover:scale-[1.01] disabled:opacity-60"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function UploadChoice({
  active,
  icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_25px_rgba(250,204,21,0.12)]'
          : 'border-white/10 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className={active ? 'mb-2 text-yellow-300' : 'mb-2 text-zinc-400'}>
        {icon}
      </div>
      <p className="font-black text-white">{title}</p>
      <p className="text-xs text-zinc-400">{subtitle}</p>
    </button>
  )
}