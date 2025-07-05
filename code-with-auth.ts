/// <reference types="@figma/plugin-typings" />

import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || ''

let supabase: any = null

// Initialize Supabase client
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

// Authentication state
let currentUser: any = null
let userProfile: any = null

// Show UI
figma.showUI(__html__, { width: 400, height: 600 })

// Authentication functions
async function initializeAuth() {
  if (!supabase) {
    console.warn('Supabase not configured')
    return
  }

  try {
    // Try to restore session from client storage
    const storedSession = await figma.clientStorage.getAsync('supabase_session')
    
    if (storedSession && storedSession.access_token) {
      // Verify session is still valid
      const { data: { user }, error } = await supabase.auth.getUser(storedSession.access_token)
      
      if (user && !error) {
        currentUser = user
        await fetchUserProfile()
        notifyAuthStateChanged()
      } else {
        // Session invalid, clear it
        await figma.clientStorage.setAsync('supabase_session', null)
      }
    }
  } catch (error) {
    console.error('Auth initialization error:', error)
  }
}

async function signInWithGoogle() {
  if (!supabase) {
    figma.notify('Authentication not configured')
    return
  }

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${figma.root.getPluginData('redirect_url') || 'http://localhost:3000'}/auth/callback`
      }
    })

    if (error) {
      figma.notify(`Sign in error: ${error.message}`)
      return
    }

    // The actual sign-in will happen in the redirect
    figma.notify('Redirecting to Google sign in...')
  } catch (error: any) {
    figma.notify(`Sign in failed: ${error.message}`)
  }
}

async function signOut() {
  if (!supabase) return

  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      figma.notify(`Sign out error: ${error.message}`)
      return
    }

    // Clear local state
    currentUser = null
    userProfile = null
    
    // Clear client storage
    await figma.clientStorage.setAsync('supabase_session', null)
    
    notifyAuthStateChanged()
    figma.notify('Signed out successfully')
  } catch (error: any) {
    figma.notify(`Sign out failed: ${error.message}`)
  }
}

async function fetchUserProfile() {
  if (!supabase || !currentUser) return

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return
    }

    userProfile = data
  } catch (error) {
    console.error('Profile fetch error:', error)
  }
}

async function incrementUsageCount() {
  if (!supabase || !currentUser) return

  try {
    const { data, error } = await supabase.rpc('increment_usage_count', {
      user_id: currentUser.id
    })

    if (error) {
      console.error('Error incrementing usage:', error)
      return
    }

    // Refresh profile
    await fetchUserProfile()
    notifyProfileUpdated()
    
    return data
  } catch (error) {
    console.error('Usage increment error:', error)
  }
}

function notifyAuthStateChanged() {
  figma.ui.postMessage({
    type: 'auth-state-changed',
    user: currentUser,
    profile: userProfile
  })
}

function notifyProfileUpdated() {
  figma.ui.postMessage({
    type: 'profile-updated',
    profile: userProfile
  })
}

// Feature functions with authentication checks
async function useBasicFeature() {
  // Basic features don't require authentication
  figma.notify('Basic feature used')
}

async function useAuthenticatedFeature() {
  if (!currentUser) {
    figma.notify('Please sign in to use this feature')
    return
  }

  await incrementUsageCount()
  figma.notify('Authenticated feature used')
}

async function usePremiumFeature() {
  if (!currentUser) {
    figma.notify('Please sign in to use this feature')
    return
  }

  if (!userProfile || (userProfile.subscription_status !== 'premium' && userProfile.subscription_status !== 'trial')) {
    figma.notify('Premium subscription required')
    return
  }

  await incrementUsageCount()
  figma.notify('Premium feature used')
}

// Message handler
figma.ui.onmessage = async (msg: { type: string; [key: string]: any }) => {
  switch (msg.type) {
    case 'get-auth-state':
      notifyAuthStateChanged()
      break
      
    case 'auth-sign-in-google':
      await signInWithGoogle()
      break
      
    case 'auth-sign-out':
      await signOut()
      break
      
    case 'use-basic-feature':
      await useBasicFeature()
      break
      
    case 'use-authenticated-feature':
      await useAuthenticatedFeature()
      break
      
    case 'use-premium-feature':
      await usePremiumFeature()
      break
      
    case 'upgrade-to-premium':
      // Open upgrade URL or show upgrade flow
      figma.notify('Upgrade flow would open here')
      break
      
    case 'close':
      figma.closePlugin()
      break
  }
}

// Initialize authentication when plugin starts
initializeAuth()