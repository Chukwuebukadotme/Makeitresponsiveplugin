/// <reference types="@figma/plugin-typings" />

// Supabase client setup
const supabaseUrl = 'https://roiltuqkzxugjfzkectn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaWx0dXFrenh1Z2pmemtlY3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MjIwMzksImV4cCI6MjA2NzI5ODAzOX0.NS89-a03z1Eem1lc_nfWMK2O8dkRkN3OD5hmhuOVlH4'

// Supabase client using fetch API (works in Figma plugins)
const supabase = {
  auth: {
    signInWithOAuth: async (options) => {
      try {
        // For Figma plugins, we need to open the OAuth URL in the UI
        const authUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent('https://www.figma.com/oauth/callback')}`
        
        // Post message to UI to open auth URL
        figma.ui.postMessage({
          type: 'open-auth-url',
          url: authUrl
        })
        
        return { data: null, error: null }
      } catch (error) {
        return { data: null, error: { message: error.message } }
      }
    },
    
    exchangeCodeForSession: async (code) => {
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=authorization_code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            auth_code: code
          })
        })
        
        const data = await response.json()
        console.log(`working ${data}`)
        console.log(`working ${code}`)

        if (response.ok) {
          return { data: { session: data, user: data.user }, error: null }
        } else {
          return { data: null, error: { message: data.error_description || 'Failed to exchange code' } }
        }
      } catch (error) {
        return { data: null, error: { message: error.message } }
      }
    },
    
    signOut: async () => {
      try {
        // Clear local session
        return { error: null }
      } catch (error) {
        return { error: { message: error.message } }
      }
    },
    
    getSession: async () => {
      try {
        // Try to get session from Figma storage
        if (typeof figma !== 'undefined' && figma.clientStorage) {
          const storedSession = await figma.clientStorage.getAsync('supabase_session')
          if (storedSession && storedSession.access_token) {
            const now = Math.floor(Date.now() / 1000)
            if (storedSession.expires_at > now) {
              return { data: { session: storedSession }, error: null }
            }
          }
        }
        return { data: { session: null }, error: null }
      } catch (error) {
        return { data: { session: null }, error: { message: error.message } }
      }
    },
    
    getUser: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session && session.user) {
          return { data: { user: session.user }, error: null }
        }
        return { data: { user: null }, error: null }
      } catch (error) {
        return { data: { user: null }, error: { message: error.message } }
      }
    },
    
    setSession: async (session) => {
      try {
        // Store session in Figma storage
        if (typeof figma !== 'undefined' && figma.clientStorage) {
          await figma.clientStorage.setAsync('supabase_session', session)
        }
        return { data: { session, user: session.user }, error: null }
      } catch (error) {
        return { data: null, error: { message: error.message } }
      }
    },
    
    onAuthStateChange: (callback) => {
      // Simple implementation for Figma plugins
      return { data: { subscription: { unsubscribe: () => {} } } }
    }
  },
  
  rpc: async (functionName, params) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(params)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        return { data, error: null }
      } else {
        return { data: null, error: { message: data.message || 'RPC call failed' } }
      }
    } catch (error) {
      return { data: null, error: { message: error.message } }
    }
  },
  
  from: (table) => {
    return {
      select: (columns) => {
        return {
          eq: (column, value) => {
            return {
              single: async () => {
                try {
                  const { data: { session } } = await supabase.auth.getSession()
                  if (!session) {
                    throw new Error('No active session')
                  }
                  
                  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${column}=eq.${value}&select=${columns}`, {
                    method: 'GET',
                    headers: {
                      'apikey': supabaseAnonKey,
                      'Authorization': `Bearer ${session.access_token}`
                    }
                  })
                  
                  const data = await response.json()
                  
                  if (response.ok && data.length > 0) {
                    return { data: data[0], error: null }
                  } else {
                    return { data: null, error: { message: 'No data found' } }
                  }
                } catch (error) {
                  return { data: null, error: { message: error.message } }
                }
              }
            }
          }
        }
      }
    }
  }
}

// FigmaAuth class
class FigmaAuth {
  constructor() {
    this.isInitialized = false
    this.currentUser = null
    this.userProfile = null
  }

  static getInstance() {
    if (!FigmaAuth.instance) {
      FigmaAuth.instance = new FigmaAuth()
    }
    return FigmaAuth.instance
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      // Check for existing session in Figma storage
      await this.restoreSessionFromFigma()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize Figma auth:', error)
    }
  }

  async signInWithGoogle() {
    try {
      // For Figma plugins, we need to redirect to https://www.figma.com/oauth/callback
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://www.figma.com/oauth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      
      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async handleAuthCodeCallback(code, state) {
    try {
      // Exchange the authorization code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session && data.user) {
        this.currentUser = data.user
        
        // Store session in Figma's client storage
        await this.storeSessionInFigma(data.session)
        
        // Fetch user profile
        await this.fetchUserProfile()
        
        return { success: true }
      }

      return { success: false, error: 'No session received' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      // Clear local state
      this.currentUser = null
      this.userProfile = null
      
      // Clear Figma storage
      await this.clearFigmaStorage()
      
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async getCurrentUser() {
    return this.currentUser
  }

  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  async getUserProfile() {
    return this.userProfile
  }

  async incrementUsageCount() {
    if (!this.currentUser) return null

    try {
      const { data, error } = await supabase.rpc('increment_usage_count', {
        user_id: this.currentUser.id
      })

      if (error) {
        throw error
      }

      // Refresh profile
      await this.fetchUserProfile()
      return data
    } catch (error) {
      console.error('Usage increment error:', error)
      throw error
    }
  }

  async fetchUserProfile() {
    if (!this.currentUser) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        // Create default profile if none exists
        this.userProfile = {
          id: this.currentUser.id,
          subscription_status: 'free',
          usage_count: 0
        }
        return
      }

      this.userProfile = data
    } catch (error) {
      console.error('Profile fetch error:', error)
      // Create default profile on error
      this.userProfile = {
        id: this.currentUser.id,
        subscription_status: 'free',
        usage_count: 0
      }
    }
  }

  async storeSessionInFigma(session) {
    if (typeof figma !== 'undefined' && figma.clientStorage) {
      try {
        await figma.clientStorage.setAsync('supabase_session', {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: session.user
        })
      } catch (error) {
        console.error('Failed to store session in Figma:', error)
      }
    }
  }

  async restoreSessionFromFigma() {
    if (typeof figma !== 'undefined' && figma.clientStorage) {
      try {
        const storedSession = await figma.clientStorage.getAsync('supabase_session')
        
        if (storedSession && storedSession.access_token) {
          // Check if session is still valid
          const now = Math.floor(Date.now() / 1000)
          
          if (storedSession.expires_at > now) {
            // Session is still valid, restore it
            const { data, error } = await supabase.auth.setSession({
              access_token: storedSession.access_token,
              refresh_token: storedSession.refresh_token
            })

            if (data.user && !error) {
              this.currentUser = data.user
              await this.fetchUserProfile()
            }
          } else {
            // Session expired, clear it
            await this.clearFigmaStorage()
          }
        }
      } catch (error) {
        console.error('Failed to restore session from Figma:', error)
      }
    }
  }

  async clearFigmaStorage() {
    if (typeof figma !== 'undefined' && figma.clientStorage) {
      try {
        await figma.clientStorage.setAsync('supabase_session', null)
      } catch (error) {
        console.error('Failed to clear Figma storage:', error)
      }
    }
  }
}

// Create singleton instance
const figmaAuth = FigmaAuth.getInstance()

// Show UI
figma.showUI(__html__, { width: 400, height: 600 })

// Initialize authentication when plugin starts
async function initializePlugin() {
  await figmaAuth.initialize()
  
  // Send initial auth state to UI
  const user = await figmaAuth.getCurrentUser()
  const profile = await figmaAuth.getUserProfile()
  
  figma.ui.postMessage({
    type: 'auth-state-changed',
    user: user,
    profile: profile
  })
}

// Feature functions with authentication checks
async function useBasicFeature() {
  // Basic features don't require authentication
  figma.notify('Basic feature used')
}

async function useAuthenticatedFeature() {
  const user = await figmaAuth.getCurrentUser()
  
  if (!user) {
    figma.notify('Please sign in to use this feature')
    return
  }

  try {
    await figmaAuth.incrementUsageCount()
    figma.notify('Authenticated feature used')
    
    // Update UI with new profile data
    const profile = await figmaAuth.getUserProfile()
    figma.ui.postMessage({
      type: 'profile-updated',
      profile: profile
    })
  } catch (error) {
    figma.notify('Error using feature')
  }
}

async function usePremiumFeature() {
  const user = await figmaAuth.getCurrentUser()
  const profile = await figmaAuth.getUserProfile()
  
  if (!user) {
    figma.notify('Please sign in to use this feature')
    return
  }

  if (!profile || (profile.subscription_status !== 'premium' && profile.subscription_status !== 'trial')) {
    figma.notify('Premium subscription required')
    return
  }

  try {
    await figmaAuth.incrementUsageCount()
    figma.notify('Premium feature used')
    
    // Update UI with new profile data
    const updatedProfile = await figmaAuth.getUserProfile()
    figma.ui.postMessage({
      type: 'profile-updated',
      profile: updatedProfile
    })
  } catch (error) {
    figma.notify('Error using premium feature')
  }
}

// Message handler
figma.ui.onmessage = async (msg) => {
  switch (msg.type) {
    case 'get-auth-state':
      const user = await figmaAuth.getCurrentUser()
      const profile = await figmaAuth.getUserProfile()
      figma.ui.postMessage({
        type: 'auth-state-changed',
        user: user,
        profile: profile
      })
      break
      
    case 'auth-sign-in-google':
      const signInResult = await figmaAuth.signInWithGoogle()
      if (!signInResult.success) {
        figma.notify(`Sign in error: ${signInResult.error}`)
      }
      break
      
    case 'auth-sign-out':
      const signOutResult = await figmaAuth.signOut()
      if (signOutResult.success) {
        figma.notify('Signed out successfully')
        figma.ui.postMessage({
          type: 'auth-state-changed',
          user: null,
          profile: null
        })
      } else {
        figma.notify(`Sign out error: ${signOutResult.error}`)
      }
      break

    // Handle OAuth callback from Figma
    case 'AUTH_CODE_RECEIVED':
      try {
        const { code, state } = msg
        const result = await figmaAuth.handleAuthCodeCallback(code, state)
        
        if (result.success) {
          figma.notify('Successfully signed in!')
          
          // Send updated auth state to UI
          const user = await figmaAuth.getCurrentUser()
          const profile = await figmaAuth.getUserProfile()
          figma.ui.postMessage({
            type: 'auth-state-changed',
            user: user,
            profile: profile
          })
        } else {
          figma.notify(`Sign in failed: ${result.error}`)
        }
      } catch (error) {
        figma.notify(`Authentication error: ${error.message}`)
      }
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

// Initialize the plugin
initializePlugin() 