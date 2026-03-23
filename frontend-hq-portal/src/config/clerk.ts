export const clerkConfig = {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  signInUrl: '/login',
  signUpUrl: '/sign-up',
  fallbackRedirectUrl: '/',
};
