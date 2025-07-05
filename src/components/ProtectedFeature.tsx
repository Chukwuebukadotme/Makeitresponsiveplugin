import React from 'react'
import { useAuth } from './AuthProvider'
import { useUserProfile } from '../hooks/useUserProfile'
import { AuthButton } from './AuthButton'

interface ProtectedFeatureProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireSubscription?: boolean
  fallback?: React.ReactNode
}

export const ProtectedFeature: React.FC<ProtectedFeatureProps> = ({
  children,
  requireAuth = true,
  requireSubscription = false,
  fallback
}) => {
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useUserProfile(user)

  if (authLoading || profileLoading) {
    return (
      <div className="protected-feature-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return (
      <div className="auth-required">
        <h3>Sign in required</h3>
        <p>Please sign in to use this feature.</p>
        <AuthButton />
      </div>
    )
  }

  // Check subscription requirement
  if (requireSubscription && profile) {
    const hasValidSubscription = 
      profile.subscription_status === 'premium' || 
      profile.subscription_status === 'trial'

    if (!hasValidSubscription) {
      return fallback || (
        <div className="subscription-required">
          <h3>Premium feature</h3>
          <p>This feature requires a premium subscription.</p>
          <button className="upgrade-button">
            Upgrade to Premium
          </button>
        </div>
      )
    }
  }

  return <>{children}</>
}