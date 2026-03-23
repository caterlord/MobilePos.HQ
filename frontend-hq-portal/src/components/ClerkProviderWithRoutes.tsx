import React from 'react';
import { ClerkProvider } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { clerkConfig } from '../config/clerk';

interface ClerkProviderWithRoutesProps {
  children: React.ReactNode;
}

export const ClerkProviderWithRoutes: React.FC<ClerkProviderWithRoutesProps> = ({ children }) => {
  const navigate = useNavigate();

  if (!clerkConfig.publishableKey) {
    throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set');
  }

  return (
    <ClerkProvider
      publishableKey={clerkConfig.publishableKey}
      signInUrl={clerkConfig.signInUrl}
      signUpUrl={clerkConfig.signUpUrl}
      afterSignOutUrl={clerkConfig.signInUrl}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
};
