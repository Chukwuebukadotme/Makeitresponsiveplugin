/*
import { config } from './config';

interface AuthConfig {
  clientId: string;
  serverUrl: string;
  scope: string[];
  redirectUri: string;
}

const authConfig: AuthConfig = {
  clientId: config.google.clientId,
  serverUrl: 'https://ac82-154-113-155-6.ngrok-free.app/auth',
  scope: ['email', 'profile', 'openid'],
  redirectUri: config.google.redirectUri
};

export async function initializeAuth() {
  try {
    const isAuthenticated = await figma.clientStorage.getAsync('isAuthenticated');
    if (!isAuthenticated) {
      // Generate state parameter for security
      const state = crypto.randomUUID();
      await figma.clientStorage.setAsync('oauth_state', state);
      
      // Start polling for auth completion
      startAuthPolling(state);
      
      // Open auth window
      const authUrl = `${authConfig.serverUrl}/start?` +
        `client_id=${authConfig.clientId}&` +
        `state=${state}&` +
        `scope=${encodeURIComponent(authConfig.scope.join(' '))}&` +
        `redirect_uri=${encodeURIComponent(authConfig.redirectUri)}`;
      
      figma.showUI(__html__, { width: 300, height: 400 });
      figma.ui.postMessage({ type: 'show-auth', url: authUrl });
      return false;
    }
    return true;
  } catch (error) {
    console.error('Auth initialization error:', error);
    return false;
  }
}

async function startAuthPolling(state: string) {
  const pollInterval = setInterval(async () => {
    try {
      const response = await fetch(`${authConfig.serverUrl}/poll?state=${state}`);
      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          clearInterval(pollInterval);
          await figma.clientStorage.setAsync('accessToken', data.access_token);
          await figma.clientStorage.setAsync('isAuthenticated', true);
          figma.ui.postMessage({ type: 'auth-success' });
        }
      }
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 2000);
}

export async function exchangeCodeForTokens(code: string) {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const clientSecret = config.google.clientSecret;
  
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: authConfig.clientId,
      client_secret: clientSecret,
      redirect_uri: authConfig.redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens');
  }

  return response.json();
}

export async function handleAuthCallback(code: string) {
  try {
    const tokens = await exchangeCodeForTokens(code);
    
    // Get user info using access token
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    }).then(res => res.json());

    // Store tokens and user info
    await figma.clientStorage.setAsync('accessToken', tokens.access_token);
    await figma.clientStorage.setAsync('refreshToken', tokens.refresh_token);
    await figma.clientStorage.setAsync('user', userInfo);
    await figma.clientStorage.setAsync('isAuthenticated', true);
    
    return userInfo;
  } catch (error) {
    console.error('Auth error:', error);
    throw error;
  }
}
*/ 
