import { Badge, Box, Container, Paper, Stack, Text, Title } from '@mantine/core';

export function IntegrationsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Integrations</Title>
          <Text size="sm" c="dimmed">External service and gateway integrations for HQ.</Text>
        </Box>

        <Paper withBorder p="lg" radius="md">
          <Badge color="blue" variant="light" mb="sm">Planned</Badge>
          <Text size="sm" c="dimmed">
            Integration setup flows (payment gateway, delivery connectors, and webhooks) are tracked in later work packages.
          </Text>
        </Paper>
      </Stack>
    </Container>
  );
}
