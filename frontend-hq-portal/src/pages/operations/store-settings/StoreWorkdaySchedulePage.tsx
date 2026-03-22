import { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import type { StoreWorkdayEntry } from '../../../services/storeSettingsService';
import storeSettingsService from '../../../services/storeSettingsService';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';

const toNumber = (value: string | number): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTimeForInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('T')) {
    const timePart = trimmed.split('T')[1] ?? '';
    return timePart.slice(0, 5);
  }

  return trimmed.slice(0, 5);
};

const normalizeTimeForApi = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '00:00:00';
  }

  if (trimmed.length === 5) {
    return `${trimmed}:00`;
  }

  return trimmed;
};

export function StoreWorkdaySchedulePage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<StoreWorkdayEntry[]>([]);

  const loadEntries = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setEntries([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await storeSettingsService.getSnapshot(brandId, selectedShopId);
      setEntries(response.workdayEntries);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load workday settings';
      setError(message);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const updateEntry = (index: number, updater: (entry: StoreWorkdayEntry) => StoreWorkdayEntry) => {
    setEntries((previous) => {
      const next = [...previous];
      next[index] = updater(next[index]);
      return next;
    });
  };

  const saveEntries = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    const payload = {
      entries: entries.map((entry) => ({
        ...entry,
        day: entry.day.trim().slice(0, 1).toUpperCase(),
        openTime: normalizeTimeForApi(entry.openTime),
        closeTime: normalizeTimeForApi(entry.closeTime),
      })),
    };

    try {
      setSaving(true);
      const response = await storeSettingsService.updateWorkday(brandId, selectedShopId, payload);
      setEntries(response);
      notifications.show({ color: 'green', message: 'Workday schedule saved' });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save workday schedule';
      notifications.show({ color: 'red', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Workday Schedule</Title>
          <Text size="sm" c="dimmed">Configure day-level opening and closing schedule.</Text>
        </Box>

        {!brandId ? (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="No Brand Selected">
            Select a brand from the top-left brand switcher.
          </Alert>
        ) : null}

        {shopsError ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load shops">
            {shopsError}
          </Alert>
        ) : null}

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="flex-end">
            <Select
              label="Shop"
              placeholder={shopsLoading ? 'Loading shops...' : 'Select a shop'}
              data={shops.map((shop) => ({ value: String(shop.shopId), label: `${shop.shopName}${shop.enabled ? '' : ' (Disabled)'}` }))}
              value={selectedShopId ? String(selectedShopId) : null}
              onChange={(value) => setSelectedShopId(value ? Number.parseInt(value, 10) : null)}
              disabled={!brandId || shopsLoading || shops.length === 0}
              searchable
              style={{ minWidth: 320 }}
            />
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => {
                void reloadShops();
                void loadEntries();
              }}
              disabled={!brandId}
            >
              Refresh
            </Button>
          </Group>
        </Paper>

        {error ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load workday schedule">
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Paper withBorder p="xl" radius="md">
            <Group justify="center">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading workday schedule...</Text>
            </Group>
          </Paper>
        ) : null}

        {!loading && selectedShop ? (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>Editing: {selectedShop.shopName}</Text>
              <Group gap="xs">
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconPlus size={14} />}
                  onClick={() => {
                    setEntries((previous) => [
                      ...previous,
                      {
                        workdayHeaderId: 0,
                        day: '',
                        openTime: '09:00:00',
                        closeTime: '18:00:00',
                        dayDelta: 0,
                        enabled: true,
                      },
                    ]);
                  }}
                >
                  Add Day
                </Button>
                <Button size="xs" leftSection={<IconDeviceFloppy size={14} />} onClick={() => void saveEntries()} loading={saving}>
                  Save
                </Button>
              </Group>
            </Group>

            <Text size="xs" c="dimmed" mb="sm">Legacy day codes: M, T, W, H, F, S, U.</Text>

            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Day</Table.Th>
                    <Table.Th>Open</Table.Th>
                    <Table.Th>Close</Table.Th>
                    <Table.Th>Day Delta</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entries.map((entry, index) => (
                    <Table.Tr key={`${entry.day}-${index}`}>
                      <Table.Td>
                        <TextInput
                          value={entry.day}
                          onChange={(event) => updateEntry(index, (current) => ({
                            ...current,
                            day: event.currentTarget.value.toUpperCase().slice(0, 1),
                          }))}
                          maxLength={1}
                          w={70}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          type="time"
                          value={normalizeTimeForInput(entry.openTime)}
                          onChange={(event) => updateEntry(index, (current) => ({
                            ...current,
                            openTime: normalizeTimeForApi(event.currentTarget.value),
                          }))}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          type="time"
                          value={normalizeTimeForInput(entry.closeTime)}
                          onChange={(event) => updateEntry(index, (current) => ({
                            ...current,
                            closeTime: normalizeTimeForApi(event.currentTarget.value),
                          }))}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={entry.dayDelta}
                          onChange={(value) => updateEntry(index, (current) => ({
                            ...current,
                            dayDelta: toNumber(value),
                          }))}
                          w={120}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={entry.enabled}
                          onChange={(event) => updateEntry(index, (current) => ({
                            ...current,
                            enabled: event.currentTarget.checked,
                          }))}
                        />
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          onClick={() => {
                            setEntries((previous) => previous.filter((_, rowIndex) => rowIndex !== index));
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {entries.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Text size="sm" c="dimmed">No workday entries found for this shop.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                </Table.Tbody>
              </Table>
            </Box>
          </Paper>
        ) : null}
      </Stack>
    </Container>
  );
}
