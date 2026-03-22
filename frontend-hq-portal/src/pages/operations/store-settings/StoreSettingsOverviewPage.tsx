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
  Loader,
} from '@mantine/core';
import {
  IconAdjustments,
  IconCalendarTime,
  IconChevronRight,
  IconClockHour4,
  IconDevices,
  IconLayoutGrid,
  IconListCheck,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useBrands } from '../../../contexts/BrandContext';
import storeSettingsService, { type StoreSettingsAuditLog } from '../../../services/storeSettingsService';
import { storeSettingsSections } from './storeSettingsSections';

const sectionIcons = [IconAdjustments, IconCalendarTime, IconClockHour4, IconSettings, IconLayoutGrid] as const;

export function StoreSettingsOverviewPage() {
  const navigate = useNavigate();
  const { selectedBrand } = useBrands();
  const [auditLogs, setAuditLogs] = useState<StoreSettingsAuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const selectedBrandId = useMemo(() => {
    if (!selectedBrand) {
      return null;
    }

    const parsed = Number.parseInt(selectedBrand, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [selectedBrand]);

  useEffect(() => {
    if (!selectedBrandId) {
      setAuditLogs([]);
      setAuditError(null);
      return;
    }

    let cancelled = false;

    const loadAuditLogs = async () => {
      try {
        setAuditLoading(true);
        setAuditError(null);
        const logs = await storeSettingsService.getAuditLogs(selectedBrandId, { limit: 8 });
        if (!cancelled) {
          setAuditLogs(logs);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'Failed to load activity';
          setAuditError(message);
          setAuditLogs([]);
        }
      } finally {
        if (!cancelled) {
          setAuditLoading(false);
        }
      }
    };

    void loadAuditLogs();

    return () => {
      cancelled = true;
    };
  }, [selectedBrandId]);

  const toDisplayAction = (actionName: string) => {
    if (!actionName) {
      return 'Settings updated';
    }

    return actionName
      .split('_')
      .filter((segment) => segment.length > 0)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
      .join(' ');
  };

  const toRelativeTime = (loggedAt: string) => {
    const timestamp = Date.parse(loggedAt);
    if (Number.isNaN(timestamp)) {
      return 'Unknown';
    }

    const diffMs = Date.now() - timestamp;
    if (diffMs < 60_000) {
      return 'Just now';
    }

    const diffMinutes = Math.floor(diffMs / 60_000);
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return new Date(timestamp).toLocaleDateString();
  };

  const getActivityVisual = (category: string) => {
    switch (category) {
      case 'TABLE_SETTINGS':
        return { icon: IconLayoutGrid, color: 'orange' };
      case 'DEVICE_SETTINGS':
        return { icon: IconDevices, color: 'blue' };
      default:
        return { icon: IconListCheck, color: 'teal' };
    }
  };

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
                <Anchor size="sm" c="dimmed">
                  Last 8 events
                </Anchor>
              </Group>

              {auditLoading ? (
                <Group py="md" justify="center" gap="xs">
                  <Loader size="xs" />
                  <Text size="sm" c="dimmed">Loading activity...</Text>
                </Group>
              ) : null}

              {!auditLoading && auditError ? (
                <Text size="sm" c="red">{auditError}</Text>
              ) : null}

              {!auditLoading && !auditError && auditLogs.length === 0 ? (
                <Text size="sm" c="dimmed">No settings changes recorded yet.</Text>
              ) : null}

              {!auditLoading && !auditError && auditLogs.length > 0 ? (
                <Stack gap="sm">
                  {auditLogs.map((log, index) => {
                    const activityVisual = getActivityVisual(log.category);
                    const Icon = activityVisual.icon;
                    const detail = [log.actionRefDescription || log.actionRefId, log.details]
                      .filter((value) => value && value.trim().length > 0)
                      .join(' · ');

                    return (
                      <Group
                        key={`${log.logId}-${log.loggedAt}`}
                        justify="space-between"
                        p="sm"
                        style={index < auditLogs.length - 1 ? { borderBottom: '1px solid #F0F0F0' } : undefined}
                      >
                        <Group>
                          <ThemeIcon size="md" radius="md" variant="light" color={activityVisual.color}>
                            <Icon size={16} />
                          </ThemeIcon>
                          <Box>
                            <Text size="sm" fw={500}>{toDisplayAction(log.actionName)}</Text>
                            <Text size="xs" c="dimmed">{detail || log.category}</Text>
                          </Box>
                        </Group>
                        <Text size="xs" c="dimmed">{toRelativeTime(log.loggedAt)}</Text>
                      </Group>
                    );
                  })}
                </Stack>
              ) : null}
            </Paper>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
