import { Box, Container, Title, Text, SimpleGrid, Card, Group, Badge, Stack, ThemeIcon } from '@mantine/core'
import { IconDevices, IconUsers, IconReceipt, IconSettings, IconChevronRight } from '@tabler/icons-react'

const posHighlights = [
  {
    title: 'Live Orders',
    description: 'Track in-store orders and tables in real time.',
    badge: 'Active now',
    icon: IconReceipt,
    color: 'blue',
  },
  {
    title: 'Stations & Devices',
    description: 'Manage terminals, printers, and kitchen displays.',
    badge: '4 devices',
    icon: IconDevices,
    color: 'teal',
  },
  {
    title: 'Staff Sessions',
    description: 'Review shifts, cash drawers, and permissions.',
    badge: '2 on duty',
    icon: IconUsers,
    color: 'grape',
  },
  {
    title: 'POS Settings',
    description: 'Configure receipts, taxes, and hardware defaults.',
    badge: 'Review',
    icon: IconSettings,
    color: 'orange',
  },
]

export function PosPage() {
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
          <Title order={1} size={28} fw={600}>
            POS System
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            Launch and manage your point-of-sale operations from one place.
          </Text>
        </Container>
      </Box>

      <Box p="xl" style={{ backgroundColor: '#F6F9FC', minHeight: 'calc(100vh - 200px)' }}>
        <Container size="xl">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
              {posHighlights.map((item) => {
                const Icon = item.icon
                return (
                  <Card
                    key={item.title}
                    shadow="sm"
                    padding="lg"
                    radius="md"
                    style={{
                      border: '1px solid #E3E8EE',
                      backgroundColor: 'white',
                    }}
                  >
                    <Group justify="space-between" mb="md">
                      <ThemeIcon size="xl" radius="md" variant="light" color={item.color}>
                        <Icon size={22} />
                      </ThemeIcon>
                      <IconChevronRight size={18} style={{ color: '#697386' }} />
                    </Group>
                    <Title order={3} size={16} fw={600} mb={6}>
                      {item.title}
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                      {item.description}
                    </Text>
                    <Badge size="sm" variant="light" color={item.color} style={{ textTransform: 'none' }}>
                      {item.badge}
                    </Badge>
                  </Card>
                )
              })}
            </SimpleGrid>

            <Card padding="xl" radius="md" style={{ border: '1px dashed #E3E8EE', backgroundColor: 'white' }}>
              <Title order={2} size={20} fw={600} mb={8}>
                POS workspace setup is in progress
              </Title>
              <Text size="sm" c="dimmed">
                We are wiring up the new POS workspace. In the meantime, use the cards above
                to review device readiness, staff sessions, and upcoming configuration steps.
              </Text>
            </Card>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}
