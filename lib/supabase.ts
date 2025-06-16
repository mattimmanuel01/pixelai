import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'pixelai-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
})

export const createServerClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Database types
export interface User {
  id: string
  email: string
  created_at: string
  subscription_tier: 'free' | 'pro'
  upscale_quota: number
  expand_quota: number
  upscale_used: number
  expand_used: number
}

export interface UserImage {
  id: string
  user_id: string
  original_url: string
  processed_url?: string
  operation_type: 'background_removal' | 'upscale' | 'expand'
  created_at: string
  file_name: string
  file_size: number
}

// Auth helpers
export const getCurrentUser = () => {
  return supabase.auth.getUser()
}

export const signOut = () => {
  return supabase.auth.signOut()
}

export const signInWithEmail = (email: string, password: string) => {
  return supabase.auth.signInWithPassword({ email, password })
}

export const signUpWithEmail = (email: string, password: string) => {
  return supabase.auth.signUp({ email, password })
}

// User data helpers
export const getUserProfile = async (userId: string) => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return { data: null, error: { message: 'Server-side execution not supported' } }
    }

    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { data: null, error: { message: 'No authentication token' } }
    }

    const response = await fetch('/api/user-profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: errorData }
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: { message: 'Failed to fetch profile' } }
  }
}

export const createUserProfile = async (userId: string, email: string) => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return { data: null, error: { message: 'Server-side execution not supported' } }
    }

    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { data: null, error: { message: 'No authentication token' } }
    }

    const response = await fetch('/api/user-profile', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: errorData }
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: { message: 'Failed to create profile' } }
  }
}

export const updateUserQuota = async (userId: string, quotaType: 'upscale' | 'expand') => {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return { data: null, error: { message: 'Server-side execution not supported' } }
    }

    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { data: null, error: { message: 'No authentication token' } }
    }

    const response = await fetch('/api/user-profile', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ quotaType })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: errorData }
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: { message: 'Failed to update quota' } }
  }
}

export const getUserImages = async () => {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { data: null, error: { message: 'No authentication token' } }
    }

    const response = await fetch('/api/user-images', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: errorData }
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: { message: 'Failed to fetch images' } }
  }
}

export const saveUserImage = async (imageData: Omit<UserImage, 'id' | 'created_at' | 'user_id'>) => {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { data: null, error: { message: 'No authentication token' } }
    }

    const response = await fetch('/api/user-images', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(imageData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: errorData }
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: { message: 'Failed to save image' } }
  }
}

export const deleteUserImage = async (imageId: string) => {
  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      return { data: null, error: { message: 'No authentication token' } }
    }

    const response = await fetch(`/api/user-images?id=${encodeURIComponent(imageId)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { data: null, error: errorData }
    }

    const result = await response.json()
    return { data: result.data, error: null }
  } catch (error) {
    return { data: null, error: { message: 'Failed to delete image' } }
  }
}