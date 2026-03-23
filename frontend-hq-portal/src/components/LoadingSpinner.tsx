import { Box, Loader, Stack, Text } from '@mantine/core'

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 48,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          minWidth: 320,
        }}
      >
        <Stack align="center" gap="xl">
          {/* Beautiful gradient spinner */}
          <Box style={{ position: 'relative' }}>
            <Loader
              size={60}
              color="violet"
              type="dots"
            />
          </Box>

          {/* Message text */}
          <Stack gap={4} align="center">
            <Text size="lg" fw={600} c="dark">
              {message}
            </Text>
            <Text size="sm" c="dimmed">
              Please wait a moment
            </Text>
          </Stack>
        </Stack>
      </Box>
    </Box>
  );
}