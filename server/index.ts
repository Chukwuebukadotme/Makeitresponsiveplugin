import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

// Initialize Express app
const app = express()
const PORT = process.env.PORT || 3001

// Environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://roiltuqkzxugjfzkectn.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaWx0dXFrenh1Z2pmemtlY3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MjIwMzksImV4cCI6MjA2NzI5ODAzOX0.NS89-a03z1Eem1lc_nfWMK2O8dkRkN3OD5hmhuOVlH4'

// Initialize Supabase client for server-side operations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.figma.com', 'https://figma.com'] 
    : '*',
  credentials: true
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Make It Responsive API'
  })
})

// Figma webhook endpoint
app.post('/webhooks/figma', async (req: Request, res: Response) => {
  try {
    const payload = req.body
    const signature = req.headers['x-figma-webhook-signature'] as string
    
    console.log('Received Figma webhook:', {
      timestamp: new Date().toISOString(),
      event_type: payload.event_type,
      file_key: payload.file_key,
      signature: signature ? 'present' : 'missing'
    })

    // TODO: Implement webhook signature verification
    // const isValid = verifyFigmaWebhookSignature(payload, signature, FIGMA_WEBHOOK_SECRET)
    // if (!isValid) {
    //   return res.status(401).json({ error: 'Invalid webhook signature' })
    // }

    // Process different webhook events
    switch (payload.event_type) {
      case 'FILE_UPDATE':
        await handleFileUpdate(payload)
        break
      case 'FILE_DELETE':
        await handleFileDelete(payload)
        break
      case 'FILE_VERSION_UPDATE':
        await handleFileVersionUpdate(payload)
        break
      default:
        console.log(`Unhandled webhook event type: ${payload.event_type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error processing Figma webhook:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// User profile endpoints
app.get('/api/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      throw error
    }

    res.json(profile)
  } catch (error) {
    console.error('Error fetching user profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.put('/api/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const updates = req.body

    // Validate required fields
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      throw error
    }

    res.json(profile)
  } catch (error) {
    console.error('Error updating user profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Usage tracking endpoints
app.post('/api/users/:userId/usage', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const { data, error } = await supabase.rpc('increment_usage_count', {
      user_id: userId
    })

    if (error) {
      throw error
    }

    res.json({ usage_count: data })
  } catch (error) {
    console.error('Error incrementing usage count:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Subscription management endpoints
app.get('/api/users/:userId/subscription', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    const { data, error } = await supabase.rpc('check_subscription_status', {
      user_id: userId
    })

    if (error) {
      throw error
    }

    res.json({ subscription_status: data })
  } catch (error) {
    console.error('Error checking subscription status:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/users/:userId/subscription', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { subscription_status, subscription_expires_at } = req.body

    if (!subscription_status) {
      return res.status(400).json({ error: 'subscription_status is required' })
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        subscription_status,
        subscription_expires_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json(profile)
  } catch (error) {
    console.error('Error updating subscription:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Plugin data endpoints
app.get('/api/plugin-data/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    // This could be extended to store plugin-specific data
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('metadata, plugin_usage_count, subscription_status')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' })
      }
      throw error
    }

    res.json(profile)
  } catch (error) {
    console.error('Error fetching plugin data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.post('/api/plugin-data/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const { metadata } = req.body

    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ error: 'metadata object is required' })
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        metadata: {
          ...metadata
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.json(profile)
  } catch (error) {
    console.error('Error updating plugin data:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Webhook event handlers
async function handleFileUpdate(payload: any) {
  console.log('Processing file update:', payload.file_key)
  // TODO: Implement file update logic
  // - Update database with file changes
  // - Notify relevant users
  // - Trigger any automated processes
}

async function handleFileDelete(payload: any) {
  console.log('Processing file deletion:', payload.file_key)
  // TODO: Implement file deletion logic
  // - Clean up related data
  // - Notify users
}

async function handleFileVersionUpdate(payload: any) {
  console.log('Processing file version update:', payload.file_key)
  // TODO: Implement version update logic
  // - Track version changes
  // - Update related metadata
}

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🔗 Supabase URL: ${SUPABASE_URL}`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app