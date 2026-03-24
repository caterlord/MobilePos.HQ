import {
  Container,
  Paper,
  Tabs,
  Stack,
  Title,
  Text,
  Avatar,
  Group,
  Button,
  Badge,
  Card,
  Alert,
  Box,
} from '@mantine/core';
import {
  IconUser,
  IconBuilding,
  IconSettings,
  IconAlertCircle,
  IconExternalLink,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'User';
  };

  return (
    <Container size="lg" py="xl">
      {/* Header */}
      <Stack gap="xl" mb="xl">
        <Group justify="space-between" align="start">
          <Group>
            <Avatar size={80} radius="xl" color="indigo">
              {getInitials()}
            </Avatar>
            <div>
              <Title order={2}>{getDisplayName()}</Title>
              <Text size="sm" c="dimmed">{user?.email}</Text>
              <Group gap="xs" mt="xs">
                {user?.identityProvider && (
                  <Badge size="sm" variant="outline" color="gray">
                    {user.identityProvider}
                  </Badge>
                )}
              </Group>
            </div>
          </Group>
          <Button
            leftSection={<IconExternalLink size={16} />}
            variant="light"
            onClick={() => navigate('/account')}
          >
            Manage Account
          </Button>
        </Group>
      </Stack>

      {/* Tabs */}
      <Paper withBorder radius="md">
        <Tabs defaultValue="profile">
          <Tabs.List>
            <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
              Profile
            </Tabs.Tab>
            <Tabs.Tab value="organization" leftSection={<IconBuilding size={16} />}>
              Organization
            </Tabs.Tab>
            <Tabs.Tab value="preferences" leftSection={<IconSettings size={16} />}>
              Preferences
            </Tabs.Tab>
          </Tabs.List>

          {/* Profile Tab */}
          <Tabs.Panel value="profile" p="xl">
            <Stack gap="lg">
              <Title order={4}>Account Overview</Title>

              <Box>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Name</Text>
                    <Text size="sm">{getDisplayName()}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Email</Text>
                    <Text size="sm">{user?.email}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Identity Provider</Text>
                    <Text size="sm">{user?.identityProvider || 'clerk'}</Text>
                  </Group>
                  {user?.userId && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">User ID</Text>
                      <Text size="sm" ff="monospace">{user.userId}</Text>
                    </Group>
                  )}
                </Stack>
              </Box>

              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                To edit your profile, email, password, or security settings, use the{' '}
                <Text component="span" fw={600} style={{ cursor: 'pointer' }} onClick={() => navigate('/account')}>
                  Account Settings
                </Text>{' '}
                page managed by Clerk.
              </Alert>
            </Stack>
          </Tabs.Panel>

          {/* Organization Tab */}
          <Tabs.Panel value="organization" p="xl">
            <Stack gap="lg">
              <Title order={4}>Organization Details</Title>

              {user?.companies && user.companies.length > 0 ? (
                <Stack gap="md">
                  {user.companies.map((company) => (
                    <Card key={company.companyId} withBorder p="md">
                      <Group justify="space-between" mb="sm">
                        <Group>
                          <IconBuilding size={20} />
                          <Text fw={500}>{company.name || `Company #${company.companyId}`}</Text>
                        </Group>
                        <Badge color={company.isActive ? 'green' : 'gray'}>
                          {company.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Group>
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" c="dimmed">Role</Text>
                          <Badge variant="light">{company.role}</Badge>
                        </Group>
                        {company.acceptedAt && (
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">Joined</Text>
                            <Text size="sm">{new Date(company.acceptedAt).toLocaleDateString()}</Text>
                          </Group>
                        )}
                      </Stack>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  You are not associated with any organization. Please complete the onboarding process.
                  <Button
                    variant="light"
                    size="sm"
                    mt="md"
                    onClick={() => navigate('/onboarding')}
                  >
                    Go to Onboarding
                  </Button>
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Preferences Tab */}
          <Tabs.Panel value="preferences" p="xl">
            <Stack gap="lg">
              <Title order={4}>Preferences</Title>
              <Alert icon={<IconSettings size={16} />} color="blue">
                Preference settings such as language, timezone, and notifications are coming soon.
              </Alert>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
    </Container>
  );
}
