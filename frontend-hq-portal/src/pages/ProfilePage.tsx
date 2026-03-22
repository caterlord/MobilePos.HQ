import { useState } from 'react';
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
  TextInput,
  Badge,
  Card,
  Divider,
  Alert,
  Grid,
  Box,
  Loader,
} from '@mantine/core';
import {
  IconUser,
  IconLock,
  IconBuilding,
  IconSettings,
  IconCamera,
  IconEdit,
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAuth } from '../contexts/Auth0Context';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, getAccessToken, updateUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  });

  const handleProfileUpdate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5125/api';

      const response = await fetch(`${apiUrl}/auth0/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          // Email update might require Auth0 verification
        }),
      });

      if (response.ok) {
        const updatedData = await response.json();
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsEditing(false);
        // Update the form with the new values from server
        const newFirstName = updatedData.firstName || profileForm.firstName;
        const newLastName = updatedData.lastName || profileForm.lastName;
        setProfileForm({
          firstName: newFirstName,
          lastName: newLastName,
          email: profileForm.email,
        });
        // Update the context so sidebar and other components reflect the change
        updateUserProfile(newFirstName, newLastName);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!user?.email) {
      setMessage({ type: 'error', text: 'Unable to find your email address for password reset.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5125/api';

      const response = await fetch(`${apiUrl}/auth0/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password reset email sent. Please check your inbox.' });
      } else {
        throw new Error('Failed to change password');
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send password reset email. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

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
                {user?.roles?.map((role) => (
                  <Badge key={role} size="sm" variant="light">
                    {role}
                  </Badge>
                ))}
                {user?.identityProvider && (
                  <Badge size="sm" variant="outline" color="gray">
                    {user.identityProvider === 'auth0' ? 'Email' : user.identityProvider}
                  </Badge>
                )}
              </Group>
            </div>
          </Group>
          <Button
            leftSection={<IconCamera size={16} />}
            variant="light"
            disabled
          >
            Change Photo
          </Button>
        </Group>
      </Stack>

      {/* Alert for messages */}
      {message && (
        <Alert
          icon={message.type === 'error' ? <IconAlertCircle size={16} /> : <IconCheck size={16} />}
          color={message.type === 'error' ? 'red' : 'green'}
          mb="lg"
          withCloseButton
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Tabs */}
      <Paper withBorder radius="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
              Profile
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
              Security
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
              <Group justify="space-between" mb="md">
                <Title order={4}>Personal Information</Title>
                {!isEditing ? (
                  <Button
                    leftSection={<IconEdit size={16} />}
                    variant="light"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </Button>
                ) : (
                  <Group gap="xs">
                    <Button
                      size="sm"
                      variant="light"
                      color="red"
                      leftSection={<IconX size={16} />}
                      onClick={() => {
                        setIsEditing(false);
                        setProfileForm({
                          firstName: user?.firstName || '',
                          lastName: user?.lastName || '',
                          email: user?.email || '',
                        });
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      leftSection={loading ? <Loader size={16} /> : <IconCheck size={16} />}
                      onClick={handleProfileUpdate}
                      disabled={loading}
                    >
                      Save
                    </Button>
                  </Group>
                )}
              </Group>

              <Grid>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="First Name"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    disabled={!isEditing}
                  />
                </Grid.Col>
                <Grid.Col span={{ base: 12, sm: 6 }}>
                  <TextInput
                    label="Last Name"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    disabled={!isEditing}
                  />
                </Grid.Col>
                <Grid.Col span={12}>
                  <TextInput
                    label="Email Address"
                    value={profileForm.email}
                    disabled
                    description="Email cannot be changed here. Contact support if needed."
                  />
                </Grid.Col>
              </Grid>

              <Divider />

              <Box>
                <Text size="sm" fw={500} mb="xs">Account Information</Text>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">User ID</Text>
                    <Text size="sm" ff="monospace">{user?.userId}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Identity Provider</Text>
                    <Text size="sm">{user?.identityProvider || 'auth0'}</Text>
                  </Group>
                  {user?.accountId && (
                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">Account ID</Text>
                      <Text size="sm">{user.accountId}</Text>
                    </Group>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Tabs.Panel>

          {/* Security Tab */}
          <Tabs.Panel value="security" p="xl">
            <Stack gap="lg">
              <Title order={4}>Change Password</Title>

              {user?.identityProvider && user.identityProvider !== 'auth0' ? (
                <Alert icon={<IconAlertCircle size={16} />} color="blue">
                  You signed in with {user.identityProvider}. Password management is handled by your identity provider.
                </Alert>
              ) : (
                <Stack gap="md">
                  <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                    For security, password changes are handled via Auth0 email reset flow.
                  </Alert>
                  <Button
                    onClick={handlePasswordChange}
                    disabled={loading}
                    leftSection={loading ? <Loader size={16} /> : <IconLock size={16} />}
                  >
                    Send Password Reset Email
                  </Button>
                </Stack>
              )}

              <Divider my="xl" />

              <Box>
                <Title order={4} mb="md">Two-Factor Authentication</Title>
                <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                  Two-factor authentication adds an extra layer of security to your account. This feature is coming soon.
                </Alert>
              </Box>
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
                        {user.shopId && (
                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">Shop ID</Text>
                            <Text size="sm">{user.shopId}</Text>
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
