import { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Button,
  Container,
  Paper,
  Card,
  TextInput,
  Radio,
  Alert,
  Loader,
  Text,
  Title,
  Divider,
  Stack,
  Badge,
  Avatar,
  Group,
  Flex,
  Anchor,
} from '@mantine/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IconBuilding,
  IconBuildingStore,
  IconBuildingCommunity,
  IconUserPlus,
  IconUserCircle,
} from '@tabler/icons-react';

const steps = ['Choose Action', 'Setup Details', 'Confirmation'];

interface TenantSetup {
  companyName?: string;
  brandName?: string;
  shopName?: string;
  shopAddress?: string;
  inviteCode?: string;
}

interface ResponsePayload<T> {
  data: T | null;
  text: string;
}

async function readResponsePayload<T>(response: Response): Promise<ResponsePayload<T>> {
  const raw = await response.text();

  if (!raw) {
    return { data: null, text: '' };
  }

  try {
    return {
      data: JSON.parse(raw) as T,
      text: raw,
    };
  } catch {
    return {
      data: null,
      text: raw,
    };
  }
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getAccessToken, logout, hasTenantAssociation, isLoading, retryBackendConnection } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [action, setAction] = useState<'create' | 'join' | ''>('');
  const [tenantSetup, setTenantSetup] = useState<TenantSetup>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationDetails, setInvitationDetails] = useState<{ organizationName: string; role?: string } | null>(null);
  const [requiresEmailVerification, setRequiresEmailVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationInvitationId, setVerificationInvitationId] = useState('');
  const [verificationInfo, setVerificationInfo] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  // Check for invitation code in URL
  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    if (inviteCode) {
      setAction('join');
      setTenantSetup({ inviteCode });
      // Automatically move to step 2 when invite code is present
      setActiveStep(1);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && hasTenantAssociation()) {
      navigate('/', { replace: true });
    }
  }, [isLoading, hasTenantAssociation, navigate]);

  if (isLoading) {
    return (
      <Container size="md" mt={32} mb={32}>
        <Paper p="xl" withBorder>
          <Flex direction="column" align="center">
            <Loader size="md" />
            <Text size="sm" mt="md">
              Checking your account status...
            </Text>
          </Flex>
        </Paper>
      </Container>
    );
  }

  const handleNext = () => {
    setError('');

    if (activeStep === 0 && !action) {
      setError('Please select an action to continue');
      return;
    }

    if (activeStep === 1) {
      if (action === 'create') {
        if (!tenantSetup.companyName || !tenantSetup.brandName || !tenantSetup.shopName) {
          setError('Please fill in all required fields');
          return;
        }
      } else if (action === 'join') {
        if (!tenantSetup.inviteCode) {
          setError('Please enter an invitation code');
          return;
        }
      }
    }

    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep === 0) {
      logout();
    } else {
      setActiveStep((prevStep) => prevStep - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5125';

      const syncResponse = await fetch(`${apiUrl}/api/auth/sync-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const syncPayload = await readResponsePayload<{ message?: string }>(syncResponse);
      if (!syncResponse.ok) {
        throw new Error(syncPayload.data?.message || syncPayload.text || 'Failed to sync your account');
      }

      if (action === 'create') {
        const response = await fetch(`${apiUrl}/api/tenants/setup`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            companyName: tenantSetup.companyName,
            brandName: tenantSetup.brandName,
            shopName: tenantSetup.shopName,
            shopAddress: tenantSetup.shopAddress,
          }),
        });

        const result = await readResponsePayload<{
          message?: string;
          success?: boolean;
          companyId?: number;
          brandId?: number;
          shopId?: number;
        }>(response);

        if (!response.ok) {
          throw new Error(result.data?.message || result.text || 'Failed to create tenant setup');
        }

        console.log('Tenant setup created:', result.data ?? result.text);
        await retryBackendConnection();
        navigate('/', { replace: true });
      } else if (action === 'join') {
        const response = await fetch(`${apiUrl}/api/invitations/accept`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: tenantSetup.inviteCode,
            inviteCode: tenantSetup.inviteCode,
          }),
        });

        const result = await readResponsePayload<{
          message?: string;
          requiresEmailVerification?: boolean;
          invitationId?: string;
        }>(response);

        if (!response.ok) {
          throw new Error(result.data?.message || result.text || 'Failed to join with invitation code');
        }

        if (result.data?.requiresEmailVerification && result.data.invitationId) {
          setRequiresEmailVerification(true);
          setVerificationInvitationId(result.data.invitationId);
          setVerificationInfo(result.data.message || 'Email verification is required to complete this invitation.');
          setActiveStep(1);
          return;
        }

        console.log('Joined tenant:', result.data ?? result.text);
        await retryBackendConnection();
        navigate('/', { replace: true });
      }
    } catch (error: unknown) {
      console.error('Error in onboarding:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during setup';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const validateInviteCode = async () => {
    if (!tenantSetup.inviteCode) return;

    setLoading(true);
    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5125';
      const response = await fetch(`${apiUrl}/api/invitations/validate/${tenantSetup.inviteCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const details = await readResponsePayload<{
          organizationName?: string;
          teamName?: string;
          role?: string;
        }>(response);

        setInvitationDetails({
          organizationName: details.data?.organizationName || details.data?.teamName || 'Unknown Organization',
          role: details.data?.role,
        });
      } else {
        setError('Invalid invitation code');
        setInvitationDetails(null);
      }
    } catch (error) {
      console.error('Error validating invite code:', error);
      setError('Failed to validate invitation code');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOwnership = async () => {
    if (!verificationInvitationId) {
      setError('Invitation verification session is missing. Try accepting the invitation again.');
      return;
    }

    const trimmedCode = verificationCode.trim();
    if (!trimmedCode) {
      setError('Please enter the verification code sent to the invited email.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5125';
      const response = await fetch(`${apiUrl}/api/invitations/verify-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: verificationInvitationId,
          verificationCode: trimmedCode,
        }),
      });

      const result = await readResponsePayload<{
        message?: string;
        attemptsRemaining?: number;
      }>(response);

      if (!response.ok) {
        if (typeof result.data?.attemptsRemaining === 'number') {
          setAttemptsRemaining(result.data.attemptsRemaining);
        }
        throw new Error(result.data?.message || result.text || 'Failed to verify email');
      }

      setRequiresEmailVerification(false);
      setVerificationCode('');
      setVerificationInfo('');
      setAttemptsRemaining(null);
      await retryBackendConnection();
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify email';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationCode = async () => {
    if (!verificationInvitationId) {
      setError('Invitation verification session is missing. Try accepting the invitation again.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5125';
      const response = await fetch(`${apiUrl}/api/invitations/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId: verificationInvitationId,
        }),
      });

      const result = await readResponsePayload<{
        message?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(result.data?.message || result.text || 'Failed to resend verification code');
      }

      setVerificationInfo(result.data?.message || result.text || 'Verification code resent successfully.');
      setAttemptsRemaining(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend verification code';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Title order={3} mb="md">
              Welcome to EWHQ Portal
            </Title>
            <Text size="sm" c="dimmed" mb="xl">
              To get started, you need to either create a new organization or join an existing one.
            </Text>

            <Radio.Group
              value={action}
              onChange={(value) => setAction(value as 'create' | 'join')}
            >
              <Stack gap="md">
                <Card
                  padding="lg"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAction('create')}
                >
                  <Radio
                    value="create"
                    label={
                      <Box ml="sm">
                        <Group gap="xs" mb={4}>
                          <IconBuildingStore size={24} color="var(--mantine-color-blue-6)" />
                          <Text fw={600} size="lg">Create New Organization</Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Set up a new company, brand, and shop for your business
                        </Text>
                      </Box>
                    }
                  />
                </Card>

                <Card
                  padding="lg"
                  withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => setAction('join')}
                >
                  <Radio
                    value="join"
                    label={
                      <Box ml="sm">
                        <Group gap="xs" mb={4}>
                          <IconUserPlus size={24} color="var(--mantine-color-blue-6)" />
                          <Text fw={600} size="lg">Join Existing Organization</Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Use an invitation code to join an existing company, brand, or shop
                        </Text>
                      </Box>
                    }
                  />
                </Card>
              </Stack>
            </Radio.Group>
          </Box>
        );

      case 1:
        if (action === 'create') {
          const hasCompany = !!(tenantSetup.companyName && tenantSetup.companyName.trim().length > 0);
          const hasBrand = !!(tenantSetup.brandName && tenantSetup.brandName.trim().length > 0);

          return (
            <Box>
              <Box mb="xl">
                <Title order={3} mb="xs" c="dark.9">
                  Hey! Let's get your first outlet set up.
                </Title>
                <Text size="sm" c="dimmed">
                  As your business grows, organization matters. That's why we guide you through our 3-layer structure: <strong>Company</strong>, <strong>Brand</strong>, and <strong>Shop</strong>.
                </Text>
              </Box>

              <Stack gap="md" style={{ position: 'relative' }}>
                {/* Connecting Line background */}
                <Box
                  hiddenFrom="xs"
                  style={{
                    position: 'absolute',
                    top: 40,
                    bottom: 40,
                    left: 28,
                    width: 2,
                    backgroundColor: 'var(--mantine-color-gray-2)',
                    zIndex: 0,
                  }}
                />
                <Box
                  visibleFrom="xs"
                  style={{
                    position: 'absolute',
                    top: 40,
                    bottom: 40,
                    left: 36,
                    width: 2,
                    backgroundColor: 'var(--mantine-color-gray-2)',
                    zIndex: 0,
                  }}
                />

                {/* Company Layer */}
                <Card withBorder shadow="sm" radius="md" p="md" style={{ position: 'relative', zIndex: 1, backgroundColor: 'white' }}>
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Avatar color="blue" radius="xl" size="md"><IconBuilding size={20} /></Avatar>
                    <Box style={{ flex: 1 }}>
                      <Text fw={600} mb={4}>1. Company Details</Text>
                      <TextInput
                        label="Company Name"
                        placeholder="e.g., ABC Restaurant Group"
                        value={tenantSetup.companyName || ''}
                        onChange={(e) => setTenantSetup({ ...tenantSetup, companyName: e.target.value })}
                        required
                        size="md"
                        description="The parent organization that owns multiple brands"
                      />
                    </Box>
                  </Group>
                </Card>

                {/* Brand Layer */}
                <Card 
                  withBorder 
                  shadow={hasCompany ? "sm" : "none"} 
                  radius="md" 
                  p="md" 
                  style={{ 
                    position: 'relative', 
                    zIndex: 1, 
                    backgroundColor: hasCompany ? 'white' : 'var(--mantine-color-gray-0)',
                    opacity: hasCompany ? 1 : 0.6,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Avatar color={hasCompany ? "indigo" : "gray"} radius="xl" size="md">
                      <IconBuildingStore size={20} />
                    </Avatar>
                    <Box style={{ flex: 1, pointerEvents: hasCompany ? 'auto' : 'none' }}>
                      <Text fw={600} mb={4}>2. Brand Details</Text>
                      <TextInput
                        label="Brand Name"
                        placeholder="e.g., Pizza Palace"
                        value={tenantSetup.brandName || ''}
                        onChange={(e) => setTenantSetup({ ...tenantSetup, brandName: e.target.value })}
                        required
                        size="md"
                        disabled={!hasCompany}
                        description="The brand name customers recognize"
                      />
                    </Box>
                  </Group>
                </Card>

                {/* Shop Layer */}
                <Card 
                  withBorder 
                  shadow={hasBrand ? "sm" : "none"} 
                  radius="md" 
                  p="md" 
                  style={{ 
                    position: 'relative', 
                    zIndex: 1, 
                    backgroundColor: hasBrand ? 'white' : 'var(--mantine-color-gray-0)',
                    opacity: hasBrand ? 1 : 0.6,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Group gap="md" align="flex-start" wrap="nowrap">
                    <Avatar color={hasBrand ? "teal" : "gray"} radius="xl" size="md">
                      <IconBuildingCommunity size={20} />
                    </Avatar>
                    <Box style={{ flex: 1, pointerEvents: hasBrand ? 'auto' : 'none' }}>
                      <Text fw={600} mb={4}>3. First Shop Setup</Text>
                      <Stack gap="md">
                        <TextInput
                          label="Shop Name"
                          placeholder="e.g., Downtown Branch"
                          value={tenantSetup.shopName || ''}
                          onChange={(e) => setTenantSetup({ ...tenantSetup, shopName: e.target.value })}
                          required
                          size="md"
                          disabled={!hasBrand}
                          description="The specific location or outlet name"
                        />
                        <TextInput
                          label="Shop Address"
                          placeholder="e.g., 123 Main St, City, State"
                          value={tenantSetup.shopAddress || ''}
                          onChange={(e) => setTenantSetup({ ...tenantSetup, shopAddress: e.target.value })}
                          size="md"
                          disabled={!hasBrand}
                          description="Physical address of the shop (optional)"
                        />
                      </Stack>
                    </Box>
                  </Group>
                </Card>
              </Stack>
            </Box>
          );
        } else if (action === 'join') {
          return (
            <Box>
              <Title order={3} mb="xs">
                Join Existing Organization
              </Title>
              <Text size="sm" c="dimmed" mb="xl">
                Enter the invitation code you received from your organization administrator.
              </Text>

              <Stack gap="xl">
                <TextInput
                  label="Invitation Code"
                  placeholder="Enter your invitation code"
                  value={tenantSetup.inviteCode || ''}
                  onChange={(e) => {
                    setTenantSetup({ ...tenantSetup, inviteCode: e.target.value });
                    setRequiresEmailVerification(false);
                    setVerificationCode('');
                    setVerificationInvitationId('');
                    setVerificationInfo('');
                    setAttemptsRemaining(null);
                  }}
                  required
                  description="The code should be provided by your administrator"
                  onBlur={validateInviteCode}
                />

                {invitationDetails && (
                  <Alert color="green" title="Valid Invitation Found!">
                    <Box mt="xs">
                      <Text size="sm">
                        You will join: <Text span fw={600}>{invitationDetails.organizationName}</Text>
                      </Text>
                      {invitationDetails.role && (
                        <Text size="sm" mt={4}>
                          Role: <Badge color="blue" size="sm">{invitationDetails.role}</Badge>
                        </Text>
                      )}
                    </Box>
                  </Alert>
                )}

                {requiresEmailVerification && (
                  <Alert color="yellow" title="Email Verification Required">
                    <Stack gap="sm">
                      <Text size="sm">
                        {verificationInfo || 'Your signed-in email does not match the invited email. Enter the verification code to continue.'}
                      </Text>
                      <TextInput
                        label="Verification Code"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                      />
                      {attemptsRemaining !== null && (
                        <Text size="xs" c="dimmed">
                          Attempts remaining: {attemptsRemaining}
                        </Text>
                      )}
                      <Group>
                        <Button size="xs" onClick={verifyEmailOwnership} loading={loading}>
                          Verify & Complete
                        </Button>
                        <Button size="xs" variant="light" onClick={resendVerificationCode} loading={loading}>
                          Resend Code
                        </Button>
                      </Group>
                    </Stack>
                  </Alert>
                )}
              </Stack>
            </Box>
          );
        }
        return null;

      case 2:
        return (
          <Box>
            <Title order={3} mb="md">
              Confirm Your Setup
            </Title>

            {action === 'create' ? (
              <Box>
                <Text size="sm" mb="md">
                  Please review your organization details:
                </Text>
                <Paper withBorder p="md">
                  <Stack gap="md">
                    <Box>
                      <Text size="xs" c="dimmed">Company</Text>
                      <Text fw={500}>{tenantSetup.companyName}</Text>
                    </Box>
                    <Divider />
                    <Box>
                      <Text size="xs" c="dimmed">Brand</Text>
                      <Text fw={500}>{tenantSetup.brandName}</Text>
                    </Box>
                    <Divider />
                    <Box>
                      <Text size="xs" c="dimmed">Shop</Text>
                      <Text fw={500}>{tenantSetup.shopName}</Text>
                      {tenantSetup.shopAddress && (
                        <Text size="sm" c="dimmed">{tenantSetup.shopAddress}</Text>
                      )}
                    </Box>
                  </Stack>
                </Paper>
              </Box>
            ) : (
              <Box>
                <Text size="sm" mb="md">
                  You are about to join:
                </Text>
                {invitationDetails && (
                  <Paper withBorder p="md">
                    <Stack gap="xs">
                      <Text fw={600}>
                        {invitationDetails.organizationName}
                      </Text>
                      {invitationDetails.role && (
                        <Box>
                          <Text size="xs" c="dimmed">Your Role:</Text>
                          <Text size="sm">{invitationDetails.role}</Text>
                        </Box>
                      )}
                    </Stack>
                  </Paper>
                )}
              </Box>
            )}

            <Alert color="blue" mt="xl">
              Click "Complete Setup" to finalize your organization setup and access the dashboard.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflowX: 'hidden',
        padding: '2rem 0',
      }}
    >
      {/* Decorative background circle */}
      <Box
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(51, 154, 240, 0.15) 0%, rgba(51, 154, 240, 0) 70%)',
          zIndex: 0,
        }}
      />

      <Box
        style={{
          position: 'absolute',
          top: 32,
          left: 32,
          zIndex: 10,
        }}
      >
        <Text size="xl" fw={800} c="dark.9" style={{ letterSpacing: 1.5 }}>
          X1<Text component="span" c="blue.5" fw={300}> HQ</Text>
        </Text>
      </Box>

      <Box style={{ zIndex: 1, position: 'relative', width: '100%' }}>
        <Container size="md">
        <Paper p="xl" radius="md" shadow="xl">
          {/* User Account Display */}
          <Box
            mb="lg"
            p="md"
            bg="var(--mantine-color-gray-0)"
            style={{
              borderRadius: 'var(--mantine-radius-sm)',
              border: '1px solid var(--mantine-color-gray-3)',
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="md">
                <Avatar color="blue" size="md" radius="xl">
                  <IconUserCircle size={24} />
                </Avatar>
                <Box>
                  <Text size="xs" c="dimmed">
                    Logged in as
                  </Text>
                  <Text fw={500}>
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email}
                  </Text>
                  {user?.firstName && user?.lastName && (
                    <Text size="xs" c="dimmed">
                      {user.email}
                    </Text>
                  )}
                </Box>
              </Group>
              <Button 
                variant="subtle" 
                color="red" 
                size="xs" 
                onClick={logout}
              >
                Sign out
              </Button>
            </Group>
          </Box>

          <Stepper 
            active={activeStep} 
            mb="xl"
            styles={{
              stepIcon: {
                '&[data-progress]': {
                  backgroundColor: 'var(--mantine-color-blue-6)',
                  color: 'white',
                }
              }
            }}
          >
            {steps.map((label) => (
              <Stepper.Step key={label} label={label} />
            ))}
          </Stepper>

          {error && (
            <Alert color="red" mb="md">
              {error}
            </Alert>
          )}

          <Box mih={400}>
            {getStepContent(activeStep)}
          </Box>

          <Group justify="space-between" mt={32}>
            {activeStep > 0 ? (
              <Button
                variant="default"
                disabled={loading}
                onClick={handleBack}
              >
                Back
              </Button>
            ) : (
              <Box />
            )}
            <Button
              variant="filled"
              onClick={handleNext}
              disabled={loading}
              leftSection={loading ? <Loader size={16} /> : undefined}
            >
              {activeStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </Button>
          </Group>
          </Paper>
        </Container>
      </Box>

      <Box
        mt={48}
        px={32}
        style={{
          width: '100%',
        }}
      >
        <Group gap="md">
          <Text size="sm" c="dimmed">
            © {new Date().getFullYear()} X1
          </Text>
          <Anchor size="sm" c="dimmed" href="#" style={{ textDecoration: 'none' }}>
            Privacy & Terms
          </Anchor>
          <Anchor size="sm" c="dimmed" href="#" style={{ textDecoration: 'none' }}>
            Support
          </Anchor>
        </Group>
      </Box>
    </Box>
  );
}
