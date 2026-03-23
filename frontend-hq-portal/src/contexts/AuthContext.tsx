import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth as useClerkAuth, useClerk, useUser } from '@clerk/react';
import { registerAccessTokenProvider } from '../lib/authToken';

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

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  backendUnavailable: boolean;
  backendError: string | null;
  backendReconnectInProgress: boolean;
  retryBackendConnection: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
  isAdmin: () => boolean;
  hasRole: (role: string) => boolean;
  hasTenantAssociation: () => boolean;
  updateUserProfile: (firstName: string, lastName: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthContext provider');
  }
  return context;
};

interface AuthContextProviderProps {
  children: React.ReactNode;
}

export const AuthContextProvider: React.FC<AuthContextProviderProps> = ({ children }) => {
  const { isLoaded: authLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoadAttempted, setProfileLoadAttempted] = useState(false);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendReconnectInProgress, setBackendReconnectInProgress] = useState(false);
  const syncInProgressRef = useRef(false);

  const isAuthenticated = authLoaded && !!isSignedIn;

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

  useEffect(() => {
    if (!authLoaded) {
      return;
    }

    registerAccessTokenProvider(
      isSignedIn
        ? async () => (await getToken()) ?? null
        : null,
    );

    return () => {
      registerAccessTokenProvider(null);
    };
  }, [authLoaded, getToken, isSignedIn]);

  const buildFallbackProfile = useCallback((): UserProfile | null => {
    if (!clerkUser) {
      return null;
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress
      ?? clerkUser.emailAddresses[0]?.emailAddress
      ?? '';

    return {
      userId: clerkUser.id,
      email,
      firstName: clerkUser.firstName ?? '',
      lastName: clerkUser.lastName ?? '',
      roles: [],
      identityProvider: 'clerk',
    };
  }, [clerkUser]);

  const syncUserProfile = useCallback(async () => {
    if (!isAuthenticated || !clerkUser || syncInProgressRef.current) {
      return;
    }

    const isInitialProfileLoad = userProfile == null;
    syncInProgressRef.current = true;
    if (isInitialProfileLoad) {
      setProfileLoadAttempted(false);
    }
    setBackendReconnectInProgress(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Missing Clerk session token');
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5125/api';

      const syncResponse = await fetch(`${apiUrl}/auth/sync-user`, {
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

      const profileResponse = await fetch(`${apiUrl}/auth/profile`, {
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
      } else {
        const fallbackProfile = buildFallbackProfile();
        if (fallbackProfile) {
          setUserProfile(fallbackProfile);
          setBackendUnavailable(false);
          setBackendError(null);
          setProfileLoadAttempted(true);
        }
      }
    } finally {
      setProfileLoadAttempted(true);
      setBackendReconnectInProgress(false);
      syncInProgressRef.current = false;
    }
  }, [buildFallbackProfile, clerkUser, getToken, isAuthenticated, userProfile]);

  useEffect(() => {
    if (!authLoaded || !userLoaded) {
      return;
    }

    if (isAuthenticated && clerkUser) {
      void syncUserProfile();
    } else {
      setUserProfile(null);
      setBackendUnavailable(false);
      setBackendError(null);
      setProfileLoadAttempted(true);
    }
  }, [authLoaded, clerkUser, isAuthenticated, syncUserProfile, userLoaded]);

  useEffect(() => {
    if (!isAuthenticated || !backendUnavailable) {
      return;
    }

    const timer = window.setInterval(() => {
      void syncUserProfile();
    }, 8000);

    return () => window.clearInterval(timer);
  }, [backendUnavailable, isAuthenticated, syncUserProfile]);

  const logout = async () => {
    localStorage.removeItem('admin_auth_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_info');
    setUserProfile(null);
    setBackendUnavailable(false);
    setBackendError(null);
    await signOut({ redirectUrl: `${window.location.origin}/login` });
  };

  const getAccessToken = async (): Promise<string> => {
    const token = await getToken();
    if (!token) {
      throw new Error('No Clerk session token available');
    }

    return token;
  };

  const isAdmin = (): boolean => {
    return userProfile?.roles?.includes('SuperAdmin') || userProfile?.roles?.includes('Admin') || false;
  };

  const hasRole = (role: string): boolean => {
    return userProfile?.roles?.includes(role) || false;
  };

  const hasTenantAssociation = (): boolean => {
    return !!(
      userProfile?.accountId
      || userProfile?.shopId
      || (userProfile?.companies && userProfile.companies.length > 0)
    );
  };

  const updateUserProfile = (firstName: string, lastName: string) => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        firstName,
        lastName,
      });
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    isLoading: !authLoaded || !userLoaded || (isAuthenticated && !profileLoadAttempted && !userProfile),
    user: userProfile,
    backendUnavailable,
    backendError,
    backendReconnectInProgress,
    retryBackendConnection: syncUserProfile,
    logout,
    getAccessToken,
    isAdmin,
    hasRole,
    hasTenantAssociation,
    updateUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
