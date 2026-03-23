import { Box, Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const sections = [
  {
    label: 'Menus',
    path: '/online-ordering/menus',
    match: (pathname: string) => pathname === '/online-ordering/menus' || pathname.startsWith('/online-ordering/menus/'),
  },
  {
    label: 'General Settings',
    path: '/online-ordering/general-settings',
    match: (pathname: string) => pathname === '/online-ordering/general-settings',
  },
  {
    label: 'Channel Settings',
    path: '/online-ordering/channel-settings',
    match: (pathname: string) => pathname === '/online-ordering/channel-settings',
  },
  {
    label: 'UI i18n',
    path: '/online-ordering/ui-i18n',
    match: (pathname: string) => pathname === '/online-ordering/ui-i18n',
  },
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
                const active = section.match(location.pathname);
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
