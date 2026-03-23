import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Group,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import smartCategoryService from '../../services/smartCategoryService';
import type { OnlineOrderingLookups } from '../../types/onlineOrdering';
import type { SmartCategoryDetail, SmartCategoryOrderChannelUpsert } from '../../types/smartCategory';

export function OnlineOrderingChannelMappingPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [lookups, setLookups] = useState<OnlineOrderingLookups | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SmartCategoryDetail | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLookups = useCallback(async () => {
    if (!brandId) {
      setLookups(null);
      return;
    }

    const response = await onlineOrderingService.getLookups(brandId);
    setLookups(response);
    if (!selectedCategoryId && response.smartCategories[0]) {
      setSelectedCategoryId(String(response.smartCategories[0].id));
    }
  }, [brandId, selectedCategoryId]);

  const loadDetail = useCallback(async () => {
    if (!brandId || !selectedCategoryId) {
      setDetail(null);
      setDraft({});
      return;
    }

    const response = await smartCategoryService.getDetail(brandId, parseInt(selectedCategoryId, 10));
    setDetail(response);
    setDraft(
      Object.fromEntries(
        response.orderChannels.map((channel) => [`${channel.shopId}:${channel.orderChannelId}`, channel.enabled]),
      ),
    );
  }, [brandId, selectedCategoryId]);

  useEffect(() => {
    if (!brandId) return;

    setLoading(true);
    setError(null);
    loadLookups()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ODO lookups'))
      .finally(() => setLoading(false));
  }, [brandId, loadLookups]);

  useEffect(() => {
    if (!selectedCategoryId || !brandId) return;
    setLoading(true);
    setError(null);
    loadDetail()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load category mapping'))
      .finally(() => setLoading(false));
  }, [brandId, selectedCategoryId, loadDetail]);

  const handleSave = async () => {
    if (!brandId || !detail) return;

    try {
      setSaving(true);
      const payload: SmartCategoryOrderChannelUpsert[] = [];
      const shopSchedules = detail.shopSchedules.map((schedule) => ({
        shopId: schedule.shopId,
        displayIndex: schedule.displayIndex,
        displayFromDate: schedule.displayFromDate,
        displayToDate: schedule.displayToDate,
        displayFromTime: schedule.displayFromTime,
        displayToTime: schedule.displayToTime,
        displayFromDateTime: schedule.displayFromDateTime,
        displayToDateTime: schedule.displayToDateTime,
        isPublicDisplay: schedule.isPublicDisplay,
        enabled: schedule.enabled,
        dayOfWeek: schedule.dayOfWeek,
        isWeekdayHide: schedule.isWeekdayHide,
        isWeekendHide: schedule.isWeekendHide,
        isHolidayHide: schedule.isHolidayHide,
        daysOfWeek: schedule.daysOfWeek,
        months: schedule.months,
        dates: schedule.dates,
      }));

      lookups?.shops.forEach((shop) => {
        lookups.orderChannels.forEach((channel) => {
          payload.push({
            shopId: shop.id,
            orderChannelId: channel.id,
            enabled: draft[`${shop.id}:${channel.id}`] ?? false,
          });
        });
      });

      await smartCategoryService.updateDisplaySettings(brandId, detail.category.smartCategoryId, {
        shopSchedules,
        orderChannels: payload,
      });

      notifications.show({
        color: 'green',
        message: 'ODO channel mapping updated.',
      });
      await loadDetail();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to save ODO channel mapping',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Channel Mapping</Title>
          <Text size="sm" c="dimmed">
            Control which ODO smart categories are visible for each shop and order channel.
          </Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void loadDetail()} loading={loading}>
            Refresh
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving} disabled={!detail}>
            Save Mapping
          </Button>
        </Group>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO channel mapping.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Stack gap="md">
          <Select
            label="Smart category"
            placeholder="Choose an ODO smart category"
            data={(lookups?.smartCategories ?? []).map((category) => ({
              value: String(category.id),
              label: category.name,
            }))}
            value={selectedCategoryId}
            onChange={setSelectedCategoryId}
          />

          {detail && (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Shop</Table.Th>
                  {(lookups?.orderChannels ?? []).map((channel) => (
                    <Table.Th key={channel.id}>{channel.name}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(lookups?.shops ?? []).map((shop) => (
                  <Table.Tr key={shop.id}>
                    <Table.Td>{shop.name}</Table.Td>
                    {(lookups?.orderChannels ?? []).map((channel) => {
                      const key = `${shop.id}:${channel.id}`;
                      return (
                        <Table.Td key={key}>
                          <Checkbox
                            checked={draft[key] ?? false}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                [key]: event.currentTarget.checked,
                              }))
                            }
                          />
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
