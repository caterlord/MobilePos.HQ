import {
  Box,
  Text,
  Anchor,
  Group,
} from '@mantine/core'
import { SignIn, SignUp } from '@clerk/react'
import { clerkConfig } from '../config/clerk'

interface LoginPageProps {
  mode?: 'sign-in' | 'sign-up'
}

export function LoginPage({ mode = 'sign-in' }: LoginPageProps) {
  const isSignUp = mode === 'sign-up'

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
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

      <Box style={{ zIndex: 1, position: 'relative' }}>
        {isSignUp ? (
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl={clerkConfig.signInUrl}
            fallbackRedirectUrl={clerkConfig.fallbackRedirectUrl}
            appearance={{
              elements: {
                rootBox: { position: 'relative', zIndex: 1 },
                card: {
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }
              }
            }}
          />
        ) : (
          <SignIn
            path="/login"
            routing="path"
            signUpUrl={clerkConfig.signUpUrl}
            fallbackRedirectUrl={clerkConfig.fallbackRedirectUrl}
            appearance={{
              elements: {
                rootBox: { position: 'relative', zIndex: 1 },
                card: {
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                }
              }
            }}
          />
        )}
      </Box>

      <Box
        style={{
          position: 'absolute',
          bottom: 32,
          left: 32,
          zIndex: 10,
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
  )
}
