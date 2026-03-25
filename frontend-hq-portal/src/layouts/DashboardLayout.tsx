import { Suspense, useState } from 'react'
import { Box, Group, TextInput, ActionIcon, Burger, Tooltip, Modal, Stack, Text, Loader } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'
import { AutoBreadcrumb } from '../components/AutoBreadcrumb'
import {
  IconSearch,
  IconHelp,
  IconBell,
  IconSettings,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
} from '@tabler/icons-react'

export function DashboardLayout() {
  const [mobileSidebarOpened, { toggle: toggleMobileSidebar }] = useDisclosure(false)
  const [searchModalOpened, { open: openSearchModal, close: closeSearchModal }] = useDisclosure(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleOpenSearch = () => {
    setSearchQuery('')
    openSearchModal()
  }

  return (
    <Box style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar - Fixed, full height - Desktop */}
      <Box
        visibleFrom="sm"
        style={{
          width: isSidebarCollapsed ? 0 : 260,
          flexShrink: 0,
          borderRight: isSidebarCollapsed ? 'none' : '1px solid #E3E8EE',
          backgroundColor: 'white',
          overflow: 'hidden',
          transition: 'width 160ms ease',
        }}
        aria-hidden={isSidebarCollapsed}
      >
        {!isSidebarCollapsed && (
          <Box style={{ width: 260, height: '100%' }} p="md">
            <Sidebar />
          </Box>
        )}
      </Box>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpened && (
        <Box
          hiddenFrom="sm"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
          }}
          onClick={toggleMobileSidebar}
        >
          <Box
            style={{
              width: 260,
              height: '100%',
              backgroundColor: 'white',
              borderRight: '1px solid #E3E8EE',
            }}
            p="md"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar onClose={toggleMobileSidebar} />
          </Box>
        </Box>
      )}

      {/* Main Content Area */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Header - only above main content */}
        <Box
          style={{
            height: 60,
            borderBottom: '1px solid #E3E8EE',
            backgroundColor: 'white',
            flexShrink: 0,
          }}
        >
          <Group
            h="100%"
            px="md"
            gap="md"
            justify="space-between"
            style={{ flex: 1 }}
          >
            <Group gap="sm" style={{ flex: 1, minWidth: 0 }} align="center">
              <Burger opened={mobileSidebarOpened} onClick={toggleMobileSidebar} hiddenFrom="sm" size="sm" />

              <Tooltip
                label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                withArrow
              >
                <ActionIcon
                  visibleFrom="sm"
                  variant={isSidebarCollapsed ? 'filled' : 'light'}
                  color={isSidebarCollapsed ? 'indigo' : 'gray'}
                  size="lg"
                  aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  aria-pressed={isSidebarCollapsed}
                  onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                >
                  {isSidebarCollapsed ? (
                    <IconLayoutSidebarLeftExpand size={18} />
                  ) : (
                    <IconLayoutSidebarLeftCollapse size={18} />
                  )}
                </ActionIcon>
              </Tooltip>

              <Box visibleFrom="sm" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <AutoBreadcrumb />
              </Box>
            </Group>

            <Group gap="xs">
              <Tooltip label="Search (/)" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={handleOpenSearch}
                  aria-label="Open search"
                >
                  <IconSearch size={20} />
                </ActionIcon>
              </Tooltip>

              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconHelp size={20} />
              </ActionIcon>

              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconBell size={20} />
              </ActionIcon>

              <ActionIcon variant="subtle" color="gray" size="lg">
                <IconSettings size={20} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>

        <Modal
          opened={searchModalOpened}
          onClose={closeSearchModal}
          title="Search"
          centered
          size="md"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <Stack>
              <TextInput
                autoFocus
                placeholder="Search across the portal"
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.currentTarget.value)}
              />
              <Text size="sm" c="dimmed">
                Global search is under construction.
              </Text>
            </Stack>
          </form>
        </Modal>

        {/* Scrollable Content */}
        <Box
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#F6F9FC',
          }}
        >
          <Suspense fallback={
            <Group justify="center" py="xl">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading page...</Text>
            </Group>
          }>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  )
}
