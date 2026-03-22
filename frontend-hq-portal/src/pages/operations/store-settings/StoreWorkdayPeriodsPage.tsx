import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { StoreWorkdayEntry, StoreWorkdayPeriod } from '../../../services/storeSettingsService';
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

export function StoreWorkdayPeriodsPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [periods, setPeriods] = useState<StoreWorkdayPeriod[]>([]);
  const [workdayHeaders, setWorkdayHeaders] = useState<StoreWorkdayEntry[]>([]);

  const workdayHeaderOptions = useMemo(
    () =>
      workdayHeaders
        .filter((entry) => entry.workdayHeaderId > 0)
        .map((entry) => ({
          value: String(entry.workdayHeaderId),
          label: `${entry.workdayHeaderId} - ${entry.day || '?'}`,
        })),
    [workdayHeaders],
  );

  const defaultWorkdayHeaderId = useMemo(
    () => workdayHeaders.find((entry) => entry.workdayHeaderId > 0)?.workdayHeaderId ?? 0,
    [workdayHeaders],
  );

  const loadPeriods = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setPeriods([]);
      setWorkdayHeaders([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [periodsResponse, snapshotResponse] = await Promise.all([
        storeSettingsService.getWorkdayPeriods(brandId, selectedShopId),
        storeSettingsService.getSnapshot(brandId, selectedShopId),
      ]);

      setPeriods(periodsResponse);
      setWorkdayHeaders(snapshotResponse.workdayEntries);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load workday periods';
      setError(message);
      setPeriods([]);
      setWorkdayHeaders([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);

  const updatePeriod = (index: number, updater: (period: StoreWorkdayPeriod) => StoreWorkdayPeriod) => {
    setPeriods((previous) => {
      const next = [...previous];
      next[index] = updater(next[index]);
      return next;
    });
  };

  const savePeriods = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    const payload = {
      periods: periods.map((period) => ({
        ...period,
        periodName: period.periodName.trim(),
        fromTime: normalizeTimeForApi(period.fromTime),
        toTime: normalizeTimeForApi(period.toTime),
        workdayHeaderId: period.workdayHeaderId > 0 ? period.workdayHeaderId : defaultWorkdayHeaderId,
      })),
    };

    try {
      setSaving(true);
      const response = await storeSettingsService.replaceWorkdayPeriods(brandId, selectedShopId, payload);
      setPeriods(response);
      notifications.show({ color: 'green', message: 'Workday periods saved' });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save workday periods';
      notifications.show({ color: 'red', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Workday Periods</Title>
          <Text size="sm" c="dimmed">Configure shift periods that map to workday headers.</Text>
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
                void loadPeriods();
              }}
              disabled={!brandId}
            >
              Refresh
            </Button>
          </Group>
        </Paper>

        {error ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load workday periods">
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Paper withBorder p="xl" radius="md">
            <Group justify="center">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading workday periods...</Text>
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
                    setPeriods((previous) => [
                      ...previous,
                      {
                        workdayPeriodId: 0,
                        workdayHeaderId: defaultWorkdayHeaderId,
                        periodName: '',
                        fromTime: '09:00:00',
                        toTime: '18:00:00',
                        dayDelta: 0,
                        enabled: true,
                        workdayPeriodMasterId: null,
                      },
                    ]);
                  }}
                  disabled={defaultWorkdayHeaderId <= 0}
                >
                  Add Period
                </Button>
                <Button size="xs" leftSection={<IconDeviceFloppy size={14} />} onClick={() => void savePeriods()} loading={saving}>
                  Save
                </Button>
              </Group>
            </Group>

            {workdayHeaderOptions.length === 0 ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow" mb="sm" title="No Workday Headers">
                Configure Workday Schedule first. Workday Periods require existing workday header records.
              </Alert>
            ) : null}

            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Period Name</Table.Th>
                    <Table.Th>Workday Header</Table.Th>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th>Day Delta</Table.Th>
                    <Table.Th>Master ID</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {periods.map((period, index) => (
                    <Table.Tr key={`${period.workdayPeriodId}-${index}`}>
                      <Table.Td>
                        <TextInput
                          value={period.periodName}
                          onChange={(event) => updatePeriod(index, (current) => ({
                            ...current,
                            periodName: event.currentTarget.value,
                          }))}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Select
                          data={workdayHeaderOptions}
                          value={period.workdayHeaderId > 0 ? String(period.workdayHeaderId) : null}
                          onChange={(value) => updatePeriod(index, (current) => ({
                            ...current,
                            workdayHeaderId: value ? Number.parseInt(value, 10) : 0,
                          }))}
                          searchable
                          clearable={false}
                          w={170}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          type="time"
                          value={normalizeTimeForInput(period.fromTime)}
                          onChange={(event) => updatePeriod(index, (current) => ({
                            ...current,
                            fromTime: normalizeTimeForApi(event.currentTarget.value),
                          }))}
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          type="time"
                          value={normalizeTimeForInput(period.toTime)}
                          onChange={(event) => updatePeriod(index, (current) => ({
                            ...current,
                            toTime: normalizeTimeForApi(event.currentTarget.value),
                          }))}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={period.dayDelta}
                          onChange={(value) => updatePeriod(index, (current) => ({
                            ...current,
                            dayDelta: toNumber(value),
                          }))}
                          w={120}
                        />
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={period.workdayPeriodMasterId ?? ''}
                          onChange={(value) => updatePeriod(index, (current) => ({
                            ...current,
                            workdayPeriodMasterId: value === '' ? null : toNumber(value),
                          }))}
                          w={120}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={period.enabled}
                          onChange={(event) => updatePeriod(index, (current) => ({
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
                            setPeriods((previous) => previous.filter((_, rowIndex) => rowIndex !== index));
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {periods.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={8}>
                        <Text size="sm" c="dimmed">No workday periods found for this shop.</Text>
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
