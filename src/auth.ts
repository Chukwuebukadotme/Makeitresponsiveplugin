interface AuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
}

const authConfig: AuthConfig = {
  clientId: '327794121021-pbm6ohimt1ciantp7783o960ppa8hifn.apps.googleusercontent.com',
  redirectUri: 'https://www.figma.com/oauth/callback',
  scope: ['email', 'profile', 'openid']
};

export async function initializeAuth() {
  try {
    const isAuthenticated = await figma.clientStorage.getAsync('isAuthenticated');
    if (!isAuthenticated) {
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${authConfig.clientId}&` +
        `redirect_uri=${encodeURIComponent(authConfig.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(authConfig.scope.join(' '))}`;
      
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

async function exchangeCodeForTokens(code: string) {
  const tokenEndpoint = 'https://oauth2.googleapis.com/token';
  const clientSecret = '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'; // Get this from Google Cloud Console
  
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