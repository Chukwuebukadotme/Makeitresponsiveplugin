var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
export const useUserProfile = (user) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (user) {
            fetchProfile();
        }
        else {
            setProfile(null);
        }
    }, [user]);
    const fetchProfile = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user)
            return;
        try {
            setLoading(true);
            setError(null);
            const { data, error } = yield supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            if (error) {
                throw error;
            }
            setProfile(data);
        }
        catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.message);
        }
        finally {
            setLoading(false);
        }
    });
    const updateProfile = (updates) => __awaiter(void 0, void 0, void 0, function* () {
        if (!user || !profile)
            return;
        try {
            setLoading(true);
            setError(null);
            const { data, error } = yield supabase
                .from('user_profiles')
                .update(Object.assign(Object.assign({}, updates), { updated_at: new Date().toISOString() }))
                .eq('id', user.id)
                .select()
                .single();
            if (error) {
                throw error;
            }
            setProfile(data);
            return data;
        }
        catch (err) {
            console.error('Error updating profile:', err);
            setError(err.message);
            throw err;
        }
        finally {
            setLoading(false);
        }
    });
    const incrementUsageCount = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user)
            return;
        try {
            const { data, error } = yield supabase.rpc('increment_usage_count', {
                user_id: user.id
            });
            if (error) {
                throw error;
            }
            // Refresh profile to get updated count
            yield fetchProfile();
            return data;
        }
        catch (err) {
            console.error('Error incrementing usage count:', err);
            throw err;
        }
    });
    const checkSubscriptionStatus = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!user)
            return;
        try {
            const { data, error } = yield supabase.rpc('check_subscription_status', {
                user_id: user.id
            });
            if (error) {
                throw error;
            }
            // Refresh profile to get updated status
            yield fetchProfile();
            return data;
        }
        catch (err) {
            console.error('Error checking subscription status:', err);
            throw err;
        }
    });
    return {
        profile,
        loading,
        error,
        updateProfile,
        incrementUsageCount,
        checkSubscriptionStatus,
        refetch: fetchProfile
    };
};
