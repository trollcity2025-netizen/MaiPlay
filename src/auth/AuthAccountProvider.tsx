import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { LEGEND_CUTOFF_ISO, LEGEND_CREATOR_LIMIT } from '../config/maiEconomy'

type MaiRole = 'user' | 'creator' | 'moderator' | 'admin'

export interface MaiAccount {
  id: string
  user_id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  role: MaiRole
  is_creator: boolean
  created_at?: string
}

interface AuthAccountContextValue {
  loading: boolean
  session: Session | null
  user: User | null
  account: MaiAccount | null
  isLegendCreator: boolean
  identityLabel: 'Legend Creator' | 'Creator' | 'MaiFan'
  signOut: () => Promise<void>
}

const AuthAccountContext = createContext<AuthAccountContextValue | undefined>(undefined)

const ADMIN_EMAIL = 'trollcity2025@gmail.com'

function usernameFromEmailOrId(user: User) {
  const emailPrefix = user.email?.split('@')[0]?.trim().toLowerCase()
  const sanitized = (emailPrefix || user.id.slice(0, 8)).replace(/[^a-z0-9_]+/g, '_')
  const safePrefix = sanitized.length > 0 ? sanitized : `user_${user.id.slice(0, 8)}`
  return `${safePrefix}_${user.id.slice(0, 6)}`
}

export function AuthAccountProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [account, setAccount] = useState<MaiAccount | null>(null)

  const withTimeout = async <T,>(promise: Promise<T>, ms = 10000): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error('Account bootstrap timed out')), ms)
      })
    ])
  }

  const buildFallbackAccount = (authUser: User): MaiAccount => {
    const normalizedEmail = authUser.email?.toLowerCase() || ''
    const isAdmin = normalizedEmail === ADMIN_EMAIL
    const username = usernameFromEmailOrId(authUser)
    return {
      id: `fallback-${authUser.id}`,
      user_id: authUser.id,
      username,
      display_name: authUser.email?.split('@')[0] || username,
      avatar_url: null,
      bio: null,
      role: isAdmin ? 'admin' : 'user',
      is_creator: false
    }
  }

  const resolveAccount = useCallback(async (authUser: User, isSignup = false) => {
    const normalizedEmail = authUser.email?.toLowerCase() || ''
    const shouldBeAdmin = normalizedEmail === ADMIN_EMAIL

    // Immediately create or get basic account - this should be fast
    const username = usernameFromEmailOrId(authUser)
    const displayName = authUser.email?.split('@')[0] || username
    const basicRole: MaiRole = shouldBeAdmin ? 'admin' : 'user'

    try {
      // Try to get existing account first (fast query)
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, username, display_name, avatar_url, bio, role, is_creator, created_at')
        .eq('user_id', authUser.id)
        .maybeSingle()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile lookup error:', profileError)
      }

      if (existingProfile) {
        setAccount(existingProfile as MaiAccount)

        if (shouldBeAdmin && existingProfile.role !== 'admin') {
          supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('user_id', authUser.id)
            .then(({ data }) => {
              if (data) setAccount(data[0] as MaiAccount)
            })
        }
        return
      }

const { data: existingMaiAccount, error: maiError } = await supabase
         .from('profiles')
         .select('id, user_id, username, display_name, avatar_url, bio, role, is_creator, created_at')
         .eq('user_id', authUser.id)
         .maybeSingle()

       if (maiError && maiError.code !== 'PGRST116') {
         console.error('Account lookup error:', maiError)
       }

       if (existingMaiAccount) {
         setAccount(existingMaiAccount as MaiAccount)

         if (shouldBeAdmin && existingMaiAccount.role !== 'admin') {
           supabase
             .from('profiles')
             .update({ role: 'admin' })
             .eq('user_id', authUser.id)
             .then(({ data }) => {
               if (data) setAccount(data[0] as MaiAccount)
             })
         }
         return
       }

      // Account doesn't exist, create it immediately in profiles
      const { data: createdProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          user_id: authUser.id,
          username,
          display_name: displayName,
          bio: null,
          role: basicRole,
          is_creator: false
        })
        .select('id, user_id, username, display_name, avatar_url, bio, role, is_creator, created_at')
        .single()

      if (createProfileError) {
        console.error('Profile creation error:', createProfileError)
        setAccount(buildFallbackAccount(authUser))
        return
      }

      if (createdProfile) {
        setAccount(createdProfile as MaiAccount)
      }
    } catch (error) {
      console.error('Account resolution error:', error)
      setAccount(buildFallbackAccount(authUser))
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const hardStop = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 3000) // Reduced to 3 seconds max

    const hydrate = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!isMounted) return

        const currentSession = data.session
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        // Set loading to false immediately after getting session
        // Account resolution happens in background
        if (isMounted) setLoading(false)

        // Resolve account asynchronously in background
        if (currentSession?.user) {
          resolveAccount(currentSession.user, false).catch((error) => {
            console.error('Failed to resolve account:', error)
            if (isMounted) {
              setAccount(buildFallbackAccount(currentSession.user))
            }
          })
        } else {
          setAccount(null)
        }
      } catch (error) {
        console.error('Failed to hydrate auth:', error)
        if (isMounted) {
          setLoading(false)
          setAccount(null)
        }
      }
    }

    hydrate()

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      // For auth changes, show loading briefly then resolve account in background
      if (event !== 'SIGNED_OUT') {
        setLoading(true)
        setTimeout(() => {
          if (isMounted) setLoading(false)
        }, 1000) // Show loading for 1 second max
      }

      // Resolve account asynchronously
      if (nextSession?.user) {
        const isSignup = event === 'SIGNED_IN' && nextSession.user.created_at === nextSession.user.last_sign_in_at
        resolveAccount(nextSession.user, isSignup).catch((error) => {
          console.error('Failed to resolve account:', error)
          if (isMounted) {
            setAccount(buildFallbackAccount(nextSession.user))
          }
        })
      } else {
        setAccount(null)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(hardStop)
      subscription.subscription.unsubscribe()
    }
  }, [resolveAccount])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const isLegendCreator = Boolean(
    account?.is_creator &&
    account?.created_at &&
    account.created_at <= LEGEND_CUTOFF_ISO
  )

  const identityLabel: 'Legend Creator' | 'Creator' | 'MaiFan' = isLegendCreator
    ? 'Legend Creator'
    : account?.is_creator
      ? 'Creator'
      : 'MaiFan'

  const value = useMemo(
    () => ({ loading, session, user, account, isLegendCreator, identityLabel, signOut }),
    [loading, session, user, account, isLegendCreator, identityLabel]
  )

  return <AuthAccountContext.Provider value={value}>{children}</AuthAccountContext.Provider>
}

export function useAuthAccount() {
  const context = useContext(AuthAccountContext)
  if (!context) throw new Error('useAuthAccount must be used within AuthAccountProvider')
  return context
}
