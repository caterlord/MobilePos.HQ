import { Badge, Box, Card, Container, Group, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconChevronRight, IconDevices, IconPlugConnectedX, IconTruckDelivery } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const integrationSections = [
  {
    title: 'Device Settings',
    description: 'Configure POS terminals, printers/KDS, and cash drawers per shop.',
    badge: 'Active',
    color: 'blue',
    icon: IconDevices,
    path: '/integrations/device-settings',
  },
  {
    title: 'Delivery Connectors',
    description: 'Third-party delivery setup and routing controls.',
    badge: 'Planned',
    color: 'orange',
    icon: IconTruckDelivery,
    path: null,
  },
  {
    title: 'External Services',
    description: 'Payment gateway, webhooks, and partner integrations.',
    badge: 'Planned',
    color: 'gray',
    icon: IconPlugConnectedX,
    path: null,
  },
];

export function IntegrationsPage() {
  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Integrations</Title>
          <Text size="sm" c="dimmed">Manage cross-system connectivity and operational device infrastructure.</Text>
        </Box>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {integrationSections.map((section) => {
            const Icon = section.icon;
            const card = (
              <Card
                withBorder
                p="lg"
                radius="md"
                style={{
                  height: '100%',
                  background: 'white',
                }}
              >
                <Group justify="space-between" mb="md">
                  <ThemeIcon size="lg" radius="md" variant="light" color={section.color}>
                    <Icon size={18} />
                  </ThemeIcon>
                  <IconChevronRight size={16} color="#7A869A" />
                </Group>
                <Title order={3} size="h5" mb={6}>{section.title}</Title>
                <Text size="sm" c="dimmed" mb="md">{section.description}</Text>
                <Badge variant="light" color={section.color}>{section.badge}</Badge>
              </Card>
            );

            if (!section.path) {
              return <Box key={section.title}>{card}</Box>;
            }

            return (
              <Box key={section.title} component={Link} to={section.path} style={{ textDecoration: 'none', color: 'inherit' }}>
                {card}
              </Box>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
