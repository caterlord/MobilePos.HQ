import { Loader, Text } from '@mantine/core'
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
import { WorkdaySchedulePage } from './pages/operations/store-settings/WorkdaySchedulePage'
import { StoreSystemParametersPage } from './pages/operations/store-settings/StoreSystemParametersPage'
import { StoreTableSettingsPage } from './pages/operations/store-settings/StoreTableSettingsPage'
import { BackendConnectionOverlay } from './components/BackendConnectionOverlay'
import { OnlineOrderingLayout } from './pages/online-ordering/OnlineOrderingLayout'
import { OnlineOrderingMenuPage } from './pages/online-ordering/OnlineOrderingMenuPage'
import { OnlineOrderingDisplayOrderPage } from './pages/online-ordering/OnlineOrderingDisplayOrderPage'
import { OnlineOrderingModifiersPage } from './pages/online-ordering/OnlineOrderingModifiersPage'
import { OnlineOrderingCallToActionPage } from './pages/online-ordering/OnlineOrderingCallToActionPage'
import { OnlineOrderingSettingsPage } from './pages/online-ordering/OnlineOrderingSettingsPage'
import { OnlineOrderingChannelMappingPage } from './pages/online-ordering/OnlineOrderingChannelMappingPage'
import { OnlineOrderingMenuCombinationsPage } from './pages/online-ordering/OnlineOrderingMenuCombinationsPage'
import { OnlineOrderingUiI18nPage } from './pages/online-ordering/OnlineOrderingUiI18nPage'
import { PosSettingsPage } from './pages/operations/pos-settings/PosSettingsPage'
import { PaymentMethodsPage } from './pages/operations/pos-settings/PaymentMethodsPage'
import { TaxSurchargePage } from './pages/operations/pos-settings/TaxSurchargePage'
import { DepartmentsPage } from './pages/operations/pos-settings/DepartmentsPage'
import { ReasonsPage } from './pages/operations/pos-settings/ReasonsPage'
import { PosUsersPage } from './pages/operations/pos-settings/PosUsersPage'

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

  // Hard redirect: only if Clerk is loaded and user is NOT signed in
  if (isLoaded && !isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // Onboarding redirect: only if fully loaded and no tenant
  if (isLoaded && isAuthenticated && user && requireTenant && !hasTenantAssociation()) {
    return <Navigate to="/onboarding" replace />;
  }

  // Always render children. Show loading/syncing as overlays, never as replacements.
  const showLoadingOverlay = authLoading || userLoading || (isAuthenticated && !user);

  return (
    <>
      {children}
      {showLoadingOverlay && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 3000, padding: '8px 0',
          display: 'flex', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'white', borderRadius: 8, padding: '8px 20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 10,
            pointerEvents: 'auto',
          }}>
            <Loader size={16} color="blue" />
            <Text size="sm" c="dimmed">
              {authLoading ? 'Loading authentication...' : 'Syncing your profile...'}
            </Text>
          </div>
        </div>
      )}
      {backendUnavailable && (
        <BackendConnectionOverlay
          message={backendError}
          reconnecting={backendReconnectInProgress}
          onRetry={retryBackendConnection}
          onLogout={logout}
        />
      )}
    </>
  );
}

// App Content with Clerk hooks available
function AppContent() {
  const { isSignedIn } = useClerkAuth();
  const isAuthenticated = !!isSignedIn;

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
        <Route path="store-settings/workday" element={<WorkdaySchedulePage />} />
        <Route path="store-settings/workday-schedule" element={<Navigate to="/store-settings/workday" replace />} />
        <Route path="store-settings/workday-periods" element={<Navigate to="/store-settings/workday" replace />} />
        <Route path="store-settings/system-parameters" element={<StoreSystemParametersPage />} />
        <Route path="store-settings/tables" element={<StoreTableSettingsPage />} />
        <Route path="settings" element={<Navigate to="/store-settings" replace />} />
        <Route path="pos-settings" element={<PosSettingsPage />} />
        <Route path="pos-settings/payment-methods" element={<PaymentMethodsPage />} />
        <Route path="pos-settings/tax-surcharge" element={<TaxSurchargePage />} />
        <Route path="pos-settings/departments" element={<DepartmentsPage />} />
        <Route path="pos-settings/reasons" element={<ReasonsPage />} />
        <Route path="pos-settings/pos-users" element={<PosUsersPage />} />
        <Route path="menus" element={<MenuPage />} />
        <Route path="menus/categories" element={<MenuCategoriesPage />} />
        <Route path="menus/smart-categories" element={<SmartCategoriesPage />} />
        <Route path="menus/items" element={<MenuItemsPage />} />
        <Route path="menus/modifiers" element={<ModifierGroupsPage />} />
        <Route path="menus/meal-set" element={<MealSetPage />} />
        <Route path="menus/promotions" element={<PromotionsPage />} />
        <Route path="menus/discounts" element={<DiscountsPage />} />
        <Route path="menus/button-styles" element={<ButtonStylesPage />} />
        <Route path="online-ordering" element={<OnlineOrderingLayout />}>
          <Route index element={<Navigate to="/online-ordering/menus" replace />} />
          <Route path="menus" element={<OnlineOrderingMenuPage />} />
          <Route path="menus/display-order" element={<OnlineOrderingDisplayOrderPage />} />
          <Route path="menus/modifiers" element={<OnlineOrderingModifiersPage />} />
          <Route path="menus/call-to-action" element={<OnlineOrderingCallToActionPage />} />
          <Route path="menus/menu-combinations" element={<OnlineOrderingMenuCombinationsPage />} />
          <Route path="general-settings" element={<OnlineOrderingSettingsPage />} />
          <Route path="channel-settings" element={<OnlineOrderingChannelMappingPage />} />
          <Route path="ui-i18n" element={<OnlineOrderingUiI18nPage />} />
          <Route path="menu" element={<Navigate to="/online-ordering/menus" replace />} />
          <Route path="display-order" element={<Navigate to="/online-ordering/menus/display-order" replace />} />
          <Route path="modifiers" element={<Navigate to="/online-ordering/menus/modifiers" replace />} />
          <Route path="call-to-action" element={<Navigate to="/online-ordering/menus/call-to-action" replace />} />
          <Route path="settings" element={<Navigate to="/online-ordering/general-settings" replace />} />
          <Route path="channel-mapping" element={<Navigate to="/online-ordering/channel-settings" replace />} />
          <Route path="menu-combinations" element={<Navigate to="/online-ordering/menus/menu-combinations" replace />} />
        </Route>
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
