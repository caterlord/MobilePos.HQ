import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
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
  IconArrowDown,
  IconArrowUp,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useBrands } from '../../../../contexts/BrandContext';
import menuItemService from '../../../../services/menuItemService';
import smartCategoryService from '../../../../services/smartCategoryService';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ itemId: number; itemCode: string; itemName: string }[]>([]);
  const [searching, setSearching] = useState(false);

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

  const handleSearchItems = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const result = await menuItemService.getMenuItems(brandId, { search: searchQuery.trim(), pageSize: 20 });
      const existingIds = new Set(detail?.items.map((i) => i.itemId) ?? []);
      setSearchResults(
        result.items
          .filter((i) => !existingIds.has(i.itemId))
          .map((i) => ({ itemId: i.itemId, itemCode: i.itemCode, itemName: i.itemName ?? '' }))
      );
    } catch {
      notifications.show({ color: 'red', message: 'Search failed' });
    } finally {
      setSearching(false);
    }
  };

  const addItem = (item: { itemId: number; itemCode: string; itemName: string }) => {
    if (!detail) return;
    const maxIdx = detail.items.reduce((max, i) => Math.max(max, i.displayIndex), 0);
    setDetail({
      ...detail,
      items: [...detail.items, {
        itemId: item.itemId, itemCode: item.itemCode, itemName: item.itemName,
        itemNameAlt: null, displayIndex: maxIdx + 1, enabled: true,
        modifiedDate: new Date().toISOString(), modifiedBy: '',
      }],
    });
    setSearchResults((prev) => prev.filter((r) => r.itemId !== item.itemId));
    setItemsDirty(true);
  };

  const removeItem = (itemId: number) => {
    if (!detail) return;
    setDetail({ ...detail, items: detail.items.filter((i) => i.itemId !== itemId) });
    setItemsDirty(true);
  };

  const moveItem = (itemId: number, direction: 'up' | 'down') => {
    if (!detail) return;
    const items = [...detail.items].sort((a, b) => a.displayIndex - b.displayIndex);
    const idx = items.findIndex((i) => i.itemId === itemId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const tempIdx = items[idx].displayIndex;
    items[idx] = { ...items[idx], displayIndex: items[swapIdx].displayIndex };
    items[swapIdx] = { ...items[swapIdx], displayIndex: tempIdx };
    setDetail({ ...detail, items });
    setItemsDirty(true);
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
          <Table verticalSpacing="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Item Name</Table.Th>
                <Table.Th>Order</Table.Th>
                <Table.Th>Enabled</Table.Th>
                <Table.Th style={{ width: 100 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sortedItems.length === 0 ? (
                <Table.Tr><Table.Td colSpan={5}><Text size="sm" c="dimmed">No items. Search below to add.</Text></Table.Td></Table.Tr>
              ) : sortedItems.map((item) => (
                <Table.Tr key={item.itemId}>
                  <Table.Td><Text size="xs" c="dimmed">{item.itemCode}</Text></Table.Td>
                  <Table.Td><Text size="sm">{item.itemName}</Text></Table.Td>
                  <Table.Td><Text size="sm">{item.displayIndex}</Text></Table.Td>
                  <Table.Td><Badge size="sm" color={item.enabled ? 'green' : 'gray'}>{item.enabled ? 'Yes' : 'No'}</Badge></Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon size="xs" variant="subtle" onClick={() => moveItem(item.itemId, 'up')}><IconArrowUp size={12} /></ActionIcon>
                      <ActionIcon size="xs" variant="subtle" onClick={() => moveItem(item.itemId, 'down')}><IconArrowDown size={12} /></ActionIcon>
                      <ActionIcon size="xs" variant="subtle" color="red" onClick={() => removeItem(item.itemId)}><IconTrash size={12} /></ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group mt="sm" gap="xs">
            <TextInput size="xs" placeholder="Search items to add..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleSearchItems(); }}
              style={{ flex: 1 }} />
            <Button size="xs" variant="light" onClick={() => void handleSearchItems()} loading={searching}>Search</Button>
          </Group>
          {searchResults.length > 0 && (
            <Paper withBorder p="xs" mt="xs">
              <Stack gap={4}>
                {searchResults.map((item) => (
                  <Group key={item.itemId} justify="space-between">
                    <Text size="xs">{item.itemCode} — {item.itemName}</Text>
                    <Button size="xs" variant="subtle" onClick={() => addItem(item)} leftSection={<IconPlus size={12} />}>Add</Button>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}
          {itemsDirty && (
            <Group mt="xs" justify="flex-end">
              <Button size="xs" onClick={() => void saveItems()} loading={saving}>Save Items</Button>
            </Group>
          )}
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
                    <Table.Td><Text size="xs" c="dimmed">{shop.months || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{shop.dates || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{formatDaysDisplay(shop.daysOfWeek)}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{shop.displayFromDate || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{shop.displayToDate || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{shop.displayFromTime || '—'}</Text></Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{shop.displayToTime || '—'}</Text></Table.Td>
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
                    <MultiSelect label="Month" placeholder="All months" data={[
                      { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
                      { value: '4', label: 'April' }, { value: '5', label: 'May' }, { value: '6', label: 'June' },
                      { value: '7', label: 'July' }, { value: '8', label: 'August' }, { value: '9', label: 'September' },
                      { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
                    ]} value={shop.months ? shop.months.split(',').map(m => m.trim()).filter(Boolean) : []}
                      onChange={(vals) => updateShop({ months: vals.length > 0 ? vals.join(',') : null })}
                      clearable />
                    <MultiSelect label="Day" placeholder="All days" data={
                      Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))
                    } value={shop.dates ? shop.dates.split(',').map(d => d.trim()).filter(Boolean) : []}
                      onChange={(vals) => updateShop({ dates: vals.length > 0 ? vals.join(',') : null })}
                      clearable searchable />
                    <MultiSelect label="Day of the Week" placeholder="All days"
                      data={DAY_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                      value={parseDaysOfWeek(shop.daysOfWeek)}
                      onChange={(vals) => updateShop({ daysOfWeek: vals.length > 0 ? vals.join(',') : null })}
                      clearable />
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
  onReload,
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
  onReload: () => void;
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
            <Table.Th>Ordering</Table.Th>
            <Table.Th>Published</Table.Th>
            <Table.Th style={{ width: 120 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {nodes.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={7}>
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
                  <Table.Td><Badge size="sm" color={node.enabled ? 'green' : 'gray'}>{node.enabled ? 'Yes' : 'No'}</Badge></Table.Td>
                  <Table.Td onClick={(e) => e.stopPropagation()}>
                    <Group gap={4}>
                      <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => onEdit(node)}><IconEdit size={14} /></ActionIcon>
                      <ActionIcon size="sm" variant="subtle" onClick={() => onCreate(node.smartCategoryId)}><IconPlus size={14} /></ActionIcon>
                      <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onDelete(node)}><IconTrash size={14} /></ActionIcon>
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
  const [createForOdo, setCreateForOdo] = useState(false);
  const [form, setForm] = useState<SmartCategoryUpsertPayload>({
    name: '', nameAlt: '', parentSmartCategoryId: null, displayIndex: 0,
    enabled: true, isTerminal: true, isPublicDisplay: true, buttonStyleId: 0,
    isOdoDisplay: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const allFlat = useMemo(() => flattenTree(tree), [tree]);
  const posNodes = useMemo(() => allFlat.filter((n) => !n.isOdoDisplay), [allFlat]);
  const onlineNodes = useMemo(() => allFlat.filter((n) => n.isOdoDisplay), [allFlat]);

  const loadData = useCallback(async () => {
    if (!brandId) { setTree([]); return; }
    try {
      setLoading(true);
      setError(null);
      setTree(await smartCategoryService.getTree(brandId));
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

  const openCreate = (isOdo: boolean, parentId?: number | null) => {
    setEditTarget(null);
    setCreateForOdo(isOdo);
    setForm({
      name: '', nameAlt: '', parentSmartCategoryId: parentId ?? null,
      displayIndex: allFlat.length * 10, enabled: true, isTerminal: true,
      isPublicDisplay: true, buttonStyleId: 0, isOdoDisplay: isOdo,
    });
    setModalOpened(true);
  };

  const openEdit = (node: FlatNode) => {
    setEditTarget(node);
    setCreateForOdo(node.isOdoDisplay);
    setForm({
      name: node.name, nameAlt: node.nameAlt, parentSmartCategoryId: node.parentSmartCategoryId,
      displayIndex: node.displayIndex, enabled: node.enabled, isTerminal: true,
      isPublicDisplay: true, buttonStyleId: node.buttonStyleId,
      isOdoDisplay: node.isOdoDisplay,
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

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Smart Categories</Title>
          <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void loadData()} loading={loading}>Refresh</Button>
        </Group>

        {!brandId && <Alert icon={<IconAlertCircle size={16} />} color="yellow">Select a brand to manage smart categories.</Alert>}
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

        {/* POS Smart Categories */}
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>POS Smart Categories</Title>
            <Button size="sm" leftSection={<IconPlus size={14} />} onClick={() => openCreate(false)} disabled={!brandId}>
              New POS Category
            </Button>
          </Group>
          {brandId && (
            <CategoryGrid
              brandId={brandId} nodes={posNodes} loading={loading} isOdo={false}
              expandedId={expandedId} setExpandedId={setExpandedId}
              onEdit={openEdit} onCreate={(parentId) => openCreate(false, parentId)}
              onDelete={(n) => void handleDelete(n)} onReload={() => void loadData()}
            />
          )}
        </Stack>

        {/* Online Smart Categories */}
        <Stack gap="sm">
          <Group justify="space-between">
            <Title order={4}>Online Smart Categories</Title>
            <Button size="sm" leftSection={<IconPlus size={14} />} onClick={() => openCreate(true)} disabled={!brandId}>
              New Online Category
            </Button>
          </Group>
          {brandId && (
            <CategoryGrid
              brandId={brandId} nodes={onlineNodes} loading={loading} isOdo={true}
              expandedId={expandedId} setExpandedId={setExpandedId}
              onEdit={openEdit} onCreate={(parentId) => openCreate(true, parentId)}
              onDelete={(n) => void handleDelete(n)} onReload={() => void loadData()}
            />
          )}
        </Stack>
      </Stack>

      {/* Create/Edit Modal */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)}
        title={editTarget ? 'Edit Smart Category' : (createForOdo ? 'New Online Smart Category' : 'New POS Smart Category')} size="md">
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
          <Group grow>
            <Switch label="Enabled" checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.currentTarget.checked })} />
            <Switch label="Public Display" checked={form.isPublicDisplay}
              onChange={(e) => setForm({ ...form, isPublicDisplay: e.currentTarget.checked })} />
          </Group>
          <Switch label="Online Display (ODO)" checked={form.isOdoDisplay ?? false}
            onChange={(e) => setForm({ ...form, isOdoDisplay: e.currentTarget.checked })}
            description="When enabled, this category appears in online ordering instead of POS" />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>{editTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
