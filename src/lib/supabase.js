var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});
// Auth helper functions
export const auth = {
    // Sign in with Google - Updated for Figma plugin OAuth
    signInWithGoogle() {
        return __awaiter(this, void 0, void 0, function* () {
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
            return { data, error };
        });
    },
    // Exchange authorization code for session (for Figma OAuth callback)
    exchangeCodeForSession(code) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield supabase.auth.exchangeCodeForSession(code);
            return { data, error };
        });
    },
    // Sign out
    signOut() {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield supabase.auth.signOut();
            return { error };
        });
    },
    // Get current user
    getCurrentUser() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { user }, error } = yield supabase.auth.getUser();
            return { user, error };
        });
    },
    // Get current session
    getCurrentSession() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data: { session }, error } = yield supabase.auth.getSession();
            return { session, error };
        });
    },
    // Set session (for restoring from storage)
    setSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error } = yield supabase.auth.setSession(session);
            return { data, error };
        });
    },
    // Listen to auth changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    }
};
