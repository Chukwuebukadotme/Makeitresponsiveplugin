import { createClient } from '@supabase/supabase-js'

// For Figma plugins, we'll use placeholder values that should be replaced
// with actual values when the plugin is deployed
const supabaseUrl = 'https://roiltuqkzxugjfzkectn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaWx0dXFrenh1Z2pmemtlY3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MjIwMzksImV4cCI6MjA2NzI5ODAzOX0.NS89-a03z1Eem1lc_nfWMK2O8dkRkN3OD5hmhuOVlH4'

// In a real deployment, these would be replaced with actual values
console.warn('Using placeholder Supabase credentials. Please update with real values in src/lib/supabase.ts')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auth helper functions
export const auth = {
  // Sign in with Google - Updated for Figma plugin OAuth
  async signInWithGoogle() {
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
    return { data, error }
  },

  // Exchange authorization code for session (for Figma OAuth callback)
  async exchangeCodeForSession(code: string) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Set session (for restoring from storage)
  async setSession(session: { access_token: string; refresh_token: string }) {
    const { data, error } = await supabase.auth.setSession(session)
    return { data, error }
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}