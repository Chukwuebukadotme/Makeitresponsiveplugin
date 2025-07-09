import { Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://roiltuqkzxugjfzkectn.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaWx0dXFrenh1Z2pmemtlY3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MjIwMzksImV4cCI6MjA2NzI5ODAzOX0.NS89-a03z1Eem1lc_nfWMK2O8dkRkN3OD5hmhuOVlH4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

/**
 * Middleware to authenticate requests using Supabase JWT tokens
 */
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Attach user to request object
    req.user = user
    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}

/**
 * Middleware to check if user has valid subscription
 */
export const requireSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('subscription_status, subscription_expires_at')
      .eq('id', req.user.id)
      .single()

    if (error) {
      throw error
    }

    const hasValidSubscription = 
      profile.subscription_status === 'premium' || 
      profile.subscription_status === 'trial'

    if (!hasValidSubscription) {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        subscription_status: profile.subscription_status
      })
    }

    // Check if subscription has expired
    if (profile.subscription_expires_at) {
      const expiresAt = new Date(profile.subscription_expires_at)
      if (expiresAt < new Date()) {
        // Update status to expired
        await supabase
          .from('user_profiles')
          .update({ subscription_status: 'expired' })
          .eq('id', req.user.id)

        return res.status(403).json({ 
          error: 'Subscription has expired',
          subscription_status: 'expired'
        })
      }
    }

    next()
  } catch (error) {
    console.error('Subscription check error:', error)
    res.status(500).json({ error: 'Subscription verification failed' })
  }
}

/**
 * Middleware to validate user owns the resource
 */
export const validateResourceOwnership = (req: Request, res: Response, next: NextFunction) => {
  const { userId } = req.params
  
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' })
  }

  if (req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied: You can only access your own resources' })
  }

  next()
}