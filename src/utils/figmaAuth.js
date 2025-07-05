var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { supabase } from '../lib/supabase';
// Figma plugin authentication utilities
export class FigmaAuth {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.userProfile = null;
    }
    static getInstance() {
        if (!FigmaAuth.instance) {
            FigmaAuth.instance = new FigmaAuth();
        }
        return FigmaAuth.instance;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isInitialized)
                return;
            try {
                // Check for existing session in Figma storage
                yield this.restoreSessionFromFigma();
                this.isInitialized = true;
            }
            catch (error) {
                console.error('Failed to initialize Figma auth:', error);
            }
        });
    }
    signInWithGoogle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // For Figma plugins, we need to redirect to https://www.figma.com/oauth/callback
                const { data, error } = yield supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: 'https://www.figma.com/oauth/callback',
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        }
                    }
                });
                if (error) {
                    return { success: false, error: error.message };
                }
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
    handleAuthCodeCallback(code, state) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Exchange the authorization code for a session
                const { data, error } = yield supabase.auth.exchangeCodeForSession(code);
                if (error) {
                    return { success: false, error: error.message };
                }
                if (data.session && data.user) {
                    this.currentUser = data.user;
                    // Store session in Figma's client storage
                    yield this.storeSessionInFigma(data.session);
                    // Fetch user profile
                    yield this.fetchUserProfile();
                    return { success: true };
                }
                return { success: false, error: 'No session received' };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
    signOut() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { error } = yield supabase.auth.signOut();
                if (error) {
                    return { success: false, error: error.message };
                }
                // Clear local state
                this.currentUser = null;
                this.userProfile = null;
                // Clear Figma storage
                yield this.clearFigmaStorage();
                return { success: true };
            }
            catch (error) {
                return { success: false, error: error.message };
            }
        });
    }
    getCurrentUser() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.currentUser;
        });
    }
    getCurrentSession() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { session } } = yield supabase.auth.getSession();
            return session;
        });
    }
    getUserProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.userProfile;
        });
    }
    incrementUsageCount() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentUser)
                return null;
            try {
                const { data, error } = yield supabase.rpc('increment_usage_count', {
                    user_id: this.currentUser.id
                });
                if (error) {
                    throw error;
                }
                // Refresh profile
                yield this.fetchUserProfile();
                return data;
            }
            catch (error) {
                console.error('Usage increment error:', error);
                throw error;
            }
        });
    }
    fetchUserProfile() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.currentUser)
                return;
            try {
                const { data, error } = yield supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', this.currentUser.id)
                    .single();
                if (error) {
                    console.error('Error fetching profile:', error);
                    return;
                }
                this.userProfile = data;
            }
            catch (error) {
                console.error('Profile fetch error:', error);
            }
        });
    }
    storeSessionInFigma(session) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                try {
                    yield figma.clientStorage.setAsync('supabase_session', {
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_at: session.expires_at,
                        user: session.user
                    });
                }
                catch (error) {
                    console.error('Failed to store session in Figma:', error);
                }
            }
        });
    }
    restoreSessionFromFigma() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                try {
                    const storedSession = yield figma.clientStorage.getAsync('supabase_session');
                    if (storedSession && storedSession.access_token) {
                        // Check if session is still valid
                        const now = Math.floor(Date.now() / 1000);
                        if (storedSession.expires_at > now) {
                            // Session is still valid, restore it
                            const { data, error } = yield supabase.auth.setSession({
                                access_token: storedSession.access_token,
                                refresh_token: storedSession.refresh_token
                            });
                            if (data.user && !error) {
                                this.currentUser = data.user;
                                yield this.fetchUserProfile();
                            }
                        }
                        else {
                            // Session expired, clear it
                            yield this.clearFigmaStorage();
                        }
                    }
                }
                catch (error) {
                    console.error('Failed to restore session from Figma:', error);
                }
            }
        });
    }
    clearFigmaStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof figma !== 'undefined' && figma.clientStorage) {
                try {
                    yield figma.clientStorage.setAsync('supabase_session', null);
                }
                catch (error) {
                    console.error('Failed to clear Figma storage:', error);
                }
            }
        });
    }
}
// Export singleton instance
export const figmaAuth = FigmaAuth.getInstance();
