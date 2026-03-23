import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingGeneralSettings } from '../../types/onlineOrdering';

const defaultSettings: OnlineOrderingGeneralSettings = {
  websiteUrl: '',
  countryCode: '852',
  timeZone: 8,
  orderTokenValidTime: 30,
  disableNavigateWhenTokenExpired: false,
  whenTokenExpiredTips: '',
  quota: 0,
  quotaOfItem: 0,
  quotaOfEachItem: 0,
  modifySetQuantity: true,
  roundingMethod: '',
  roundingPlace: null,
  businessDaySections: [],
};

export function OnlineOrderingSettingsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [settings, setSettings] = useState<OnlineOrderingGeneralSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setSettings(defaultSettings);
      return;
    }

    setLoading(true);
    setError(null);
    onlineOrderingService.getSettings(brandId)
      .then(setSettings)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ODO settings'))
      .finally(() => setLoading(false));
  }, [brandId]);

  const handleSave = async () => {
    if (!brandId) return;

    try {
      setSaving(true);
      const response = await onlineOrderingService.updateSettings(brandId, settings);
      setSettings(response);
      notifications.show({
        color: 'green',
        message: 'ODO general settings updated.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to save ODO settings',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>General Settings</Title>
          <Text size="sm" c="dimmed">
            Configure the base storefront settings for online ordering.
          </Text>
        </div>
        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving} disabled={!brandId}>
          Save Settings
        </Button>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO settings.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white', opacity: loading ? 0.7 : 1 }}>
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <TextInput label="Website URL" value={settings.websiteUrl} onChange={(event) => setSettings((current) => ({ ...current, websiteUrl: event.currentTarget.value }))} />
            <TextInput label="Country Code" value={settings.countryCode} onChange={(event) => setSettings((current) => ({ ...current, countryCode: event.currentTarget.value }))} />
            <NumberInput label="Time Zone" value={settings.timeZone} onChange={(value) => setSettings((current) => ({ ...current, timeZone: Number(value) || 0 }))} />
            <NumberInput label="Order Token Valid Time (min)" value={settings.orderTokenValidTime} onChange={(value) => setSettings((current) => ({ ...current, orderTokenValidTime: Number(value) || 0 }))} />
            <NumberInput label="Quota" value={settings.quota} onChange={(value) => setSettings((current) => ({ ...current, quota: Number(value) || 0 }))} />
            <NumberInput label="Quota Of Item" value={settings.quotaOfItem} onChange={(value) => setSettings((current) => ({ ...current, quotaOfItem: Number(value) || 0 }))} />
            <NumberInput label="Quota Of Each Item" value={settings.quotaOfEachItem} onChange={(value) => setSettings((current) => ({ ...current, quotaOfEachItem: Number(value) || 0 }))} />
            <TextInput label="Rounding Method" value={settings.roundingMethod} onChange={(event) => setSettings((current) => ({ ...current, roundingMethod: event.currentTarget.value }))} />
            <NumberInput label="Rounding Place" value={settings.roundingPlace ?? 0} onChange={(value) => setSettings((current) => ({ ...current, roundingPlace: Number(value) || 0 }))} />
            <TextInput label="Expired Token Message" value={settings.whenTokenExpiredTips ?? ''} onChange={(event) => setSettings((current) => ({ ...current, whenTokenExpiredTips: event.currentTarget.value }))} />
          </SimpleGrid>

          <Group>
            <Switch
              label="Disable navigation when token expired"
              checked={settings.disableNavigateWhenTokenExpired}
              onChange={(event) =>
                setSettings((current) => ({ ...current, disableNavigateWhenTokenExpired: event.currentTarget.checked }))
              }
            />
            <Switch
              label="Allow set quantity modifications"
              checked={settings.modifySetQuantity}
              onChange={(event) =>
                setSettings((current) => ({ ...current, modifySetQuantity: event.currentTarget.checked }))
              }
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>Business Day Sections</Title>
            <Text size="sm" c="dimmed">
              Optional storefront-specific business day overrides.
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() =>
              setSettings((current) => ({
                ...current,
                businessDaySections: [...current.businessDaySections, { label: '', daysOfWeek: '', fromTime: '', toTime: '' }],
              }))
            }
          >
            Add Section
          </Button>
        </Group>

        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Label</Table.Th>
              <Table.Th>Days</Table.Th>
              <Table.Th>From</Table.Th>
              <Table.Th>To</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {settings.businessDaySections.map((section, index) => (
              <Table.Tr key={`${section.label}-${index}`}>
                <Table.Td>
                  <TextInput
                    value={section.label}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, label: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={section.daysOfWeek ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, daysOfWeek: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={section.fromTime ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, fromTime: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={section.toTime ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, toTime: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.filter((_, entryIndex) => entryIndex !== index),
                      }))
                    }
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
