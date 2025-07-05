var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../lib/supabase';
const AuthContext = createContext(undefined);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Get initial session
        const getInitialSession = () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const { session } = yield auth.getCurrentSession();
            setSession(session);
            setUser((_a = session === null || session === void 0 ? void 0 : session.user) !== null && _a !== void 0 ? _a : null);
            setLoading(false);
        });
        getInitialSession();
        // Listen for auth changes
        const { data: { subscription } } = auth.onAuthStateChange((event, session) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            setSession(session);
            setUser((_a = session === null || session === void 0 ? void 0 : session.user) !== null && _a !== void 0 ? _a : null);
            setLoading(false);
            // Handle different auth events
            if (event === 'SIGNED_IN') {
                console.log('User signed in:', session === null || session === void 0 ? void 0 : session.user);
            }
            else if (event === 'SIGNED_OUT') {
                console.log('User signed out');
            }
        }));
        return () => subscription.unsubscribe();
    }, []);
    const signInWithGoogle = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            setLoading(true);
            const { error } = yield auth.signInWithGoogle();
            if (error) {
                console.error('Error signing in with Google:', error.message);
                throw error;
            }
        }
        catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    });
    const signOut = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            setLoading(true);
            const { error } = yield auth.signOut();
            if (error) {
                console.error('Error signing out:', error.message);
                throw error;
            }
        }
        catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
        finally {
            setLoading(false);
        }
    });
    const value = {
        user,
        session,
        loading,
        signInWithGoogle,
        signOut
    };
    return (<AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>);
};
