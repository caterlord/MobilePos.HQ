import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FC } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowDown,
  IconArrowUp,
  IconCurrencyDollar,
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import menuItemService from '../../../../services/menuItemService';
import modifierGroupService from '../../../../services/modifierGroupService';
import type {
  MenuItemDetail,
  MenuItemLookups,
  MenuItemSummary,
  MenuItemUpsertPayload,
} from '../../../../types/menuItem';
import type {
  ModifierGroupHeader,
  ModifierGroupMember,
  ModifierGroupProperties,
  ModifierGroupShopPricing,
} from '../../../../types/modifierGroup';
import { mapDetailToPayload, normalizePayload, formatDateTime } from './menuItemsUtils';
import { CenterLoader } from '../../../../components/CenterLoader';

export type NodePropertiesDrawerState =
  | { kind: 'item'; itemId: number }
  | { kind: 'modifier'; itemId: number; groupHeaderId: number; originContext?: 'inStore' | 'online' }
  | { kind: 'item-set'; itemId: number; groupHeaderId: number; originContext?: 'inStore' | 'online' };

interface NodePropertiesDrawerProps {
  state: NodePropertiesDrawerState | null;
  brandId: number | null;
  onClose: () => void;
  onAfterSave: () => Promise<void>;
  onModifierGroupUpdated: (header: ModifierGroupHeader) => void;
}

interface ItemPropertiesContentProps {
  brandId: number;
  itemId: number;
  onAfterSave: () => Promise<void>;
}

interface ModifierGroupPropertiesContentProps {
  brandId: number;
  groupHeaderId: number;
  mode: 'modifier' | 'item-set';
  originContext?: 'inStore' | 'online';
  onAfterSave: () => Promise<void>;
  onModifierGroupUpdated: (header: ModifierGroupHeader) => void;
}

interface ShopPricingDraftRow {
  shopId: number;
  shopName: string;
  originalPrice: number;
  enabled: boolean;
  price: number | null;
}

const sortMembers = (members: ModifierGroupMember[]): ModifierGroupMember[] =>
  [...members].sort((a, b) => {
    if (a.displayIndex !== b.displayIndex) {
      return a.displayIndex - b.displayIndex;
    }
    return a.item.itemName?.localeCompare(b.item.itemName ?? '') ?? 0;
  });

const toHeader = (properties: ModifierGroupProperties): ModifierGroupHeader => ({
  groupHeaderId: properties.groupHeaderId,
  accountId: properties.accountId,
  groupBatchName: properties.groupBatchName,
  groupBatchNameAlt: properties.groupBatchNameAlt,
  enabled: properties.enabled,
  isFollowSet: properties.isFollowSet,
});

const ItemPropertiesContent: FC<ItemPropertiesContentProps> = ({ brandId, itemId, onAfterSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<MenuItemDetail | null>(null);
  const [lookups, setLookups] = useState<MenuItemLookups | null>(null);
  const [payload, setPayload] = useState<MenuItemUpsertPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detailResponse, lookupResponse] = await Promise.all([
        menuItemService.getMenuItem(brandId, itemId),
        menuItemService.getLookups(brandId),
      ]);
      setDetail(detailResponse);
      setLookups(lookupResponse);
      setPayload(mapDetailToPayload(detailResponse));
    } catch (err) {
      console.error('Failed to load item properties', err);
      notifications.show({
        color: 'red',
        title: 'Unable to load item properties',
        message: 'An error occurred while loading the item details.',
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePayloadChange = useCallback(
    <K extends keyof MenuItemUpsertPayload>(key: K, value: MenuItemUpsertPayload[K]) => {
      setPayload((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: value };
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!payload) {
      return;
    }

    setSaving(true);
    try {
      await menuItemService.updateMenuItem(brandId, itemId, normalizePayload(payload));
      notifications.show({
        color: 'green',
        title: 'Item updated',
        message: 'Item properties have been saved.',
      });
      await onAfterSave();
      await load();
    } catch (err) {
      console.error('Failed to update item', err);
      notifications.show({
        color: 'red',
        title: 'Unable to save item',
        message: 'An error occurred while saving the item.',
      });
    } finally {
      setSaving(false);
    }
  }, [brandId, itemId, load, onAfterSave, payload]);

  if (loading) {
    return <CenterLoader message="Loading item properties" />;
  }

  if (!payload || !detail) {
    return (
      <Alert color="red" title="Item not available">
        The item could not be loaded. It may have been removed.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Text fw={600}>{detail.itemName ?? detail.itemCode}</Text>
        <Text size="sm" c="dimmed">
          Item code: {detail.itemCode}
        </Text>
        {detail.modifiedDate && (
          <Text size="xs" c="dimmed">
            Last updated: {formatDateTime(detail.modifiedDate)}
          </Text>
        )}
      </Stack>
      <Divider label="Basics" labelPosition="center" />
      <Stack gap="sm">
        <Group gap="sm" grow align="flex-start">
          <TextInput
            label="Item name"
            value={payload.itemName ?? ''}
            onChange={(event) => handlePayloadChange('itemName', event.currentTarget.value)}
          />
          <TextInput
            label="Item code"
            value={payload.itemCode}
            onChange={(event) => handlePayloadChange('itemCode', event.currentTarget.value)}
            required
          />
        </Group>
        <Group gap="sm" grow>
          <NumberInput
            label="Display order"
            value={payload.displayIndex}
            min={0}
            onChange={(value) => handlePayloadChange('displayIndex', Number(value) || 0)}
          />
          <Select
            label="Category"
            data={(lookups?.categories ?? []).map((category) => ({
              value: String(category.categoryId),
              label: category.categoryName,
            }))}
            value={String(payload.categoryId)}
            onChange={(value) => {
              if (value) handlePayloadChange('categoryId', parseInt(value, 10));
            }}
          />
          <Select
            label="Department"
            data={(lookups?.departments ?? []).map((department) => ({
              value: String(department.departmentId),
              label: department.departmentName,
            }))}
            value={String(payload.departmentId)}
            onChange={(value) => {
              if (value) handlePayloadChange('departmentId', parseInt(value, 10));
            }}
          />
        </Group>
      </Stack>
      <Divider label="Flags" labelPosition="center" />
      <Group>
        <Switch
          label="Enabled"
          checked={payload.enabled}
          onChange={(event) => handlePayloadChange('enabled', event.currentTarget.checked)}
        />
        <Switch
          label="Show item"
          checked={payload.isItemShow}
          onChange={(event) => handlePayloadChange('isItemShow', event.currentTarget.checked)}
        />
        <Switch
          label="Show price"
          checked={payload.isPriceShow}
          onChange={(event) => handlePayloadChange('isPriceShow', event.currentTarget.checked)}
        />
        <Switch
          label="Promo item"
          checked={payload.isPromoItem}
          onChange={(event) => handlePayloadChange('isPromoItem', event.currentTarget.checked)}
        />
      </Group>
      <Divider label="Actions" labelPosition="center" />
      <Group justify="flex-end">
        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={() => void load()}
          disabled={saving}
        >
          Reload
        </Button>
        <Button
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={() => void handleSave()}
          loading={saving}
        >
          Save item
        </Button>
      </Group>
    </Stack>
  );
};

const ModifierGroupPropertiesContent: FC<ModifierGroupPropertiesContentProps> = ({
  brandId,
  groupHeaderId,
  mode,
  originContext,
  onAfterSave,
  onModifierGroupUpdated,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<ModifierGroupProperties | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupNameAlt, setGroupNameAlt] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [maxModifierSelectCount, setMaxModifierSelectCount] = useState(0);
  const [minModifierSelectCount, setMinModifierSelectCount] = useState(0);
  const [isOdoDisplay, setIsOdoDisplay] = useState(true);
  const [isKioskDisplay, setIsKioskDisplay] = useState(true);
  const [isTableOrderingDisplay, setIsTableOrderingDisplay] = useState(true);
  const [isPosDisplay, setIsPosDisplay] = useState(true);
  const [isSelfOrderingDisplay, setIsSelfOrderingDisplay] = useState(true);
  const [members, setMembers] = useState<ModifierGroupMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<MenuItemSummary[]>([]);
  const [shopPricingItem, setShopPricingItem] = useState<ModifierGroupMember | null>(null);
  const [shopPricingRows, setShopPricingRows] = useState<ShopPricingDraftRow[]>([]);
  const [shopPricingLoading, setShopPricingLoading] = useState(false);
  const [shopPricingSaving, setShopPricingSaving] = useState(false);

  const copy = useMemo(() => {
    if (mode === 'modifier') {
      return {
        badgeLabel: 'Modifier group',
        membersDividerLabel: 'Modifiers',
        membersIntro:
          'These modifiers will be offered after the customer selects the item. Use the arrows to adjust the order.',
        searchInputLabel: 'Search modifiers',
        searchPlaceholder: 'Search modifier items by name or code',
        searchButton: 'Search modifiers',
        searchResultsLabel: 'Modifier results',
        addButtonLabel: 'Add modifier',
        emptyStateTitle: 'No modifiers linked',
        emptyStateMessage: 'This group has no modifiers yet. Search above to add existing modifier items.',
        tableItemHeader: 'Modifier',
      };
    }

    return {
      badgeLabel: 'Item set group',
      membersDividerLabel: 'Set items',
      membersIntro:
        'Set items are presented as part of this combo. Reorder them to control how they appear to the staff.',
      searchInputLabel: 'Search set items',
      searchPlaceholder: 'Search items to include in this set',
      searchButton: 'Search items',
      searchResultsLabel: 'Set item results',
      addButtonLabel: 'Add item',
      emptyStateTitle: 'No set items linked',
      emptyStateMessage: 'This group does not contain any set items yet. Search above to add menu items.',
      tableItemHeader: 'Set item',
    };
  }, [mode]);

  const contextLabel = useMemo(() => {
    if (!originContext) return null;
    return originContext === 'inStore' ? 'POS flow' : 'Online flow';
  }, [originContext]);

  const mapShopPricingRows = useCallback(
    (rows: ModifierGroupShopPricing[]): ShopPricingDraftRow[] =>
      rows.map((row) => ({
        shopId: row.shopId,
        shopName: row.shopName,
        originalPrice: row.originalPrice,
        enabled: row.enabled,
        price: row.price,
      })),
    [],
  );

  const closeShopPricingModal = useCallback(() => {
    setShopPricingItem(null);
    setShopPricingRows([]);
  }, []);

  const handleOpenShopPricing = useCallback(
    async (member: ModifierGroupMember) => {
      setShopPricingItem(member);
      setShopPricingLoading(true);

      try {
        const response = await modifierGroupService.getShopPricing(brandId, groupHeaderId, member.itemId);
        setShopPricingRows(mapShopPricingRows(response));
      } catch (err) {
        console.error('Failed to load group shop pricing', err);
        notifications.show({
          color: 'red',
          title: 'Unable to load shop pricing',
          message: 'An error occurred while loading shop-level group pricing.',
        });
        closeShopPricingModal();
      } finally {
        setShopPricingLoading(false);
      }
    },
    [brandId, closeShopPricingModal, groupHeaderId, mapShopPricingRows],
  );

  const handleShopPricingToggle = useCallback((shopId: number, checked: boolean) => {
    setShopPricingRows((prev) =>
      prev.map((row) => {
        if (row.shopId !== shopId) {
          return row;
        }

        if (!checked) {
          return { ...row, enabled: false, price: null };
        }

        return { ...row, enabled: true, price: row.price ?? row.originalPrice };
      }),
    );
  }, []);

  const handleShopPricingValueChange = useCallback((shopId: number, value: string | number) => {
    const parsed = Number(value);
    setShopPricingRows((prev) =>
      prev.map((row) => {
        if (row.shopId !== shopId) {
          return row;
        }

        if (!Number.isFinite(parsed) || parsed < 0) {
          return row;
        }

        return { ...row, price: parsed };
      }),
    );
  }, []);

  const handleSaveShopPricing = useCallback(async () => {
    if (!shopPricingItem) {
      return;
    }

    setShopPricingSaving(true);
    try {
      const response = await modifierGroupService.updateShopPricing(brandId, groupHeaderId, shopPricingItem.itemId, {
        entries: shopPricingRows.map((row) => ({
          shopId: row.shopId,
          price: row.enabled ? (row.price ?? row.originalPrice) : null,
        })),
      });

      setShopPricingRows(mapShopPricingRows(response));
      notifications.show({
        color: 'green',
        title: 'Shop pricing updated',
        message: 'Group item shop pricing has been saved.',
      });
    } catch (err) {
      console.error('Failed to update group shop pricing', err);
      notifications.show({
        color: 'red',
        title: 'Unable to save shop pricing',
        message: 'An error occurred while saving shop pricing.',
      });
    } finally {
      setShopPricingSaving(false);
    }
  }, [brandId, groupHeaderId, mapShopPricingRows, shopPricingItem, shopPricingRows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await modifierGroupService.getProperties(brandId, groupHeaderId);
      setProperties(data);
      setGroupName(data.groupBatchName);
      setGroupNameAlt(data.groupBatchNameAlt ?? '');
      setEnabled(data.enabled);
      setMaxModifierSelectCount(data.maxModifierSelectCount ?? 0);
      setMinModifierSelectCount(data.minModifierSelectCount ?? 0);
      setIsOdoDisplay(data.isOdoDisplay ?? true);
      setIsKioskDisplay(data.isKioskDisplay ?? true);
      setIsTableOrderingDisplay(data.isTableOrderingDisplay ?? true);
      setIsPosDisplay(data.isPosDisplay ?? true);
      setIsSelfOrderingDisplay(data.isSelfOrderingDisplay ?? true);
      setMembers(sortMembers(data.items));
    } catch (err) {
      console.error('Failed to load modifier group properties', err);
      notifications.show({
        color: 'red',
        title: 'Unable to load properties',
        message: 'An error occurred while loading the modifier group.',
      });
    } finally {
      setLoading(false);
    }
  }, [brandId, groupHeaderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMoveMember = useCallback((itemId: number, direction: -1 | 1) => {
    setMembers((prev) => {
      const index = prev.findIndex((member) => member.itemId === itemId);
      if (index === -1) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next.map((member, position) => ({ ...member, displayIndex: position + 1 }));
    });
  }, []);

  const handleRemoveMember = useCallback((itemId: number) => {
    setMembers((prev) =>
      prev
        .filter((member) => member.itemId !== itemId)
        .map((member, index) => ({ ...member, displayIndex: index + 1 })),
    );
  }, []);

  const handleToggleMember = useCallback((itemId: number, value: boolean) => {
    setMembers((prev) =>
      prev.map((member) => (member.itemId === itemId ? { ...member, enabled: value } : member)),
    );
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await menuItemService.getMenuItems(brandId, {
        search: searchTerm.trim(),
        includeDisabled: true,
        page: 1,
        pageSize: 25,
      });
      setSearchResults(response.items);
    } catch (err) {
      console.error('Failed to search items', err);
      notifications.show({
        color: 'red',
        title: 'Search failed',
        message: 'Unable to search items. Please try again.',
      });
    } finally {
      setSearchLoading(false);
    }
  }, [brandId, searchTerm]);

  const handleAddMember = useCallback(
    (item: MenuItemSummary) => {
      setMembers((prev) => {
        if (prev.some((member) => member.itemId === item.itemId)) {
          notifications.show({
            color: 'yellow',
            title: 'Already added',
            message: `${item.itemName ?? item.itemCode} is already part of this group.`,
          });
          return prev;
        }

        return [
          ...prev,
          {
            itemId: item.itemId,
            displayIndex: prev.length + 1,
            enabled: item.enabled,
            item,
          },
        ];
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!groupName.trim()) {
      notifications.show({
        color: 'red',
        title: 'Group name required',
        message: 'Please provide a name for the group before saving.',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        groupBatchName: groupName.trim(),
        groupBatchNameAlt: groupNameAlt.trim() ? groupNameAlt.trim() : null,
        enabled,
        maxModifierSelectCount,
        minModifierSelectCount,
        isOdoDisplay,
        isKioskDisplay,
        isTableOrderingDisplay,
        isPosDisplay,
        isSelfOrderingDisplay,
        items: members.map((member, index) => ({
          itemId: member.itemId,
          enabled: member.enabled,
          displayIndex: index + 1,
        })),
      };

      const updated = await modifierGroupService.updateProperties(brandId, groupHeaderId, payload);
      setProperties(updated);
      setMembers(sortMembers(updated.items));
      onModifierGroupUpdated(toHeader(updated));

      notifications.show({
        color: 'green',
        title: 'Group updated',
        message: 'Properties saved successfully.',
      });

      await onAfterSave();
    } catch (err) {
      console.error('Failed to update modifier group', err);
      notifications.show({
        color: 'red',
        title: 'Unable to save group',
        message: 'An error occurred while saving the modifier group.',
      });
    } finally {
      setSaving(false);
    }
  }, [
    brandId,
    enabled,
    groupHeaderId,
    groupName,
    groupNameAlt,
    isKioskDisplay,
    isOdoDisplay,
    isPosDisplay,
    isSelfOrderingDisplay,
    isTableOrderingDisplay,
    maxModifierSelectCount,
    minModifierSelectCount,
    members,
    onAfterSave,
    onModifierGroupUpdated,
  ]);

  const filteredSearchResults = useMemo(() => {
    const existingIds = new Set(members.map((member) => member.itemId));
    return searchResults.filter((item) => !existingIds.has(item.itemId));
  }, [members, searchResults]);

  if (loading) {
    return <CenterLoader message="Loading group properties" />;
  }

  if (!properties) {
    return (
      <Alert color="red" title="Modifier group not available">
        The modifier group could not be loaded or no longer exists.
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Stack gap={4}>
        <Group justify="space-between" align="flex-start">
          <Stack gap={2}>
            <Text fw={600}>
              {groupName}
              {!enabled && (
                <Text component="span" size="sm" c="red.6" ml={8}>
                  (Disabled)
                </Text>
              )}
            </Text>
            <Text size="sm" c="dimmed">
              Group ID: {properties.groupHeaderId}
            </Text>
          </Stack>
          <Stack gap={4} align="flex-end">
            <Badge color={mode === 'modifier' ? 'grape' : 'teal'}>{copy.badgeLabel}</Badge>
            {contextLabel && (
              <Badge color={originContext === 'inStore' ? 'indigo' : 'gray'} variant="light">
                {contextLabel}
              </Badge>
            )}
          </Stack>
        </Group>
        {properties.modifiedDate && (
          <Text size="xs" c="dimmed">
            Last updated: {formatDateTime(properties.modifiedDate ?? undefined)} by{' '}
            {properties.modifiedBy ?? 'System'}
          </Text>
        )}
      </Stack>

      <Divider label="Properties" labelPosition="center" />
      <Stack gap="sm">
        <TextInput label="Group name" value={groupName} onChange={(event) => setGroupName(event.currentTarget.value)} required />
        <TextInput
          label="Group name (alt)"
          value={groupNameAlt}
          onChange={(event) => setGroupNameAlt(event.currentTarget.value)}
        />
        <Group gap="sm" grow>
          <NumberInput
            label="Max selection"
            min={0}
            value={maxModifierSelectCount}
            onChange={(value) => setMaxModifierSelectCount(Math.max(Number(value) || 0, 0))}
          />
          <NumberInput
            label="Min selection"
            min={0}
            value={minModifierSelectCount}
            onChange={(value) => setMinModifierSelectCount(Math.max(Number(value) || 0, 0))}
          />
        </Group>
        <Switch label="Enabled" checked={enabled} onChange={(event) => setEnabled(event.currentTarget.checked)} />
        <Switch
          label="Display in POS"
          checked={isPosDisplay}
          onChange={(event) => setIsPosDisplay(event.currentTarget.checked)}
        />
        <Switch
          label="Display in Self Ordering"
          checked={isSelfOrderingDisplay}
          onChange={(event) => setIsSelfOrderingDisplay(event.currentTarget.checked)}
        />
        <Switch
          label="Display in Kiosk"
          checked={isKioskDisplay}
          onChange={(event) => setIsKioskDisplay(event.currentTarget.checked)}
        />
        <Switch
          label="Display in Table Ordering"
          checked={isTableOrderingDisplay}
          onChange={(event) => setIsTableOrderingDisplay(event.currentTarget.checked)}
        />
        <Switch
          label="Display in ODO"
          checked={isOdoDisplay}
          onChange={(event) => setIsOdoDisplay(event.currentTarget.checked)}
        />
      </Stack>

      <Divider label={copy.membersDividerLabel} labelPosition="center" />
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          {copy.membersIntro}
        </Text>
        <Group gap="sm" align="end">
          <TextInput
            label={copy.searchInputLabel}
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleSearch();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button
            leftSection={<IconSearch size={16} />}
            onClick={() => void handleSearch()}
            loading={searchLoading}
            variant="light"
            aria-label={copy.searchButton}
          >
            {copy.searchButton}
          </Button>
        </Group>
        {filteredSearchResults.length > 0 && (
          <Box
            style={{
              border: '1px solid var(--mantine-color-gray-3)',
              borderRadius: 'var(--mantine-radius-sm)',
              padding: 'var(--mantine-spacing-sm)',
            }}
          >
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text fw={600} size="sm">
                  {copy.searchResultsLabel}
                </Text>
                <Text size="xs" c="dimmed">
                  {filteredSearchResults.length} item{filteredSearchResults.length === 1 ? '' : 's'} found
                </Text>
              </Group>
              <Stack gap="xs">
                {filteredSearchResults.map((item) => (
                  <Group key={item.itemId} justify="space-between">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text size="sm" fw={500}>
                        {item.itemName ?? item.itemCode}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {item.itemCode}
                      </Text>
                    </Stack>
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={() => handleAddMember(item)}
                      variant="light"
                    >
                      {copy.addButtonLabel}
                    </Button>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Box>
        )}
        {members.length === 0 ? (
          <Alert color="yellow" title={copy.emptyStateTitle}>
            {copy.emptyStateMessage}
          </Alert>
        ) : (
          <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 60 }}>Seq</Table.Th>
                <Table.Th>{copy.tableItemHeader}</Table.Th>
                <Table.Th style={{ width: 100 }}>Enabled</Table.Th>
                <Table.Th style={{ width: 120 }}>Reorder</Table.Th>
                <Table.Th style={{ width: 120 }}>Shop Pricing</Table.Th>
                <Table.Th style={{ width: 80 }}>Remove</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {members.map((member, index) => (
                <Table.Tr key={member.itemId}>
                  <Table.Td>
                    <Badge variant="light" color="gray">
                      {index + 1}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={2}>
                      <Text size="sm" fw={500}>
                        {member.item.itemName ?? member.item.itemCode}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {member.item.itemCode}
                      </Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <Switch
                      checked={member.enabled}
                      onChange={(event) => handleToggleMember(member.itemId, event.currentTarget.checked)}
                      size="xs"
                    />
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} justify="center">
                      <ActionIcon
                        aria-label="Move up"
                        variant="light"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => handleMoveMember(member.itemId, -1)}
                      >
                        <IconArrowUp size={14} />
                      </ActionIcon>
                      <ActionIcon
                        aria-label="Move down"
                        variant="light"
                        size="sm"
                        disabled={index === members.length - 1}
                        onClick={() => handleMoveMember(member.itemId, 1)}
                      >
                        <IconArrowDown size={14} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      aria-label="Edit shop pricing"
                      variant="light"
                      color="teal"
                      size="sm"
                      onClick={() => void handleOpenShopPricing(member)}
                    >
                      <IconCurrencyDollar size={14} />
                    </ActionIcon>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      aria-label="Remove"
                      color="red"
                      variant="light"
                      size="sm"
                      onClick={() => handleRemoveMember(member.itemId)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>

      <Divider label="Actions" labelPosition="center" />
      <Group justify="flex-end">
        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void load()}
          disabled={saving}
        >
          Reload
        </Button>
        <Button
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={() => void handleSave()}
          loading={saving}
        >
          Save group
        </Button>
      </Group>

      <Modal
        opened={shopPricingItem !== null}
        onClose={closeShopPricingModal}
        title={`Shop pricing · ${shopPricingItem?.item.itemName ?? shopPricingItem?.item.itemCode ?? ''}`}
        size="lg"
      >
        <Stack gap="md">
          {shopPricingLoading ? (
            <CenterLoader message="Loading shop pricing" />
          ) : shopPricingRows.length === 0 ? (
            <Alert color="yellow" title="No shop pricing rows">
              No active shop prices were found for this item.
            </Alert>
          ) : (
            <Table striped withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Shop</Table.Th>
                  <Table.Th style={{ width: 120 }}>Base Price</Table.Th>
                  <Table.Th style={{ width: 120 }}>Override</Table.Th>
                  <Table.Th style={{ width: 160 }}>Custom Price</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {shopPricingRows.map((row) => (
                  <Table.Tr key={row.shopId}>
                    <Table.Td>{row.shopName}</Table.Td>
                    <Table.Td>{row.originalPrice.toFixed(2)}</Table.Td>
                    <Table.Td>
                      <Switch
                        size="xs"
                        checked={row.enabled}
                        onChange={(event) => handleShopPricingToggle(row.shopId, event.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        decimalScale={2}
                        fixedDecimalScale
                        value={row.enabled ? (row.price ?? row.originalPrice) : undefined}
                        disabled={!row.enabled}
                        onChange={(value) => handleShopPricingValueChange(row.shopId, value)}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}

          <Group justify="flex-end">
            <Button variant="light" onClick={closeShopPricingModal}>
              Close
            </Button>
            <Button
              onClick={() => void handleSaveShopPricing()}
              loading={shopPricingSaving}
              disabled={shopPricingLoading || shopPricingRows.length === 0}
            >
              Save pricing
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};

export const NodePropertiesDrawer: FC<NodePropertiesDrawerProps> = ({
  state,
  brandId,
  onClose,
  onAfterSave,
  onModifierGroupUpdated,
}) => {
  const opened = Boolean(state);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="lg"
      title="Node properties"
      overlayProps={{ opacity: 0.1 }}
      styles={{
        content: { display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 0 },
      }}
    >
      {opened && state ? (
        brandId == null ? (
          <Alert color="yellow" title="Brand not selected">
            Select a brand before editing node properties.
          </Alert>
        ) : (
          <ScrollArea style={{ flex: 1 }}>
            <Box p="md">
              {state.kind === 'item' ? (
                <ItemPropertiesContent brandId={brandId} itemId={state.itemId} onAfterSave={onAfterSave} />
              ) : (
                <ModifierGroupPropertiesContent
                  brandId={brandId}
                  groupHeaderId={state.groupHeaderId}
                  mode={state.kind === 'modifier' ? 'modifier' : 'item-set'}
                  originContext={state.originContext}
                  onAfterSave={onAfterSave}
                  onModifierGroupUpdated={onModifierGroupUpdated}
                />
              )}
            </Box>
          </ScrollArea>
        )
      ) : (
        <Group justify="center" align="center" style={{ flex: 1 }}>
          <Loader size="sm" />
        </Group>
      )}
    </Drawer>
  );
};
