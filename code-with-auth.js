/// <reference types="@figma/plugin-typings" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { figmaAuth } from './src/utils/figmaAuth';
// Show UI
figma.showUI(__html__, { width: 400, height: 600 });
// Initialize authentication when plugin starts
function initializePlugin() {
    return __awaiter(this, void 0, void 0, function* () {
        yield figmaAuth.initialize();
        // Send initial auth state to UI
        const user = yield figmaAuth.getCurrentUser();
        const profile = yield figmaAuth.getUserProfile();
        figma.ui.postMessage({
            type: 'auth-state-changed',
            user: user,
            profile: profile
        });
    });
}
// Feature functions with authentication checks
function useBasicFeature() {
    return __awaiter(this, void 0, void 0, function* () {
        // Basic features don't require authentication
        figma.notify('Basic feature used');
    });
}
function useAuthenticatedFeature() {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield figmaAuth.getCurrentUser();
        if (!user) {
            figma.notify('Please sign in to use this feature');
            return;
        }
        try {
            yield figmaAuth.incrementUsageCount();
            figma.notify('Authenticated feature used');
            // Update UI with new profile data
            const profile = yield figmaAuth.getUserProfile();
            figma.ui.postMessage({
                type: 'profile-updated',
                profile: profile
            });
        }
        catch (error) {
            figma.notify('Error using feature');
        }
    });
}
function usePremiumFeature() {
    return __awaiter(this, void 0, void 0, function* () {
        const user = yield figmaAuth.getCurrentUser();
        const profile = yield figmaAuth.getUserProfile();
        if (!user) {
            figma.notify('Please sign in to use this feature');
            return;
        }
        if (!profile || (profile.subscription_status !== 'premium' && profile.subscription_status !== 'trial')) {
            figma.notify('Premium subscription required');
            return;
        }
        try {
            yield figmaAuth.incrementUsageCount();
            figma.notify('Premium feature used');
            // Update UI with new profile data
            const updatedProfile = yield figmaAuth.getUserProfile();
            figma.ui.postMessage({
                type: 'profile-updated',
                profile: updatedProfile
            });
        }
        catch (error) {
            figma.notify('Error using premium feature');
        }
    });
}
// Message handler
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    switch (msg.type) {
        case 'get-auth-state':
            const user = yield figmaAuth.getCurrentUser();
            const profile = yield figmaAuth.getUserProfile();
            figma.ui.postMessage({
                type: 'auth-state-changed',
                user: user,
                profile: profile
            });
            break;
        case 'auth-sign-in-google':
            const signInResult = yield figmaAuth.signInWithGoogle();
            if (!signInResult.success) {
                figma.notify(`Sign in error: ${signInResult.error}`);
            }
            break;
        case 'auth-sign-out':
            const signOutResult = yield figmaAuth.signOut();
            if (signOutResult.success) {
                figma.notify('Signed out successfully');
                figma.ui.postMessage({
                    type: 'auth-state-changed',
                    user: null,
                    profile: null
                });
            }
            else {
                figma.notify(`Sign out error: ${signOutResult.error}`);
            }
            break;
        // Handle OAuth callback from Figma
        case 'AUTH_CODE_RECEIVED':
            try {
                const { code, state } = msg;
                const result = yield figmaAuth.handleAuthCodeCallback(code, state);
                if (result.success) {
                    figma.notify('Successfully signed in!');
                    // Send updated auth state to UI
                    const user = yield figmaAuth.getCurrentUser();
                    const profile = yield figmaAuth.getUserProfile();
                    figma.ui.postMessage({
                        type: 'auth-state-changed',
                        user: user,
                        profile: profile
                    });
                }
                else {
                    figma.notify(`Sign in failed: ${result.error}`);
                }
            }
            catch (error) {
                figma.notify(`Authentication error: ${error.message}`);
            }
            break;
        case 'use-basic-feature':
            yield useBasicFeature();
            break;
        case 'use-authenticated-feature':
            yield useAuthenticatedFeature();
            break;
        case 'use-premium-feature':
            yield usePremiumFeature();
            break;
        case 'upgrade-to-premium':
            // Open upgrade URL or show upgrade flow
            figma.notify('Upgrade flow would open here');
            break;
        case 'close':
            figma.closePlugin();
            break;
    }
});
// Initialize the plugin
initializePlugin();
