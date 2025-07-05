import { supabase } from '../lib/supabase'

// Figma plugin authentication utilities
export class FigmaAuth {
  private static instance: FigmaAuth
  private isInitialized = false
  private currentUser: any = null
  private userProfile: any = null

  static getInstance(): FigmaAuth {
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

  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
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
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async handleAuthCodeCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
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
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
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
    } catch (error: any) {
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

  private async fetchUserProfile() {
    if (!this.currentUser) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', this.currentUser.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      this.userProfile = data
    } catch (error) {
      console.error('Profile fetch error:', error)
    }
  }

  private async storeSessionInFigma(session: any) {
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

  private async restoreSessionFromFigma() {
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

  private async clearFigmaStorage() {
    if (typeof figma !== 'undefined' && figma.clientStorage) {
      try {
        await figma.clientStorage.setAsync('supabase_session', null)
      } catch (error) {
        console.error('Failed to clear Figma storage:', error)
      }
    }
  }
}

// Export singleton instance
export const figmaAuth = FigmaAuth.getInstance()