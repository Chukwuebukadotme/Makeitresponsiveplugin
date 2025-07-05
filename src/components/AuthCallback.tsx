import React, { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'

export const AuthCallback: React.FC = () => {
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // The AuthProvider will automatically handle the callback
        // We just need to wait for the user to be set
        if (user) {
          setStatus('success')
          // Redirect back to the main plugin interface
          setTimeout(() => {
            window.location.href = '/'
          }, 2000)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
      }
    }

    handleAuthCallback()
  }, [user])

  return (
    <div className="auth-callback">
      {status === 'loading' && (
        <div className="callback-loading">
          <div className="loading-spinner"></div>
          <h2>Completing sign in...</h2>
          <p>Please wait while we finish setting up your account.</p>
        </div>
      )}
      
      {status === 'success' && (
        <div className="callback-success">
          <div className="success-icon">✓</div>
          <h2>Successfully signed in!</h2>
          <p>Welcome! Redirecting you back to the plugin...</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="callback-error">
          <div className="error-icon">✗</div>
          <h2>Sign in failed</h2>
          <p>There was an error completing your sign in. Please try again.</p>
          <button onClick={() => window.location.href = '/'}>
            Return to Plugin
          </button>
        </div>
      )}
    </div>
  )
}