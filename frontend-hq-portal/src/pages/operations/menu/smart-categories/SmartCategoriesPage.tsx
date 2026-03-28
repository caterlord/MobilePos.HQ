import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
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
  IconAlertCircle,
  IconArrowsSort,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconRestore,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useBrands } from '../../../../contexts/BrandContext';
import buttonStyleService from '../../../../services/buttonStyleService';
import itemCategoryService from '../../../../services/itemCategoryService';
import menuItemService from '../../../../services/menuItemService';
import smartCategoryService from '../../../../services/smartCategoryService';
import type { ButtonStyle } from '../../../../types/buttonStyle';
import { SmartCategoryItemsReorderModal } from './SmartCategoryItemsReorderModal';
import type {
  SmartCategoryDetail,
  SmartCategoryTreeNode,
  SmartCategoryUpsertPayload,
} from '../../../../types/smartCategory';

// ── Flatten tree ──

interface FlatNode extends SmartCategoryTreeNode {
  depth: number;
}

const flattenTree = (nodes: SmartCategoryTreeNode[], depth = 0): FlatNode[] =>
  nodes.flatMap((n) => [{ ...n, depth }, ...flattenTree(n.children, depth + 1)]);

// ── Day of week mapping (DB stores numbers 1-7 or short names) ──
const DAY_OPTIONS = [
  { value: '1', label: 'Monday', short: 'Mon' },
  { value: '2', label: 'Tuesday', short: 'Tue' },
  { value: '3', label: 'Wednesday', short: 'Wed' },
  { value: '4', label: 'Thursday', short: 'Thu' },
  { value: '5', label: 'Friday', short: 'Fri' },
  { value: '6', label: 'Saturday', short: 'Sat' },
  { value: '7', label: 'Sunday', short: 'Sun' },
];

const DAY_SHORT_MAP: Record<string, string> = Object.fromEntries(
  DAY_OPTIONS.flatMap((d) => [
    [d.value, d.short],
    [d.short, d.short],
    [d.short.toLowerCase(), d.short],
    [d.label, d.short],
    [d.label.toLowerCase(), d.short],
  ])
);

/** Parse "1,2,3" or "Mon,Tue,Wed" or "[1,2,3]" → normalized value array ["1","2","3"] */
const parseDaysOfWeek = (raw?: string | null): string[] => {
  if (!raw) return [];
  const cleaned = raw.replace(/[\[\]]/g, '');
  return cleaned.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    // Normalize: if it's a name like "Mon" or "Monday", map to number
    for (const d of DAY_OPTIONS) {
      if (s === d.value || s.toLowerCase() === d.short.toLowerCase() || s.toLowerCase() === d.label.toLowerCase()) return d.value;
    }
    return s;
  });
};

/** Format day values for display as React node with tooltip badge for overflow */
const formatDaysDisplay = (raw?: string | null, maxShow = 2): React.ReactNode => {
  if (!raw) return '—';
  const vals = parseDaysOfWeek(raw);
  if (vals.length === 0) return '—';
  if (vals.length === 7) return 'Every day';
  const names = vals.map((v) => DAY_SHORT_MAP[v] ?? v);
  if (names.length <= maxShow) return names.join(', ');
  const visible = names.slice(0, maxShow).join(', ');
  const hidden = names.slice(maxShow);
  return (
    <Group gap={4} wrap="nowrap">
      <span>{visible}</span>
      <Tooltip label={hidden.join(', ')} withArrow>
        <Badge size="xs" variant="light" style={{ cursor: 'pointer' }}>+{hidden.length}</Badge>
      </Tooltip>
    </Group>
  );
};

// ── Category Detail Panel (inline expand) ──

function CategoryDetailPanel({
  brandId,
  categoryId,
  showChannels,
  onDataChanged,
}: {
  brandId: number;
  categoryId: number;
  showChannels: boolean;
  onDataChanged?: () => void;
}) {
  const [detail, setDetail] = useState<SmartCategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemsDirty, setItemsDirty] = useState(false);

  // Reorder modal
  const [reorderModalOpened, setReorderModalOpened] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);

  // Add items modal
  type ItemRow = { itemId: number; itemCode: string; itemName: string; categoryName?: string };
  const [addItemsModalOpened, setAddItemsModalOpened] = useState(false);
  const [addMode, setAddMode] = useState<'search' | 'browse'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ItemRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  // Category list (shared by browse + copy)
  const [categoryList, setCategoryList] = useState<{ id: number; name: string; isSmartCategory: boolean; isOdo: boolean }[]>([]);
  const [categoryNameMap, setCategoryNameMap] = useState<Map<number, string>>(new Map());
  // Browse by category
  const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null);
  const [browseItems, setBrowseItems] = useState<ItemRow[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(false);

  // Shop edit modal
  const [shopEditModalOpened, setShopEditModalOpened] = useState(false);
  const [editingShopIdx, setEditingShopIdx] = useState<number | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await smartCategoryService.getDetail(brandId, categoryId);
      setDetail(data);
      setItemsDirty(false);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to load category detail' });
    } finally {
      setLoading(false);
    }
  }, [brandId, categoryId]);

  useEffect(() => { void reload(); }, [reload]);

  const openAddItemsModal = async () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedItemIds(new Set());
    setAddMode('search');
    setBrowseCategoryId(null);
    setBrowseItems([]);
    setAddItemsModalOpened(true);
    // Load categories for browse/copy
    try {
      const [cats, smartTree] = await Promise.allSettled([
        itemCategoryService.getItemCategories(brandId),
        smartCategoryService.getTree(brandId),
      ]);
      const list: { id: number; name: string; isSmartCategory: boolean; isOdo: boolean }[] = [];
      const nameMap = new Map<number, string>();
      if (cats.status === 'fulfilled') {
        for (const c of cats.value) {
          list.push({ id: c.categoryId, name: c.categoryName, isSmartCategory: false, isOdo: false });
          nameMap.set(c.categoryId, c.categoryName);
        }
      }
      if (smartTree.status === 'fulfilled') {
        const flatten = (nodes: SmartCategoryTreeNode[]): void => {
          for (const n of nodes) {
            if (n.smartCategoryId !== categoryId) list.push({ id: n.smartCategoryId, name: n.name, isSmartCategory: true, isOdo: n.isOdoDisplay });
            flatten(n.children);
          }
        };
        flatten(smartTree.value);
      }
      setCategoryList(list);
      setCategoryNameMap(nameMap);
    } catch { /* non-blocking */ }
  };

  const handleSearchItems = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const result = await menuItemService.getMenuItems(brandId, { search: searchQuery.trim(), pageSize: 50 });
      setSearchResults(
        result.items.map((i) => ({
          itemId: i.itemId, itemCode: i.itemCode, itemName: i.itemName ?? '',
          categoryName: categoryNameMap.get(i.categoryId) ?? `Category #${i.categoryId}`,
        }))
      );
      setSelectedItemIds(new Set());
    } catch {
      notifications.show({ color: 'red', message: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const handleBrowseCategory = async (catKey: string) => {
    setBrowseCategoryId(catKey);
    if (!catKey) { setBrowseItems([]); return; }
    try {
      setLoadingBrowse(true);
      const [idStr, type] = catKey.split(':');
      const id = parseInt(idStr);
      if (type === 'smart') {
        const d = await smartCategoryService.getDetail(brandId, id);
        setBrowseItems(d.items.map((i) => ({ itemId: i.itemId, itemCode: i.itemCode, itemName: i.itemName, categoryName: categoryNameMap.get(id) })));
      } else {
        const result = await menuItemService.getMenuItems(brandId, { categoryId: id, pageSize: 200 });
        setBrowseItems(result.items.map((i) => ({ itemId: i.itemId, itemCode: i.itemCode, itemName: i.itemName ?? '', categoryName: categoryNameMap.get(i.categoryId) })));
      }
      setSelectedItemIds(new Set());
    } catch {
      notifications.show({ color: 'red', message: 'Failed to load items' });
    } finally {
      setLoadingBrowse(false);
    }
  };

  const addSelectedItems = (items: { itemId: number; itemCode: string; itemName: string }[]) => {
    if (!detail) return;
    const existingIds = new Set(detail.items.map((i) => i.itemId));
    const maxIdx = detail.items.reduce((max, i) => Math.max(max, i.displayIndex), 0);
    let nextIdx = maxIdx + 1;
    const newItems = items.filter((i) => !existingIds.has(i.itemId));
    if (newItems.length === 0) {
      notifications.show({ color: 'yellow', message: 'All selected items already exist in this category' });
      return;
    }
    setDetail({
      ...detail,
      items: [...detail.items, ...newItems.map((item) => ({
        itemId: item.itemId, itemCode: item.itemCode, itemName: item.itemName,
        itemNameAlt: null, displayIndex: nextIdx++, enabled: true,
        modifiedDate: new Date().toISOString(), modifiedBy: '',
      }))],
    });
    setItemsDirty(true);
    notifications.show({ color: 'green', message: `${newItems.length} item(s) added` });
    setAddItemsModalOpened(false);
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  };

  const removeItem = (itemId: number) => {
    if (!detail) return;
    setDetail({ ...detail, items: detail.items.filter((i) => i.itemId !== itemId) });
    setItemsDirty(true);
  };

  const handleReorderSave = async (orderedItems: SmartCategoryDetail['items']) => {
    if (!detail) return;
    try {
      setReorderSaving(true);
      await smartCategoryService.upsertItems(brandId, categoryId, {
        items: orderedItems.map((item, idx) => ({ itemId: item.itemId, displayIndex: idx * 10, enabled: true })),
      });
      notifications.show({ color: 'green', message: 'Item order saved' });
      setReorderModalOpened(false);
      await reload();
      onDataChanged?.();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save order' });
    } finally {
      setReorderSaving(false);
    }
  };

  const resetItems = () => {
    void reload();
  };

  const saveItems = async () => {
    if (!detail) return;
    try {
      setSaving(true);
      await smartCategoryService.upsertItems(brandId, categoryId, {
        items: detail.items.map((i) => ({ itemId: i.itemId, displayIndex: i.displayIndex, enabled: i.enabled })),
      });
      notifications.show({ color: 'green', message: 'Items saved' });
      setItemsDirty(false);
      onDataChanged?.();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save items' });
    } finally {
      setSaving(false);
    }
  };

  const saveDisplaySettings = async () => {
    if (!detail) return;
    try {
      setSaving(true);
      await smartCategoryService.updateDisplaySettings(brandId, categoryId, {
        shopSchedules: detail.shopSchedules.map((s) => ({
          shopId: s.shopId, displayIndex: s.displayIndex,
          displayFromDate: s.displayFromDate, displayToDate: s.displayToDate,
          displayFromTime: s.displayFromTime, displayToTime: s.displayToTime,
          displayFromDateTime: s.displayFromDateTime, displayToDateTime: s.displayToDateTime,
          isPublicDisplay: s.isPublicDisplay, enabled: s.enabled,
          dayOfWeek: s.dayOfWeek, isWeekdayHide: s.isWeekdayHide,
          isWeekendHide: s.isWeekendHide, isHolidayHide: s.isHolidayHide,
          daysOfWeek: s.daysOfWeek, months: s.months, dates: s.dates,
        })),
        orderChannels: detail.orderChannels.map((c) => ({
          shopId: c.shopId, orderChannelId: c.orderChannelId, enabled: c.enabled,
        })),
      });
      notifications.show({ color: 'green', message: 'Settings saved' });
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Group justify="center" py="sm"><Loader size="xs" /><Text size="sm" c="dimmed">Loading...</Text></Group>;
  if (!detail) return null;

  const sortedItems = [...detail.items].sort((a, b) => a.displayIndex - b.displayIndex);

  return (
    <Paper p="sm" bg="gray.0" radius="sm">
      <Tabs defaultValue="items">
        <Tabs.List>
          <Tabs.Tab value="items">Sellable Items ({detail.items.length})</Tabs.Tab>
          <Tabs.Tab value="shops">Shop Display Settings ({detail.shopSchedules.length})</Tabs.Tab>
          {showChannels && <Tabs.Tab value="channels">Order Channels ({detail.orderChannels.length})</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="items" pt="xs">
          <Group justify="flex-end" mb="xs" gap="xs">
            <Button size="xs" variant="light" leftSection={<IconArrowsSort size={14} />} onClick={() => setReorderModalOpened(true)} disabled={sortedItems.length < 2}>
              Reorder
            </Button>
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => void openAddItemsModal()}>Add Items</Button>
            {itemsDirty && (
              <>
                <Button size="xs" variant="default" leftSection={<IconRestore size={14} />} onClick={resetItems}>Reset</Button>
                <Button size="xs" onClick={() => void saveItems()} loading={saving}>Save Items</Button>
              </>
            )}
          </Group>
          <Table verticalSpacing="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Item Name</Table.Th>
                <Table.Th>Order</Table.Th>
                <Table.Th style={{ width: 50 }} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedItems.length === 0 ? (
                <Table.Tr><Table.Td colSpan={4}><Text size="sm" c="dimmed">No items assigned. Click "Add Items" to get started.</Text></Table.Td></Table.Tr>
              ) : sortedItems.map((item) => (
                <Table.Tr key={item.itemId}>
                  <Table.Td><Text size="xs" c="dimmed">{item.itemCode}</Text></Table.Td>
                  <Table.Td><Text size="sm">{item.itemName}</Text></Table.Td>
                  <Table.Td><Text size="sm">{item.displayIndex}</Text></Table.Td>
                  <Table.Td>
                    <Tooltip label="Remove" withArrow><ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeItem(item.itemId)}><IconTrash size={12} /></ActionIcon></Tooltip>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {/* Reorder Modal */}
          <SmartCategoryItemsReorderModal
            opened={reorderModalOpened}
            onClose={() => setReorderModalOpened(false)}
            categoryName={detail.category.name}
            items={sortedItems}
            loading={false}
            saving={reorderSaving}
            onSave={handleReorderSave}
          />

          {/* Add Items Modal */}
          <Modal opened={addItemsModalOpened} onClose={() => setAddItemsModalOpened(false)} title="Add Items" size="xl">
            <Stack gap="md">
              <Group gap="xs">
                <Button size="xs" variant={addMode === 'search' ? 'filled' : 'light'} leftSection={<IconSearch size={14} />} onClick={() => { setAddMode('search'); setSelectedItemIds(new Set()); }}>
                  Search Items
                </Button>
                <Button size="xs" variant={addMode === 'browse' ? 'filled' : 'light'} leftSection={<IconPlus size={14} />} onClick={() => { setAddMode('browse'); setSelectedItemIds(new Set()); }}>
                  Browse by Category
                </Button>
              </Group>

              {/* Shared item list renderer */}
              {(() => {
                const renderItemList = (items: ItemRow[]) => {
                  if (items.length === 0) return null;
                  const selectableItems = items.filter((i) => !detail?.items.some((e) => e.itemId === i.itemId));
                  const selectedCount = selectableItems.filter((i) => selectedItemIds.has(i.itemId)).length;
                  const allSelected = selectableItems.length > 0 && selectedCount === selectableItems.length;
                  const someSelected = selectedCount > 0 && !allSelected;

                  const toggleAll = () => {
                    if (allSelected) {
                      setSelectedItemIds(new Set());
                    } else {
                      setSelectedItemIds(new Set(selectableItems.map((i) => i.itemId)));
                    }
                  };

                  return (
                    <Stack gap={0} style={{ maxHeight: 350, overflow: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
                      <Group gap="sm" py={4} px="xs" style={{ borderBottom: '1px solid #ddd', backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 1 }}>
                        <Checkbox size="xs" checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
                        <Text size="xs" fw={600} style={{ width: 70 }}>Code</Text>
                        <Text size="xs" fw={600} style={{ flex: 1 }}>Item Name</Text>
                        <Text size="xs" fw={600} style={{ width: 120 }}>Category</Text>
                        <div style={{ width: 80 }} />
                      </Group>
                      {items.map((item) => {
                        const alreadyExists = detail?.items.some((i) => i.itemId === item.itemId);
                        return (
                          <Group key={item.itemId} gap="sm" py={4} px="xs" style={{ borderBottom: '1px solid #f0f0f0', opacity: alreadyExists ? 0.4 : 1 }}>
                            <Checkbox size="xs"
                              checked={selectedItemIds.has(item.itemId)}
                              onChange={() => toggleItemSelection(item.itemId)}
                              disabled={alreadyExists} />
                            <Text size="xs" c="dimmed" style={{ width: 70 }}>{item.itemCode}</Text>
                            <Text size="sm" style={{ flex: 1 }}>{item.itemName}</Text>
                            <Text size="xs" c="dimmed" style={{ width: 120 }} lineClamp={1}>{item.categoryName || '—'}</Text>
                            {alreadyExists ? <Badge size="xs" variant="light" style={{ width: 80 }}>Added</Badge> : <div style={{ width: 80 }} />}
                          </Group>
                        );
                      })}
                    </Stack>
                  );
                };

                const browseCatMap = new Map(categoryList.map((c) => [
                  `${c.id}:${c.isSmartCategory ? 'smart' : 'regular'}`,
                  c,
                ]));

                if (addMode === 'search') return (
                  <>
                    <Group gap="xs">
                      <TextInput size="sm" placeholder="Search by item code, name, or alt name..." value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void handleSearchItems(); }}
                        style={{ flex: 1 }} />
                      <Button size="sm" onClick={() => void handleSearchItems()} loading={searching}>Search</Button>
                    </Group>
                    {renderItemList(searchResults)}
                  </>
                );

                // browse mode
                return (
                  <>
                    <Select label="Select a category to browse items" placeholder="Choose category (required)..."
                      data={categoryList.map((c) => ({
                        value: `${c.id}:${c.isSmartCategory ? 'smart' : 'regular'}`,
                        label: `${c.name} [${c.isSmartCategory ? (c.isOdo ? 'Online' : 'POS Smart') : 'Category'}]`,
                      }))}
                      value={browseCategoryId}
                      onChange={(v) => void handleBrowseCategory(v ?? '')}
                      searchable clearable
                      renderOption={({ option }) => {
                        const cat = browseCatMap.get(option.value);
                        const typeLabel = cat?.isSmartCategory ? (cat.isOdo ? 'Online' : 'POS Smart') : 'Category';
                        const color = cat?.isSmartCategory ? (cat.isOdo ? 'violet' : 'blue') : 'gray';
                        return (
                          <Group gap="sm">
                            <Text size="sm">{cat?.name ?? option.label}</Text>
                            <Badge size="xs" variant="light" color={color}>{typeLabel}</Badge>
                          </Group>
                        );
                      }} />
                    {loadingBrowse && <Text size="sm" c="dimmed">Loading items...</Text>}
                    {renderItemList(browseItems)}
                  </>
                );
              })()}

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setAddItemsModalOpened(false)}>Cancel</Button>
                <Button
                  disabled={selectedItemIds.size === 0}
                  onClick={() => {
                    const source = addMode === 'search' ? searchResults : browseItems;
                    const items = source.filter((i) => selectedItemIds.has(i.itemId));
                    addSelectedItems(items);
                  }}
                >
                  Add Selected ({selectedItemIds.size})
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Tabs.Panel>

        <Tabs.Panel value="shops" pt="xs">
          {detail.shopSchedules.length === 0 ? (
            <Text size="sm" c="dimmed" py="xs">No shop display settings.</Text>
          ) : (
            <Table verticalSpacing="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Shop</Table.Th>
                  <Table.Th>Month</Table.Th>
                  <Table.Th>Day</Table.Th>
                  <Table.Th>Day of Week</Table.Th>
                  <Table.Th>From Date</Table.Th>
                  <Table.Th>To Date</Table.Th>
                  <Table.Th>From Time</Table.Th>
                  <Table.Th>To Time</Table.Th>
                  <Table.Th>Special</Table.Th>
                  <Table.Th>Published</Table.Th>
                  <Table.Th style={{ width: 60 }} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.shopSchedules.map((shop, i) => (
                  <Table.Tr key={shop.shopId}>
                    <Table.Td><Text size="sm">{shop.shopName}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.months ? undefined : 'dimmed'}>{shop.months || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.dates ? undefined : 'dimmed'}>{shop.dates || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.daysOfWeek ? undefined : 'dimmed'}>{formatDaysDisplay(shop.daysOfWeek)}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.displayFromDate ? undefined : 'dimmed'}>{shop.displayFromDate || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.displayToDate ? undefined : 'dimmed'}>{shop.displayToDate || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.displayFromTime ? undefined : 'dimmed'}>{shop.displayFromTime || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c={shop.displayToTime ? undefined : 'dimmed'}>{shop.displayToTime || '—'}</Text></Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={shop.isHolidayHide ? 'orange' : 'gray'} variant="light">
                        {shop.isHolidayHide === true ? 'Special only' : shop.isWeekdayHide || shop.isWeekendHide ? 'Custom' : 'All'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="xs" color={shop.isPublicDisplay ? 'green' : 'red'}>
                        {shop.isPublicDisplay ? 'Yes' : 'No'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Button size="xs" variant="light" onClick={() => { setEditingShopIdx(i); setShopEditModalOpened(true); }}>Edit</Button>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          {/* Shop Display Edit Modal */}
          {editingShopIdx !== null && detail.shopSchedules[editingShopIdx] && (
            <Modal opened={shopEditModalOpened} onClose={() => setShopEditModalOpened(false)} title={`Edit Store Display Settings — ${detail.shopSchedules[editingShopIdx].shopName}`} size="md">
              {(() => {
                const shop = detail.shopSchedules[editingShopIdx];
                const updateShop = (patch: Partial<typeof shop>) => {
                  const u = [...detail.shopSchedules];
                  u[editingShopIdx] = { ...shop, ...patch };
                  setDetail({ ...detail, shopSchedules: u });
                };
                // Derive special days mode
                const specialMode = shop.isHolidayHide === true && !shop.isWeekdayHide && !shop.isWeekendHide
                  ? 'exclude-special'
                  : shop.isWeekdayHide === true && shop.isWeekendHide === true && !shop.isHolidayHide
                    ? 'special-only'
                    : 'all';
                return (
                  <Stack gap="md">
                    {(() => {
                      const monthVals = shop.months ? shop.months.split(',').map(m => m.trim()).filter(Boolean) : [];
                      const dayVals = shop.dates ? shop.dates.split(',').map(d => d.trim()).filter(Boolean) : [];
                      const dowVals = parseDaysOfWeek(shop.daysOfWeek);
                      return (<>
                        <MultiSelect label="Month" placeholder={monthVals.length === 0 ? 'All months' : undefined} data={[
                          { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
                          { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
                          { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
                          { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
                        ]} value={monthVals}
                          onChange={(vals) => updateShop({ months: vals.length > 0 ? vals.join(',') : null })}
                          clearable />
                        <MultiSelect label="Day" placeholder={dayVals.length === 0 ? 'All days' : undefined} data={
                          Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
                        } value={dayVals}
                          onChange={(vals) => updateShop({ dates: vals.length > 0 ? vals.join(',') : null })}
                          clearable searchable />
                        <MultiSelect label="Day of the Week" placeholder={dowVals.length === 0 ? 'All days' : undefined}
                          data={DAY_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                          value={dowVals}
                          onChange={(vals) => updateShop({ daysOfWeek: vals.length > 0 ? vals.join(',') : null })}
                          clearable />
                      </>);
                    })()}
                    <Group grow>
                      <TextInput label="From Date" type="date" value={shop.displayFromDate ?? ''} onChange={(e) => updateShop({ displayFromDate: e.currentTarget.value || null })} />
                      <TextInput label="To Date" type="date" value={shop.displayToDate ?? ''} onChange={(e) => updateShop({ displayToDate: e.currentTarget.value || null })} />
                    </Group>
                    <Group grow>
                      <TextInput label="From Time" type="time" value={shop.displayFromTime ?? ''} onChange={(e) => updateShop({ displayFromTime: e.currentTarget.value || null })} />
                      <TextInput label="To Time" type="time" value={shop.displayToTime ?? ''} onChange={(e) => updateShop({ displayToTime: e.currentTarget.value || null })} />
                    </Group>
                    <Select label="Special Days" data={[
                      { value: 'all', label: 'Display on weekdays, weekends and special days' },
                      { value: 'exclude-special', label: 'Display on weekdays and weekends other than special days' },
                      { value: 'special-only', label: 'Display only on special days' },
                    ]} value={specialMode} onChange={(v) => {
                      if (v === 'all') updateShop({ isWeekdayHide: false, isWeekendHide: false, isHolidayHide: false });
                      else if (v === 'exclude-special') updateShop({ isWeekdayHide: false, isWeekendHide: false, isHolidayHide: true });
                      else if (v === 'special-only') updateShop({ isWeekdayHide: true, isWeekendHide: true, isHolidayHide: false });
                    }} />
                    <Switch label="Publish" checked={shop.isPublicDisplay} onChange={(e) => updateShop({ isPublicDisplay: e.currentTarget.checked, enabled: e.currentTarget.checked })} />
                    <Group justify="flex-end">
                      <Button variant="default" onClick={() => setShopEditModalOpened(false)}>Cancel</Button>
                      <Button onClick={() => { void saveDisplaySettings(); setShopEditModalOpened(false); }} loading={saving}>Update</Button>
                    </Group>
                  </Stack>
                );
              })()}
            </Modal>
          )}
        </Tabs.Panel>

        {showChannels && (
          <Tabs.Panel value="channels" pt="xs">
            {detail.orderChannels.length === 0 ? (
              <Text size="sm" c="dimmed" py="xs">No channel mappings.</Text>
            ) : (
              <Table verticalSpacing="xs" striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Shop</Table.Th>
                    <Table.Th>Channel</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {detail.orderChannels.map((ch, i) => (
                    <Table.Tr key={`${ch.shopId}-${ch.orderChannelId}`}>
                      <Table.Td><Text size="sm">{ch.shopName}</Text></Table.Td>
                      <Table.Td><Text size="sm">{ch.name}</Text></Table.Td>
                      <Table.Td><Switch size="xs" checked={ch.enabled} onChange={(e) => { const u = [...detail.orderChannels]; u[i] = { ...ch, enabled: e.currentTarget.checked }; setDetail({ ...detail, orderChannels: u }); }} /></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
            <Group mt="xs" justify="flex-end">
              <Button size="xs" onClick={() => void saveDisplaySettings()} loading={saving}>Save Channels</Button>
            </Group>
          </Tabs.Panel>
        )}
      </Tabs>
    </Paper>
  );
}

// ── Shared Category Grid ──

function CategoryGrid({
  brandId,
  nodes,
  loading,
  isOdo,
  expandedId,
  setExpandedId,
  onEdit,
  onCreate,
  onDelete,
  onReorderChildren,
  onReload,
  allNodes,
  getButtonStyleById,
  getButtonStyleColor,
}: {
  brandId: number;
  nodes: FlatNode[];
  loading: boolean;
  isOdo: boolean;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  onEdit: (node: FlatNode) => void;
  onCreate: (parentId?: number | null) => void;
  onDelete: (node: FlatNode) => void;
  onReorderChildren: (parentId: number) => void;
  onReload: () => void;
  allNodes: FlatNode[];
  getButtonStyleById: (id?: number) => ButtonStyle | undefined;
  getButtonStyleColor: (style: ButtonStyle) => string;
}) {
  const emptyMsg = isOdo
    ? 'No online smart categories. Create one or flag existing categories for ODO display.'
    : 'No POS smart categories found.';

  return (
    <Paper withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: 40 }} />
            <Table.Th>Category Name</Table.Th>
            <Table.Th>Alt Name</Table.Th>
            <Table.Th>Items</Table.Th>
            <Table.Th>Display Index</Table.Th>
            <Table.Th>Style</Table.Th>
            <Table.Th>Published</Table.Th>
            <Table.Th style={{ width: 140 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {nodes.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={8}>
                <Text c="dimmed" ta="center" py="md">{loading ? 'Loading...' : emptyMsg}</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            nodes.flatMap((node) => {
              const isExpanded = expandedId === node.smartCategoryId;
              const rows = [
                <Table.Tr key={node.smartCategoryId} style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : node.smartCategoryId)}>
                  <Table.Td>
                    <ActionIcon variant="subtle" size="sm">
                      {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </ActionIcon>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ paddingLeft: node.depth * 20 }}>
                      {node.depth > 0 && <span style={{ color: '#aaa', marginRight: 4 }}>└</span>}
                      {node.name}
                    </Text>
                  </Table.Td>
                  <Table.Td><Text size="sm" c={node.nameAlt ? undefined : 'dimmed'}>{node.nameAlt || '—'}</Text></Table.Td>
                  <Table.Td><Badge size="sm" variant="light">{node.itemCount}</Badge></Table.Td>
                  <Table.Td><Text size="sm">{node.displayIndex}</Text></Table.Td>
                  <Table.Td>{(() => {
                    const style = getButtonStyleById(node.buttonStyleId);
                    if (!style) return <Box style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#E0E0E0', border: '1px dashed #999' }} />;
                    return <Tooltip label={style.styleName} withArrow><Box style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: getButtonStyleColor(style), border: '1px solid rgba(0,0,0,0.1)' }} /></Tooltip>;
                  })()}</Table.Td>
                  <Table.Td><Badge size="sm" color={node.enabled ? 'green' : 'gray'}>{node.enabled ? 'Yes' : 'No'}</Badge></Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Group gap={4}>
                      <Tooltip label="Edit" withArrow><ActionIcon size="sm" variant="subtle" color="blue" onClick={() => onEdit(node)}><IconEdit size={14} /></ActionIcon></Tooltip>
                      <Tooltip label="Add child" withArrow><ActionIcon size="sm" variant="subtle" onClick={() => onCreate(node.smartCategoryId)}><IconPlus size={14} /></ActionIcon></Tooltip>
                      {allNodes.some(n => n.parentSmartCategoryId === node.smartCategoryId) && (
                        <Tooltip label="Reorder children" withArrow><ActionIcon size="sm" variant="subtle" color="indigo" onClick={() => onReorderChildren(node.smartCategoryId)}><IconArrowsSort size={14} /></ActionIcon></Tooltip>
                      )}
                      <Tooltip label="Delete" withArrow><ActionIcon size="sm" variant="subtle" color="red" onClick={() => onDelete(node)}><IconTrash size={14} /></ActionIcon></Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>,
              ];
              if (isExpanded) {
                rows.push(
                  <Table.Tr key={`${node.smartCategoryId}-detail`} style={{ backgroundColor: '#f8f9fa' }}>
                    <Table.Td colSpan={7} style={{ padding: '12px 16px' }}>
                      <CategoryDetailPanel brandId={brandId} categoryId={node.smartCategoryId} showChannels={isOdo} onDataChanged={onReload} />
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
  );
}

// ── Main Page ──

export function SmartCategoriesPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [tree, setTree] = useState<SmartCategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Create/Edit modal
  const [modalOpened, setModalOpened] = useState(false);
  const [editTarget, setEditTarget] = useState<FlatNode | null>(null);
  const [form, setForm] = useState<SmartCategoryUpsertPayload>({
    name: '', nameAlt: '', parentSmartCategoryId: null, displayIndex: 0,
    enabled: true, isTerminal: true, isPublicDisplay: true, buttonStyleId: 0,
    isOdoDisplay: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // Category reorder modal with navigation stack
  const [catReorderOpened, setCatReorderOpened] = useState(false);
  const [catReorderSaving, setCatReorderSaving] = useState(false);
  const [catReorderParentId, setCatReorderParentId] = useState<number | null>(null);
  const [catReorderStack, setCatReorderStack] = useState<{ parentId: number | null; name: string }[]>([]);

  // Button styles for color box
  const [buttonStyles, setButtonStyles] = useState<ButtonStyle[]>([]);

  // Copy from existing modal
  const [copyModalOpened, setCopyModalOpened] = useState(false);
  const [copySourceFilter, setCopySourceFilter] = useState<'pos' | 'online'>('pos');
  const [copySelectedId, setCopySelectedId] = useState<number | null>(null);
  const [copyNewName, setCopyNewName] = useState('');
  const [copying, setCopying] = useState(false);

  const allFlat = useMemo(() => flattenTree(tree), [tree]);
  const posNodes = useMemo(() => allFlat.filter((n) => !n.isOdoDisplay), [allFlat]);
  const onlineNodes = useMemo(() => allFlat.filter((n) => n.isOdoDisplay), [allFlat]);
  const copySourceNodes = useMemo(() => copySourceFilter === 'online' ? onlineNodes : posNodes, [copySourceFilter, posNodes, onlineNodes]);

  const getButtonStyleColor = useCallback((style: ButtonStyle) => {
    let color = style.backgroundColorTop || style.backgroundColorMiddle || style.backgroundColorBottom || '#E0E0E0';
    if (color.length === 9 && color.startsWith('#')) color = '#' + color.substring(3);
    return color;
  }, []);

  const getButtonStyleById = useCallback((id?: number) => buttonStyles.find(s => s.buttonStyleId === id), [buttonStyles]);

  const loadData = useCallback(async () => {
    if (!brandId) { setTree([]); return; }
    try {
      setLoading(true);
      setError(null);
      const [treeData, styles] = await Promise.all([
        smartCategoryService.getTree(brandId),
        buttonStyleService.getButtonStyles(brandId),
      ]);
      setTree(treeData);
      setButtonStyles(styles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // Parent options for modal
  const parentOptions = useMemo(() => [
    { value: '', label: '(Root - no parent)' },
    ...allFlat
      .filter((n) => n.smartCategoryId !== editTarget?.smartCategoryId)
      .map((n) => ({ value: String(n.smartCategoryId), label: `${'  '.repeat(n.depth)}${n.name}` })),
  ], [allFlat, editTarget]);

  const openCreate = (parentId?: number | null) => {
    setEditTarget(null);
    setForm({
      name: '', nameAlt: '', parentSmartCategoryId: parentId ?? null,
      displayIndex: posNodes.length * 10, enabled: true, isTerminal: true,
      isPublicDisplay: true, buttonStyleId: 0, isOdoDisplay: false,
    });
    setModalOpened(true);
  };

  const openEdit = (node: FlatNode) => {
    setEditTarget(node);
    setForm({
      name: node.name, nameAlt: node.nameAlt, parentSmartCategoryId: node.parentSmartCategoryId,
      displayIndex: node.displayIndex, enabled: node.enabled, isTerminal: true,
      isPublicDisplay: true, buttonStyleId: node.buttonStyleId,
      isOdoDisplay: false,
    });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!brandId || !form.name.trim()) {
      notifications.show({ color: 'red', message: 'Category name is required' });
      return;
    }
    try {
      setSubmitting(true);
      if (editTarget) {
        await smartCategoryService.update(brandId, editTarget.smartCategoryId, form);
        notifications.show({ color: 'green', message: 'Category updated' });
      } else {
        await smartCategoryService.create(brandId, form);
        notifications.show({ color: 'green', message: 'Category created' });
      }
      setModalOpened(false);
      await loadData();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const openCopyModal = () => {
    setCopySourceFilter('pos');
    setCopySelectedId(null);
    setCopyNewName('');
    setCopyModalOpened(true);
  };

  const handleCopy = async () => {
    if (!brandId || !copySelectedId) return;
    try {
      setCopying(true);
      const result = await smartCategoryService.copy(brandId, copySelectedId, copyNewName, false);
      const catMsg = result.categoriesCopied > 1 ? ` (${result.categoriesCopied} categories)` : '';
      notifications.show({ color: 'green', message: `Copied "${result.name}" with ${result.itemCount} items${catMsg}` });
      setCopyModalOpened(false);
      await loadData();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to copy' });
    } finally {
      setCopying(false);
    }
  };

  const handleDelete = async (node: FlatNode) => {
    if (!brandId) return;
    if (!window.confirm(`Delete smart category "${node.name}"?`)) return;
    try {
      await smartCategoryService.remove(brandId, node.smartCategoryId);
      notifications.show({ color: 'green', message: 'Category deleted' });
      if (expandedId === node.smartCategoryId) setExpandedId(null);
      await loadData();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to delete' });
    }
  };

  const openCatReorder = (parentId: number | null = null) => {
    setCatReorderParentId(parentId);
    setCatReorderStack([]);
    setCatReorderOpened(true);
  };

  // Map categories to SmartCategoryItemAssignment shape for reuse of the reorder modal
  const catReorderAsItems = useMemo(() => {
    const filtered = posNodes.filter(n =>
      catReorderParentId === null
        ? !n.parentSmartCategoryId
        : n.parentSmartCategoryId === catReorderParentId
    );
    return filtered.map((n) => ({
      itemId: n.smartCategoryId,
      itemCode: n.nameAlt ?? '',
      itemName: n.name,
      itemNameAlt: n.nameAlt,
      displayIndex: n.displayIndex,
      enabled: n.enabled,
      modifiedDate: '',
      modifiedBy: '',
    }));
  }, [posNodes, catReorderParentId]);

  // IDs of categories that have children (for expand icon)
  const expandableIds = useMemo(() => {
    const ids = new Set<number>();
    for (const n of posNodes) {
      if (n.parentSmartCategoryId && posNodes.some(p => p.smartCategoryId === n.parentSmartCategoryId)) {
        ids.add(n.parentSmartCategoryId);
      }
    }
    return ids;
  }, [posNodes]);

  // Breadcrumb path
  const catReorderBreadcrumb = useMemo(() => {
    return catReorderStack.map(s => ({
      id: s.parentId ?? 0,
      name: s.name,
    }));
  }, [catReorderStack]);

  const catReorderName = useMemo(() => {
    if (catReorderParentId === null) return 'Root Smart Categories';
    return posNodes.find(n => n.smartCategoryId === catReorderParentId)?.name ?? 'Children';
  }, [catReorderParentId, posNodes]);

  // Drill down into children
  const handleDrillDown = (itemId: number) => {
    setCatReorderStack(prev => [...prev, {
      parentId: catReorderParentId,
      name: catReorderParentId === null ? 'Root' : (posNodes.find(n => n.smartCategoryId === catReorderParentId)?.name ?? 'Parent'),
    }]);
    setCatReorderParentId(itemId);
  };

  // Navigate back via breadcrumb
  const handleBreadcrumbClick = (index: number) => {
    const target = catReorderStack[index];
    setCatReorderStack(prev => prev.slice(0, index));
    setCatReorderParentId(target.parentId);
  };

  // Shared save logic
  const saveCatReorderEntries = async (orderedItems: SmartCategoryDetail['items']) => {
    if (!brandId) return;
    await smartCategoryService.reorder(brandId, {
      categories: orderedItems.map((item, idx) => {
        const node = posNodes.find(n => n.smartCategoryId === item.itemId);
        return {
          smartCategoryId: item.itemId,
          parentSmartCategoryId: node?.parentSmartCategoryId ?? null,
          displayIndex: idx * 10,
        };
      }),
    });
    await loadData();
  };

  const handleCatReorderSave = async (orderedItems: SmartCategoryDetail['items']) => {
    try {
      setCatReorderSaving(true);
      await saveCatReorderEntries(orderedItems);
      notifications.show({ color: 'green', message: 'Category order saved' });
      setCatReorderOpened(false);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save order' });
    } finally {
      setCatReorderSaving(false);
    }
  };

  // Save current level without closing (for drill-down confirm)
  const handleCatReorderSaveLevel = async (orderedItems: SmartCategoryDetail['items']) => {
    await saveCatReorderEntries(orderedItems);
    notifications.show({ color: 'green', message: 'Order saved' });
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Smart Categories</Title>
          <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void loadData()} loading={loading}>Refresh</Button>
        </Group>

        {!brandId && <Alert icon={<IconAlertCircle size={16} />} color="yellow">Select a brand to manage smart categories.</Alert>}
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

        <Group justify="flex-end">
          <Button variant="light" leftSection={<IconArrowsSort size={16} />} onClick={() => openCatReorder(null)} disabled={!brandId || posNodes.length < 2}>
            Reorder Categories
          </Button>
          <Button variant="light" leftSection={<IconCopy size={16} />} onClick={openCopyModal} disabled={!brandId}>
            Copy from Existing
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => openCreate()} disabled={!brandId}>
            New Smart Category
          </Button>
        </Group>

        {brandId && (
          <CategoryGrid
            brandId={brandId} nodes={posNodes} loading={loading} isOdo={false}
            expandedId={expandedId} setExpandedId={setExpandedId}
            onEdit={openEdit} onCreate={(parentId) => openCreate(parentId)}
            onDelete={(n) => void handleDelete(n)}
            onReorderChildren={(parentId) => openCatReorder(parentId)}
            onReload={() => void loadData()}
            allNodes={posNodes}
            getButtonStyleById={getButtonStyleById}
            getButtonStyleColor={getButtonStyleColor}
          />
        )}
      </Stack>

      {/* Create/Edit Modal */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)}
        title={editTarget ? 'Edit Smart Category' : 'New Smart Category'} size="md">
        <Stack gap="md">
          <TextInput label="Category Name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
          <TextInput label="Category Name (Alt)" value={form.nameAlt ?? ''}
            onChange={(e) => setForm({ ...form, nameAlt: e.currentTarget.value })} />
          <Select label="Parent Category" data={parentOptions}
            value={form.parentSmartCategoryId ? String(form.parentSmartCategoryId) : ''}
            onChange={(v) => setForm({ ...form, parentSmartCategoryId: v ? parseInt(v, 10) : null })}
            clearable searchable />
          <NumberInput label="Display Order" value={form.displayIndex}
            onChange={(v) => setForm({ ...form, displayIndex: typeof v === 'number' ? v : 0 })} />
          <Switch label="Public Display" checked={form.isPublicDisplay}
            onChange={(e) => setForm({ ...form, isPublicDisplay: e.currentTarget.checked })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>{editTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Category Reorder Modal (reuses the drag-and-drop items reorder modal) */}
      <SmartCategoryItemsReorderModal
        opened={catReorderOpened}
        onClose={() => setCatReorderOpened(false)}
        categoryName={catReorderName}
        items={catReorderAsItems}
        loading={false}
        saving={catReorderSaving}
        onSave={handleCatReorderSave}
        onSaveLevel={handleCatReorderSaveLevel}
        expandableIds={expandableIds}
        onDrillDown={handleDrillDown}
        breadcrumb={catReorderBreadcrumb}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      {/* Copy from Existing Modal */}
      <Modal opened={copyModalOpened} onClose={() => setCopyModalOpened(false)} title="Copy from Existing Smart Category" size="lg">
        <Stack gap="md">
          <SegmentedControl
            value={copySourceFilter}
            onChange={(v) => { setCopySourceFilter(v as 'pos' | 'online'); setCopySelectedId(null); setCopyNewName(''); }}
            data={[
              { value: 'pos', label: `POS Categories (${posNodes.length})` },
              { value: 'online', label: `Online Categories (${onlineNodes.length})` },
            ]}
          />

          {copySourceNodes.length === 0 ? (
            <Text c="dimmed" py="md">No {copySourceFilter === 'online' ? 'online' : 'POS'} smart categories available.</Text>
          ) : (
            <Stack gap={0} style={{ maxHeight: 300, overflow: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
              {copySourceNodes.map((node) => (
                <Group key={node.smartCategoryId} gap="sm" py={6} px="xs"
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: copySelectedId === node.smartCategoryId ? 'var(--mantine-color-blue-0)' : undefined,
                  }}
                  onClick={() => {
                    setCopySelectedId(node.smartCategoryId);
                    setCopyNewName(`${node.name}(1)`);
                  }}
                >
                  <Text size="sm" fw={copySelectedId === node.smartCategoryId ? 600 : 400} style={{ flex: 1 }}>
                    {'  '.repeat(node.depth)}{node.name}
                  </Text>
                  <Badge size="xs" variant="light">{node.itemCount} items</Badge>
                </Group>
              ))}
            </Stack>
          )}

          {copySelectedId && (
            <TextInput
              label="New category name"
              value={copyNewName}
              onChange={(e) => setCopyNewName(e.currentTarget.value)}
              required
            />
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCopyModalOpened(false)}>Cancel</Button>
            <Button
              disabled={!copySelectedId || !copyNewName.trim()}
              onClick={() => void handleCopy()}
              loading={copying}
            >
              Copy
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
