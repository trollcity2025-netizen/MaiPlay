import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { VideoUploadForm } from '../components/video/VideoUploadForm'
import { MusicUploadForm } from '../components/music/MusicUploadForm'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AppHeader } from '../components/layout/AppHeader'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { useAuthAccount } from '../auth/AuthAccountProvider'

type UploadVideoPageProps = { fixedType?: 'music' | 'short' | 'music-video' | 'movie' }

export function UploadVideoPage({ fixedType }: UploadVideoPageProps) {
  const navigate = useNavigate()
  const { account, user } = useAuthAccount()
  const { type: paramType } = useParams<{ type?: string }>()
  const [searchParams] = useSearchParams()
  const queryType = searchParams.get('type')
  const type = fixedType || paramType || queryType || 'short'
  const [uploadComplete, setUploadComplete] = useState(false)
  const [uploadMode, setUploadMode] = useState<'single' | 'album'>('single')
  const [trackType, setTrackType] = useState<'instrumental' | 'full'>('instrumental')

  const moviePermissionQuery = useQuery({
    queryKey: ['movie-permission', user?.id],
    queryFn: async () => {
      if (!user?.id || type !== 'movie') return null
      const { data, error } = await supabase
        .from('movie_upload_permissions')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: Boolean(user?.id) && type === 'movie',
  })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
      }
    }
    checkAuth()
  }, [navigate])

  const handleUploadComplete = () => {
    setUploadComplete(true)
    setTimeout(() => {
      navigate('/creator-hub')
    }, 3000)
  }

  const getTitle = () => {
    switch (type) {
      case 'music':
        return 'Upload Music'
      case 'music-video':
        return 'Upload Music Video'
      case 'short':
        return 'Upload Short'
      case 'movie':
        return 'Upload Movie'
      default:
        return 'Upload Video'
    }
  }

  const getDescription = () => {
    switch (type) {
      case 'music':
        return 'Upload tracks or albums to share with music fans.'
      case 'music-video':
        return 'Upload a music video to promote your track.'
      case 'short':
        return 'Create quick, engaging content for your audience.'
      case 'movie':
        return 'Upload full-length movies to reach a wider audience.'
      default:
        return 'Share your content with the MAI community.'
    }
  }

  // Check movie permissions
  if (type === 'movie') {
    if (!account?.is_creator) {
      return (
        <>
          <AppHeader />
          <div className="min-h-screen bg-[#070202] text-white">
            <main className="mx-auto max-w-2xl px-4 py-8">
              <Card className="border-yellow-400/20 bg-yellow-500/10 p-8 text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
                <h1 className="text-2xl font-black mb-2">Creator Status Required</h1>
                <p className="text-zinc-300 mb-6">
                  You need to be a creator to upload movies. Apply now to get started.
                </p>
                <Button onClick={() => navigate('/creator-application')}>
                  Apply to Become a Creator
                </Button>
              </Card>
            </main>
          </div>
        </>
      )
    }

    if (moviePermissionQuery.isLoading) {
      return (
        <>
          <AppHeader />
          <div className="min-h-screen bg-[#070202] text-white">
            <main className="mx-auto max-w-2xl px-4 py-8">
              <Card className="border-yellow-400/20 bg-black/50 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <p className="text-zinc-300">Checking permissions...</p>
              </Card>
            </main>
          </div>
        </>
      )
    }

    const permission = moviePermissionQuery.data
    if (!permission || permission.used) {
      return (
        <>
          <AppHeader />
          <div className="min-h-screen bg-[#070202] text-white">
            <main className="mx-auto max-w-2xl px-4 py-8">
              <Card className="border-yellow-400/20 bg-yellow-500/10 p-8 text-center">
                <AlertCircle className="mx-auto h-16 w-16 text-yellow-400 mb-4" />
                <h1 className="text-2xl font-black mb-2">Movie Upload Permission Required</h1>
                <p className="text-zinc-300 mb-6">
                  You need to purchase a movie upload permission to upload full-length movies.
                </p>
                <Button onClick={() => navigate('/movie-permission')}>
                  Purchase Permission ($5)
                </Button>
              </Card>
            </main>
          </div>
        </>
      )
    }
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-[#070202] text-white">
        <main className="mx-auto max-w-4xl px-4 py-8">
          <section className="rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-red-950/80 via-black to-yellow-950/30 p-6 shadow-2xl mb-8">
            <p className="text-xs font-black uppercase tracking-[0.4em] text-yellow-400">
              Creator Hub
            </p>
            <h1 className="mt-3 text-3xl font-black">{getTitle()}</h1>
            <p className="mt-2 text-sm text-zinc-300">
              {getDescription()}
            </p>
          </section>

          <Card className="border-yellow-400/20 bg-black/50 p-6">
            {uploadComplete ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-black mb-2 text-white">Upload Complete!</h3>
                <p className="text-zinc-400">
                  Your content has been uploaded successfully.
                </p>
              </div>
            ) : type === 'music' ? (
              <MusicUploadForm
                onUploadComplete={handleUploadComplete}
                uploadMode={uploadMode}
                trackType={trackType}
              />
            ) : (
              <VideoUploadForm onUploadComplete={handleUploadComplete} uploadType={type} />
            )}
          </Card>
        </main>
      </div>
    </>
  )
}