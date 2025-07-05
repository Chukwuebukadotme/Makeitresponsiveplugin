var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { AuthButton } from './AuthButton';
import { ProtectedFeature } from './ProtectedFeature';
import { useUserProfile } from '../hooks/useUserProfile';
import { figmaAuth } from '../utils/figmaAuth';
import '../styles/auth.css';
const AppContent = () => {
    const { user, loading } = useAuth();
    const { profile, incrementUsageCount } = useUserProfile(user);
    useEffect(() => {
        // Initialize Figma auth when component mounts
        figmaAuth.initialize();
    }, []);
    const handleFeatureUse = () => __awaiter(void 0, void 0, void 0, function* () {
        if (user && profile) {
            try {
                yield incrementUsageCount();
                console.log('Usage count incremented');
            }
            catch (error) {
                console.error('Failed to increment usage count:', error);
            }
        }
    });
    if (loading) {
        return (<div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading application...</p>
      </div>);
    }
    return (<div className="authenticated-app">
      <div className="app-header">
        <h1>Make It Responsive</h1>
        <AuthButton />
      </div>

      {user && profile && (<div className="user-stats">
          <div className="stat-item">
            <span className="stat-label">Usage Count:</span>
            <span className="stat-value">{profile.plugin_usage_count}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status:</span>
            <span className={`stat-value status-${profile.subscription_status}`}>
              {profile.subscription_status}
            </span>
          </div>
        </div>)}

      <div className="app-content">
        {/* Basic features available to all users */}
        <ProtectedFeature requireAuth={false}>
          <div className="feature-section">
            <h3>Basic Features</h3>
            <button onClick={handleFeatureUse}>
              Use Basic Feature
            </button>
          </div>
        </ProtectedFeature>

        {/* Features requiring authentication */}
        <ProtectedFeature requireAuth={true}>
          <div className="feature-section">
            <h3>Authenticated Features</h3>
            <button onClick={handleFeatureUse}>
              Use Authenticated Feature
            </button>
          </div>
        </ProtectedFeature>

        {/* Premium features */}
        <ProtectedFeature requireAuth={true} requireSubscription={true} fallback={<div className="premium-upsell">
              <h3>Premium Features</h3>
              <p>Unlock advanced responsive design tools with a premium subscription.</p>
              <button className="upgrade-button">
                Upgrade to Premium
              </button>
            </div>}>
          <div className="feature-section premium">
            <h3>Premium Features</h3>
            <button onClick={handleFeatureUse}>
              Use Premium Feature
            </button>
          </div>
        </ProtectedFeature>
      </div>
    </div>);
};
export const AuthenticatedApp = () => {
    return (<AuthProvider>
      <AppContent />
    </AuthProvider>);
};
