import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Text,
  Title,
  Anchor,
  Group,
  Alert,
} from '@mantine/core'
import { useState } from 'react'
import { useAuth } from '../contexts/Auth0Context'
import { IconAlertCircle } from '@tabler/icons-react'
import {
  FaGoogle,
  FaMicrosoft,
  FaApple,
  FaXTwitter,
  FaFacebookF,
} from 'react-icons/fa6'

export function LoginPage() {
  const { loginWithRedirect, loginWithSocial } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleHostedLogin = async (screenHint: 'login' | 'signup' = 'login') => {
    setError('')
    setLoading(true)

    try {
      loginWithRedirect({ screen_hint: screenHint })
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to redirect to Auth0 login'
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleSocialLogin = async (connection: string) => {
    setError('')
    setLoading(true)

    try {
      loginWithSocial(connection)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to redirect to social provider'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Box
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
        }}
        hiddenFrom="sm"
      >
        <Text size="lg" fw={700} c="white">
          EWHQ
        </Text>
      </Box>

      <Box
        style={{
          position: 'absolute',
          top: 32,
          left: 32,
        }}
        visibleFrom="sm"
      >
        <Text size="xl" fw={700} c="white">
          EWHQ
        </Text>
      </Box>

      <Container size={560} px="md" pt={{ base: 60, sm: 0 }}>
        <Paper
          radius="md"
          p="xl"
          shadow="xl"
          style={{
            backgroundColor: 'white',
          }}
        >
          <Stack gap="lg">
            <Title order={2} ta="center" fw={600}>
              Sign in to your account
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              Authentication is handled securely on the Auth0 hosted login page.
            </Text>

            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
                {error}
              </Alert>
            )}

            <Button
              size="md"
              radius="md"
              fullWidth
              loading={loading}
              onClick={() => handleHostedLogin('login')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              Continue with Email / Password
            </Button>

            <Divider label="Or continue with" labelPosition="center" />

            <Stack gap="sm">
              <Button
                variant="default"
                size="md"
                radius="md"
                fullWidth
                leftSection={<FaGoogle size={18} />}
                onClick={() => handleSocialLogin('google-oauth2')}
                style={{ justifyContent: 'flex-start' }}
              >
                Google
              </Button>

              <Button
                variant="default"
                size="md"
                radius="md"
                fullWidth
                leftSection={<FaMicrosoft size={18} />}
                onClick={() => handleSocialLogin('windowslive')}
                style={{ justifyContent: 'flex-start' }}
              >
                Microsoft
              </Button>

              <Button
                variant="default"
                size="md"
                radius="md"
                fullWidth
                leftSection={<FaApple size={18} />}
                onClick={() => handleSocialLogin('apple')}
                style={{ justifyContent: 'flex-start' }}
              >
                Apple
              </Button>

              <Button
                variant="default"
                size="md"
                radius="md"
                fullWidth
                leftSection={<FaFacebookF size={18} />}
                onClick={() => handleSocialLogin('facebook')}
                style={{ justifyContent: 'flex-start' }}
              >
                Facebook
              </Button>

              <Button
                variant="default"
                size="md"
                radius="md"
                fullWidth
                leftSection={<FaXTwitter size={18} />}
                onClick={() => handleSocialLogin('twitter')}
                style={{ justifyContent: 'flex-start' }}
              >
                X (Twitter)
              </Button>
            </Stack>

            <Box
              p="md"
              style={{
                backgroundColor: '#f8f9fa',
                borderRadius: 8,
              }}
            >
              <Group gap="xs" justify="center">
                <Text size="sm" c="dimmed">
                  New to EWHQ?
                </Text>
                <Anchor
                  size="sm"
                  c="indigo"
                  fw={500}
                  onClick={() => handleHostedLogin('signup')}
                  style={{ cursor: 'pointer' }}
                >
                  Create account
                </Anchor>
              </Group>
            </Box>
          </Stack>
        </Paper>

        <Box mt="xl" ta="center">
          <Text size="sm" c="white" style={{ opacity: 0.9 }}>
            If you're an admin, you can require two-step authentication for your entire team in settings.
          </Text>
        </Box>
      </Container>

      <Box
        style={{
          position: 'absolute',
          bottom: 32,
          left: 32,
        }}
      >
        <Group gap="md">
          <Anchor size="sm" c="white" style={{ opacity: 0.9 }}>
            © EWHQ
          </Anchor>
          <Anchor size="sm" c="white" style={{ opacity: 0.9 }}>
            Privacy & terms
          </Anchor>
        </Group>
      </Box>
    </Box>
  )
}
