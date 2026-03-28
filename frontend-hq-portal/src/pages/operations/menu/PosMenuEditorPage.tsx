import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Paper,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconArrowsSort,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBrands } from '../../../contexts/BrandContext';
import api from '../../../services/api';
import { SmartCategoryItemsReorderModal } from './smart-categories/SmartCategoryItemsReorderModal';
import type { SmartCategoryItemAssignment } from '../../../types/smartCategory';

// ── Types ──

interface MenuInfo {
  menuId: number; menuName: string; menuNameAlt: string; menuCode: string;
  displayOrder: number; isBuiltIn: boolean; isPublished: boolean; shopCount: number;
}

interface MenuCategory {
  categoryId: number; isSmartCategory: boolean; categoryName: string;
  categoryNameAlt: string; displayIndex: number; type: string;
}

interface AvailableCategory {
  categoryId: number; isSmartCategory: boolean; categoryName: string;
  categoryNameAlt: string; type: string;
}

interface ShopSchedule {
  shopId: number; shopName: string; enabled: boolean; isPublicDisplay: boolean;
  daysOfWeek: string; months: string; dates: string;
  displayFromTime: string; displayToTime: string;
}

// ── Service ──

const svc = {
  getMenu: async (brandId: number, menuId: number): Promise<MenuInfo> =>
    (await api.get(`/pos-menus/brand/${brandId}/${menuId}`)).data,
  updateMenu: async (brandId: number, menuId: number, payload: { menuName: string; menuNameAlt?: string; menuCode?: string; isPublished: boolean }) =>
    api.put(`/pos-menus/brand/${brandId}/${menuId}`, payload),
  getCategories: async (brandId: number, menuId: number): Promise<MenuCategory[]> =>
    (await api.get(`/pos-menus/brand/${brandId}/${menuId}/categories`)).data,
  updateCategories: async (brandId: number, menuId: number, entries: { categoryId: number; isSmartCategory: boolean }[]) =>
    api.put(`/pos-menus/brand/${brandId}/${menuId}/categories`, entries),
  reorderCategories: async (brandId: number, menuId: number, entries: { categoryId: number; isSmartCategory: boolean; displayIndex: number }[]) =>
    api.put(`/pos-menus/brand/${brandId}/${menuId}/reorder-categories`, entries),
  getAvailable: async (brandId: number): Promise<AvailableCategory[]> =>
    (await api.get(`/pos-menus/brand/${brandId}/available-categories`)).data,
  getShopSchedule: async (brandId: number, menuId: number): Promise<ShopSchedule[]> =>
    (await api.get(`/pos-menus/brand/${brandId}/${menuId}/shop-schedule`)).data,
  updateShopSchedule: async (brandId: number, menuId: number, entries: ShopSchedule[]) =>
    api.put(`/pos-menus/brand/${brandId}/${menuId}/shop-schedule`, entries),
};

// ── Day helpers (reuse from smart categories) ──
const DAY_OPTIONS = [
  { value: '1', label: 'Monday', short: 'Mon' },
  { value: '2', label: 'Tuesday', short: 'Tue' },
  { value: '3', label: 'Wednesday', short: 'Wed' },
  { value: '4', label: 'Thursday', short: 'Thu' },
  { value: '5', label: 'Friday', short: 'Fri' },
  { value: '6', label: 'Saturday', short: 'Sat' },
  { value: '7', label: 'Sunday', short: 'Sun' },
];

const parseDays = (raw?: string): string[] => {
  if (!raw) return [];
  return raw.replace(/[\[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
};

// ── Main Component ──

export function PosMenuEditorPage() {
  const { menuId: menuIdParam } = useParams<{ menuId: string }>();
  const menuId = menuIdParam ? parseInt(menuIdParam, 10) : null;
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const navigate = useNavigate();

  const [menu, setMenu] = useState<MenuInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [shopSchedule, setShopSchedule] = useState<ShopSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Details form
  const [detailsForm, setDetailsForm] = useState({ menuName: '', menuNameAlt: '', menuCode: '', isPublished: true });
  const [detailsSaving, setDetailsSaving] = useState(false);

  // Add categories modal
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [available, setAvailable] = useState<AvailableCategory[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());

  // Shop schedule edit modal
  const [shopEditIdx, setShopEditIdx] = useState<number | null>(null);
  const [shopModalOpened, setShopModalOpened] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);

  // Reorder modal (drag-and-drop, reuses SmartCategoryItemsReorderModal)
  const [reorderModalOpened, setReorderModalOpened] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);

  const loadAll = useCallback(async () => {
    if (!brandId || !menuId) return;
    try {
      setLoading(true);
      const menuData = await svc.getMenu(brandId, menuId);
      setMenu(menuData);
      setDetailsForm({ menuName: menuData.menuName, menuNameAlt: menuData.menuNameAlt, menuCode: menuData.menuCode, isPublished: menuData.isPublished });
      const cats = await svc.getCategories(brandId, menuId);
      setCategories(cats);
      const schedule = await svc.getShopSchedule(brandId, menuId);
      setShopSchedule(schedule);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to load menu' });
    } finally {
      setLoading(false);
    }
  }, [brandId, menuId]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // ── Categories ──
  const removeCategory = async (catId: number, isSmart: boolean) => {
    if (!brandId || !menuId) return;
    const updated = categories.filter(c => !(c.categoryId === catId && c.isSmartCategory === isSmart));
    try {
      await svc.updateCategories(brandId, menuId, updated.map(c => ({ categoryId: c.categoryId, isSmartCategory: c.isSmartCategory })));
      setCategories(updated);
      notifications.show({ color: 'green', message: 'Category removed' });
    } catch {
      notifications.show({ color: 'red', message: 'Failed to remove' });
    }
  };

  const openAddModal = async () => {
    if (!brandId) return;
    setSelectedToAdd(new Set());
    try {
      setAvailable(await svc.getAvailable(brandId));
    } catch { /* non-blocking */ }
    setAddModalOpened(true);
  };

  const handleAddCategories = async () => {
    if (!brandId || !menuId || selectedToAdd.size === 0) return;
    const existingKeys = new Set(categories.map(c => `${c.categoryId}-${c.isSmartCategory}`));
    const toAdd: { categoryId: number; isSmartCategory: boolean }[] = [];
    for (const key of selectedToAdd) {
      if (existingKeys.has(key)) continue;
      const [id, isSmart] = key.split('-');
      toAdd.push({ categoryId: parseInt(id), isSmartCategory: isSmart === 'true' });
    }
    const updated = [...categories.map(c => ({ categoryId: c.categoryId, isSmartCategory: c.isSmartCategory })), ...toAdd];
    try {
      await svc.updateCategories(brandId, menuId, updated);
      notifications.show({ color: 'green', message: `${toAdd.length} categories added` });
      setAddModalOpened(false);
      const cats = await svc.getCategories(brandId, menuId);
      setCategories(cats);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to add' });
    }
  };

  // ── Reorder (drag-and-drop via SmartCategoryItemsReorderModal) ──
  const openReorder = () => setReorderModalOpened(true);

  // Map categories to the reorder modal's expected format
  const reorderAsItems: SmartCategoryItemAssignment[] = useMemo(() =>
    categories.map((c) => ({
      itemId: c.categoryId * (c.isSmartCategory ? -1 : 1), // unique key: negative for smart
      itemCode: c.isSmartCategory ? 'Smart Category' : 'Category',
      itemName: c.categoryName || '—',
      itemNameAlt: c.categoryNameAlt,
      displayIndex: c.displayIndex,
      enabled: true,
      modifiedDate: '',
      modifiedBy: '',
    })),
  [categories]);

  // Map back from reorder modal format and save
  const handleReorderSave = async (orderedItems: SmartCategoryItemAssignment[]) => {
    if (!brandId || !menuId || !menu) return;
    try {
      setReorderSaving(true);
      const entries = orderedItems.map((item, idx) => {
        const isSmartCategory = item.itemId < 0;
        return {
          categoryId: Math.abs(item.itemId),
          isSmartCategory,
          displayIndex: idx * 10,
        };
      });
      if (menu.isBuiltIn) {
        await svc.reorderCategories(brandId, menuId, entries);
      } else {
        await svc.updateCategories(brandId, menuId, entries.map(e => ({ categoryId: e.categoryId, isSmartCategory: e.isSmartCategory })));
      }
      notifications.show({ color: 'green', message: 'Order saved' });
      setReorderModalOpened(false);
      const cats = await svc.getCategories(brandId, menuId);
      setCategories(cats);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save order' });
    } finally {
      setReorderSaving(false);
    }
  };

  // ── Details ──
  const saveDetails = async () => {
    if (!brandId || !menuId) return;
    try {
      setDetailsSaving(true);
      await svc.updateMenu(brandId, menuId, detailsForm);
      notifications.show({ color: 'green', message: 'Menu details saved' });
      const menuData = await svc.getMenu(brandId, menuId);
      setMenu(menuData);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setDetailsSaving(false);
    }
  };

  // ── Shop Schedule ──
  const saveShopSchedule = async () => {
    if (!brandId || !menuId) return;
    try {
      setShopSaving(true);
      await svc.updateShopSchedule(brandId, menuId, shopSchedule);
      notifications.show({ color: 'green', message: 'Shop schedule saved' });
      setShopModalOpened(false);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setShopSaving(false);
    }
  };

  const assignedKeys = useMemo(() => new Set(categories.map(c => `${c.categoryId}-${c.isSmartCategory}`)), [categories]);
  const unassigned = useMemo(() => available.filter(a => !assignedKeys.has(`${a.categoryId}-${a.isSmartCategory}`)), [available, assignedKeys]);
  const enabledShopCount = useMemo(() => shopSchedule.filter(s => s.enabled).length, [shopSchedule]);

  if (loading) return <Container size="xl" py="xl"><Group justify="center"><Loader /><Text>Loading menu...</Text></Group></Container>;
  if (!menu) return <Container size="xl" py="xl"><Alert color="red">Menu not found</Alert></Container>;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Group>
            <Tooltip label="Back to POS Menus" withArrow>
              <ActionIcon variant="subtle" size="lg" onClick={() => navigate('/menus/pos-menus')}>
                <IconArrowLeft size={20} />
              </ActionIcon>
            </Tooltip>
            <div>
              <Title order={2}>{menu.menuName}</Title>
              <Text size="sm" c="dimmed">
                {menu.isBuiltIn && <Badge size="sm" variant="light" mr="xs">Built-in</Badge>}
                {menu.isPublished ? <Badge size="sm" color="green" mr="xs">Published</Badge> : <Badge size="sm" color="gray" mr="xs">Unpublished</Badge>}
                {enabledShopCount > 0 && <Badge size="sm" variant="light" mr="xs">{enabledShopCount} shops</Badge>}
              </Text>
            </div>
          </Group>
          <Group gap="xs">
            {menu.isBuiltIn && (
              <Button variant="light" leftSection={<IconArrowsSort size={16} />} onClick={openReorder} disabled={categories.length < 2}>
                Reorder Categories
              </Button>
            )}
            <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void loadAll()} loading={loading}>Refresh</Button>
          </Group>
        </Group>

        <Tabs defaultValue="categories">
          <Tabs.List>
            <Tabs.Tab value="categories">Categories ({categories.length})</Tabs.Tab>
            <Tabs.Tab value="shops">Shop Schedule ({enabledShopCount})</Tabs.Tab>
            <Tabs.Tab value="details">Details</Tabs.Tab>
          </Tabs.List>

          {/* ══════════ Categories Tab ══════════ */}
          <Tabs.Panel value="categories" pt="md">
            <Group justify="flex-end" mb="sm" gap="xs">
              <Button size="sm" leftSection={<IconPlus size={14} />} onClick={() => void openAddModal()}>
                Add Categories
              </Button>
            </Group>
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Alt Name</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th style={{ width: 60 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {categories.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">No categories. Click "Add Categories".</Text></Table.Td></Table.Tr>
                  ) : categories.map((cat) => (
                    <Table.Tr key={`${cat.categoryId}-${cat.isSmartCategory}`}>
                      <Table.Td><Text size="sm">{cat.categoryName || '—'}</Text></Table.Td>
                      <Table.Td><Text size="sm" c={cat.categoryNameAlt ? undefined : 'dimmed'}>{cat.categoryNameAlt || '—'}</Text></Table.Td>
                      <Table.Td><Badge size="xs" variant="light" color={cat.isSmartCategory ? 'violet' : 'blue'}>{cat.type}</Badge></Table.Td>
                      <Table.Td>
                        {!menu.isBuiltIn && (
                          <Tooltip label="Remove" withArrow>
                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => void removeCategory(cat.categoryId, cat.isSmartCategory)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* ══════════ Shop Schedule Tab ══════════ */}
          <Tabs.Panel value="shops" pt="md">
            <Paper withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Shop</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th>Days</Table.Th>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th style={{ width: 60 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {shopSchedule.map((shop, i) => (
                    <Table.Tr key={shop.shopId}>
                      <Table.Td><Text size="sm">{shop.shopName}</Text></Table.Td>
                      <Table.Td><Badge size="sm" color={shop.enabled ? 'green' : 'gray'}>{shop.enabled ? 'Yes' : 'No'}</Badge></Table.Td>
                      <Table.Td><Text size="xs" c={shop.daysOfWeek ? undefined : 'dimmed'}>{shop.daysOfWeek || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs" c={shop.displayFromTime ? undefined : 'dimmed'}>{shop.displayFromTime || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs" c={shop.displayToTime ? undefined : 'dimmed'}>{shop.displayToTime || '—'}</Text></Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light" onClick={() => { setShopEditIdx(i); setShopModalOpened(true); }}>Edit</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>

          {/* ══════════ Details Tab ══════════ */}
          <Tabs.Panel value="details" pt="md">
            <Paper withBorder p="md">
              <Stack gap="md">
                <TextInput label="Menu Name" required value={detailsForm.menuName}
                  onChange={(e) => setDetailsForm({ ...detailsForm, menuName: e.currentTarget.value })}
                  disabled={menu.isBuiltIn} />
                <TextInput label="Alt Name" value={detailsForm.menuNameAlt}
                  onChange={(e) => setDetailsForm({ ...detailsForm, menuNameAlt: e.currentTarget.value })} />
                <TextInput label="Code" value={detailsForm.menuCode}
                  onChange={(e) => setDetailsForm({ ...detailsForm, menuCode: e.currentTarget.value })} />
                <Switch label="Published" checked={detailsForm.isPublished}
                  onChange={(e) => setDetailsForm({ ...detailsForm, isPublished: e.currentTarget.checked })} />
                <Group justify="flex-end">
                  <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveDetails()} loading={detailsSaving}>
                    Save Details
                  </Button>
                </Group>
              </Stack>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* ── Add Categories Modal ── */}
      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add Categories to Menu" size="lg">
        <Stack gap="md">
          {unassigned.length === 0 ? (
            <Text c="dimmed" py="md">All categories are already assigned.</Text>
          ) : (
            <Stack gap={0} style={{ maxHeight: 400, overflow: 'auto' }}>
              {unassigned.map((cat) => {
                const key = `${cat.categoryId}-${cat.isSmartCategory}`;
                return (
                  <Group key={key} gap="sm" py={4} px="xs" style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                    onClick={() => setSelectedToAdd(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; })}>
                    <Checkbox checked={selectedToAdd.has(key)} onChange={() => {}} />
                    <Text size="sm" style={{ flex: 1 }}>{cat.categoryName}</Text>
                    <Badge size="xs" variant="light" color={cat.isSmartCategory ? 'violet' : 'blue'}>{cat.type}</Badge>
                  </Group>
                );
              })}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>Cancel</Button>
            <Button disabled={selectedToAdd.size === 0} onClick={() => void handleAddCategories()}>
              Add ({selectedToAdd.size})
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Reorder Modal (drag-and-drop) ── */}
      <SmartCategoryItemsReorderModal
        opened={reorderModalOpened}
        onClose={() => setReorderModalOpened(false)}
        categoryName={menu?.menuName ?? 'Menu'}
        items={reorderAsItems}
        loading={false}
        saving={reorderSaving}
        onSave={handleReorderSave}
      />

      {/* ── Shop Schedule Edit Modal ── */}
      {shopEditIdx !== null && shopSchedule[shopEditIdx] && (
        <Modal opened={shopModalOpened} onClose={() => setShopModalOpened(false)}
          title={`Shop Schedule — ${shopSchedule[shopEditIdx].shopName}`} size="md">
          {(() => {
            const shop = shopSchedule[shopEditIdx];
            const update = (patch: Partial<ShopSchedule>) => {
              const u = [...shopSchedule]; u[shopEditIdx] = { ...shop, ...patch }; setShopSchedule(u);
            };
            const monthVals = shop.months ? shop.months.split(',').map(m => m.trim()).filter(Boolean) : [];
            const dayVals = shop.dates ? shop.dates.split(',').map(d => d.trim()).filter(Boolean) : [];
            const dowVals = parseDays(shop.daysOfWeek);
            return (
              <Stack gap="md">
                <Switch label="Enabled" checked={shop.enabled} onChange={(e) => update({ enabled: e.currentTarget.checked })} />
                <MultiSelect label="Month" placeholder={monthVals.length === 0 ? 'All months' : undefined} data={[
                  { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
                  { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
                  { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
                  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
                ]} value={monthVals} onChange={(vals) => update({ months: vals.join(',') || '' })} clearable />
                <MultiSelect label="Day" placeholder={dayVals.length === 0 ? 'All days' : undefined}
                  data={Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                  value={dayVals} onChange={(vals) => update({ dates: vals.join(',') || '' })} clearable searchable />
                <MultiSelect label="Day of the Week" placeholder={dowVals.length === 0 ? 'All days' : undefined}
                  data={DAY_OPTIONS.map(d => ({ value: d.value, label: d.label }))}
                  value={dowVals} onChange={(vals) => update({ daysOfWeek: vals.join(',') || '' })} clearable />
                <Group grow>
                  <TextInput label="From Time" type="time" value={shop.displayFromTime} onChange={(e) => update({ displayFromTime: e.currentTarget.value })} />
                  <TextInput label="To Time" type="time" value={shop.displayToTime} onChange={(e) => update({ displayToTime: e.currentTarget.value })} />
                </Group>
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setShopModalOpened(false)}>Cancel</Button>
                  <Button onClick={() => void saveShopSchedule()} loading={shopSaving}>Update</Button>
                </Group>
              </Stack>
            );
          })()}
        </Modal>
      )}
    </Container>
  );
}
