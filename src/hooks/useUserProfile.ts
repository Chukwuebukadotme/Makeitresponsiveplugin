import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  provider: string
  created_at: string
  updated_at: string
  last_sign_in_at: string
  plugin_usage_count: number
  subscription_status: 'free' | 'trial' | 'premium' | 'expired'
  subscription_expires_at?: string
  metadata: Record<string, any>
}

export const useUserProfile = (user: User | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else {
      setProfile(null)
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      setProfile(data)
      return data
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const incrementUsageCount = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('increment_usage_count', {
        user_id: user.id
      })

      if (error) {
        throw error
      }

      // Refresh profile to get updated count
      await fetchProfile()
      return data
    } catch (err: any) {
      console.error('Error incrementing usage count:', err)
      throw err
    }
  }

  const checkSubscriptionStatus = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('check_subscription_status', {
        user_id: user.id
      })

      if (error) {
        throw error
      }

      // Refresh profile to get updated status
      await fetchProfile()
      return data
    } catch (err: any) {
      console.error('Error checking subscription status:', err)
      throw err
    }
  }

  return {
    profile,
    loading,
    error,
    updateProfile,
    incrementUsageCount,
    checkSubscriptionStatus,
    refetch: fetchProfile
  }
}