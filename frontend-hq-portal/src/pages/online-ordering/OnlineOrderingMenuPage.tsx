import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconEdit, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import menuItemService from '../../services/menuItemService';
import onlineOrderingService from '../../services/onlineOrderingService';
import smartCategoryService from '../../services/smartCategoryService';
import type { MenuItemSummary } from '../../types/menuItem';
import type {
  OnlineOrderingDisplayOrderNode,
  OnlineOrderingLookups,
} from '../../types/onlineOrdering';
import type {
  SmartCategory,
  SmartCategoryDetail,
  SmartCategoryItemAssignment,
  SmartCategoryItemAssignmentEntry,
  SmartCategoryShopSchedule,
  SmartCategoryUpsertPayload,
} from '../../types/smartCategory';
import { NodePropertiesDrawer, type NodePropertiesDrawerState } from '../operations/menu/menu-items/NodePropertiesDrawer';

const flattenNodes = (nodes: OnlineOrderingDisplayOrderNode[], depth = 0): Array<OnlineOrderingDisplayOrderNode & { depth: number }> =>
  nodes.flatMap((node) => [{ ...node, depth }, ...flattenNodes(node.children, depth + 1)]);

function mapCategoryToPayload(category: SmartCategory): SmartCategoryUpsertPayload {
  return {
    name: category.name,
    nameAlt: category.nameAlt ?? '',
    parentSmartCategoryId: category.parentSmartCategoryId,
    displayIndex: category.displayIndex,
    enabled: category.enabled,
    isTerminal: category.isTerminal,
    isPublicDisplay: category.isPublicDisplay,
    buttonStyleId: category.buttonStyleId,
    description: category.description ?? '',
    descriptionAlt: category.descriptionAlt ?? '',
    imageFileName: category.imageFileName ?? '',
    imageFileName2: category.imageFileName2 ?? '',
    imageFileName3: category.imageFileName3 ?? '',
    isSelfOrderingDisplay: category.isSelfOrderingDisplay ?? false,
    isOnlineStoreDisplay: category.isOnlineStoreDisplay ?? false,
    isOdoDisplay: category.isOdoDisplay ?? true,
    isKioskDisplay: category.isKioskDisplay ?? false,
    isTableOrderingDisplay: category.isTableOrderingDisplay ?? false,
    onlineStoreRefCategoryId: category.onlineStoreRefCategoryId ?? null,
    remark: category.remark ?? '',
    remarkAlt: category.remarkAlt ?? '',
  };
}

function nextDisplayIndex(items: SmartCategoryItemAssignment[]) {
  return (items.reduce((max, item) => Math.max(max, item.displayIndex), 0) || 0) + 1;
}

function hydrateShopSchedules(detail: SmartCategoryDetail, lookups: OnlineOrderingLookups | null): SmartCategoryShopSchedule[] {
  if (!lookups) {
    return detail.shopSchedules;
  }

  const existing = new Map(detail.shopSchedules.map((schedule) => [schedule.shopId, schedule]));
  return lookups.shops.map((shop, index) => existing.get(shop.id) ?? {
    shopId: shop.id,
    shopName: shop.name,
    displayIndex: index + 1,
    displayFromDate: null,
    displayToDate: null,
    displayFromTime: null,
    displayToTime: null,
    displayFromDateTime: null,
    displayToDateTime: null,
    isPublicDisplay: false,
    enabled: false,
    dayOfWeek: null,
    isWeekdayHide: null,
    isWeekendHide: null,
    isHolidayHide: null,
    daysOfWeek: '',
    months: '',
    dates: '',
    modifiedDate: '',
    modifiedBy: '',
  });
}

export function OnlineOrderingMenuPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [lookups, setLookups] = useState<OnlineOrderingLookups | null>(null);
  const [tree, setTree] = useState<OnlineOrderingDisplayOrderNode[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SmartCategoryDetail | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<SmartCategoryUpsertPayload | null>(null);
  const [itemDraft, setItemDraft] = useState<SmartCategoryItemAssignment[]>([]);
  const [shopDraft, setShopDraft] = useState<SmartCategoryShopSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [savingShops, setSavingShops] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemSearchOpen, setItemSearchOpen] = useState(false);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [itemSearchResults, setItemSearchResults] = useState<MenuItemSummary[]>([]);
  const [itemDrawerState, setItemDrawerState] = useState<NodePropertiesDrawerState | null>(null);

  const loadLookups = useCallback(async () => {
    if (!brandId) {
      setLookups(null);
      setTree([]);
      return;
    }

    const [lookupsResponse, treeResponse] = await Promise.all([
      onlineOrderingService.getLookups(brandId),
      onlineOrderingService.getDisplayOrder(brandId),
    ]);

    setLookups(lookupsResponse);
    setTree(treeResponse);
    if (!selectedCategoryId && lookupsResponse.smartCategories[0]) {
      setSelectedCategoryId(String(lookupsResponse.smartCategories[0].id));
    }
  }, [brandId, selectedCategoryId]);

  const loadDetail = useCallback(async () => {
    if (!brandId || !selectedCategoryId) {
      setDetail(null);
      setCategoryDraft(null);
      setItemDraft([]);
      setShopDraft([]);
      return;
    }

    const response = await smartCategoryService.getDetail(brandId, parseInt(selectedCategoryId, 10));
    setDetail(response);
    setCategoryDraft(mapCategoryToPayload(response.category));
    setItemDraft([...response.items].sort((a, b) => a.displayIndex - b.displayIndex));
    setShopDraft(hydrateShopSchedules(response, lookups));
  }, [brandId, lookups, selectedCategoryId]);

  useEffect(() => {
    if (!brandId) {
      setLookups(null);
      setTree([]);
      return;
    }

    setLoading(true);
    setError(null);
    loadLookups()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load online ordering data'))
      .finally(() => setLoading(false));
  }, [brandId, loadLookups]);

  useEffect(() => {
    if (!brandId || !selectedCategoryId) {
      return;
    }

    setLoading(true);
    setError(null);
    loadDetail()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ODO category detail'))
      .finally(() => setLoading(false));
  }, [brandId, selectedCategoryId, loadDetail]);

  const flattened = useMemo(() => flattenNodes(tree), [tree]);
  const selectedCategory = useMemo(
    () => lookups?.smartCategories.find((category) => String(category.id) === selectedCategoryId) ?? null,
    [lookups, selectedCategoryId],
  );

  const searchItems = useCallback(async () => {
    if (!brandId || !itemSearchTerm.trim()) {
      setItemSearchResults([]);
      return;
    }

    try {
      setItemSearchLoading(true);
      const response = await menuItemService.getMenuItems(brandId, {
        search: itemSearchTerm.trim(),
        includeDisabled: true,
        pageSize: 20,
      });
      const currentIds = new Set(itemDraft.map((item) => item.itemId));
      setItemSearchResults(response.items.filter((item) => !currentIds.has(item.itemId) && !item.isModifier));
    } finally {
      setItemSearchLoading(false);
    }
  }, [brandId, itemDraft, itemSearchTerm]);

  useEffect(() => {
    if (!itemSearchOpen) {
      return;
    }

    void searchItems();
  }, [itemSearchOpen, searchItems]);

  const handleSaveCategory = async () => {
    if (!brandId || !selectedCategoryId || !categoryDraft) return;

    try {
      setSavingCategory(true);
      await smartCategoryService.update(brandId, parseInt(selectedCategoryId, 10), categoryDraft);
      notifications.show({ color: 'green', message: 'ODO category metadata updated.' });
      await loadLookups();
      await loadDetail();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to update ODO category metadata',
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveItems = async () => {
    if (!brandId || !selectedCategoryId) return;

    try {
      setSavingItems(true);
      const payload: SmartCategoryItemAssignmentEntry[] = itemDraft.map((item, index) => ({
        itemId: item.itemId,
        displayIndex: item.displayIndex || index + 1,
        enabled: item.enabled,
      }));
      await smartCategoryService.upsertItems(brandId, parseInt(selectedCategoryId, 10), { items: payload });
      notifications.show({ color: 'green', message: 'ODO category items updated.' });
      await loadDetail();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to update ODO category items',
      });
    } finally {
      setSavingItems(false);
    }
  };

  const handleSaveShops = async () => {
    if (!brandId || !selectedCategoryId || !detail) return;

    try {
      setSavingShops(true);
      await smartCategoryService.updateDisplaySettings(brandId, parseInt(selectedCategoryId, 10), {
        shopSchedules: shopDraft.map((schedule) => ({
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
        })),
        orderChannels: detail.orderChannels.map((entry) => ({
          shopId: entry.shopId,
          orderChannelId: entry.orderChannelId,
          enabled: entry.enabled,
        })),
      });
      notifications.show({ color: 'green', message: 'Shop visibility updated.' });
      await loadDetail();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to update shop visibility',
      });
    } finally {
      setSavingShops(false);
    }
  };

  return (
    <Stack gap="xl">
      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage online ordering.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">ODO smart categories</Text>
          <Title order={2} mt="xs">{lookups?.summary.odoCategoryCount ?? 0}</Title>
          <Text size="sm" c="dimmed" mt={6}>Categories currently flagged for ODO display.</Text>
        </Paper>
        <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">Menu items surfaced</Text>
          <Title order={2} mt="xs">{lookups?.summary.odoItemCount ?? 0}</Title>
          <Text size="sm" c="dimmed" mt={6}>Distinct items reachable through ODO smart categories.</Text>
        </Paper>
        <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">ODO modifier groups</Text>
          <Title order={2} mt="xs">{lookups?.summary.odoModifierGroupCount ?? 0}</Title>
          <Text size="sm" c="dimmed" mt={6}>Modifier groups currently enabled for online ordering.</Text>
        </Paper>
        <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">ODO meal sets</Text>
          <Title order={2} mt="xs">{lookups?.summary.odoMealSetCount ?? 0}</Title>
          <Text size="sm" c="dimmed" mt={6}>Meal-set groups currently visible on ODO.</Text>
        </Paper>
      </SimpleGrid>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>ODO Category Management</Title>
            <Text size="sm" c="dimmed">
              Use this page to publish categories, manage their item membership, and control shop visibility without switching back to the generic menu screens.
            </Text>
          </div>
          <Group>
            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void loadDetail()} loading={loading}>
              Refresh
            </Button>
            <Select
              placeholder="Choose category"
              searchable
              data={(lookups?.smartCategories ?? []).map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              style={{ minWidth: 320 }}
            />
          </Group>
        </Group>

        {!detail || !categoryDraft ? (
          <Alert color="blue">Select an ODO smart category to manage its menu configuration.</Alert>
        ) : (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Paper p="md" radius="md" style={{ border: '1px solid #E3E8EE' }}>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <div>
                      <Text fw={600}>{detail.category.name}</Text>
                      {detail.category.nameAlt && <Text size="sm" c="dimmed">{detail.category.nameAlt}</Text>}
                    </div>
                    <Badge color={detail.category.isOdoDisplay ? 'indigo' : 'gray'}>
                      {detail.category.isOdoDisplay ? 'ODO Visible' : 'ODO Hidden'}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">Description</Text>
                  <Text size="sm">{detail.category.description || '-'}</Text>
                  <Text size="sm" c="dimmed">Remark</Text>
                  <Text size="sm">{detail.category.remark || '-'}</Text>
                  <Text size="sm" c="dimmed">Images</Text>
                  <Text size="sm">{detail.category.imageFileName || '-'}</Text>
                </Stack>
              </Paper>

              <Paper p="md" radius="md" style={{ border: '1px solid #E3E8EE' }}>
                <Stack gap="sm">
                  <Title order={4}>Category Publish Flags</Title>
                  <Switch
                    label="Visible in ODO"
                    checked={categoryDraft.isOdoDisplay ?? true}
                    onChange={(event) => setCategoryDraft((current) => current ? { ...current, isOdoDisplay: event.currentTarget.checked } : current)}
                  />
                  <Switch
                    label="Published"
                    checked={categoryDraft.isPublicDisplay}
                    onChange={(event) => setCategoryDraft((current) => current ? { ...current, isPublicDisplay: event.currentTarget.checked } : current)}
                  />
                  <Switch
                    label="Enabled"
                    checked={categoryDraft.enabled}
                    onChange={(event) => setCategoryDraft((current) => current ? { ...current, enabled: event.currentTarget.checked } : current)}
                  />
                  <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSaveCategory()} loading={savingCategory}>
                    Save Category
                  </Button>
                </Stack>
              </Paper>
            </SimpleGrid>

            <Paper p="md" radius="md" style={{ border: '1px solid #E3E8EE' }}>
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4}>Category Items</Title>
                  <Text size="sm" c="dimmed">
                    Manage which items appear in this ODO category, including order and enabled state. Use item edit to surface images, public names, and remarks.
                  </Text>
                </div>
                <Group>
                  <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => setItemSearchOpen(true)}>
                    Add Items
                  </Button>
                  <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSaveItems()} loading={savingItems}>
                    Save Items
                  </Button>
                </Group>
              </Group>

              <Table withTableBorder striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>Display Order</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {itemDraft.map((item, index) => (
                    <Table.Tr key={item.itemId}>
                      <Table.Td>
                        <Text fw={600}>{item.itemName}</Text>
                        <Text size="xs" c="dimmed">{item.itemCode}</Text>
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={item.displayIndex}
                          min={1}
                          onChange={(value) =>
                            setItemDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, displayIndex: Number(value) || 1 } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={item.enabled}
                          onChange={(event) =>
                            setItemDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, enabled: event.currentTarget.checked } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon color="blue" variant="light" onClick={() => setItemDrawerState({ kind: 'item', itemId: item.itemId })}>
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => setItemDraft((current) => current.filter((entry) => entry.itemId !== item.itemId))}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>

            <Paper p="md" radius="md" style={{ border: '1px solid #E3E8EE' }}>
              <Group justify="space-between" mb="md">
                <div>
                  <Title order={4}>Shop Visibility</Title>
                  <Text size="sm" c="dimmed">
                    Control which shops publish this category and the visibility timing rules used by ODO.
                  </Text>
                </div>
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSaveShops()} loading={savingShops}>
                  Save Shop Visibility
                </Button>
              </Group>

              <Table withTableBorder striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Shop</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th>Published</Table.Th>
                    <Table.Th>Days</Table.Th>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {shopDraft.map((shop, index) => (
                    <Table.Tr key={shop.shopId}>
                      <Table.Td>{shop.shopName}</Table.Td>
                      <Table.Td>
                        <Switch
                          checked={shop.enabled}
                          onChange={(event) =>
                            setShopDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, enabled: event.currentTarget.checked } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={shop.isPublicDisplay}
                          onChange={(event) =>
                            setShopDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, isPublicDisplay: event.currentTarget.checked } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          value={shop.daysOfWeek ?? ''}
                          onChange={(event) =>
                            setShopDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, daysOfWeek: event.currentTarget.value } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          value={shop.displayFromTime ?? ''}
                          onChange={(event) =>
                            setShopDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, displayFromTime: event.currentTarget.value } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          value={shop.displayToTime ?? ''}
                          onChange={(event) =>
                            setShopDraft((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, displayToTime: event.currentTarget.value } : entry,
                              ),
                            )
                          }
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          </Stack>
        )}
      </Paper>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>Published ODO category tree</Title>
            <Text size="sm" c="dimmed">
              Current smart-category structure visible to online ordering.
            </Text>
          </div>
          <Badge color="indigo" variant="light">
            {flattened.length} nodes
          </Badge>
        </Group>

        {loading ? (
          <Text size="sm" c="dimmed">Loading ODO menu structure...</Text>
        ) : flattened.length === 0 ? (
          <Alert color="blue">No ODO smart categories have been configured yet.</Alert>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th>Items</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {flattened.map((node) => (
                <Table.Tr key={node.smartCategoryId}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: node.depth * 16 }} />
                      <div>
                        <Text fw={600}>{node.name}</Text>
                        {node.nameAlt && <Text size="xs" c="dimmed">{node.nameAlt}</Text>}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>{node.itemCount}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Modal opened={itemSearchOpen} onClose={() => setItemSearchOpen(false)} title={`Add items to ${selectedCategory?.name ?? 'ODO category'}`} size="lg">
        <Stack gap="md">
          <Group>
            <TextInput
              placeholder="Search item name or code"
              value={itemSearchTerm}
              onChange={(event) => setItemSearchTerm(event.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Button variant="light" onClick={() => void searchItems()} loading={itemSearchLoading}>
              Search
            </Button>
          </Group>

          <Table withTableBorder striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Item</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {itemSearchResults.map((item) => (
                <Table.Tr key={item.itemId}>
                  <Table.Td>
                    <Text fw={600}>{item.itemName ?? item.itemCode}</Text>
                    <Text size="xs" c="dimmed">{item.itemCode}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() =>
                        setItemDraft((current) => [
                          ...current,
                          {
                            itemId: item.itemId,
                            itemCode: item.itemCode,
                            itemName: item.itemName ?? item.itemCode,
                            itemNameAlt: item.itemNameAlt ?? '',
                            displayIndex: nextDisplayIndex(current),
                            enabled: true,
                            modifiedDate: item.modifiedDate ?? '',
                            modifiedBy: item.modifiedBy ?? '',
                          },
                        ])
                      }
                    >
                      Add
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Modal>

      <NodePropertiesDrawer
        state={itemDrawerState}
        brandId={brandId}
        onClose={() => setItemDrawerState(null)}
        onAfterSave={loadDetail}
        onModifierGroupUpdated={() => undefined}
      />
    </Stack>
  );
}
