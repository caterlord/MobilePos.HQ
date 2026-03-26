import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import smartCategoryService from '../../services/smartCategoryService';
import type { OnlineOrderingDisplayOrderNode } from '../../types/onlineOrdering';
import type {
  SmartCategoryDetail,
  SmartCategoryOrderChannel,
  SmartCategoryShopSchedule,
  SmartCategoryTreeNode,
} from '../../types/smartCategory';

// ── Flatten tree helper ──

interface FlatNode extends OnlineOrderingDisplayOrderNode {
  depth: number;
}

const flattenNodes = (nodes: OnlineOrderingDisplayOrderNode[], depth = 0): FlatNode[] =>
  nodes.flatMap((node) => [{ ...node, depth }, ...flattenNodes(node.children, depth + 1)]);

// ── Category Detail Panel (inline expand) ──

function CategoryDetailPanel({
  brandId,
  categoryId,
}: {
  brandId: number;
  categoryId: number;
}) {
  const [detail, setDetail] = useState<SmartCategoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await smartCategoryService.getDetail(brandId, categoryId);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) notifications.show({ color: 'red', message: 'Failed to load category detail' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [brandId, categoryId]);

  const saveShopVisibility = async (schedules: SmartCategoryShopSchedule[], channels: SmartCategoryOrderChannel[]) => {
    try {
      setSaving(true);
      await smartCategoryService.updateDisplaySettings(brandId, categoryId, {
        shopSchedules: schedules.map((s) => ({
          shopId: s.shopId,
          displayIndex: s.displayIndex,
          displayFromDate: s.displayFromDate,
          displayToDate: s.displayToDate,
          displayFromTime: s.displayFromTime,
          displayToTime: s.displayToTime,
          displayFromDateTime: s.displayFromDateTime,
          displayToDateTime: s.displayToDateTime,
          isPublicDisplay: s.isPublicDisplay,
          enabled: s.enabled,
          dayOfWeek: s.dayOfWeek,
          isWeekdayHide: s.isWeekdayHide,
          isWeekendHide: s.isWeekendHide,
          isHolidayHide: s.isHolidayHide,
          daysOfWeek: s.daysOfWeek,
          months: s.months,
          dates: s.dates,
        })),
        orderChannels: channels.map((c) => ({
          shopId: c.shopId,
          orderChannelId: c.orderChannelId,
          enabled: c.enabled,
        })),
      });
      notifications.show({ color: 'green', message: 'Visibility settings saved' });
    } catch {
      notifications.show({ color: 'red', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Group justify="center" py="sm">
        <Loader size="xs" />
        <Text size="sm" c="dimmed">Loading detail...</Text>
      </Group>
    );
  }

  if (!detail) return null;

  return (
    <Paper p="sm" bg="gray.0" radius="sm">
      <Tabs defaultValue="items">
        <Tabs.List>
          <Tabs.Tab value="items">Items ({detail.items.length})</Tabs.Tab>
          <Tabs.Tab value="shops">Shop Visibility ({detail.shopSchedules.length})</Tabs.Tab>
          <Tabs.Tab value="channels">Channels ({detail.orderChannels.length})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="items" pt="xs">
          {detail.items.length === 0 ? (
            <Text size="sm" c="dimmed" py="xs">No items in this category.</Text>
          ) : (
            <Table verticalSpacing="xs" striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Item Name</Table.Th>
                  <Table.Th>Alt Name</Table.Th>
                  <Table.Th>Display Index</Table.Th>
                  <Table.Th>Enabled</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.items.map((item) => (
                  <Table.Tr key={item.itemId}>
                    <Table.Td><Text size="sm">{item.itemName}</Text></Table.Td>
                    <Table.Td><Text size="sm" c={item.itemNameAlt ? undefined : 'dimmed'}>{item.itemNameAlt || '—'}</Text></Table.Td>
                    <Table.Td><Text size="sm">{item.displayIndex}</Text></Table.Td>
                    <Table.Td><Badge size="sm" color={item.enabled ? 'green' : 'gray'}>{item.enabled ? 'Yes' : 'No'}</Badge></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          <Group mt="xs">
            <Button size="xs" variant="light" component={Link} to={`/menus/smart-categories?id=${categoryId}`} leftSection={<IconEdit size={14} />}>
              Edit Items in Menus
            </Button>
          </Group>
        </Tabs.Panel>

        <Tabs.Panel value="shops" pt="xs">
          {detail.shopSchedules.length === 0 ? (
            <Text size="sm" c="dimmed" py="xs">No shop visibility configured.</Text>
          ) : (
            <>
              <Table verticalSpacing="xs" striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Shop</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th>Public</Table.Th>
                    <Table.Th>Days</Table.Th>
                    <Table.Th>From Time</Table.Th>
                    <Table.Th>To Time</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {detail.shopSchedules.map((shop, i) => (
                    <Table.Tr key={shop.shopId}>
                      <Table.Td><Text size="sm">{shop.shopName}</Text></Table.Td>
                      <Table.Td>
                        <Switch size="xs" checked={shop.enabled} onChange={(e) => {
                          const updated = [...detail.shopSchedules];
                          updated[i] = { ...shop, enabled: e.currentTarget.checked };
                          setDetail({ ...detail, shopSchedules: updated });
                        }} />
                      </Table.Td>
                      <Table.Td>
                        <Switch size="xs" checked={shop.isPublicDisplay} onChange={(e) => {
                          const updated = [...detail.shopSchedules];
                          updated[i] = { ...shop, isPublicDisplay: e.currentTarget.checked };
                          setDetail({ ...detail, shopSchedules: updated });
                        }} />
                      </Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">{shop.daysOfWeek || 'All'}</Text></Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">{shop.displayFromTime || '—'}</Text></Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">{shop.displayToTime || '—'}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group mt="xs" justify="flex-end">
                <Button size="xs" onClick={() => void saveShopVisibility(detail.shopSchedules, detail.orderChannels)} loading={saving}>
                  Save Visibility
                </Button>
              </Group>
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="channels" pt="xs">
          {detail.orderChannels.length === 0 ? (
            <Text size="sm" c="dimmed" py="xs">No channel mappings configured.</Text>
          ) : (
            <>
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
                      <Table.Td>
                        <Switch size="xs" checked={ch.enabled} onChange={(e) => {
                          const updated = [...detail.orderChannels];
                          updated[i] = { ...ch, enabled: e.currentTarget.checked };
                          setDetail({ ...detail, orderChannels: updated });
                        }} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Group mt="xs" justify="flex-end">
                <Button size="xs" onClick={() => void saveShopVisibility(detail.shopSchedules, detail.orderChannels)} loading={saving}>
                  Save Channels
                </Button>
              </Group>
            </>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
}

// ── Main Component ──

export function OnlineOrderingMenuPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [tree, setTree] = useState<OnlineOrderingDisplayOrderNode[]>([]);
  const [allCategories, setAllCategories] = useState<SmartCategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Modal state
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [copyModalOpened, setCopyModalOpened] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const flatNodes = useMemo(() => flattenNodes(tree), [tree]);

  // Non-ODO categories for the "Add to ODO" modal
  const odoIds = useMemo(() => new Set(flatNodes.map((n) => n.smartCategoryId)), [flatNodes]);

  const flattenAll = (nodes: SmartCategoryTreeNode[]): SmartCategoryTreeNode[] =>
    nodes.flatMap((n) => [n, ...flattenAll(n.children)]);

  const nonOdoCategories = useMemo(() =>
    flattenAll(allCategories).filter((c) => !odoIds.has(c.smartCategoryId)),
  [allCategories, odoIds]);

  const loadData = useCallback(async () => {
    if (!brandId) { setTree([]); setAllCategories([]); return; }
    try {
      setLoading(true);
      setError(null);
      const [odoTree, allTree] = await Promise.all([
        onlineOrderingService.getDisplayOrder(brandId),
        smartCategoryService.getTree(brandId),
      ]);
      setTree(odoTree);
      setAllCategories(allTree);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Remove from ODO ──
  const handleRemoveFromOdo = async (node: FlatNode) => {
    if (!brandId) return;
    if (!window.confirm(`Remove "${node.name}" from online ordering? It will still exist in the Menus section.`)) return;
    try {
      await smartCategoryService.update(brandId, node.smartCategoryId, {
        name: node.name,
        nameAlt: node.nameAlt,
        displayIndex: node.displayIndex,
        enabled: true,
        isTerminal: true,
        isPublicDisplay: true,
        buttonStyleId: 0,
        isOdoDisplay: false,
      });
      notifications.show({ color: 'green', message: `"${node.name}" removed from ODO` });
      await loadData();
      if (expandedId === node.smartCategoryId) setExpandedId(null);
    } catch {
      notifications.show({ color: 'red', message: 'Failed to remove from ODO' });
    }
  };

  // ── Add to ODO ──
  const handleAddToOdo = async () => {
    if (!brandId || selectedIds.size === 0) return;
    try {
      setModalSubmitting(true);
      for (const id of selectedIds) {
        const cat = flattenAll(allCategories).find((c) => c.smartCategoryId === id);
        if (!cat) continue;
        await smartCategoryService.update(brandId, id, {
          name: cat.name,
          nameAlt: cat.nameAlt,
          displayIndex: cat.displayIndex,
          enabled: true,
          isTerminal: true,
          isPublicDisplay: true,
          buttonStyleId: cat.buttonStyleId,
          isOdoDisplay: true,
        });
      }
      notifications.show({ color: 'green', message: `${selectedIds.size} categories added to ODO` });
      setAddModalOpened(false);
      setSelectedIds(new Set());
      await loadData();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to add categories' });
    } finally {
      setModalSubmitting(false);
    }
  };

  // ── Copy from existing ──
  const handleCopyToOdo = async () => {
    if (!brandId || selectedIds.size === 0) return;
    try {
      setModalSubmitting(true);
      const result = await onlineOrderingService.copyCategoriesToOdo(brandId, Array.from(selectedIds));
      notifications.show({ color: 'green', message: `${result.count} categories copied to ODO` });
      setCopyModalOpened(false);
      setSelectedIds(new Set());
      await loadData();
    } catch {
      notifications.show({ color: 'red', message: 'Failed to copy categories' });
    } finally {
      setModalSubmitting(false);
    }
  };

  const toggleSelected = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Category selector modal content (shared between Add and Copy) ──
  const CategorySelectorContent = ({ categories, emptyMsg }: { categories: SmartCategoryTreeNode[]; emptyMsg: string }) => (
    categories.length === 0 ? (
      <Text c="dimmed" py="md">{emptyMsg}</Text>
    ) : (
      <Stack gap="xs" style={{ maxHeight: 400, overflow: 'auto' }}>
        {categories.map((cat) => (
          <Group key={cat.smartCategoryId} gap="sm" style={{ cursor: 'pointer' }} onClick={() => toggleSelected(cat.smartCategoryId)}>
            <Checkbox checked={selectedIds.has(cat.smartCategoryId)} onChange={() => toggleSelected(cat.smartCategoryId)} />
            <Text size="sm">{cat.name}</Text>
            {cat.nameAlt && <Text size="xs" c="dimmed">({cat.nameAlt})</Text>}
            <Badge size="xs" variant="light">{cat.itemCount} items</Badge>
          </Group>
        ))}
      </Stack>
    )
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Menu</Title>
        <Group>
          <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void loadData()} loading={loading}>
            Refresh
          </Button>
          <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => { setSelectedIds(new Set()); setAddModalOpened(true); }} disabled={!brandId}>
            Add to ODO
          </Button>
          <Button variant="light" leftSection={<IconCopy size={16} />} onClick={() => { setSelectedIds(new Set()); setCopyModalOpened(true); }} disabled={!brandId}>
            Copy from Existing
          </Button>
        </Group>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO menus.
        </Alert>
      )}

      {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 40 }} />
              <Table.Th>Category Name</Table.Th>
              <Table.Th>Alt Name</Table.Th>
              <Table.Th>Items</Table.Th>
              <Table.Th>Published</Table.Th>
              <Table.Th style={{ width: 100 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {flatNodes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text c="dimmed" ta="center" py="md">
                    {loading ? 'Loading...' : 'No ODO smart categories configured. Use "Add to ODO" or "Copy from Existing" to get started.'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              flatNodes.map((node) => {
                const isExpanded = expandedId === node.smartCategoryId;
                return (
                  <Table.Tr key={node.smartCategoryId} style={{ verticalAlign: 'top' }}>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : node.smartCategoryId)}
                      >
                        {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={0}>
                        <Text size="sm" style={{ paddingLeft: node.depth * 20 }}>
                          {node.depth > 0 && <span style={{ color: '#aaa', marginRight: 4 }}>└</span>}
                          {node.name}
                        </Text>
                        {isExpanded && brandId && (
                          <Collapse in={isExpanded}>
                            <div style={{ paddingTop: 8, paddingLeft: node.depth * 20 }}>
                              <CategoryDetailPanel brandId={brandId} categoryId={node.smartCategoryId} />
                            </div>
                          </Collapse>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c={node.nameAlt ? undefined : 'dimmed'}>{node.nameAlt || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" variant="light">{node.itemCount}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge size="sm" color="green" variant="filled">Yes</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" component={Link} to={`/menus/smart-categories?id=${node.smartCategoryId}`}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => void handleRemoveFromOdo(node)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* ── Add to ODO Modal ── */}
      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add Categories to Online Ordering" size="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select categories to include in online ordering. These categories will appear in ODO as-is (shared with POS).
            Use "Copy from Existing" instead if you want a separate ODO variant.
          </Text>
          <CategorySelectorContent categories={nonOdoCategories} emptyMsg="All categories are already in ODO." />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleAddToOdo()} loading={modalSubmitting} disabled={selectedIds.size === 0}>
              Add {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Copy from Existing Modal ── */}
      <Modal opened={copyModalOpened} onClose={() => setCopyModalOpened(false)} title="Copy Categories to ODO" size="lg">
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Select categories to deep-copy into ODO. New ODO categories will be created with copies of all items and shop settings.
            The originals remain unchanged.
          </Text>
          <CategorySelectorContent
            categories={flattenAll(allCategories)}
            emptyMsg="No categories available."
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCopyModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleCopyToOdo()} loading={modalSubmitting} disabled={selectedIds.size === 0}>
              Copy {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
