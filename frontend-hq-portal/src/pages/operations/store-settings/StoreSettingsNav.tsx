import { Anchor, Box, Breadcrumbs, Button, Group, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { storeSettingsSections } from './storeSettingsSections';

export function StoreSettingsBreadcrumbs({ currentTitle }: { currentTitle: string }) {
  const navigate = useNavigate();

  return (
    <Breadcrumbs separator={<IconChevronRight size={14} />}>
      <Anchor c="dimmed" onClick={() => navigate('/')}>Home</Anchor>
      <Anchor c="dimmed" onClick={() => navigate('/store-settings')}>Store Settings</Anchor>
      <Text fw={500}>{currentTitle}</Text>
    </Breadcrumbs>
  );
}

export function StoreSettingsSubNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box>
      <Group gap="xs">
        {storeSettingsSections.map((section) => (
          <Button
            key={section.path}
            size="xs"
            variant={location.pathname === section.path ? 'filled' : 'light'}
            onClick={() => navigate(section.path)}
          >
            {section.title}
          </Button>
        ))}
      </Group>
    </Box>
  );
}
