import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/react'
import { ClerkProviderWithRoutes } from './components/ClerkProviderWithRoutes'
import { AuthContextProvider, useAuth } from './contexts/AuthContext'
import { BrandProvider } from './contexts/BrandContext'
import { BookmarkProvider } from './contexts/BookmarkContext'
import { LoginPage } from './pages/LoginPage'
import { AccountSettingsPage } from './pages/AccountSettingsPage'
import { DashboardLayout } from './layouts/DashboardLayout'
import { DashboardPage } from './pages/DashboardPage'
import { ProfilePage } from './pages/ProfilePage'
import { OrganizationManagementPage } from './pages/OrganizationManagementPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { DeviceSettingsPage } from './pages/integrations/DeviceSettingsPage'
import OnboardingWizard from './pages/OnboardingWizard'
import { MenuPage } from './pages/MenuPage'
import { PosPage } from './pages/PosPage'
import { MenuCategoriesPage } from './pages/operations/menu/MenuCategoriesPage'
import ButtonStylesPage from './pages/operations/menu/ButtonStyles'
import MenuItemsPage from './pages/operations/menu/MenuItems'
import { ModifierGroupsPage } from './pages/operations/menu/ModifierGroupsPage'
import { MealSetPage } from './pages/operations/menu/MealSetPage'
import { PromotionsPage } from './pages/operations/menu/PromotionsPage'
import { DiscountsPage } from './pages/operations/menu/DiscountsPage'
import { SmartCategoriesPage } from './pages/operations/menu/smart-categories'
import { StoreSettingsOverviewPage } from './pages/operations/store-settings/StoreSettingsOverviewPage'
import { StoreInfoSettingsPage } from './pages/operations/store-settings/StoreInfoSettingsPage'
import { StoreWorkdaySchedulePage } from './pages/operations/store-settings/StoreWorkdaySchedulePage'
import { StoreWorkdayPeriodsPage } from './pages/operations/store-settings/StoreWorkdayPeriodsPage'
import { StoreSystemParametersPage } from './pages/operations/store-settings/StoreSystemParametersPage'
import { StoreTableSettingsPage } from './pages/operations/store-settings/StoreTableSettingsPage'
import { LoadingSpinner } from './components/LoadingSpinner'
import { BackendConnectionOverlay } from './components/BackendConnectionOverlay'

// Protected Route Component
function ProtectedRoute({ children, requireTenant = true }: { children: React.ReactNode, requireTenant?: boolean }) {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const {
    user,
    isLoading: userLoading,
    hasTenantAssociation,
    backendUnavailable,
    backendError,
    backendReconnectInProgress,
    retryBackendConnection,
    logout,
  } = useAuth();
  const isAuthenticated = !!isSignedIn;
  const authLoading = !isLoaded;

  if (backendUnavailable) {
    return (
      <BackendConnectionOverlay
        message={backendError}
        reconnecting={backendReconnectInProgress}
        onRetry={retryBackendConnection}
        onLogout={logout}
      />
    );
  }

  // Show loading while Clerk or user profile is loading
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

// App Content with Clerk hooks available
function AppContent() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const isAuthenticated = !!isSignedIn;

  if (!isLoaded) {
    return <LoadingSpinner message="Loading authentication..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <LoginPage mode="sign-in" /> : <Navigate to="/" replace />} />
      <Route path="/sign-up" element={!isAuthenticated ? <LoginPage mode="sign-up" /> : <Navigate to="/" replace />} />
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
        <Route path="account/*" element={<AccountSettingsPage />} />
        <Route path="pos" element={<PosPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="organization-management" element={<OrganizationManagementPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="integrations/device-settings" element={<DeviceSettingsPage />} />
        <Route path="store-settings" element={<StoreSettingsOverviewPage />} />
        <Route path="store-settings/info" element={<StoreInfoSettingsPage />} />
        <Route path="store-settings/workday-schedule" element={<StoreWorkdaySchedulePage />} />
        <Route path="store-settings/workday-periods" element={<StoreWorkdayPeriodsPage />} />
        <Route path="store-settings/system-parameters" element={<StoreSystemParametersPage />} />
        <Route path="store-settings/tables" element={<StoreTableSettingsPage />} />
        <Route path="settings" element={<Navigate to="/store-settings" replace />} />
        <Route path="menus" element={<MenuPage />} />
        <Route path="menus/categories" element={<MenuCategoriesPage />} />
        <Route path="menus/smart-categories" element={<SmartCategoriesPage />} />
        <Route path="menus/items" element={<MenuItemsPage />} />
        <Route path="menus/modifiers" element={<ModifierGroupsPage />} />
        <Route path="menus/meal-set" element={<MealSetPage />} />
        <Route path="menus/promotions" element={<PromotionsPage />} />
        <Route path="menus/discounts" element={<DiscountsPage />} />
        <Route path="menus/button-styles" element={<ButtonStylesPage />} />
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ClerkProviderWithRoutes>
        <AuthContextProvider>
          <BrandProvider>
            <BookmarkProvider>
              <AppContent />
            </BookmarkProvider>
          </BrandProvider>
        </AuthContextProvider>
      </ClerkProviderWithRoutes>
    </BrowserRouter>
  )
}

export default App
