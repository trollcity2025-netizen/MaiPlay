import { useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Loader2, Upload, AlertCircle, CheckCircle, Music } from 'lucide-react'

// Simple UUIDv4 generator
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

interface MusicUploadFormProps {
  onUploadComplete?: (trackId: string) => void
  uploadMode: 'single' | 'album'
  trackType?: 'instrumental' | 'full'
}

export function MusicUploadForm({ onUploadComplete, uploadMode, trackType }: MusicUploadFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [trackTitles, setTrackTitles] = useState<string[]>([])
  const [albumCover, setAlbumCover] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'error' | 'success'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [trackId, setTrackId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const safeFileName = (fileName: string) => {
    return fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  }

  const handleUpload = useCallback(async () => {
    if (!file && files.length === 0) {
      setError('Audio file is required')
      return
    }

    setLoading(true)
    setError(null)
    setStatus('uploading')
    setProgress(0)

    try {
      // Get current user and profile BEFORE uploading
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Not authenticated')

      // Get profile ID for creator_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        throw new Error('Creator profile not found.')
      }

      const authUserId = user.id
      const creatorProfileId = profile.id

      // Upload files to Supabase storage
      let audioUrl: string | null = null
      let coverUrl: string | null = null
      let tracks: any[] = []

       if (uploadMode === 'single' && file) {
         const filePath = `${authUserId}/singles/${Date.now()}-${safeFileName(file.name)}`
         const { error } = await supabase.storage
           .from('music-files')
           .upload(filePath, file, {
             cacheControl: '3600',
             upsert: false
           })

         if (error) throw error
         // Generate signed URL for private bucket (valid for 1 hour)
         const { data: urlData, error: urlError } = await supabase.storage.from('music-files').createSignedUrl(filePath, 60 * 60)
         if (urlError || !urlData) throw urlError || new Error('Failed to generate signed URL')
         audioUrl = urlData.signedUrl

        if (albumCover) {
          const coverPath = `${authUserId}/covers/${Date.now()}-${safeFileName(albumCover.name)}`
          const { error: coverError } = await supabase.storage
            .from('music-covers')
            .upload(coverPath, albumCover, {
              cacheControl: '3600',
              upsert: false
            })

          if (coverError) throw coverError
          const { data: coverUrlData } = supabase.storage.from('music-covers').getPublicUrl(coverPath)
          coverUrl = coverUrlData.publicUrl
        }
       } else if (uploadMode === 'album' && files.length > 0) {
         // Upload all album tracks
         for (let i = 0; i < files.length; i++) {
           const trackFile = files[i]
           const filePath = `${authUserId}/albums/${Date.now()}-${i + 1}-${safeFileName(trackFile.name)}`
           const { error } = await supabase.storage
             .from('music-files')
             .upload(filePath, trackFile, {
               cacheControl: '3600',
               upsert: false
             })

            if (error) throw error
            // Generate signed URL for private bucket (valid for 1 hour)
            const { data: urlData, error: urlError } = await supabase.storage.from('music-files').createSignedUrl(filePath, 60 * 60)
            if (urlError || !urlData) throw urlError || new Error('Failed to generate signed URL')
            const trackUrl = urlData.signedUrl

           tracks.push({
             title: trackTitles[i] || trackFile.name.replace(/\.[^/.]+$/, ""),
             audio_url: trackUrl,
             file_url: trackUrl,
             track_number: i + 1,
             original_file_name: trackFile.name
           })
         }

        // Use first track's URL as the main audio_url
        audioUrl = tracks[0].audio_url

        // Upload album cover if provided
        if (albumCover) {
          const coverPath = `${authUserId}/covers/${Date.now()}-${safeFileName(albumCover.name)}`
          const { error: coverError } = await supabase.storage
            .from('music-covers')
            .upload(coverPath, albumCover, {
              cacheControl: '3600',
              upsert: false
            })

          if (coverError) throw coverError
          const { data: coverUrlData } = supabase.storage.from('music-covers').getPublicUrl(coverPath)
          coverUrl = coverUrlData.publicUrl
        }
      }

       // Create database record
       let trackData: any = null;

       if (uploadMode === 'single') {
         // Insert single track into tracks table
         const { data, error } = await supabase
           .from('tracks')
           .insert({
             creator_id: creatorProfileId,
             title,
             description,
             category: 'music',
             audio_url: audioUrl,
             cover_art_url: coverUrl,
             track_type: trackType || 'instrumental',
             visibility: 'private',
             upload_status: 'ready',
             moderation_status: 'pending',
           })
           .select()
           .single();

         if (error) throw error;
         trackData = data;
       } else if (uploadMode === 'album') {
         // Insert album into albums table
         const { data: albumData, error: albumError } = await supabase
           .from('albums')
           .insert({
             creator_id: creatorProfileId,
             title,
             description,
             category: 'music_album',
             cover_art_url: coverUrl,
             visibility: 'private',
             upload_status: 'ready',
             moderation_status: 'pending',
           })
           .select()
           .single();

         if (albumError) throw albumError;

         // Insert album tracks into album_tracks table
         const albumTracksToInsert = tracks.map((track, index) => ({
           album_id: albumData.id,
           track_id: uuidv4(), // Generate temporary ID, will be updated after track insertion
           track_number: index + 1,
         }));

         const { data: albumTracksData, error: albumTracksError } = await supabase
           .from('album_tracks')
           .insert(albumTracksToInsert)
           .select();

         if (albumTracksError) throw albumTracksError;

         // Insert individual tracks into tracks table
         const trackInserts = tracks.map((track, index) => ({
           id: albumTracksData[index].track_id, // Use the generated ID from album_tracks
           creator_id: creatorProfileId,
           title: track.title,
           description: null, // Individual track description not stored separately
           category: 'music',
           audio_url: track.audio_url,
           cover_art_url: coverUrl,
           track_type: trackType || 'instrumental',
           visibility: 'private',
           upload_status: 'ready',
           moderation_status: 'pending',
         }));

         const { data: tracksData, error: tracksError } = await supabase
           .from('tracks')
           .insert(trackInserts)
           .select();

         if (tracksError) throw tracksError;

         // Update album_tracks with correct track IDs
         const updatedAlbumTracks = tracksData.map((track, index) => ({
           id: albumTracksData[index].id,
           album_id: albumData.id,
           track_id: track.id,
           track_number: index + 1,
         }));

         const { error: updateAlbumTracksError } = await supabase
           .from('album_tracks')
           .update({
             track_id: (_, index) => updatedAlbumTracks[index].track_id,
           })
           .match({
             id: (_, index) => updatedAlbumTracks[index].id,
           });

         if (updateAlbumTracksError) throw updateAlbumTracksError;

         trackData = albumData;
       }

      if (dbError) throw dbError

      setTrackId(trackData.id)

      // Start copyright scan without blocking upload completion
      if (uploadMode === 'single') {
        try {
          const { error } = await supabase.functions.invoke('check-audio-copyright', {
            body: {
              video_id: trackData.id,
              audio_url: audioUrl,
            },
          })
          if (error) throw error
        } catch (err) {
          console.warn('Copyright scan unavailable, upload still completed', err)
        }
      } else if (uploadMode === 'album' && tracks.length > 0) {
        tracks.forEach(async (track, index) => {
          try {
            const { error } = await supabase.functions.invoke('check-audio-copyright', {
              body: {
                video_id: trackData.id,
                audio_url: track.audio_url,
                track_number: index + 1,
              },
            })
            if (error) throw error
          } catch (err) {
            console.warn('Copyright scan unavailable, upload still completed for track', index + 1, err)
          }
        })
      }

      setStatus('success')
      setProgress(100)

      if (onUploadComplete) {
        onUploadComplete(trackData.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setStatus('error')
      setLoading(false)
    }
  }, [file, files, trackTitles, albumCover, title, description, uploadMode, onUploadComplete])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB
        setError('File too large. Max: 100MB')
        return
      }
      if (!selectedFile.type.startsWith('audio/')) {
        setError('Please select an audio file')
        return
      }
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length > 15) {
      setError('Maximum 15 tracks per album')
      return
    }
    for (const f of selectedFiles) {
      if (f.size > 100 * 1024 * 1024) {
        setError('Each file must be under 100MB')
        return
      }
      if (!f.type.startsWith('audio/')) {
        setError('All files must be audio files')
        return
      }
    }
    setFiles(selectedFiles)
    // Initialize track titles from filenames (without extension)
    setTrackTitles(selectedFiles.map(f => f.name.replace(/\.[^/.]+$/, "")))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleUpload()
  }

  if (status === 'processing') {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-yellow-400" />
        <h3 className="text-lg font-black mb-2 text-white">Processing your music</h3>
        <p className="text-zinc-400">
          Your music is being processed. This may take a few minutes.
        </p>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-xl font-black mb-2 text-white">Upload Complete!</h3>
        <p className="text-zinc-400 mb-4">
          Your music has been uploaded successfully. Copyright scan is running in the background.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-yellow-500 text-black px-4 py-2 rounded font-bold hover:bg-yellow-400"
        >
          Upload Another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-2 text-zinc-300">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter track/album title"
          className="w-full rounded-md border border-yellow-400/20 bg-black/30 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-yellow-400"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-2 text-zinc-300">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Track/album description"
          rows={3}
          className="w-full rounded-md border border-yellow-400/20 bg-black/30 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-yellow-400"
          disabled={loading}
        />
      </div>

      {uploadMode === 'single' && (
        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-300">Audio File *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-md border-2 border-dashed border-yellow-400/30 bg-yellow-400/5 px-6 py-8 text-center transition hover:border-yellow-400/50 hover:bg-yellow-400/10"
            disabled={loading}
          >
            <Music className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
            <p className="text-sm font-semibold text-yellow-300">
              {file ? `Selected: ${file.name}` : 'Click to select audio file'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">MP3 up to 100MB</p>
          </button>
        </div>
      )}

      {uploadMode === 'album' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Album Tracks *</label>
            <input
              ref={filesInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFilesChange}
              className="hidden"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => filesInputRef.current?.click()}
              className="w-full rounded-md border-2 border-dashed border-yellow-400/30 bg-yellow-400/5 px-6 py-8 text-center transition hover:border-yellow-400/50 hover:bg-yellow-400/10"
              disabled={loading}
            >
              <Music className="mx-auto mb-2 h-8 w-8 text-yellow-400" />
              <p className="text-sm font-semibold text-yellow-300">
                {files.length > 0 ? `Selected: ${files.length} tracks` : 'Click to select album tracks'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Up to 15 MP3 files, 100MB each</p>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-zinc-300">Album Cover</label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setAlbumCover(e.target.files?.[0] || null)}
              className="hidden"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="w-full rounded-md border-2 border-dashed border-yellow-400/30 bg-yellow-400/5 px-6 py-4 text-center transition hover:border-yellow-400/50 hover:bg-yellow-400/10"
              disabled={loading}
            >
              <p className="text-sm font-semibold text-yellow-300">
                {albumCover ? `Selected: ${albumCover.name}` : 'Click to select album cover (optional)'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">JPG/PNG up to 10MB</p>
            </button>
          </div>

          {files.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2 text-zinc-300">Track Titles</label>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400 w-6">{index + 1}.</span>
                    <input
                      type="text"
                      value={trackTitles[index] || ''}
                      onChange={(e) => {
                        const newTitles = [...trackTitles]
                        newTitles[index] = e.target.value
                        setTrackTitles(newTitles)
                      }}
                      placeholder={`Track ${index + 1}`}
                      className="flex-1 rounded-md border border-yellow-400/20 bg-black/30 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-yellow-400 text-sm"
                      disabled={loading}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (!file && files.length === 0)}
        className="w-full rounded-md bg-yellow-500 px-4 py-2 text-sm font-black text-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Uploading...' : 'Upload Music'}
      </button>
    </form>
  )
}