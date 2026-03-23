import { Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const sections = [
  { label: 'Menu', path: '/online-ordering/menu' },
  { label: 'Menu Display Order', path: '/online-ordering/display-order' },
  { label: 'Modifier', path: '/online-ordering/modifiers' },
  { label: 'Call To Action', path: '/online-ordering/call-to-action' },
  { label: 'General Settings', path: '/online-ordering/settings' },
  { label: 'Channel Mapping', path: '/online-ordering/channel-mapping' },
  { label: 'Menu Combinations', path: '/online-ordering/menu-combinations' },
  { label: 'UI i18n', path: '/online-ordering/ui-i18n' },
];

export function OnlineOrderingLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box>
      <Box
        pt="xl"
        px="xl"
        pb="lg"
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #E3E8EE',
        }}
      >
        <Container size="xl">
          <Stack gap="md">
            <div>
              <Title order={1} size={28} fw={600}>
                Online Ordering
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Manage the ODO storefront menu, ordering channels, CTA content, and translated UI payloads.
              </Text>
            </div>
            <Group gap="xs">
              {sections.map((section) => {
                const active =
                  location.pathname === section.path || (section.path !== '/online-ordering/menu' && location.pathname.startsWith(section.path));
                return (
                  <Button
                    key={section.path}
                    variant={active ? 'filled' : 'light'}
                    color={active ? 'indigo' : 'gray'}
                    radius="xl"
                    onClick={() => navigate(section.path)}
                  >
                    {section.label}
                  </Button>
                );
              })}
            </Group>
          </Stack>
        </Container>
      </Box>

      <Box p="xl" style={{ backgroundColor: '#F6F9FC', minHeight: 'calc(100vh - 220px)' }}>
        <Container size="xl">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
