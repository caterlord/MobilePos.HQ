import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Auth0ProviderWithHistory } from './components/Auth0ProviderWithHistory'
import { Auth0ContextProvider, useAuth } from './contexts/Auth0Context'
import { BrandProvider } from './contexts/BrandContext'
import { BookmarkProvider } from './contexts/BookmarkContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardLayout } from './layouts/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { OrganizationManagementPage } from './pages/OrganizationManagementPage'
import OnboardingWizard from './pages/OnboardingWizard'
import { MenuPage } from './pages/MenuPage'
import { PosPage } from './pages/PosPage'
import { MenuCategoriesPage } from './pages/operations/menu/MenuCategoriesPage'
import ButtonStylesPage from './pages/operations/menu/ButtonStyles'
import MenuItemsPage from './pages/operations/menu/MenuItems'
import { SmartCategoriesPage } from './pages/operations/menu/smart-categories'
import { LoadingSpinner } from './components/LoadingSpinner'
import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'

// Protected Route Component
function ProtectedRoute({ children, requireTenant = true }: { children: React.ReactNode, requireTenant?: boolean }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth0();
  const { user, isLoading: userLoading, hasTenantAssociation } = useAuth();

  // Show loading while Auth0 or user profile is loading
  if (authLoading || userLoading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Wait for user profile to be loaded
  if (isAuthenticated && !user) {
    return <LoadingSpinner message="Syncing your profile..." />;
  }

  // Check tenant association if required
  if (requireTenant && user && !hasTenantAssociation()) {
    return <Navigate to="/onboarding" replace />;
  }

  // Both auth and user profile are ready
  return <>{children}</>;
}

// Callback Component for Auth0
function CallbackPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth0();
  const { user, isLoading: userLoading, hasTenantAssociation } = useAuth();

  useEffect(() => {
    // Wait for both Auth0 authentication and user profile sync
    if (!isLoading && !userLoading) {
      if (isAuthenticated && user) {
        // Check if user has tenant association
        if (hasTenantAssociation()) {
          // Has tenant, go to dashboard
          navigate('/', { replace: true });
        } else {
          // No tenant, go to onboarding
          navigate('/onboarding', { replace: true });
        }
      } else if (!isAuthenticated && !isLoading) {
        // Authentication failed, go back to login
        navigate('/login', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, user, userLoading, hasTenantAssociation, navigate]);

  return <LoadingSpinner message="Completing sign in..." />;
}

// App Content with Auth0 hooks available
function AppContent() {
  const { isAuthenticated } = useAuth0();

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" replace />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route path="/onboarding" element={
        <ProtectedRoute requireTenant={false}>
          <OnboardingWizard />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="organization-management" element={<OrganizationManagementPage />} />
        <Route path="menus" element={<MenuPage />} />
        <Route path="menus/categories" element={<MenuCategoriesPage />} />
        <Route path="menus/smart-categories" element={<SmartCategoriesPage />} />
        <Route path="menus/items" element={<MenuItemsPage />} />
        <Route path="menus/button-styles" element={<ButtonStylesPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Auth0ProviderWithHistory>
        <Auth0ContextProvider>
          <BrandProvider>
            <BookmarkProvider>
              <AppContent />
            </BookmarkProvider>
          </BrandProvider>
        </Auth0ContextProvider>
      </Auth0ProviderWithHistory>
    </BrowserRouter>
  )
}

export default App
