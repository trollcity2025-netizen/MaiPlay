import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Loader2, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { AppHeader } from '../components/layout/AppHeader'
import { useAuthAccount } from '../auth/AuthAccountProvider'

const AVATAR_BUCKET = 'mai-profile-images'
const MAX_IMAGE_MB = 5

export function EditProfilePage() {
  const { user, account } = useAuthAccount()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!account) return

    setDisplayName(account.display_name || '')
    setBio(account.bio || '')
    setAvatarUrl(account.avatar_url || '')
    setPreviewUrl(account.avatar_url || '')
  }, [account])

  const initials = useMemo(() => {
    const name = displayName || account?.username || 'MAI'
    return name.slice(0, 2).toUpperCase()
  }, [displayName, account?.username])

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setErrorMessage('')

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file.')
      return
    }

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrorMessage(`Profile image must be under ${MAX_IMAGE_MB}MB.`)
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const uploadAvatar = async () => {
    if (!user || !selectedFile) return avatarUrl

    const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !account) return

    const cleanDisplayName = displayName.trim()
    const cleanBio = bio.trim()

    if (cleanDisplayName.length < 2) {
      setErrorMessage('Display name must be at least 2 characters.')
      return
    }

    if (cleanDisplayName.length > 50) {
      setErrorMessage('Display name must be 50 characters or less.')
      return
    }

    if (cleanBio.length > 300) {
      setErrorMessage('Bio must be 300 characters or less.')
      return
    }

    setLoading(true)
    setErrorMessage('')

    try {
      const finalAvatarUrl = await uploadAvatar()

const { error } = await supabase
         .from('profiles')
         .update({
           display_name: cleanDisplayName,
           bio: cleanBio,
           avatar_url: finalAvatarUrl,
           updated_at: new Date().toISOString()
         })
         .eq('user_id', user.id)

      if (error) throw error

      navigate(`/profile/${account.username}`)
    } catch (error) {
      console.error('Profile update failed:', error)
      setErrorMessage('Profile could not be saved. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const removeSelectedImage = () => {
    setSelectedFile(null)
    setPreviewUrl(avatarUrl || '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <AppHeader />

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 rounded-3xl border border-yellow-500/20 bg-gradient-to-br from-red-950/60 via-black to-yellow-950/30 p-6 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-yellow-400">
            MAI Creator Profile
          </p>
          <h1 className="mt-2 text-3xl font-black">Edit Profile</h1>
          <p className="mt-2 text-sm text-white/60">
            Update your public identity, creator bio, and profile image.
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-xl">
          <section className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="relative">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-32 w-32 rounded-full border-4 border-yellow-500 object-cover shadow-lg"
                />
              ) : (
                 <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-yellow-500 bg-gradient-to-br from-red-700 to-yellow-600 text-3xl font-black text-black">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 rounded-full bg-yellow-500 p-3 text-black shadow-lg hover:bg-yellow-400"
                aria-label="Upload profile image"
              >
                <Camera size={18} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Upload Image
              </Button>

              {selectedFile && (
                <Button type="button" variant="ghost" onClick={removeSelectedImage}>
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>

            <p className="text-xs text-white/50">
              JPG, PNG, or WEBP. Max {MAX_IMAGE_MB}MB.
            </p>
          </section>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-white/60">
              @{account?.username || 'username'}

              {/* Future badges render here */}
              <span className="rounded-full border border-yellow-500/40 px-2 py-0.5 text-xs text-yellow-400">
                Badges coming soon
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell fans who you are, what you create, and why they should follow you."
              rows={5}
              maxLength={300}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-500"
            />
            <p className="text-right text-xs text-white/40">{bio.length}/300</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
            <h2 className="font-bold text-yellow-400">Creator Calendar</h2>
            <p className="mt-2 text-sm text-white/60">
              Calendar scheduling can connect here next: lives, premieres, movie drops, and subscriber-only events.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={loading} className="bg-yellow-500 text-black hover:bg-yellow-400">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/profile/${account?.username || ''}`)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
