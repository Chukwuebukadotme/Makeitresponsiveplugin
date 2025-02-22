var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const authConfig = {
    clientId: '327794121021-pbm6ohimt1ciantp7783o960ppa8hifn.apps.googleusercontent.com',
    redirectUri: 'https://www.figma.com/oauth/callback',
    scope: ['email', 'profile', 'openid']
};
export function initializeAuth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const isAuthenticated = yield figma.clientStorage.getAsync('isAuthenticated');
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
        }
        catch (error) {
            console.error('Auth initialization error:', error);
            return false;
        }
    });
}
function exchangeCodeForTokens(code) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenEndpoint = 'https://oauth2.googleapis.com/token';
        const clientSecret = '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'; // Get this from Google Cloud Console
        const response = yield fetch(tokenEndpoint, {
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
    });
}
export function handleAuthCallback(code) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tokens = yield exchangeCodeForTokens(code);
            // Get user info using access token
            const userInfo = yield fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`
                }
            }).then(res => res.json());
            // Store tokens and user info
            yield figma.clientStorage.setAsync('accessToken', tokens.access_token);
            yield figma.clientStorage.setAsync('refreshToken', tokens.refresh_token);
            yield figma.clientStorage.setAsync('user', userInfo);
            yield figma.clientStorage.setAsync('isAuthenticated', true);
            return userInfo;
        }
        catch (error) {
            console.error('Auth error:', error);
            throw error;
        }
    });
}
