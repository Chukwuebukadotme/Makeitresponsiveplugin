import { supabase, auth } from '../lib/supabase'

// Figma plugin authentication utilities
export class FigmaAuth {
  private static instance: FigmaAuth
  private isInitialized = false

  static getInstance(): FigmaAuth {
    if (!FigmaAuth.instance) {
      FigmaAuth.instance = new FigmaAuth()
    }
    return FigmaAuth.instance
  }

  async initialize() {
    if (this.isInitialized) return

    try {
      // Check for existing session
      const { session } = await auth.getCurrentSession()
      
      if (session) {
        // Store session in Figma's client storage for persistence
        await this.storeSessionInFigma(session)
      } else {
        // Try to restore session from Figma storage
        await this.restoreSessionFromFigma()
      }

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize Figma auth:', error)
    }
  }

  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await auth.signInWithGoogle()
      
      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      // Clear Figma storage
      await this.clearFigmaStorage()
      
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async getCurrentUser() {
    return await auth.getCurrentUser()
  }

  async getCurrentSession() {
    return await auth.getCurrentSession()
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
            await supabase.auth.setSession({
              access_token: storedSession.access_token,
              refresh_token: storedSession.refresh_token
            })
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

  // Listen to auth state changes and sync with Figma storage
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.storeSessionInFigma(session)
      } else if (event === 'SIGNED_OUT') {
        await this.clearFigmaStorage()
      }
      
      callback(event, session)
    })
  }
}

// Export singleton instance
export const figmaAuth = FigmaAuth.getInstance()