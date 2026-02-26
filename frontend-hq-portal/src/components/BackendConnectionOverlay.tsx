import { Button, Paper, Stack, Text, Title } from '@mantine/core';

interface BackendConnectionOverlayProps {
  message?: string | null;
  reconnecting: boolean;
  onRetry: () => Promise<void> | void;
  onLogout: () => void;
}

export function BackendConnectionOverlay({
  message,
  reconnecting,
  onRetry,
  onLogout,
}: BackendConnectionOverlayProps) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <Paper withBorder radius="md" p="xl" maw={560} w="100%">
        <Stack gap="md">
          <Title order={3}>Cannot Reach Backend Service</Title>
          <Text size="sm" c="dimmed">
            {message ?? 'The application cannot connect to the API server. It will keep retrying automatically.'}
          </Text>
          <Text size="sm" c="dimmed">
            You can retry now or logout safely.
          </Text>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button variant="light" onClick={onLogout}>
              Logout
            </Button>
            <Button loading={reconnecting} onClick={() => void onRetry()}>
              Retry Now
            </Button>
          </div>
        </Stack>
      </Paper>
    </div>
  );
}
