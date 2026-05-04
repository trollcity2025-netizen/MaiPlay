import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Sparkles, ShieldCheck } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const loadingWatchdogRef = useRef<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLoading(false)
        navigate('/home', { replace: true })
      }
    })
    return () => {
      sub.subscription.unsubscribe()
      if (loadingWatchdogRef.current) window.clearTimeout(loadingWatchdogRef.current)
    }
  }, [navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    const normalizedEmail = email.trim().toLowerCase()

    try {
      if (loadingWatchdogRef.current) window.clearTimeout(loadingWatchdogRef.current)
      loadingWatchdogRef.current = window.setTimeout(() => {
        setLoading(false)
        setErrorMsg('Sign-in is taking longer than expected. Please try again.')
      }, 20000)

      const signInPromise = supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sign-in timed out. Please try again.')), 15000)
      })

      await Promise.race([signInPromise, timeoutPromise])

      if (loadingWatchdogRef.current) {
        window.clearTimeout(loadingWatchdogRef.current)
        loadingWatchdogRef.current = null
      }

      setLoading(false)
    } catch (error) {
      if (loadingWatchdogRef.current) {
        window.clearTimeout(loadingWatchdogRef.current)
        loadingWatchdogRef.current = null
      }
      setLoading(false)
      setErrorMsg(error instanceof Error ? error.message : 'Unable to sign in')
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050101] text-white">
      
      {/* Background (clean, premium — not noisy) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,209,77,0.18),transparent_35%),linear-gradient(180deg,#050101,#120404,#050101)]" />
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center px-4 py-2 mb-6 rounded-full border border-yellow-400/40 bg-black/50 text-yellow-300 text-sm font-bold backdrop-blur-xl">
              <Sparkles className="w-4 h-4 mr-2" />
              MAI Access
            </div>

            <h1 className="text-4xl font-black mb-2">
              Welcome back
            </h1>
            <p className="text-zinc-300">
              Sign in to your MaiPlay account
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl p-8 shadow-2xl">

            <form onSubmit={handleLogin} className="space-y-6">

              {/* Email */}
              <div>
                <Label className="text-sm text-zinc-300">Email</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 h-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-yellow-400"
                />
              </div>

              {/* Password */}
              <div>
                <Label className="text-sm text-zinc-300">Password</Label>
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-12 bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-yellow-400"
                />
              </div>

              {/* Row */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-zinc-400">
                  <input type="checkbox" className="accent-yellow-500" />
                  Remember me
                </label>

                <Link to="/forgot-password" className="text-yellow-400 hover:text-yellow-300">
                  Forgot password
                </Link>
              </div>

              {/* Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-yellow-300 via-yellow-500 to-red-500 text-black font-black shadow-xl hover:scale-[1.02] transition-all"
              >
                {loading ? 'Signing in...' : 'Enter MaiPlay'}
              </Button>
            </form>

            {/* Error */}
            {errorMsg && (
              <div className="mt-5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
                {errorMsg}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-zinc-400">
              Don’t have an account?{' '}
              <Link to="/register" className="text-yellow-400 hover:text-yellow-300 font-medium">
                Sign up
              </Link>
            </div>

            {/* Trust */}
            <div className="mt-6 flex items-center justify-center text-xs text-zinc-500">
              <ShieldCheck className="w-4 h-4 mr-2 text-yellow-400" />
              Secure MAI authentication
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}