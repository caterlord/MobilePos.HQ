import { Container, Paper, Title } from '@mantine/core';
import { UserProfile } from '@clerk/react';

export function AccountSettingsPage() {
  return (
    <Container size="lg" py="xl">
      <Title order={2} mb="lg">
        Account Settings
      </Title>
      <Paper withBorder radius="md" p="md">
        <UserProfile path="/account" routing="path" />
      </Paper>
    </Container>
  );
}
