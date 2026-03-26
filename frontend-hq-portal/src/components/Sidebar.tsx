import { Stack, NavLink, Box, Text, UnstyledButton, Group, Collapse, Avatar, Menu, ActionIcon } from '@mantine/core'
import {
  IconHome,
  IconReceipt,
  IconUsers,
  IconPackage,
  IconLink,
  IconChevronRight,
  IconSettings,
  IconChartBar,
  IconLogout,
  IconUser,
  IconX,
  IconBuildingStore,
  IconMenu2,
  IconTable,
  IconUserCheck,
  IconClock,
  IconFileInvoice,
  IconReceiptTax,
  IconPigMoney,
  IconBoxSeam,
  IconTruckDelivery,
  IconSoup,
  IconUsersGroup,
  IconTicket,
  IconPercentage,
  IconMotorbike,
  IconDevices,
  IconCloudComputing,
  IconWallet,
  IconBuildingBank,
  IconBrandSlack,
  IconAdjustments,
  IconShoppingCart,
  IconLanguage,
  IconCategory,
  IconListDetails,
  IconToolsKitchen2,
  IconPalette,
} from '@tabler/icons-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { TenantSelector } from './TenantSelector'

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const { user, logout } = useAuth()

  // Get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    } else if (user?.email) {
      return user.email[0].toUpperCase()
    }
    return 'U'
  }

  // Get display name
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    } else if (user?.firstName) {
      return user.firstName
    } else if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  const handleLogout = () => {
    logout()
  }

  const availablePaths = useMemo(
    () =>
      new Set([
        '/',
        '/menus',
        '/menus/categories',
        '/menus/smart-categories',
        '/menus/items',
        '/menus/pos-menus',
        '/menus/modifiers',
        '/menus/meal-set',
        '/menus/promotions',
        '/menus/discounts',
        '/menus/button-styles',
        '/online-ordering',
        '/online-ordering/menus',
        '/online-ordering/menus/display-order',
        '/online-ordering/menus/modifiers',
        '/online-ordering/menus/call-to-action',
        '/online-ordering/menus/menu-combinations',
        '/online-ordering/general-settings',
        '/online-ordering/channel-settings',
        '/online-ordering/ui-i18n',
        '/online-ordering/menu',
        '/online-ordering/display-order',
        '/online-ordering/modifiers',
        '/online-ordering/call-to-action',
        '/online-ordering/settings',
        '/online-ordering/channel-mapping',
        '/online-ordering/menu-combinations',
        '/store-settings',
        '/store-settings/info',
        '/store-settings/workday',
        '/store-settings/system-parameters',
        '/store-settings/tables',
        '/pos-settings',
        '/pos-settings/payment-methods',
        '/pos-settings/tax-surcharge',
        '/pos-settings/departments',
        '/pos-settings/reasons',
        '/pos-settings/pos-users',
        '/integrations',
        '/integrations/device-settings',
        '/profile',
        '/organization-management',
      ]),
    [],
  )

  // Section 1: Common items (always visible)
  const commonItems = useMemo(
    () =>
      [
        { icon: IconHome, label: 'Home', path: '/' },
        { icon: IconReceipt, label: 'Orders', path: '/orders' },
        { icon: IconPackage, label: 'Products', path: '/products' },
        { icon: IconChartBar, label: 'Reports', path: '/reports' },
      ].filter((item) => availablePaths.has(item.path)),
    [availablePaths],
  )

  // Section 3: Full menu items (expandable)
  const fullMenuSections = useMemo(
    () =>
      [
        {
          key: 'menus',
          label: 'Menus',
          items: [
            { icon: IconCategory, label: 'Categories', path: '/menus/categories' },
            { icon: IconListDetails, label: 'Smart Categories', path: '/menus/smart-categories' },
            { icon: IconToolsKitchen2, label: 'Menu Items', path: '/menus/items' },
            { icon: IconMenu2, label: 'POS Menus', path: '/menus/pos-menus' },
            { icon: IconAdjustments, label: 'Modifiers', path: '/menus/modifiers' },
            { icon: IconPackage, label: 'Meal Set', path: '/menus/meal-set' },
            { icon: IconPercentage, label: 'Promotions', path: '/menus/promotions' },
            { icon: IconTicket, label: 'Discounts', path: '/menus/discounts' },
            { icon: IconPalette, label: 'Button Styles', path: '/menus/button-styles' },
          ],
        },
        {
          key: 'store-settings',
          label: 'Store Settings',
          items: [
            { icon: IconBuildingStore, label: 'Store Info', path: '/store-settings/info' },
            { icon: IconClock, label: 'Workday Schedule', path: '/store-settings/workday' },
            { icon: IconSettings, label: 'System Parameters', path: '/store-settings/system-parameters' },
            { icon: IconTable, label: 'Tables & Sections', path: '/store-settings/tables' },
          ],
        },
        {
          key: 'operations',
          label: 'Operations',
          items: [
            { icon: IconBuildingStore, label: 'Stores', path: '/stores' },
            { icon: IconTable, label: 'Tables', path: '/tables' },
            { icon: IconUserCheck, label: 'Staff', path: '/staff' },
            { icon: IconClock, label: 'Shifts', path: '/shifts' },
          ],
        },
        {
          key: 'pos-settings',
          label: 'POS Settings',
          items: [
            { icon: IconWallet, label: 'Payment Methods', path: '/pos-settings/payment-methods' },
            { icon: IconReceiptTax, label: 'Tax & Surcharge', path: '/pos-settings/tax-surcharge' },
            { icon: IconBoxSeam, label: 'Departments', path: '/pos-settings/departments' },
            { icon: IconFileInvoice, label: 'Reasons', path: '/pos-settings/reasons' },
            { icon: IconUsers, label: 'POS Users', path: '/pos-settings/pos-users' },
          ],
        },
        {
          key: 'finance',
          label: 'Finance',
          items: [
            { icon: IconWallet, label: 'Payments', path: '/payments' },
            { icon: IconFileInvoice, label: 'Invoices', path: '/invoices' },
            { icon: IconReceiptTax, label: 'Taxation', path: '/taxation' },
            { icon: IconPigMoney, label: 'Cash Management', path: '/cash-management' },
          ],
        },
        {
          key: 'inventory',
          label: 'Inventory',
          items: [
            { icon: IconBoxSeam, label: 'Inventory Overview', path: '/inventory' },
            { icon: IconTruckDelivery, label: 'Stock Orders', path: '/stock-orders' },
            { icon: IconPackage, label: 'Raw Materials', path: '/raw-materials' },
            { icon: IconUsers, label: 'Suppliers', path: '/suppliers' },
          ],
        },
        {
          key: 'customers',
          label: 'Customer Relations',
          items: [
            { icon: IconUsers, label: 'Customers', path: '/customers' },
            { icon: IconUsersGroup, label: 'Members', path: '/members' },
            { icon: IconTicket, label: 'Coupons', path: '/coupons' },
            { icon: IconPercentage, label: 'Promotions', path: '/promotions' },
          ],
        },
        {
          key: 'delivery',
          label: 'Delivery & Takeaway',
          items: [
            { icon: IconMotorbike, label: 'Delivery', path: '/delivery' },
            { icon: IconSoup, label: 'Kitchen Display', path: '/kitchen' },
            { icon: IconDevices, label: 'Self-Ordering', path: '/self-ordering' },
          ],
        },
        {
          key: 'online-ordering',
          label: 'Online Ordering',
          items: [
            { icon: IconCloudComputing, label: 'Menus', path: '/online-ordering/menus' },
            { icon: IconSettings, label: 'General Settings', path: '/online-ordering/general-settings' },
            { icon: IconShoppingCart, label: 'Channel Settings', path: '/online-ordering/channel-settings' },
            { icon: IconLanguage, label: 'UI i18n', path: '/online-ordering/ui-i18n' },
          ],
        },
        {
          key: 'integrations',
          label: 'Integrations',
          items: [
            { icon: IconLink, label: 'Integrations', path: '/integrations' },
            { icon: IconDevices, label: 'Device Settings', path: '/integrations/device-settings' },
            { icon: IconBuildingBank, label: 'Payment Gateway', path: '/payment-gateway' },
            { icon: IconBrandSlack, label: 'Brand Management', path: '/brand-management' },
          ],
        },
      ]
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => availablePaths.has(item.path)),
        }))
        .filter((section) => section.items.length > 0),
    [availablePaths],
  )

  const toggleSection = (key: string) => {
    setExpandedSections(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // Auto-expand sections when a subitem is active
  useEffect(() => {
    const sectionsToExpand: string[] = []

    fullMenuSections.forEach((section) => {
      const hasActiveItem = section.items.some((item) =>
        location.pathname === item.path ||
        (item.path !== '/' && location.pathname.startsWith(item.path + '/'))
      )

      if (hasActiveItem) {
        sectionsToExpand.push(section.key)
      }
    })

    if (sectionsToExpand.length > 0) {
      setExpandedSections(prev => {
        const newSections = [...new Set([...prev, ...sectionsToExpand])]
        return newSections.length === prev.length ? prev : newSections
      })
    }
  }, [location.pathname, fullMenuSections])

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Close button - Mobile only */}
      {onClose && (
        <Box mb="xs" hiddenFrom="sm">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={onClose}
          >
            <IconX size={20} />
          </ActionIcon>
        </Box>
      )}

      {/* Scrollable Content */}
      <Box style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <Stack gap={0}>
          {/* Tenant Selector */}
          <Box mb="md">
            <TenantSelector />
          </Box>

          {/* Section 1: Common Items */}
          <Box mb="sm">
            <Stack gap={0}>
              {commonItems.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <NavLink
                    key={link.path}
                    label={link.label}
                    leftSection={<link.icon size={18} stroke={1.5} />}
                    active={isActive}
                    onClick={() => navigate(link.path)}
                    styles={{
                      root: {
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 14,
                        minHeight: 32,
                      },
                      label: {
                        fontSize: 14,
                        fontWeight: isActive ? 600 : 400,
                      },
                    }}
                  />
                );
              })}
            </Stack>
          </Box>

          {/* Section 3: Management (Full Menu) */}
          <Box mb="sm">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={8} px={4}>
              Management
            </Text>
            <Stack gap={0}>
              {fullMenuSections.map((section) => (
                <Box key={section.key}>
                  <NavLink
                    label={section.label}
                    leftSection={
                      section.key === 'menus' ? <IconMenu2 size={18} stroke={1.5} /> :
                      section.key === 'store-settings' ? <IconAdjustments size={18} stroke={1.5} /> :
                      section.key === 'operations' ? <IconBuildingStore size={18} stroke={1.5} /> :
                      section.key === 'finance' ? <IconWallet size={18} stroke={1.5} /> :
                      section.key === 'inventory' ? <IconBoxSeam size={18} stroke={1.5} /> :
                      section.key === 'customers' ? <IconUsersGroup size={18} stroke={1.5} /> :
                      section.key === 'delivery' ? <IconMotorbike size={18} stroke={1.5} /> :
                      <IconLink size={18} stroke={1.5} />
                    }
                    rightSection={
                      <IconChevronRight
                        size={14}
                        style={{
                          color: '#697386',
                          transform: expandedSections.includes(section.key) ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      />
                    }
                    onClick={() => toggleSection(section.key)}
                    styles={{
                      root: {
                        borderRadius: 6,
                        padding: '6px 8px',
                        fontSize: 14,
                        minHeight: 32,
                      },
                      label: {
                        fontSize: 14,
                        fontWeight: 400,
                      },
                    }}
                  />
                  <Collapse in={expandedSections.includes(section.key)}>
                    <Box pl={32} py={2}>
                      <Stack gap={0}>
                        {section.items.map((item) => {
                          // Check if current path matches item path or starts with it (for sub-pages)
                          const isActive = location.pathname === item.path ||
                            (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                          return (
                            <NavLink
                              key={item.path}
                              label={item.label}
                              leftSection={<item.icon size={16} stroke={1.5} />}
                              active={isActive}
                              onClick={() => navigate(item.path)}
                              styles={{
                                root: {
                                  borderRadius: 6,
                                  padding: '6px 8px',
                                  fontSize: 14,
                                  minHeight: 32,
                                },
                                label: {
                                  fontSize: 14,
                                  fontWeight: isActive ? 600 : 400,
                                },
                              }}
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* User Profile - Fixed at bottom */}
      <Box
        style={{
          borderTop: '1px solid #E3E8EE',
          backgroundColor: 'white',
          paddingTop: 8,
        }}
      >
        <Menu shadow="md" width={260} position="top-start">
          <Menu.Target>
            <UnstyledButton
              w="100%"
              p="xs"
              style={(theme) => ({
                borderRadius: 8,
                '&:hover': {
                  backgroundColor: theme.colors.gray[0],
                },
              })}
            >
              <Group gap="sm">
                <Avatar
                  color="indigo"
                  radius="xl"
                  size="md"
                  style={{
                    backgroundColor: '#5469D4',
                  }}
                >
                  {getUserInitials()}
                </Avatar>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <Text size="sm" fw={600} lineClamp={1}>
                    {getDisplayName()}
                  </Text>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {user?.email || 'user@example.com'}
                  </Text>
                </Box>
                <IconChevronRight size={16} style={{ color: '#697386' }} />
              </Group>
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Account</Menu.Label>
            <Menu.Item leftSection={<IconUser size={16} />} onClick={() => navigate('/profile')}>
              Profile
            </Menu.Item>
            <Menu.Item leftSection={<IconSettings size={16} />}>
              Settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={handleLogout}>
              Logout
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
    </Box>
  )
}
