import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  MultiSelect,
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
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type {
  OnlineOrderingLookups,
  OnlineOrderingMenuCombination,
  UpsertOnlineOrderingMenuCombinationRequest,
} from '../../types/onlineOrdering';

const emptyForm: UpsertOnlineOrderingMenuCombinationRequest = {
  menuName: '',
  menuNameAlt: '',
  menuCode: '',
  displayOrder: 1,
  enabled: true,
  isPublished: false,
  isOdoDisplay: true,
  isFoodpandaMealForOne: false,
  categories: [],
  shops: [],
};

export function OnlineOrderingMenuCombinationsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [lookups, setLookups] = useState<OnlineOrderingLookups | null>(null);
  const [rows, setRows] = useState<OnlineOrderingMenuCombination[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<OnlineOrderingMenuCombination | null>(null);
  const [form, setForm] = useState<UpsertOnlineOrderingMenuCombinationRequest>(emptyForm);

  const load = useCallback(async () => {
    if (!brandId) {
      setLookups(null);
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [lookupsResponse, combinationsResponse] = await Promise.all([
        onlineOrderingService.getLookups(brandId),
        onlineOrderingService.getMenuCombinations(brandId),
      ]);
      setLookups(lookupsResponse);
      setRows(combinationsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ODO menu combinations');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      shops: (lookups?.shops ?? []).map((shop) => ({
        shopId: shop.id,
        enabled: true,
        isPublicDisplay: true,
        daysOfWeek: '',
        dates: '',
        months: '',
        displayFromTime: '',
        displayToTime: '',
      })),
    });
    setOpened(true);
  };

  const openEdit = (row: OnlineOrderingMenuCombination) => {
    setEditing(row);
    setForm({
      menuName: row.menuName,
      menuNameAlt: row.menuNameAlt ?? '',
      menuCode: row.menuCode ?? '',
      displayOrder: row.displayOrder,
      enabled: row.enabled,
      isPublished: row.isPublished,
      isOdoDisplay: row.isOdoDisplay,
      isFoodpandaMealForOne: row.isFoodpandaMealForOne,
      categories: (row.categories ?? []).map((category) => ({
        categoryId: category.categoryId,
        isSmartCategory: category.isSmartCategory,
      })),
      shops: (row.shops ?? []).map((shop) => ({
        shopId: shop.shopId,
        enabled: shop.enabled,
        isPublicDisplay: shop.isPublicDisplay,
        daysOfWeek: shop.daysOfWeek ?? '',
        dates: shop.dates ?? '',
        months: shop.months ?? '',
        displayFromTime: shop.displayFromTime ?? '',
        displayToTime: shop.displayToTime ?? '',
      })),
    });
    setOpened(true);
  };

  const handleSave = async () => {
    if (!brandId) return;

    try {
      setSaving(true);
      if (editing) {
        await onlineOrderingService.updateMenuCombination(brandId, editing.menuId, form);
      } else {
        await onlineOrderingService.createMenuCombination(brandId, form);
      }
      setOpened(false);
      notifications.show({
        color: 'green',
        message: `Menu combination ${editing ? 'updated' : 'created'}.`,
      });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to save menu combination',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (menuId: number) => {
    if (!brandId) return;
    try {
      await onlineOrderingService.deleteMenuCombination(brandId, menuId);
      notifications.show({
        color: 'green',
        message: 'Menu combination disabled.',
      });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to disable menu combination',
      });
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Menu Combinations</Title>
          <Text size="sm" c="dimmed">
            Build online-ordering menus from ODO smart categories and assign them to shops.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId || loading}>
          Create Menu Combination
        </Button>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO menu combinations.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Menu</Table.Th>
              <Table.Th>Order</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Categories</Table.Th>
              <Table.Th>Shops</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.menuId}>
                <Table.Td>
                  <Text fw={600}>{row.menuName}</Text>
                  {row.menuCode && (
                    <Text size="xs" c="dimmed">
                      {row.menuCode}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>{row.displayOrder}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Badge color={row.enabled ? 'green' : 'gray'}>{row.enabled ? 'Enabled' : 'Disabled'}</Badge>
                    <Badge color={row.isPublished ? 'indigo' : 'gray'}>{row.isPublished ? 'Published' : 'Draft'}</Badge>
                  </Group>
                </Table.Td>
                <Table.Td>{(row.categories ?? []).length}</Table.Td>
                <Table.Td>{(row.shops ?? []).length}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="light" color="blue" onClick={() => openEdit(row)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="light" color="red" onClick={() => void handleDelete(row.menuId)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editing ? 'Edit Menu Combination' : 'Create Menu Combination'} size="xl">
        <Stack gap="md">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <TextInput label="Menu Name" value={form.menuName} onChange={(event) => setForm((current) => ({ ...current, menuName: event.currentTarget.value }))} />
            <TextInput label="Menu Name (Alt)" value={form.menuNameAlt ?? ''} onChange={(event) => setForm((current) => ({ ...current, menuNameAlt: event.currentTarget.value }))} />
            <TextInput label="Menu Code" value={form.menuCode ?? ''} onChange={(event) => setForm((current) => ({ ...current, menuCode: event.currentTarget.value }))} />
            <NumberInput
              label="Display Order"
              value={form.displayOrder ?? undefined}
              min={1}
              onChange={(value) => setForm((current) => ({ ...current, displayOrder: Number(value) || 1 }))}
            />
          </SimpleGrid>

          <MultiSelect
            label="ODO Smart Categories"
            data={(lookups?.smartCategories ?? []).map((category) => ({
              value: String(category.id),
              label: category.name,
            }))}
            value={form.categories.map((category) => String(category.categoryId))}
            onChange={(values) =>
              setForm((current) => ({
                ...current,
                categories: values.map((value) => ({
                  categoryId: parseInt(value, 10),
                  isSmartCategory: true,
                })),
              }))
            }
            searchable
          />

          <Group>
            <Switch label="Enabled" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.currentTarget.checked }))} />
            <Switch label="Published" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.currentTarget.checked }))} />
            <Switch label="Visible in ODO" checked={form.isOdoDisplay} onChange={(event) => setForm((current) => ({ ...current, isOdoDisplay: event.currentTarget.checked }))} />
            <Switch label="Foodpanda meal for one" checked={form.isFoodpandaMealForOne} onChange={(event) => setForm((current) => ({ ...current, isFoodpandaMealForOne: event.currentTarget.checked }))} />
          </Group>

          <Stack gap="xs">
            <Text fw={600}>Shop assignments</Text>
            {form.shops.map((shop, index) => {
              const lookup = lookups?.shops.find((entry) => entry.id === shop.shopId);
              return (
                <Paper key={shop.shopId} p="md" radius="md" style={{ border: '1px solid #E3E8EE' }}>
                  <Stack gap="sm">
                    <Group justify="space-between">
                      <Text fw={600}>{lookup?.name ?? `Shop #${shop.shopId}`}</Text>
                      <Group>
                        <Checkbox
                          label="Enabled"
                          checked={shop.enabled}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              shops: current.shops.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, enabled: event.currentTarget.checked } : entry,
                              ),
                            }))
                          }
                        />
                        <Checkbox
                          label="Public"
                          checked={shop.isPublicDisplay}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              shops: current.shops.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, isPublicDisplay: event.currentTarget.checked } : entry,
                              ),
                            }))
                          }
                        />
                      </Group>
                    </Group>
                    <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
                      <TextInput label="Days Of Week" value={shop.daysOfWeek ?? ''} onChange={(event) => setForm((current) => ({ ...current, shops: current.shops.map((entry, entryIndex) => entryIndex === index ? { ...entry, daysOfWeek: event.currentTarget.value } : entry) }))} />
                      <TextInput label="Dates" value={shop.dates ?? ''} onChange={(event) => setForm((current) => ({ ...current, shops: current.shops.map((entry, entryIndex) => entryIndex === index ? { ...entry, dates: event.currentTarget.value } : entry) }))} />
                      <TextInput label="From Time" value={shop.displayFromTime ?? ''} onChange={(event) => setForm((current) => ({ ...current, shops: current.shops.map((entry, entryIndex) => entryIndex === index ? { ...entry, displayFromTime: event.currentTarget.value } : entry) }))} />
                      <TextInput label="To Time" value={shop.displayToTime ?? ''} onChange={(event) => setForm((current) => ({ ...current, shops: current.shops.map((entry, entryIndex) => entryIndex === index ? { ...entry, displayToTime: event.currentTarget.value } : entry) }))} />
                    </SimpleGrid>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setOpened(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} loading={saving}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
