import { lazy, Suspense } from 'react'
import { Loader, Text, Group } from '@mantine/core'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth as useClerkAuth } from '@clerk/react'
import { ClerkProviderWithRoutes } from './components/ClerkProviderWithRoutes'
import { AuthContextProvider, useAuth } from './contexts/AuthContext'
import { BrandProvider } from './contexts/BrandContext'
import { BookmarkProvider } from './contexts/BookmarkContext'
import { BackendConnectionOverlay } from './components/BackendConnectionOverlay'
import { LoadingSpinner } from './components/LoadingSpinner'

// Eagerly loaded (needed on every page)
import { DashboardLayout } from './layouts/DashboardLayout'
import { LoginPage } from './pages/LoginPage'

// Lazy-loaded pages (code-split into separate chunks)
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage').then(m => ({ default: m.AccountSettingsPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const OrganizationManagementPage = lazy(() => import('./pages/OrganizationManagementPage').then(m => ({ default: m.OrganizationManagementPage })))
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage })))
const DeviceSettingsPage = lazy(() => import('./pages/integrations/DeviceSettingsPage').then(m => ({ default: m.DeviceSettingsPage })))
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'))
const PosPage = lazy(() => import('./pages/PosPage').then(m => ({ default: m.PosPage })))
const MenuPage = lazy(() => import('./pages/MenuPage').then(m => ({ default: m.MenuPage })))
const MenuCategoriesPage = lazy(() => import('./pages/operations/menu/MenuCategoriesPage').then(m => ({ default: m.MenuCategoriesPage })))
const ButtonStylesPage = lazy(() => import('./pages/operations/menu/ButtonStyles'))
const MenuItemsPage = lazy(() => import('./pages/operations/menu/MenuItems'))
const ModifierGroupsPage = lazy(() => import('./pages/operations/menu/ModifierGroupsPage').then(m => ({ default: m.ModifierGroupsPage })))
const MealSetPage = lazy(() => import('./pages/operations/menu/MealSetPage').then(m => ({ default: m.MealSetPage })))
const PromotionsPage = lazy(() => import('./pages/operations/menu/PromotionsPage').then(m => ({ default: m.PromotionsPage })))
const DiscountsPage = lazy(() => import('./pages/operations/menu/DiscountsPage').then(m => ({ default: m.DiscountsPage })))
const SmartCategoriesPage = lazy(() => import('./pages/operations/menu/smart-categories').then(m => ({ default: m.SmartCategoriesPage })))
const StoreSettingsOverviewPage = lazy(() => import('./pages/operations/store-settings/StoreSettingsOverviewPage').then(m => ({ default: m.StoreSettingsOverviewPage })))
const StoreInfoSettingsPage = lazy(() => import('./pages/operations/store-settings/StoreInfoSettingsPage').then(m => ({ default: m.StoreInfoSettingsPage })))
const WorkdaySchedulePage = lazy(() => import('./pages/operations/store-settings/WorkdaySchedulePage').then(m => ({ default: m.WorkdaySchedulePage })))
const StoreSystemParametersPage = lazy(() => import('./pages/operations/store-settings/StoreSystemParametersPage').then(m => ({ default: m.StoreSystemParametersPage })))
const StoreTableSettingsPage = lazy(() => import('./pages/operations/store-settings/StoreTableSettingsPage').then(m => ({ default: m.StoreTableSettingsPage })))
const OnlineOrderingLayout = lazy(() => import('./pages/online-ordering/OnlineOrderingLayout').then(m => ({ default: m.OnlineOrderingLayout })))
const OnlineOrderingMenuPage = lazy(() => import('./pages/online-ordering/OnlineOrderingMenuPage').then(m => ({ default: m.OnlineOrderingMenuPage })))
const OnlineOrderingDisplayOrderPage = lazy(() => import('./pages/online-ordering/OnlineOrderingDisplayOrderPage').then(m => ({ default: m.OnlineOrderingDisplayOrderPage })))
const OnlineOrderingModifiersPage = lazy(() => import('./pages/online-ordering/OnlineOrderingModifiersPage').then(m => ({ default: m.OnlineOrderingModifiersPage })))
const OnlineOrderingCallToActionPage = lazy(() => import('./pages/online-ordering/OnlineOrderingCallToActionPage').then(m => ({ default: m.OnlineOrderingCallToActionPage })))
const OnlineOrderingSettingsPage = lazy(() => import('./pages/online-ordering/OnlineOrderingSettingsPage').then(m => ({ default: m.OnlineOrderingSettingsPage })))
const OnlineOrderingChannelMappingPage = lazy(() => import('./pages/online-ordering/OnlineOrderingChannelMappingPage').then(m => ({ default: m.OnlineOrderingChannelMappingPage })))
const OnlineOrderingMenuCombinationsPage = lazy(() => import('./pages/online-ordering/OnlineOrderingMenuCombinationsPage').then(m => ({ default: m.OnlineOrderingMenuCombinationsPage })))
const OnlineOrderingUiI18nPage = lazy(() => import('./pages/online-ordering/OnlineOrderingUiI18nPage').then(m => ({ default: m.OnlineOrderingUiI18nPage })))
const PosSettingsPage = lazy(() => import('./pages/operations/pos-settings/PosSettingsPage').then(m => ({ default: m.PosSettingsPage })))
const PaymentMethodsPage = lazy(() => import('./pages/operations/pos-settings/PaymentMethodsPage').then(m => ({ default: m.PaymentMethodsPage })))
const TaxSurchargePage = lazy(() => import('./pages/operations/pos-settings/TaxSurchargePage').then(m => ({ default: m.TaxSurchargePage })))
const DepartmentsPage = lazy(() => import('./pages/operations/pos-settings/DepartmentsPage').then(m => ({ default: m.DepartmentsPage })))
const ReasonsPage = lazy(() => import('./pages/operations/pos-settings/ReasonsPage').then(m => ({ default: m.ReasonsPage })))
const PosUsersPage = lazy(() => import('./pages/operations/pos-settings/PosUsersPage').then(m => ({ default: m.PosUsersPage })))

// Suspense fallback for lazy-loaded pages
function PageLoader() {
  return (
    <Group justify="center" py="xl">
      <Loader size="sm" />
      <Text size="sm" c="dimmed">Loading page...</Text>
    </Group>
  )
}

// Track if user was ever fully loaded in this page lifecycle.
let _hasEverAuthenticated = false;

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

  // Mark once user is fully authenticated
  if (isAuthenticated && user) {
    _hasEverAuthenticated = true;
  }

  // INITIAL LOAD: block rendering until auth is ready (prevents 401 race conditions)
  if (!_hasEverAuthenticated) {
    if (authLoading || userLoading) {
      return <LoadingSpinner message="Loading your profile..." />;
    }
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (!user) {
      return <LoadingSpinner message="Syncing your profile..." />;
    }
    if (requireTenant && !hasTenantAssociation()) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // Hard redirect: only if Clerk confirms user is NOT signed in
  if (isLoaded && !isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // RE-SYNC: render children + non-blocking banner on top
  const showSyncBanner = _hasEverAuthenticated && (authLoading || userLoading || (isAuthenticated && !user));

  return (
    <>
      {children}
      {showSyncBanner && (
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
            <Text size="sm" c="dimmed">Reconnecting...</Text>
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
          <Suspense fallback={<PageLoader />}><OnboardingWizard /></Suspense>
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
