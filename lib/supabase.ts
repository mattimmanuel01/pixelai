import { createClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

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
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export const createUserProfile = async (userId: string, email: string) => {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      subscription_tier: 'free',
      upscale_quota: 0,
      expand_quota: 0,
      upscale_used: 0,
      expand_used: 0
    })
    .select()
    .single()
  
  return { data, error }
}

export const updateUserQuota = async (userId: string, quotaType: 'upscale' | 'expand') => {
  const field = quotaType === 'upscale' ? 'upscale_used' : 'expand_used'
  
  const { data, error } = await supabase
    .from('users')
    .update({ [field]: supabase.sql`${field} + 1` })
    .eq('id', userId)
    .select()
    .single()
  
  return { data, error }
}

export const getUserImages = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_images')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

export const saveUserImage = async (imageData: Omit<UserImage, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('user_images')
    .insert(imageData)
    .select()
    .single()
  
  return { data, error }
}