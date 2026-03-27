import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
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
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
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


// ── Main Page ──

// ── Main Page ──

export function PosMenusPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const navigate = useNavigate();
  const [menus, setMenus] = useState<PosMenu[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
                <Table.Th>Menu Name</Table.Th>
                <Table.Th>Alt Name</Table.Th>
                <Table.Th>Code</Table.Th>
                <Table.Th>Published</Table.Th>
                <Table.Th>Built-in</Table.Th>
                <Table.Th style={{ width: 160 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {menus.length === 0 ? (
                <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md">{loading ? 'Loading...' : 'No POS menus found.'}</Text></Table.Td></Table.Tr>
              ) : menus.map((menu) => (
                <Table.Tr key={menu.menuId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/menus/pos-menus/${menu.menuId}`)}>
                  <Table.Td><Text size="sm" fw={500}>{menu.menuName}</Text></Table.Td>
                  <Table.Td><Text size="sm" c={menu.menuNameAlt ? undefined : 'dimmed'}>{menu.menuNameAlt || '—'}</Text></Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{menu.menuCode || '—'}</Text></Table.Td>
                  <Table.Td><Badge size="sm" color={menu.isPublished ? 'green' : 'gray'}>{menu.isPublished ? 'Yes' : 'No'}</Badge></Table.Td>
                  <Table.Td>{menu.isBuiltIn && <Badge size="sm" variant="light">Built-in</Badge>}</Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Group gap={4}>
                      <Tooltip label="Move up" withArrow><ActionIcon size="xs" variant="subtle" onClick={() => void handleMove(menu.menuId, 'up')}><IconArrowUp size={12} /></ActionIcon></Tooltip>
                      <Tooltip label="Move down" withArrow><ActionIcon size="xs" variant="subtle" onClick={() => void handleMove(menu.menuId, 'down')}><IconArrowDown size={12} /></ActionIcon></Tooltip>
                      <Tooltip label="Edit" withArrow><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => navigate(`/menus/pos-menus/${menu.menuId}`)}><IconEdit size={14} /></ActionIcon></Tooltip>
                      {!menu.isBuiltIn && (
                        <Tooltip label="Delete" withArrow><ActionIcon size="sm" variant="subtle" color="red" onClick={() => void handleDelete(menu)}><IconTrash size={14} /></ActionIcon></Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
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
