'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User, getUserProfile, createUserProfile } from '@/lib/supabase'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signUp: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // Timeout fallback to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.log('Auth timeout fallback: setting loading to false')
        setLoading(false)
      }
    }, 3000) // 3 seconds timeout - reduced from 10 seconds

    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('Getting initial session...')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!isMounted) return
        
        console.log('Initial session:', !!session?.user)
        setUser(session?.user ?? null)
        if (session?.user) {
          await loadUserProfile(session.user.id)
        } else {
          console.log('No initial session, setting loading to false')
          setLoading(false)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, !!session?.user)
      
      if (!isMounted) return
      
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await loadUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading user profile for:', userId)
      const { data, error } = await getUserProfile(userId)
      
      if (error && error.code === 'PGRST116') {
        console.log('User profile not found, creating new one')
        // User profile doesn't exist, create one
        const user = await supabase.auth.getUser()
        if (user.data.user?.email) {
          const { data: newProfile, error: createError } = await createUserProfile(userId, user.data.user.email)
          if (createError) {
            console.error('Failed to create user profile:', createError)
            // Don't sign out immediately, just set userProfile to null and let dashboard handle it
            setUserProfile(null)
          } else {
            setUserProfile(newProfile)
            console.log('Created new user profile:', newProfile)
          }
        } else {
          console.error('No user email found')
          setUserProfile(null)
        }
      } else if (error) {
        console.error('Error loading user profile:', error)
        // Don't sign out on profile loading errors - might be temporary network issues
        setUserProfile(null)
      } else if (data) {
        console.log('Loaded user profile:', data)
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      // Don't sign out on catch errors - might be temporary issues
      setUserProfile(null)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}