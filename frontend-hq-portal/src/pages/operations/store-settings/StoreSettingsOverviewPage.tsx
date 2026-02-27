import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Card,
  SimpleGrid,
  UnstyledButton,
  ThemeIcon,
  Anchor,
  Badge,
} from '@mantine/core';
import {
  IconAdjustments,
  IconCalendarTime,
  IconChevronRight,
  IconClockHour4,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { storeSettingsSections } from './storeSettingsSections';

const sectionIcons = [IconAdjustments, IconCalendarTime, IconClockHour4, IconSettings] as const;

export function StoreSettingsOverviewPage() {
  const navigate = useNavigate();

  return (
    <Box>
      <Box
        pt="xl"
        px="xl"
        pb="lg"
        style={{
          backgroundColor: 'white',
        }}
      >
        <Container size="xl">
          <Box mb="xl">
            <Title order={1} size={28} fw={600}>
              Store Settings
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Configure store-level operational settings used by POS X1 HQ
            </Text>
          </Box>
        </Container>
      </Box>

      <Box p="xl" style={{ backgroundColor: '#F6F9FC', minHeight: 'calc(100vh - 200px)' }}>
        <Container size="xl">
          <Stack gap="xl">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {storeSettingsSections.map((section, index) => {
                const Icon = sectionIcons[index] ?? IconSettings;

                return (
                  <UnstyledButton
                    key={section.id}
                    onClick={() => navigate(section.path)}
                    style={{ display: 'block' }}
                  >
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      style={{
                        border: '1px solid #E3E8EE',
                        backgroundColor: 'white',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          borderColor: '#5469D4',
                        },
                      }}
                    >
                      <Group justify="space-between" mb="md">
                        <ThemeIcon
                          size="xl"
                          radius="md"
                          variant="light"
                          color={section.color}
                        >
                          <Icon size={24} />
                        </ThemeIcon>
                        <IconChevronRight size={20} style={{ color: '#697386' }} />
                      </Group>

                      <Title order={3} size={18} fw={600} mb={8}>
                        {section.title}
                      </Title>

                      <Text size="sm" c="dimmed" mb="md">
                        {section.description}
                      </Text>

                      <Group justify="space-between">
                        <Badge
                          size="sm"
                          variant="light"
                          color={section.color}
                          style={{ textTransform: 'none' }}
                        >
                          {section.stats}
                        </Badge>
                        <Text size="xs" c="indigo" fw={500}>
                          Manage →
                        </Text>
                      </Group>
                    </Card>
                  </UnstyledButton>
                );
              })}
            </SimpleGrid>

            <Paper p="xl" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
              <Group justify="space-between" mb="md">
                <Title order={2} size={20} fw={600}>
                  Recent Activity
                </Title>
                <Anchor size="sm" c="indigo">
                  View all →
                </Anchor>
              </Group>

              <Stack gap="sm">
                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <Group>
                    <ThemeIcon size="md" radius="md" variant="light" color="green">
                      <IconPlus size={16} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={500}>Workday schedule updated</Text>
                      <Text size="xs" c="dimmed">Friday closing time changed to 23:00</Text>
                    </Box>
                  </Group>
                  <Text size="xs" c="dimmed">2 hours ago</Text>
                </Group>

                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <Group>
                    <ThemeIcon size="md" radius="md" variant="light" color="blue">
                      <IconAdjustments size={16} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={500}>System parameter changed</Text>
                      <Text size="xs" c="dimmed">POS_TIMEOUT set to 45 seconds</Text>
                    </Box>
                  </Group>
                  <Text size="xs" c="dimmed">5 hours ago</Text>
                </Group>

                <Group justify="space-between" p="sm">
                  <Group>
                    <ThemeIcon size="md" radius="md" variant="light" color="teal">
                      <IconClockHour4 size={16} />
                    </ThemeIcon>
                    <Box>
                      <Text size="sm" fw={500}>Workday period adjusted</Text>
                      <Text size="xs" c="dimmed">Dinner period extended by 30 minutes</Text>
                    </Box>
                  </Group>
                  <Text size="xs" c="dimmed">Yesterday</Text>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
