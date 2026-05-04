import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Link } from 'react-router-dom'
import { LEGEND_CUTOFF_ISO, LEGEND_CREATOR_LIMIT } from '../../config/maiEconomy'
import { Mic } from 'lucide-react'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [wantsCreator, setWantsCreator] = useState(false)
  const [creatorType, setCreatorType] = useState<'content' | 'artist' | null>(null)
  const [legendCount, setLegendCount] = useState(0)
  const [legendLoading, setLegendLoading] = useState(true)
  const navigate = useNavigate()

  const legendWindowOpen = useMemo(() => new Date().toISOString() <= LEGEND_CUTOFF_ISO, [])
  const legendSpotsRemaining = Math.max(0, LEGEND_CREATOR_LIMIT - legendCount)
  const canJoinLegendCreators = legendWindowOpen && legendSpotsRemaining > 0

  useEffect(() => {
    const fetchLegendCount = async () => {
const { count } = await supabase
         .from('profiles')
         .select('id', { count: 'exact', head: true })
         .eq('is_creator', true)
         .neq('role', 'admin')
      setLegendCount(count || 0)
      setLegendLoading(false)
    }
    fetchLegendCount()
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
          wants_creator: wantsCreator && canJoinLegendCreators,
          creator_type: creatorType

        }
      }
    })
    
    if (error) {
      alert(error.message)
    } else if (data.user) {
      await supabase.from('profiles').upsert({
        user_id: data.user.id,
        username,
        display_name: username,
        subscriber_count: 0,
        total_views: 0,
        short_views: 0,
        is_creator: false,
        creator_level: 'bronze'
      }, { onConflict: 'user_id' })

      if (data.session) {
        navigate('/home')
      } else {
        setMessage('Account created. Check your email to confirm your account before signing in.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#070202] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-red-700/25 blur-3xl" />
        <div className="absolute top-20 -left-20 h-[400px] w-[400px] rounded-full bg-purple-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-blue-900/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-yellow-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,215,90,0.08),transparent_40%),linear-gradient(135deg,rgba(100,50,200,0.15),rgba(0,50,150,0.1),transparent_50%)]" />
      </div>
      <div className="container mx-auto px-4 py-20 flex min-h-screen items-center justify-center relative z-10">
      <div className="w-full max-w-md space-y-8">
         <div className="text-center mb-8">
           <Link to="/" className="text-3xl font-bold text-yellow-400">MaiPlay</Link>
           <p className="text-zinc-300 mt-2">Create your account</p>
         </div>
         <form onSubmit={handleRegister} className="bg-white/5 p-6 rounded-xl border border-white/10">
           <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                required
              />
            </div>
             <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black" disabled={loading}>
               {loading ? 'Creating account...' : 'Create Account'}
             </Button>
              <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-3">
                <p className="font-medium mb-2 text-white">Choose your path</p>
                {legendLoading ? (
                  <p className="text-sm text-yellow-400">Checking Legend Creator slots...</p>
                ) : (
                  <>
                    <div className="mb-3">
                      <p className="text-sm mb-2">What type of creator are you?</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCreatorType('content')}
                          className={`flex-1 rounded-lg border p-2 text-sm transition ${
                            creatorType === 'content'
                              ? 'border-yellow-400 bg-yellow-400/20 text-white'
                              : 'border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          Content Creator
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreatorType('artist')}
                          className={`flex-1 rounded-lg border p-2 text-sm transition ${
                            creatorType === 'artist'
                              ? 'border-yellow-400 bg-yellow-400/20 text-white'
                              : 'border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10'
                          }`}
                        >
                          <Mic className="inline h-4 w-4 mr-1" />
                          Artist
                        </button>
                      </div>
                    </div>
                    {canJoinLegendCreators ? (
                      <label className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={wantsCreator}
                          onChange={(e) => setWantsCreator(e.target.checked)}
                          className="mt-1"
                        />
                        <span>
                          Join as a <span className="text-yellow-400 font-semibold">Legend Creator</span> (first 10 non-admin creators).
                          <span className="block text-yellow-400/70">Spots left: {legendSpotsRemaining}. After that, new members join as MaiFans.</span>
                        </span>
                      </label>
                    ) : (
                      <p className="text-sm text-yellow-400/70">
                        Legend Creator signup is full or closed. New signups join as <span className="font-semibold">MaiFan</span>.
                      </p>
                    )}
                  </>
                )}
              </div>
             {message && <p className="text-sm text-yellow-400 mt-3">{message}</p>}
          </div>
        </form>
         <p className="text-center text-sm text-zinc-400 mt-4">
           Already have an account?{' '}
           <Link to="/login" className="text-yellow-400">Sign in</Link>
         </p>
        </div>
        </div>
      </div>
  )
}
