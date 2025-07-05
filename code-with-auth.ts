/// <reference types="@figma/plugin-typings" />

import { figmaAuth } from './src/utils/figmaAuth'

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
figma.ui.onmessage = async (msg: { type: string; [key: string]: any }) => {
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
      } catch (error: any) {
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