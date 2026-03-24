import { Box } from '@mantine/core';
import { UserProfile } from '@clerk/react';

export function AccountSettingsPage() {
  return (
    <Box py="xl" px="xl">
      <UserProfile path="/account" routing="path" />
    </Box>
  );
}
