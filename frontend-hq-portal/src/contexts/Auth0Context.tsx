import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface UserProfile {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  accountId?: number;
  shopId?: number;
  identityProvider?: string;
  companies?: Array<{
    companyId: number;
    name?: string;
    role: string;
    acceptedAt?: string;
    isActive: boolean;
  }>;
}

interface LoginOptions {
  screen_hint?: string;
  login_hint?: string;
}

interface Auth0ContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  backendUnavailable: boolean;
  backendError: string | null;
  backendReconnectInProgress: boolean;
  retryBackendConnection: () => Promise<void>;
  loginWithRedirect: (options?: LoginOptions) => void;
  loginWithSocial: (connection: string) => void;
  logout: () => void;
  getAccessToken: () => Promise<string>;
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
  hasTenantAssociation: () => boolean;
  updateUserProfile: (firstName: string, lastName: string) => void;
}

const Auth0Context = createContext<Auth0ContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(Auth0Context);
  if (!context) {
    throw new Error('useAuth must be used within an Auth0Provider');
  }
  return context;
};

interface Auth0ContextProviderProps {
  children: React.ReactNode;
}

export const Auth0ContextProvider: React.FC<Auth0ContextProviderProps> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect: auth0LoginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    user: auth0User,
  } = useAuth0();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendReconnectInProgress, setBackendReconnectInProgress] = useState(false);
  const syncInProgressRef = useRef(false);

  const isBackendUnavailableError = (error: unknown): boolean => {
    if (!(error instanceof Error)) {
      return false;
    }

    const normalized = error.message.toLowerCase();
    return normalized.startsWith('backend_unavailable')
      || normalized.includes('failed to fetch')
      || normalized.includes('networkerror')
      || normalized.includes('network request failed');
  };

  // Cache the Auth0 token for API calls
  useEffect(() => {
    const cacheAuth0Token = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          if (token) {
            // Cache the token for synchronous use in API interceptor
            localStorage.setItem('auth0_token', token);
          }
        } catch (error) {
          console.error('Error caching Auth0 token:', error);
        }
      } else {
        // Clear old tokens
        localStorage.removeItem('auth0_token');
        localStorage.removeItem('admin_auth_token');
        localStorage.removeItem('user_role');
        localStorage.removeItem('user_info');
      }
    };

    cacheAuth0Token();
  }, [isAuthenticated, getAccessTokenSilently]);

  const syncUserProfile = useCallback(async () => {
    if (!isAuthenticated || !auth0User || syncInProgressRef.current) {
      return;
    }

    syncInProgressRef.current = true;
    setProfileLoadAttempted(false);
    setBackendReconnectInProgress(true);

    try {
      const token = await getAccessTokenSilently();
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5125';

      const syncResponse = await fetch(`${apiUrl}/api/auth0/sync-user`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!syncResponse.ok) {
        if (syncResponse.status >= 500) {
          throw new Error(`BACKEND_UNAVAILABLE:${syncResponse.status}`);
        }
        throw new Error(`Failed to sync user profile: ${syncResponse.status}`);
      }

      await syncResponse.json();

      const profileResponse = await fetch(`${apiUrl}/api/auth0/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!profileResponse.ok) {
        if (profileResponse.status >= 500) {
          throw new Error(`BACKEND_UNAVAILABLE:${profileResponse.status}`);
        }
        throw new Error(`Failed to load user profile: ${profileResponse.status}`);
      }

      const profileData = await profileResponse.json();
      setUserProfile({
        userId: profileData.userId,
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        roles: profileData.roles || [],
        accountId: profileData.accountId,
        shopId: profileData.shopId,
        identityProvider: profileData.identityProvider,
        companies: profileData.companies || [],
      });
      setBackendUnavailable(false);
      setBackendError(null);
    } catch (error) {
      console.error('Error syncing user profile:', error);

      if (isBackendUnavailableError(error)) {
        setBackendUnavailable(true);
        setBackendError('Cannot reach backend service. Trying to reconnect automatically.');
      } else if (auth0User) {
        const fallbackProfile: UserProfile = {
          userId: auth0User.sub || '',
          email: auth0User.email || '',
          firstName: auth0User.given_name || auth0User.nickname || '',
          lastName: auth0User.family_name || '',
          roles: [],
          accountId: undefined,
          shopId: undefined,
          identityProvider: auth0User.sub?.split('|')[0] || '',
        };
        setUserProfile(fallbackProfile);
        setBackendUnavailable(false);
        setBackendError(null);
      }
    } finally {
      setProfileLoadAttempted(true);
      setBackendReconnectInProgress(false);
      syncInProgressRef.current = false;
    }
  }, [auth0User, getAccessTokenSilently, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && auth0User) {
      void syncUserProfile();
    } else if (!auth0Loading && !isAuthenticated) {
      setUserProfile(null);
      setBackendUnavailable(false);
      setBackendError(null);
      setProfileLoadAttempted(true);
    }
  }, [isAuthenticated, auth0User, auth0Loading, syncUserProfile]);

  useEffect(() => {
    if (!isAuthenticated || !backendUnavailable) {
      return;
    }

    const timer = window.setInterval(() => {
      void syncUserProfile();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [backendUnavailable, isAuthenticated, syncUserProfile]);

  const loginWithRedirect = (options?: LoginOptions) => {
    auth0LoginWithRedirect({
      authorizationParams: {
        screen_hint: options?.screen_hint,
        login_hint: options?.login_hint,
      },
      appState: {
        returnTo: window.location.pathname,
      },
    });
  };

  const loginWithSocial = (connection: string) => {
    // Social login with specific connection
    auth0LoginWithRedirect({
      authorizationParams: {
        connection: connection,
      },
      appState: {
        returnTo: window.location.pathname,
      },
    });
  };

  const logout = () => {
    // Clear all auth-related storage
    localStorage.removeItem('auth0_token');
    localStorage.removeItem('admin_auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_info');
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    setUserProfile(null);
    setBackendUnavailable(false);
    setBackendError(null);
  };

  const getAccessToken = async (): Promise<string> => {
    try {
      return await getAccessTokenSilently();
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  };

  const isAdmin = (): boolean => {
    return userProfile?.roles?.includes('SuperAdmin') || userProfile?.roles?.includes('Admin') || false;
  };

  const hasRole = (role: string): boolean => {
    return userProfile?.roles?.includes(role) || false;
  };

  const hasTenantAssociation = (): boolean => {
    // Check if user has any tenant associations (company/brand/shop)
    return !!(
      userProfile?.accountId ||
      userProfile?.shopId ||
      (userProfile?.companies && userProfile.companies.length > 0)
    );
  };

  // Function to update user profile locally after successful API update
  const updateUserProfile = (firstName: string, lastName: string) => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        firstName,
        lastName,
      });
    }
  };

  const value: Auth0ContextType = {
    isAuthenticated,
    // Only show loading while Auth0 is loading OR while we're authenticated and loading the profile
    // This ensures we don't prematurely show content before profile is ready
    isLoading: auth0Loading || (isAuthenticated && !profileLoadAttempted),
    user: userProfile,
    backendUnavailable,
    backendError,
    backendReconnectInProgress,
    retryBackendConnection: syncUserProfile,
    loginWithRedirect,
    loginWithSocial,
    logout,
    getAccessToken,
    isAdmin,
    hasRole,
    hasTenantAssociation,
    updateUserProfile,
  };

  return <Auth0Context.Provider value={value}>{children}</Auth0Context.Provider>;
};
