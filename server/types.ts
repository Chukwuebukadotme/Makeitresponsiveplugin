// Server-side type definitions

export interface FigmaWebhookPayload {
  event_type: 'FILE_UPDATE' | 'FILE_DELETE' | 'FILE_VERSION_UPDATE' | 'LIBRARY_PUBLISH'
  file_key: string
  file_name?: string
  timestamp: string
  triggered_by: {
    id: string
    handle: string
  }
  description?: string
  label?: string
  version_id?: string
  created_components?: Array<{
    key: string
    file_key: string
    node_id: string
    thumbnail_url: string
    name: string
    description: string
    created_at: string
    updated_at: string
    user: {
      id: string
      handle: string
      img_url: string
    }
  }>
  created_styles?: Array<{
    key: string
    file_key: string
    node_id: string
    style_type: string
    thumbnail_url: string
    name: string
    description: string
    created_at: string
    updated_at: string
    user: {
      id: string
      handle: string
      img_url: string
    }
  }>
  modified_components?: string[]
  modified_styles?: string[]
  deleted_components?: string[]
  deleted_styles?: string[]
}

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

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface UsageTrackingRequest {
  feature_used?: string
  metadata?: Record<string, any>
}

export interface SubscriptionUpdateRequest {
  subscription_status: 'free' | 'trial' | 'premium' | 'expired'
  subscription_expires_at?: string
}

export interface PluginDataRequest {
  metadata: Record<string, any>
}