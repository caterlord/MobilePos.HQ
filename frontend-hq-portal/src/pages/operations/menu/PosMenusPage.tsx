import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Container,
  Group,
  Modal,
  Paper,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import api from '../../../services/api';

// ── Types ──

interface PosMenu {
  menuId: number;
  menuName: string;
  menuNameAlt: string;
  menuCode: string;
  displayOrder: number;
  isBuiltIn: boolean;
  isPublished: boolean;
}

interface MenuCategory {
  categoryId: number;
  isSmartCategory: boolean;
  categoryName: string;
  categoryNameAlt: string;
  displayIndex: number;
  type: string;
}

interface AvailableCategory {
  categoryId: number;
  isSmartCategory: boolean;
  categoryName: string;
  categoryNameAlt: string;
  type: string;
}

// ── Service ──

const posMenuService = {
  list: async (brandId: number): Promise<PosMenu[]> =>
    (await api.get(`/pos-menus/brand/${brandId}`)).data,

  create: async (brandId: number, payload: { menuName: string; menuNameAlt?: string; menuCode?: string; isPublished: boolean }): Promise<PosMenu> =>
    (await api.post(`/pos-menus/brand/${brandId}`, payload)).data,

  update: async (brandId: number, menuId: number, payload: { menuName: string; menuNameAlt?: string; menuCode?: string; isPublished: boolean }): Promise<void> => {
    await api.put(`/pos-menus/brand/${brandId}/${menuId}`, payload);
  },

  remove: async (brandId: number, menuId: number): Promise<void> => {
    await api.delete(`/pos-menus/brand/${brandId}/${menuId}`);
  },

  reorder: async (brandId: number, entries: { id: number; displayOrder: number }[]): Promise<void> => {
    await api.put(`/pos-menus/brand/${brandId}/reorder`, entries);
  },

  getCategories: async (brandId: number, menuId: number): Promise<MenuCategory[]> =>
    (await api.get(`/pos-menus/brand/${brandId}/${menuId}/categories`)).data,

  updateCategories: async (brandId: number, menuId: number, entries: { categoryId: number; isSmartCategory: boolean }[]): Promise<void> => {
    await api.put(`/pos-menus/brand/${brandId}/${menuId}/categories`, entries);
  },

  getAvailable: async (brandId: number): Promise<AvailableCategory[]> =>
    (await api.get(`/pos-menus/brand/${brandId}/available-categories`)).data,

  syncBuiltIn: async (brandId: number): Promise<{ message: string }> =>
    (await api.post(`/pos-menus/brand/${brandId}/sync-builtin`, {})).data,
};

// ── Menu Detail Panel ──

function MenuDetailPanel({
  brandId,
  menuId,
  onChanged,
}: {
  brandId: number;
  menuId: number;
  onChanged?: () => void;
}) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [available, setAvailable] = useState<AvailableCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const loadAvailable = useCallback(async () => {
    try {
      setAvailable(await posMenuService.getAvailable(brandId));
    } catch { /* loaded on demand */ }
  }, [brandId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const cats = await posMenuService.getCategories(brandId, menuId);
      setCategories(cats);
      setDirty(false);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to load menu categories' });
    } finally {
      setLoading(false);
    }
  }, [brandId, menuId]);

  useEffect(() => { void load(); }, [load]);

  const assignedKeys = useMemo(
    () => new Set(categories.map((c) => `${c.categoryId}-${c.isSmartCategory}`)),
    [categories],
  );

  const unassigned = useMemo(
    () => available.filter((a) => !assignedKeys.has(`${a.categoryId}-${a.isSmartCategory}`)),
    [available, assignedKeys],
  );

  const removeCategory = (categoryId: number, isSmartCategory: boolean) => {
    setCategories((prev) => prev.filter((c) => !(c.categoryId === categoryId && c.isSmartCategory === isSmartCategory)));
    setDirty(true);
  };

  const moveCategory = (categoryId: number, isSmartCategory: boolean, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.displayIndex - b.displayIndex);
    const idx = sorted.findIndex((c) => c.categoryId === categoryId && c.isSmartCategory === isSmartCategory);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tempIdx = sorted[idx].displayIndex;
    sorted[idx] = { ...sorted[idx], displayIndex: sorted[swapIdx].displayIndex };
    sorted[swapIdx] = { ...sorted[swapIdx], displayIndex: tempIdx };
    setCategories(sorted);
    setDirty(true);
  };

  const handleAddSelected = () => {
    const toAdd: MenuCategory[] = [];
    const maxIdx = categories.reduce((max, c) => Math.max(max, c.displayIndex), 0);
    let nextIdx = maxIdx + 1;
    for (const key of selectedToAdd) {
      const [idStr, isSmart] = key.split('-');
      const a = available.find((av) => av.categoryId === parseInt(idStr) && av.isSmartCategory === (isSmart === 'true'));
      if (a) {
        toAdd.push({
          categoryId: a.categoryId,
          isSmartCategory: a.isSmartCategory,
          categoryName: a.categoryName,
          categoryNameAlt: a.categoryNameAlt,
          displayIndex: nextIdx++,
          type: a.type,
        });
      }
    }
    setCategories((prev) => [...prev, ...toAdd]);
    setSelectedToAdd(new Set());
    setAddModalOpened(false);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const sorted = [...categories].sort((a, b) => a.displayIndex - b.displayIndex);
      await posMenuService.updateCategories(brandId, menuId, sorted.map((c) => ({
        categoryId: c.categoryId,
        isSmartCategory: c.isSmartCategory,
      })));
      notifications.show({ color: 'green', message: 'Menu categories saved' });
      setDirty(false);
      onChanged?.();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  const toggleAdd = (key: string) => {
    setSelectedToAdd((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (loading) return <Text size="sm" c="dimmed" py="xs">Loading...</Text>;

  const sorted = [...categories].sort((a, b) => a.displayIndex - b.displayIndex);

  return (
    <Paper p="sm" bg="gray.0" radius="sm">
      <Group justify="space-between" mb="xs">
        <Text size="sm" fw={600}>{sorted.length} categories assigned</Text>
        <Group gap="xs">
          <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => { setSelectedToAdd(new Set()); void loadAvailable(); setAddModalOpened(true); }}>
            Add Categories
          </Button>
          {dirty && (
            <Button size="xs" onClick={() => void handleSave()} loading={saving}>Save</Button>
          )}
        </Group>
      </Group>

      <Table verticalSpacing="xs" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Alt Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th style={{ width: 100 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sorted.length === 0 ? (
            <Table.Tr><Table.Td colSpan={4}><Text size="sm" c="dimmed">No categories assigned. Click "Add Categories" to get started.</Text></Table.Td></Table.Tr>
          ) : sorted.map((cat) => (
            <Table.Tr key={`${cat.categoryId}-${cat.isSmartCategory}`}>
              <Table.Td><Text size="sm">{cat.categoryName}</Text></Table.Td>
              <Table.Td><Text size="sm" c={cat.categoryNameAlt ? undefined : 'dimmed'}>{cat.categoryNameAlt || '—'}</Text></Table.Td>
              <Table.Td><Badge size="xs" variant="light" color={cat.isSmartCategory ? 'violet' : 'blue'}>{cat.type}</Badge></Table.Td>
              <Table.Td>
                <Group gap={4}>
                  <ActionIcon size="xs" variant="subtle" onClick={() => moveCategory(cat.categoryId, cat.isSmartCategory, 'up')}><IconArrowUp size={12} /></ActionIcon>
                  <ActionIcon size="xs" variant="subtle" onClick={() => moveCategory(cat.categoryId, cat.isSmartCategory, 'down')}><IconArrowDown size={12} /></ActionIcon>
                  <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeCategory(cat.categoryId, cat.isSmartCategory)}><IconTrash size={12} /></ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add Categories to Menu" size="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">Select categories and smart categories to add to this menu.</Text>
          {unassigned.length === 0 ? (
            <Text c="dimmed" py="md">All categories are already assigned.</Text>
          ) : (
            <Stack gap="xs" style={{ maxHeight: 400, overflow: 'auto' }}>
              {unassigned.map((cat) => {
                const key = `${cat.categoryId}-${cat.isSmartCategory}`;
                return (
                  <Group key={key} gap="sm" style={{ cursor: 'pointer' }} onClick={() => toggleAdd(key)}>
                    <Checkbox checked={selectedToAdd.has(key)} onChange={() => toggleAdd(key)} />
                    <Text size="sm">{cat.categoryName}</Text>
                    <Badge size="xs" variant="light" color={cat.isSmartCategory ? 'violet' : 'blue'}>{cat.type}</Badge>
                  </Group>
                );
              })}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>Cancel</Button>
            <Button onClick={handleAddSelected} disabled={selectedToAdd.size === 0}>
              Add ({selectedToAdd.size})
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}

// ── Main Page ──

export function PosMenusPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [menus, setMenus] = useState<PosMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Create/Edit modal
  const [modalOpened, setModalOpened] = useState(false);
  const [editTarget, setEditTarget] = useState<PosMenu | null>(null);
  const [form, setForm] = useState({ menuName: '', menuNameAlt: '', menuCode: '', isPublished: true });
  const [submitting, setSubmitting] = useState(false);

  const loadMenus = useCallback(async () => {
    if (!brandId) { setMenus([]); return; }
    try {
      setLoading(true);
      setMenus(await posMenuService.list(brandId));
    } catch {
      notifications.show({ color: 'red', message: 'Failed to load menus' });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadMenus(); }, [loadMenus]);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ menuName: '', menuNameAlt: '', menuCode: '', isPublished: true });
    setModalOpened(true);
  };

  const openEdit = (menu: PosMenu) => {
    setEditTarget(menu);
    setForm({ menuName: menu.menuName, menuNameAlt: menu.menuNameAlt, menuCode: menu.menuCode, isPublished: menu.isPublished });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!brandId || !form.menuName.trim()) {
      notifications.show({ color: 'red', message: 'Menu name is required' });
      return;
    }
    try {
      setSubmitting(true);
      if (editTarget) {
        await posMenuService.update(brandId, editTarget.menuId, form);
        notifications.show({ color: 'green', message: 'Menu updated' });
      } else {
        await posMenuService.create(brandId, form);
        notifications.show({ color: 'green', message: 'Menu created' });
      }
      setModalOpened(false);
      await loadMenus();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (menu: PosMenu) => {
    if (!brandId) return;
    if (!window.confirm(`Delete "${menu.menuName}"?`)) return;
    try {
      await posMenuService.remove(brandId, menu.menuId);
      notifications.show({ color: 'green', message: 'Menu deleted' });
      if (expandedId === menu.menuId) setExpandedId(null);
      await loadMenus();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to delete' });
    }
  };

  const handleMove = async (menuId: number, direction: 'up' | 'down') => {
    if (!brandId) return;
    const sorted = [...menus].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((m) => m.menuId === menuId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    [sorted[idx], sorted[swapIdx]] = [sorted[swapIdx], sorted[idx]];
    const entries = sorted.map((m, i) => ({ id: m.menuId, displayOrder: i }));
    try {
      await posMenuService.reorder(brandId, entries);
      await loadMenus();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to reorder' });
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>POS Menus</Title>
          <Group>
            <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void loadMenus()} loading={loading}>Refresh</Button>
            <Button variant="light" loading={syncing} disabled={!brandId} onClick={async () => {
              if (!brandId) return;
              try {
                setSyncing(true);
                const result = await posMenuService.syncBuiltIn(brandId);
                notifications.show({ color: 'green', message: result.message });
                await loadMenus();
              } catch {
                notifications.show({ color: 'red', message: 'Sync failed' });
              } finally {
                setSyncing(false);
              }
            }}>Sync Built-in Menu</Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>New Menu</Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">Select a brand to manage POS menus.</Alert>
        )}

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }} />
                <Table.Th>Menu Name</Table.Th>
                <Table.Th>Alt Name</Table.Th>
                <Table.Th>Code</Table.Th>
                <Table.Th>Published</Table.Th>
                <Table.Th>Built-in</Table.Th>
                <Table.Th style={{ width: 140 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {menus.length === 0 ? (
                <Table.Tr><Table.Td colSpan={7}><Text c="dimmed" ta="center" py="md">{loading ? 'Loading...' : 'No POS menus found.'}</Text></Table.Td></Table.Tr>
              ) : (
                menus.flatMap((menu) => {
                  const isExpanded = expandedId === menu.menuId;
                  const rows = [
                    <Table.Tr key={menu.menuId} style={{ cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : menu.menuId)}>
                      <Table.Td>
                        <ActionIcon variant="subtle" size="sm">
                          {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        </ActionIcon>
                      </Table.Td>
                      <Table.Td><Text size="sm" fw={500}>{menu.menuName}</Text></Table.Td>
                      <Table.Td><Text size="sm" c={menu.menuNameAlt ? undefined : 'dimmed'}>{menu.menuNameAlt || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">{menu.menuCode || '—'}</Text></Table.Td>
                      <Table.Td><Badge size="sm" color={menu.isPublished ? 'green' : 'gray'}>{menu.isPublished ? 'Yes' : 'No'}</Badge></Table.Td>
                      <Table.Td>{menu.isBuiltIn && <Badge size="sm" variant="light">Built-in</Badge>}</Table.Td>
                      <Table.Td onClick={(e) => e.stopPropagation()}>
                        <Group gap={4}>
                          <ActionIcon size="xs" variant="subtle" onClick={() => void handleMove(menu.menuId, 'up')}><IconArrowUp size={12} /></ActionIcon>
                          <ActionIcon size="xs" variant="subtle" onClick={() => void handleMove(menu.menuId, 'down')}><IconArrowDown size={12} /></ActionIcon>
                          <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => openEdit(menu)}><IconEdit size={14} /></ActionIcon>
                          {!menu.isBuiltIn && (
                            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => void handleDelete(menu)}><IconTrash size={14} /></ActionIcon>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>,
                  ];
                  if (isExpanded && brandId) {
                    rows.push(
                      <Table.Tr key={`${menu.menuId}-detail`} style={{ backgroundColor: '#f8f9fa' }}>
                        <Table.Td colSpan={7} style={{ padding: '12px 16px' }}>
                          <MenuDetailPanel brandId={brandId} menuId={menu.menuId} onChanged={() => void loadMenus()} />
                        </Table.Td>
                      </Table.Tr>
                    );
                  }
                  return rows;
                })
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {/* ── Create/Edit Modal ── */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Menu' : 'New Menu'} size="md">
        <Stack gap="md">
          <TextInput label="Menu Name" required value={form.menuName} onChange={(e) => setForm({ ...form, menuName: e.currentTarget.value })} />
          <TextInput label="Alt Name" value={form.menuNameAlt} onChange={(e) => setForm({ ...form, menuNameAlt: e.currentTarget.value })} />
          <TextInput label="Code" value={form.menuCode} onChange={(e) => setForm({ ...form, menuCode: e.currentTarget.value })} />
          <Switch label="Published" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.currentTarget.checked })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>{editTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
