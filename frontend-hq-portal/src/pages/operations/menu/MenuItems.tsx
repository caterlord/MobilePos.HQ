import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Group,
  Paper,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  SegmentedControl,
  UnstyledButton,
} from '@mantine/core';
import type { ColumnDef, ColumnSizingState, VisibilityState } from '@tanstack/react-table';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconAdjustments,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconColumns,
  IconArrowsSort,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconList,
  IconX,
} from '@tabler/icons-react';
import { DataTable } from '../../../components/DataTable';
import { MenuItemDrawer } from './menu-items/MenuItemDrawer';
import { MenuItemsCategorySidebar } from './menu-items/MenuItemsCategorySidebar';
import { ManageItemRelationshipsModal } from './menu-items/ManageItemRelationshipsModal';
import { MenuItemsReorderModal } from './menu-items/MenuItemsReorderModal';
import {
  PAGE_SIZE,
  PANEL_BORDER_COLOR,
  buildCategoryTree,
  createBasePayload,
  formatDateTime,
  normalizePayload,
  mapDetailToPayload,
  type CategoryNode,
} from './menu-items/menuItemsUtils';
import { useBrands } from '../../../contexts/BrandContext';
import menuItemService from '../../../services/menuItemService';
import type { ButtonStyle } from '../../../types/buttonStyle';
import type {
  MenuItemListResponse,
  MenuItemSummary,
  MenuItemLookups,
  MenuItemUpsertPayload,
  MenuItemDetail,
  CategoryItemCount,
  MenuItemPrice,
  MenuItemShopAvailability,
} from '../../../types/menuItem';

const SORT_OPTIONS: Array<{
  label: string;
  value: 'displayIndex' | 'itemId' | 'itemCode' | 'name';
}> = [
  { label: 'Display order', value: 'displayIndex' },
  { label: 'Item ID', value: 'itemId' },
  { label: 'Item code', value: 'itemCode' },
  { label: 'Name', value: 'name' },
];

type MenuItemsColumnDef = ColumnDef<MenuItemSummary> & { accessorKey?: string | number };

const getColumnId = (column: MenuItemsColumnDef): string => {
  if (typeof column.accessorKey === 'string' || typeof column.accessorKey === 'number') {
    return column.accessorKey.toString();
  }
  return column.id ?? '';
};

const getColumnLabel = (column: MenuItemsColumnDef): string => {
  if (typeof column.header === 'string') {
    return column.header;
  }
  return getColumnId(column) || 'Column';
};

const MenuItemsPage: FC = () => {
  const { selectedBrand } = useBrands();
  const brandId = selectedBrand ? parseInt(selectedBrand, 10) : null;
  const isDesktopLayout = useMediaQuery('(min-width: 62em)');

  const [lookups, setLookups] = useState<MenuItemLookups | null>(null);
  const [lookupsLoading, setLookupsLoading] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [itemsResponse, setItemsResponse] = useState<MenuItemListResponse | null>(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [categorySearch, setCategorySearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 800);
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'displayIndex' | 'itemId' | 'itemCode' | 'name'>('displayIndex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [searchPopoverOpened, setSearchPopoverOpened] = useState(false);
  const isSearchActive = searchPopoverOpened || Boolean(search);
  const [sortPopoverOpened, setSortPopoverOpened] = useState(false);
  const [columnMenuOpened, setColumnMenuOpened] = useState(false);
  const [isCategorySidebarCollapsed, setIsCategorySidebarCollapsed] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => ({
    isManualPrice: false,
    isManualName: false,
    isNonDiscountItem: false,
    isNonServiceChargeItem: false,
    isPointPaidItem: false,
    isNoPointEarnItem: false,
    isNonTaxableItem: false,
    isComboRequired: false,
    itemPosName: false,
    itemPublicDisplayName: false,
    itemPosNameAlt: false,
    itemPublicDisplayNameAlt: false,
    itemPublicPrintedName: false,
    showItemOnReceipt: false,
    showPriceOnReceipt: false,
  }));
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [modifierModalItem, setModifierModalItem] = useState<MenuItemSummary | null>(null);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderItems, setReorderItems] = useState<MenuItemSummary[]>([]);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderCategoryId, setReorderCategoryId] = useState<number | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MenuItemDetail | null>(null);
  const [priceEdits, setPriceEdits] = useState<Record<number, { price: number | null; enabled: boolean }>>({});
  const [availabilityEdits, setAvailabilityEdits] = useState<Record<number, { enabled: boolean | null; isOutOfStock: boolean | null; isLimitedItem: boolean | null }>>({});
  const [printerEdits, setPrinterEdits] = useState<Record<
    number,
    {
      shopPrinter1: number | null;
      shopPrinter2: number | null;
      shopPrinter3: number | null;
      shopPrinter4: number | null;
      shopPrinter5: number | null;
      isGroupPrintByPrinter: boolean | null;
    }
  >>({});
  const [formData, setFormData] = useState<MenuItemUpsertPayload | null>(null);
  const [activeTab, setActiveTab] = useState<string>('basics');
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalItems = itemsResponse?.totalItems ?? 0;
  const totalPages = useMemo(() => {
    if (!itemsResponse) {
      return 1;
    }

    const expectedPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const backendPages = Math.max(1, itemsResponse.totalPages);

    return Math.min(backendPages, expectedPages);
  }, [itemsResponse, totalItems]);

  const goToPreviousPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handlePageSelect = useCallback(
    (value: string | null) => {
      if (!value) return;
      const nextPage = Number(value);
      if (Number.isNaN(nextPage)) return;
      setPage(nextPage);
    },
    [setPage],
  );

  const handleRetry = useCallback(() => {
    if (itemsLoading) return;
    setReloadToken((token) => token + 1);
  }, [itemsLoading]);

  const handleOpenModifiers = useCallback((item: MenuItemSummary) => {
    setModifierModalItem(item);
  }, []);

  const handleCloseModifiers = useCallback(() => {
    setModifierModalItem(null);
  }, []);

  const handleModifiersSaved = useCallback(
    (itemId: number, hasModifier: boolean) => {
      setItemsResponse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((entry) => (entry.itemId === itemId ? { ...entry, hasModifier } : entry)),
        };
      });

      setSelectedDetail((prev) => (prev && prev.itemId === itemId ? { ...prev, hasModifier } : prev));
      setFormData((prev) => (prev && editingItemId === itemId ? { ...prev, hasModifier } : prev));
      setReloadToken((token) => token + 1);
    },
    [editingItemId, setItemsResponse, setSelectedDetail, setFormData, setReloadToken],
  );

  useEffect(() => {
    if (searchPopoverOpened) {
      window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [searchPopoverOpened]);

  useEffect(() => {
    if (!columnMenuOpened) {
      setColumnSearch('');
    }
  }, [columnMenuOpened]);


  useEffect(() => {
    setPage((prev) => {
      if (prev > totalPages) {
        return totalPages;
      }
      return prev;
    });
  }, [totalPages]);

  const getCategoryLabel = useCallback((categoryId?: number | null) => {
    if (categoryId === null || categoryId === undefined || !lookups) return '—';
    const match = lookups.categories.find((cat) => cat.categoryId === categoryId);
    return match ? match.categoryName : '—';
  }, [lookups]);

  const getDepartmentName = useCallback((departmentId?: number) => {
    if (departmentId === null || departmentId === undefined || !lookups) return '—';
    return lookups.departments.find((dep) => dep.departmentId === departmentId)?.departmentName ?? '—';
  }, [lookups]);

  const getButtonStyleById = useCallback((buttonStyleId?: number | null): ButtonStyle | null => {
    if (!buttonStyleId || !lookups) return null;
    return lookups.buttonStyles.find((style) => style.buttonStyleId === buttonStyleId) ?? null;
  }, [lookups]);

  const getButtonStyleColor = useCallback((style: ButtonStyle | null) => {
    if (!style) return '#E0E0E0';
    const candidates = [
      style.backgroundColorTop,
      style.backgroundColorMiddle,
      style.backgroundColorBottom,
    ].filter((color): color is string => Boolean(color && color.trim().length > 0));

    if (candidates.length === 0) {
      return '#E0E0E0';
    }

    let color = candidates[0]!;
    if (color.startsWith('#') && color.length === 9) {
      color = `#${color.slice(3)}`;
    }

    return color;
  }, []);

  const reorderCategoryName = useMemo(() => {
    if (reorderCategoryId === null) {
      return 'Selected category';
    }

    const label = getCategoryLabel(reorderCategoryId);
    return label === '—' ? 'Selected category' : label;
  }, [getCategoryLabel, reorderCategoryId]);

  const resetDrawerState = useCallback(() => {
    setDrawerOpen(false);
    setFormData(null);
    setEditingItemId(null);
    setSelectedDetail(null);
    setPriceEdits({});
    setAvailabilityEdits({});
    setPrinterEdits({});
    setDetailLoading(false);
    setActiveTab('basics');
  }, []);

  const handleDrawerClose = useCallback(() => {
    if (saving) return;
    resetDrawerState();
  }, [resetDrawerState, saving]);

  const handleCreate = useCallback(() => {
    if (!lookups || lookups.categories.length === 0 || lookups.departments.length === 0) {
      notifications.show({
        title: 'Missing data',
        message: 'Please configure categories and departments before creating items.',
        color: 'orange',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    const defaultCategoryId = selectedCategoryId ?? lookups.categories[0].categoryId;
    const defaultDepartmentId = lookups.departments[0].departmentId;

    setFormData(createBasePayload(defaultCategoryId, defaultDepartmentId));
    setDrawerMode('create');
   setEditingItemId(null);
   setSelectedDetail(null);
   setPriceEdits({});
   setAvailabilityEdits({});
    setPrinterEdits({});
    setActiveTab('basics');
    setDrawerOpen(true);
  }, [lookups, selectedCategoryId]);

  const handleEdit = useCallback(async (item: MenuItemSummary) => {
    if (!brandId) return;
    setDrawerMode('edit');
    setDrawerOpen(true);
    setActiveTab('basics');
    setFormData(null);
    setEditingItemId(item.itemId);
    setSelectedDetail(null);
    setPriceEdits({});
    setAvailabilityEdits({});
    setPrinterEdits({});
    setDetailLoading(true);
    try {
      const detail = await menuItemService.getMenuItem(brandId, item.itemId);
      setSelectedDetail(detail);
      setFormData(mapDetailToPayload(detail));
    } catch (error) {
      console.error('Failed to load item detail', error);
      notifications.show({
        title: 'Error',
        message: 'Unable to load item details',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      resetDrawerState();
    } finally {
      setDetailLoading(false);
    }
  }, [brandId, resetDrawerState]);

  const handleOpenReorderModal = useCallback(async () => {
    if (!brandId) {
      notifications.show({
        title: 'Brand required',
        message: 'Select a brand before reordering items.',
        color: 'orange',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    if (selectedCategoryId === null) {
      notifications.show({
        title: 'Category required',
        message: 'Select a category to reorder its items.',
        color: 'orange',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    setReorderCategoryId(selectedCategoryId);
    setReorderModalOpen(true);
    setReorderLoading(true);
    setReorderItems([]);

    try {
      const response = await menuItemService.getMenuItems(brandId, {
        categoryId: selectedCategoryId,
        includeDisabled: true,
        sortBy: 'displayIndex',
        sortDirection: 'asc',
        page: 1,
        pageSize: 1000,
      });
      setReorderItems(response.items);
    } catch (error) {
      console.error('Failed to load items for reorder', error);
      notifications.show({
        title: 'Error',
        message: 'Unable to load items for reordering.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      setReorderModalOpen(false);
      setReorderCategoryId(null);
    } finally {
      setReorderLoading(false);
    }
  }, [brandId, selectedCategoryId]);

  const handleCloseReorderModal = useCallback(() => {
    if (reorderSaving) return;
    setReorderModalOpen(false);
    setReorderCategoryId(null);
    setReorderItems([]);
  }, [reorderSaving]);

  const handleSaveReorder = useCallback(async (ordered: MenuItemSummary[]) => {
    if (!brandId || reorderCategoryId === null) {
      return;
    }

    setReorderSaving(true);
    try {
      await menuItemService.reorderMenuItems(brandId, {
        items: ordered.map((item, index) => ({
          itemId: item.itemId,
          displayIndex: index + 1,
        })),
      });

      notifications.show({
        title: 'Order saved',
        message: 'Menu item display order updated.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      setReorderModalOpen(false);
      setReorderCategoryId(null);
      setReorderItems([]);
      setReloadToken((prev) => prev + 1);
      setSortBy('displayIndex');
      setSortDirection('asc');
      setPage(1);
    } catch (error) {
      console.error('Failed to reorder items', error);
      notifications.show({
        title: 'Error',
        message: 'Unable to save the new order.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setReorderSaving(false);
    }
  }, [brandId, reorderCategoryId, setReloadToken, setSortBy, setSortDirection]);

  const columns = useMemo<ColumnDef<MenuItemSummary>[]>(() => {
    const renderBoolean = (value: boolean | null | undefined, trueColor: string) => {
      if (value === null || value === undefined) {
        return <Text size="sm" c="dimmed">—</Text>;
      }

      if (value) {
        return (
          <Badge variant="light" color={trueColor} size="sm">
            Yes
          </Badge>
        );
      }

      return (
        <Badge variant="light" color="gray" size="sm">
          No
        </Badge>
      );
    };

    const renderText = (value?: string | null) => (
      <Text size="sm" truncate="end">{value && value.trim().length > 0 ? value : '—'}</Text>
    );

    return [
      {
        accessorKey: 'itemId',
        header: 'Item Id',
        size: 90,
        enableHiding: false,
        cell: ({ row }) => (
          <Text size="sm" fw={600}>{row.original.itemId}</Text>
        ),
      },
      {
        accessorKey: 'itemCode',
        header: 'Code',
        size: 100,
        enableHiding: false,
        cell: ({ row }) => (
          <Text size="sm" fw={500} truncate="end">{row.original.itemCode}</Text>
        ),
      },
      {
        accessorKey: 'displayIndex',
        header: 'Display Index',
        size: 120,
        enableHiding: false,
        cell: ({ row }) => (
          <Text size="sm">{row.original.displayIndex}</Text>
        ),
      },
      {
        accessorKey: 'itemName',
        header: 'Item Name',
        size: 200,
        enableHiding: false,
        cell: ({ row }) => (
          <Text size="sm" truncate="end">{row.original.itemName || '—'}</Text>
        ),
      },
      {
        id: 'itemType',
        header: 'Type',
        size: 100,
        cell: ({ row }) => {
          const item = row.original;
          if (item.isModifier) return <Badge variant="light" color="violet" size="sm">Modifier</Badge>;
          if (item.isFollowSetDynamic || item.isFollowSetStandard) return <Badge variant="light" color="teal" size="sm">Set Item</Badge>;
          return <Badge variant="light" color="blue" size="sm">Sellable</Badge>;
        },
      },
      {
        id: 'buttonStyle',
        header: 'Button Style',
        size: 200,
        cell: ({ row }) => {
          const style = getButtonStyleById(row.original.buttonStyleId);
          if (!style) {
            return <Text size="sm" c="dimmed">—</Text>;
          }

          const color = getButtonStyleColor(style);
          return (
            <Group gap="xs" wrap="nowrap">
              <Box
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: '1px solid var(--mantine-color-gray-3, #dee2e6)',
                  backgroundColor: color,
                  flexShrink: 0,
                }}
              />
              <Text size="sm" truncate="end">{style.styleName}</Text>
            </Group>
          );
        },
      },
      {
        accessorKey: 'categoryId',
        header: 'Category',
        size: 140,
        cell: ({ row }) => (
          <Text size="sm" truncate="end">{getCategoryLabel(row.original.categoryId)}</Text>
        ),
      },
      {
        accessorKey: 'departmentId',
        header: 'Department',
        size: 120,
        cell: ({ row }) => (
          <Text size="sm" truncate="end">{getDepartmentName(row.original.departmentId)}</Text>
        ),
      },
      {
        accessorKey: 'enabled',
        header: 'Enabled',
        size: 90,
        cell: ({ row }) => (
          <Badge variant="light" color={row.original.enabled ? 'green' : 'gray'} size="sm">
            {row.original.enabled ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        accessorKey: 'hasModifier',
        header: 'Modifiers',
        size: 95,
        cell: ({ row }) => row.original.hasModifier ? (
          <Badge variant="light" color="violet" size="sm">Yes</Badge>
        ) : (
          <Text size="sm" c="dimmed">—</Text>
        ),
      },
      {
        accessorKey: 'isPromoItem',
        header: 'Promo',
        size: 80,
        cell: ({ row }) => row.original.isPromoItem ? (
          <Badge variant="light" color="orange" size="sm">Yes</Badge>
        ) : (
          <Text size="sm" c="dimmed">—</Text>
        ),
      },
      {
        accessorKey: 'isManualPrice',
        header: 'Manual Price',
        size: 120,
        cell: ({ row }) => renderBoolean(row.original.isManualPrice, 'red'),
      },
      {
        accessorKey: 'isManualName',
        header: 'Manual Name',
        size: 120,
        cell: ({ row }) => renderBoolean(row.original.isManualName, 'red'),
      },
      {
        accessorKey: 'isNonDiscountItem',
        header: 'Non discountable',
        size: 150,
        cell: ({ row }) => renderBoolean(row.original.isNonDiscountItem, 'blue'),
      },
      {
        accessorKey: 'isNonServiceChargeItem',
        header: 'Non service charge',
        size: 170,
        cell: ({ row }) => renderBoolean(row.original.isNonServiceChargeItem, 'blue'),
      },
      {
        accessorKey: 'isPointPaidItem',
        header: 'Allow points payment',
        size: 190,
        cell: ({ row }) => renderBoolean(row.original.isPointPaidItem, 'green'),
      },
      {
        accessorKey: 'isNoPointEarnItem',
        header: 'No point earning',
        size: 170,
        cell: ({ row }) => renderBoolean(row.original.isNoPointEarnItem, 'green'),
      },
      {
        accessorKey: 'isNonTaxableItem',
        header: 'Non taxable',
        size: 140,
        cell: ({ row }) => renderBoolean(row.original.isNonTaxableItem, 'teal'),
      },
      {
        accessorKey: 'isComboRequired',
        header: 'Combo required',
        size: 150,
        cell: ({ row }) => renderBoolean(row.original.isComboRequired, 'purple'),
      },
      {
        accessorKey: 'itemPosName',
        header: 'POS display name',
        size: 200,
        cell: ({ row }) => renderText(row.original.itemPosName),
      },
      {
        accessorKey: 'itemPublicDisplayName',
        header: 'Public display name',
        size: 200,
        cell: ({ row }) => renderText(row.original.itemPublicDisplayName),
      },
      {
        accessorKey: 'itemPosNameAlt',
        header: 'POS display name (alt)',
        size: 220,
        cell: ({ row }) => renderText(row.original.itemPosNameAlt),
      },
      {
        accessorKey: 'itemPublicDisplayNameAlt',
        header: 'Public display name (alt)',
        size: 220,
        cell: ({ row }) => renderText(row.original.itemPublicDisplayNameAlt),
      },
      {
        accessorKey: 'itemPublicPrintedName',
        header: 'POS printed name',
        size: 200,
        cell: ({ row }) => renderText(row.original.itemPublicPrintedName),
      },
      {
        id: 'showItemOnReceipt',
        header: 'Show item on receipt',
        size: 170,
        accessorFn: (row) => row.isItemShow,
        cell: ({ row }) => renderBoolean(row.original.isItemShow, 'blue'),
      },
      {
        id: 'showPriceOnReceipt',
        header: 'Show price on receipt',
        size: 180,
        accessorFn: (row) => row.isPriceShow,
        cell: ({ row }) => renderBoolean(row.original.isPriceShow, 'blue'),
      },
      {
        accessorKey: 'modifiedDate',
        header: 'Last updated',
        size: 160,
        cell: ({ row }) => (
          <Text size="sm" truncate="end">{formatDateTime(row.original.modifiedDate)}</Text>
        ),
      },
      {
        accessorKey: 'modifiedBy',
        header: 'Last updated by',
        size: 200,
        cell: ({ row }) => (
          <Text size="sm" truncate="end">{row.original.modifiedBy || '—'}</Text>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 100,
        enableHiding: false,
        enableResizing: false,
        cell: ({ row }) => (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Tooltip label="Manage item relationships" withArrow>
              <ActionIcon
                variant="subtle"
                color={row.original.hasModifier ? 'violet' : 'gray'}
                size="sm"
                onClick={() => handleOpenModifiers(row.original)}
              >
                <IconAdjustments size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit item" withArrow>
              <ActionIcon variant="subtle" color="indigo" size="sm" onClick={() => handleEdit(row.original)}>
                <IconPencil size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ];
  }, [getButtonStyleById, getButtonStyleColor, getCategoryLabel, getDepartmentName, handleEdit, handleOpenModifiers]);

  const pageOptions = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, index) => ({
        value: String(index + 1),
        label: String(index + 1),
      })),
    [totalPages],
  );

  const toggleableColumns = useMemo<MenuItemsColumnDef[]>(
    () =>
      columns
        .filter((col) => col.enableHiding !== false)
        .map((col) => col as MenuItemsColumnDef),
    [columns],
  );

  const filteredToggleColumns = useMemo(() => {
    const searchTerm = columnSearch.trim().toLowerCase();
    if (!searchTerm) {
      return toggleableColumns;
    }

    return toggleableColumns.filter((column) => getColumnLabel(column).toLowerCase().includes(searchTerm));
  }, [toggleableColumns, columnSearch]);

  const allToggleColumnsSelected = toggleableColumns.length > 0
    && toggleableColumns.every((column) => {
      const key = getColumnId(column);
      if (!key) {
        return true;
      }
      return columnVisibility[key] !== false;
    });
  const anyToggleColumnsSelected = toggleableColumns.some((column) => {
    const key = getColumnId(column);
    return key ? columnVisibility[key] !== false : true;
  });

  const handleToggleAllColumns = useCallback(
    (visible: boolean) => {
      const newVisibility = { ...columnVisibility };
      toggleableColumns.forEach((column) => {
        const key = getColumnId(column);
        if (key) {
          newVisibility[key] = visible;
        }
      });
      setColumnVisibility(newVisibility);
    },
    [columnVisibility, toggleableColumns],
  );

  // Helper to toggle single column visibility
  const toggleColumnVisibility = (columnId: string, visible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: visible
    }));
  };

  useEffect(() => {
    if (!brandId) {
      setLookups(null);
      setFiltersReady(false);
      return;
    }

    let active = true;

    const loadLookups = async () => {
      setLookupsLoading(true);
      try {
        const data = await menuItemService.getLookups(brandId);
        if (!active) return;
        setLookups(data);
        const defaultCategoryId = (() => {
          const roots = buildCategoryTree(data.categories);
          if (roots.length > 0) {
            return roots[0].categoryId;
          }
          return data.categories[0]?.categoryId ?? null;
        })();

        setSelectedCategoryId((current) => {
          if (current && data.categories.some((cat) => cat.categoryId === current)) {
            return current;
          }
          return defaultCategoryId;
        });
        setPage(1);
        setFiltersReady(true);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load menu item lookups', error);
        notifications.show({
          title: 'Error',
          message: 'Unable to load supporting data for menu items',
          color: 'red',
          icon: <IconAlertCircle size={16} />,
        });
        setFiltersReady(true);
      } finally {
        if (active) {
          setLookupsLoading(false);
        }
      }
    };

    loadLookups();

    return () => {
      active = false;
      setFiltersReady(false);
    };
  }, [brandId]);

  useEffect(() => {
    if (!selectedDetail) {
      setPriceEdits({});
      setAvailabilityEdits({});
      return;
    }

    const initialPrices = Object.fromEntries(
      (selectedDetail.prices ?? []).map((price) => [
        price.shopId,
        {
          price: price.price ?? null,
          enabled: price.enabled,
        },
      ]),
    );

    const initialAvailability = Object.fromEntries(
      (selectedDetail.shopAvailability ?? []).map((record) => [
        record.shopId,
        {
          enabled: record.enabled ?? false,
          isOutOfStock: record.isOutOfStock ?? false,
          isLimitedItem: record.isLimitedItem ?? false,
        },
      ]),
    );

    setPriceEdits(initialPrices);
    setAvailabilityEdits(initialAvailability);
  }, [selectedDetail]);

  useEffect(() => {
    if (!brandId || !filtersReady) return;

    const loadItems = async () => {
      setItemsLoading(true);
      setFetchError(null);
      try {
        const response = await menuItemService.getMenuItems(brandId, {
          categoryId: selectedCategoryId ?? undefined,
          search: debouncedSearch || undefined,
          itemType: itemTypeFilter === 'all' ? undefined : itemTypeFilter as 'sellable' | 'modifier' | 'setItem',
          sortBy,
          sortDirection,
          page,
          pageSize: PAGE_SIZE,
        });
        setItemsResponse(response);
      } catch (error) {
        console.error('Failed to load menu items', error);
        setFetchError('Unable to fetch menu items. Please try again.');
      } finally {
        setItemsLoading(false);
      }
    };

    loadItems();
  }, [brandId, filtersReady, selectedCategoryId, debouncedSearch, itemTypeFilter, sortBy, sortDirection, page, reloadToken]);

  const categoryTree = useMemo(() => buildCategoryTree(lookups?.categories ?? []), [lookups?.categories]);

  const parentMap = useMemo(() => {
    const map = new Map<number, number | null>();
    (lookups?.categories ?? []).forEach((category) => {
      map.set(category.categoryId, category.parentCategoryId ?? null);
    });
    return map;
  }, [lookups?.categories]);

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categoryTree;

    const term = categorySearch.trim().toLowerCase();

    const filterRecursive = (nodes: CategoryNode[]): CategoryNode[] =>
      nodes
        .map((node) => ({
          ...node,
          children: filterRecursive(node.children),
        }))
        .filter((node) =>
          node.categoryName.toLowerCase().includes(term) || node.children.length > 0,
        );

    return filterRecursive(categoryTree);
  }, [categoryTree, categorySearch]);

  useEffect(() => {
    if (!categoryTree.length) {
      setExpandedCategories(new Set());
      return;
    }

    // Ensure top-level categories are expanded by default for quick scanning
    setExpandedCategories((prev) => {
      if (prev.size > 0) {
        return prev;
      }
      return new Set(categoryTree.map((node) => node.categoryId));
    });
  }, [categoryTree]);

  useEffect(() => {
    if (selectedCategoryId == null) {
      return;
    }

    const path = new Set<number>();
    let current = parentMap.get(selectedCategoryId) ?? null;
    while (current !== null && current !== undefined) {
      path.add(current);
      current = parentMap.get(current) ?? null;
    }

    if (path.size === 0) {
      return;
    }

    setExpandedCategories((prev) => {
      const merged = new Set(prev);
      path.forEach((id) => merged.add(id));
      return merged;
    });
  }, [selectedCategoryId, parentMap]);

  const categoryCounts = useMemo(() => {
    const map = new Map<number, number>();
    itemsResponse?.categoryCounts.forEach((entry: CategoryItemCount) => {
      map.set(entry.categoryId, entry.itemCount);
    });
    return map;
  }, [itemsResponse?.categoryCounts]);

  const totalCategoryItems = useMemo(
    () => (itemsResponse?.categoryCounts ?? []).reduce((acc, entry) => acc + entry.itemCount, 0),
    [itemsResponse?.categoryCounts],
  );

  const updatePriceEdit = (shopId: number, changes: Partial<{ price: number | null; enabled: boolean }>) => {
    const base = selectedDetail?.prices.find((price) => price.shopId === shopId);
    setPriceEdits((prev) => {
      const previous = prev[shopId] ?? { price: base?.price ?? null, enabled: base?.enabled ?? false };
      return {
        ...prev,
        [shopId]: {
          price: Object.prototype.hasOwnProperty.call(changes, 'price') ? changes.price ?? null : previous.price,
          enabled: Object.prototype.hasOwnProperty.call(changes, 'enabled') ? changes.enabled ?? false : previous.enabled,
        },
      };
    });
  };

  const updateAvailabilityEdit = (
    shopId: number,
    changes: Partial<{ enabled: boolean | null; isOutOfStock: boolean | null; isLimitedItem: boolean | null }>,
  ) => {
    const base = selectedDetail?.shopAvailability.find((record) => record.shopId === shopId);
    setAvailabilityEdits((prev) => {
      const previous =
        prev[shopId] ??
        {
          enabled: base?.enabled ?? false,
          isOutOfStock: base?.isOutOfStock ?? false,
          isLimitedItem: base?.isLimitedItem ?? false,
        };
      return {
        ...prev,
        [shopId]: {
          enabled: Object.prototype.hasOwnProperty.call(changes, 'enabled') ? changes.enabled ?? false : previous.enabled,
          isOutOfStock: Object.prototype.hasOwnProperty.call(changes, 'isOutOfStock')
            ? changes.isOutOfStock ?? false
            : previous.isOutOfStock,
          isLimitedItem: Object.prototype.hasOwnProperty.call(changes, 'isLimitedItem')
            ? changes.isLimitedItem ?? false
            : previous.isLimitedItem,
        },
      };
    });
  };

  const updatePrinterEdit = (
    shopId: number,
    changes: Partial<{
      shopPrinter1: number | null;
      shopPrinter2: number | null;
      shopPrinter3: number | null;
      shopPrinter4: number | null;
      shopPrinter5: number | null;
      isGroupPrintByPrinter: boolean | null;
    }>,
  ) => {
    const base = selectedDetail?.shopAvailability.find((record) => record.shopId === shopId);
    setPrinterEdits((prev) => {
      const previous =
        prev[shopId] ??
        {
          shopPrinter1: base?.shopPrinter1 ?? null,
          shopPrinter2: base?.shopPrinter2 ?? null,
          shopPrinter3: base?.shopPrinter3 ?? null,
          shopPrinter4: base?.shopPrinter4 ?? null,
          shopPrinter5: base?.shopPrinter5 ?? null,
          isGroupPrintByPrinter: base?.isGroupPrintByPrinter ?? false,
        };
      return {
        ...prev,
        [shopId]: {
          shopPrinter1: Object.prototype.hasOwnProperty.call(changes, 'shopPrinter1')
            ? changes.shopPrinter1 ?? null
            : previous.shopPrinter1,
          shopPrinter2: Object.prototype.hasOwnProperty.call(changes, 'shopPrinter2')
            ? changes.shopPrinter2 ?? null
            : previous.shopPrinter2,
          shopPrinter3: Object.prototype.hasOwnProperty.call(changes, 'shopPrinter3')
            ? changes.shopPrinter3 ?? null
            : previous.shopPrinter3,
          shopPrinter4: Object.prototype.hasOwnProperty.call(changes, 'shopPrinter4')
            ? changes.shopPrinter4 ?? null
            : previous.shopPrinter4,
          shopPrinter5: Object.prototype.hasOwnProperty.call(changes, 'shopPrinter5')
            ? changes.shopPrinter5 ?? null
            : previous.shopPrinter5,
          isGroupPrintByPrinter: Object.prototype.hasOwnProperty.call(changes, 'isGroupPrintByPrinter')
            ? Boolean(changes.isGroupPrintByPrinter)
            : Boolean(previous.isGroupPrintByPrinter),
        },
      };
    });
  };

  const updateForm = <K extends keyof MenuItemUpsertPayload>(key: K, value: MenuItemUpsertPayload[K]) => {
    setFormData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

const handleSubmit = async () => {
  if (!formData || !brandId) return;

  if (!formData.itemCode.trim()) {
    notifications.show({
      title: 'Validation error',
      message: 'Item code is required.',
      color: 'orange',
      icon: <IconAlertCircle size={16} />,
    });
    setActiveTab('basics');
    return;
  }

  type PriceUpdate = { shopId: number; payload: { price: number; enabled: boolean } };
  type AvailabilityUpdate = {
    shopId: number;
    payload: {
      enabled: boolean;
      isOutOfStock: boolean;
      isLimitedItem: boolean;
      shopPrinter1: number | null;
      shopPrinter2: number | null;
      shopPrinter3: number | null;
      shopPrinter4: number | null;
      shopPrinter5: number | null;
      isGroupPrintByPrinter: boolean;
    };
  };

  let priceValidationFailed = false;
  const priceUpdates: PriceUpdate[] = [];
  const availabilityUpdates: AvailabilityUpdate[] = [];

  if (drawerMode === 'edit' && selectedDetail) {
    const shops = selectedDetail.shopAvailability;
    for (const record of shops) {
      const shopId = record.shopId;
      const price = selectedDetail.prices.find((entry) => entry.shopId === shopId);
      const priceState = priceEdits[shopId] ?? {
        price: price?.price ?? null,
        enabled: price?.enabled ?? false,
      };
      const availabilityEdit = availabilityEdits[shopId];
      const printerEdit = printerEdits[shopId];

      const normalisePrice = (value: number | null) =>
        value === null || Number.isNaN(value) ? null : Math.round(value * 100) / 100;

      const finalPrice = normalisePrice(priceState.price ?? price?.price ?? null);
      const originalPrice = normalisePrice(price?.price ?? null);
      const finalPriceEnabled = priceState.enabled ?? (price?.enabled ?? false);
      const originalPriceEnabled = price?.enabled ?? false;

      const priceChanged = finalPrice !== originalPrice || finalPriceEnabled !== originalPriceEnabled;
      if (priceChanged) {
        if (finalPrice === null) {
          priceValidationFailed = true;
        } else {
          priceUpdates.push({
            shopId,
            payload: {
              price: finalPrice,
              enabled: finalPriceEnabled,
            },
          });
        }
      }

      const finalAvailabilityEnabled = Boolean(availabilityEdit?.enabled ?? record.enabled ?? false);
      const finalOutOfStock = Boolean(availabilityEdit?.isOutOfStock ?? record.isOutOfStock ?? false);
      const finalLimited = Boolean(availabilityEdit?.isLimitedItem ?? record.isLimitedItem ?? false);

      const originalAvailabilityEnabled = Boolean(record.enabled);
      const originalOutOfStock = Boolean(record.isOutOfStock);
      const originalLimited = Boolean(record.isLimitedItem);

      const finalPrinter1 = printerEdit?.shopPrinter1 ?? record.shopPrinter1 ?? null;
      const finalPrinter2 = printerEdit?.shopPrinter2 ?? record.shopPrinter2 ?? null;
      const finalPrinter3 = printerEdit?.shopPrinter3 ?? record.shopPrinter3 ?? null;
      const finalPrinter4 = printerEdit?.shopPrinter4 ?? record.shopPrinter4 ?? null;
      const finalPrinter5 = printerEdit?.shopPrinter5 ?? record.shopPrinter5 ?? null;
      const finalGroupPrint = Boolean(printerEdit?.isGroupPrintByPrinter ?? record.isGroupPrintByPrinter ?? false);

      const availabilityChanged =
        finalAvailabilityEnabled !== originalAvailabilityEnabled ||
        finalOutOfStock !== originalOutOfStock ||
        finalLimited !== originalLimited ||
        finalPrinter1 !== (record.shopPrinter1 ?? null) ||
        finalPrinter2 !== (record.shopPrinter2 ?? null) ||
        finalPrinter3 !== (record.shopPrinter3 ?? null) ||
        finalPrinter4 !== (record.shopPrinter4 ?? null) ||
        finalPrinter5 !== (record.shopPrinter5 ?? null) ||
        finalGroupPrint !== Boolean(record.isGroupPrintByPrinter);

      if (availabilityChanged) {
        availabilityUpdates.push({
          shopId,
          payload: {
            enabled: finalAvailabilityEnabled,
            isOutOfStock: finalOutOfStock,
            isLimitedItem: finalLimited,
            shopPrinter1: finalPrinter1,
            shopPrinter2: finalPrinter2,
            shopPrinter3: finalPrinter3,
            shopPrinter4: finalPrinter4,
            shopPrinter5: finalPrinter5,
            isGroupPrintByPrinter: finalGroupPrint,
          },
        });
      }
    }

    if (priceValidationFailed) {
      notifications.show({
        title: 'Validation error',
        message: 'Please provide a valid price for each updated shop before saving.',
        color: 'orange',
        icon: <IconAlertCircle size={16} />,
      });
      setActiveTab('availability');
      return;
    }
  }

  setSaving(true);
  try {
    const payload = normalizePayload(formData);
    let overridesApplied = false;

    if (drawerMode === 'create') {
      await menuItemService.createMenuItem(brandId, payload);
      notifications.show({
        title: 'Item created',
        message: 'The menu item has been created successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setPage(1);
    } else if (drawerMode === 'edit' && editingItemId) {
      await menuItemService.updateMenuItem(brandId, editingItemId, payload);

      if (selectedDetail && (priceUpdates.length > 0 || availabilityUpdates.length > 0)) {
        const updatedPrices: MenuItemPrice[] = [];
        for (const update of priceUpdates) {
          const result = await menuItemService.updateMenuItemPrice(
            brandId,
            selectedDetail.itemId,
            update.shopId,
            update.payload,
          );
          updatedPrices.push(result);
        }

        const updatedAvailability: MenuItemShopAvailability[] = [];
        for (const update of availabilityUpdates) {
          const result = await menuItemService.updateMenuItemAvailability(
            brandId,
            selectedDetail.itemId,
            update.shopId,
            update.payload,
          );
          updatedAvailability.push(result);
        }

        if (updatedPrices.length > 0 || updatedAvailability.length > 0) {
          overridesApplied = true;
          setSelectedDetail((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              prices:
                updatedPrices.length > 0
                  ? prev.prices.map((entry) => {
                      const match = updatedPrices.find((item) => item.shopId === entry.shopId);
                      return match ?? entry;
                    })
                  : prev.prices,
              shopAvailability:
                updatedAvailability.length > 0
                  ? prev.shopAvailability.map((entry) => {
                      const match = updatedAvailability.find((item) => item.shopId === entry.shopId);
                      return match ?? entry;
                    })
                  : prev.shopAvailability,
            };
          });
        }

        setPriceEdits({});
        setAvailabilityEdits({});
        setPrinterEdits({});
      }

      notifications.show({
        title: 'Item updated',
        message: overridesApplied ? 'Item details and shop overrides have been saved.' : 'Changes have been saved.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    }

    resetDrawerState();
    const response = await menuItemService.getMenuItems(brandId, {
      categoryId: selectedCategoryId ?? undefined,
      search: debouncedSearch || undefined,
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
    });
    setItemsResponse(response);
    } catch (error) {
      console.error('Failed to save menu item', error);
      notifications.show({
        title: 'Save failed',
        message: 'Unable to save changes. Please check the form and try again.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      if (drawerMode === 'edit' && (priceUpdates.length > 0 || availabilityUpdates.length > 0)) {
        setActiveTab('availability');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleCategoryExpansion = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setPage(1);
  };

  const renderCategoryNodes = (nodes: CategoryNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      const isSelected = node.categoryId === selectedCategoryId;
      const count = categoryCounts.get(node.categoryId) ?? 0;
      const hasChildren = node.children.length > 0;
      const forceExpanded = Boolean(categorySearch.trim());
      const isExpanded = forceExpanded || expandedCategories.has(node.categoryId);
      const displayChildren = hasChildren && isExpanded;

      const labelColor = isSelected ? 'var(--mantine-color-indigo-7)' : 'var(--mantine-color-gray-7)';
      const backgroundColor = isSelected ? 'var(--mantine-color-indigo-0)' : 'transparent';

      return (
        <Stack key={node.categoryId} gap={4}>
          <UnstyledButton
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              backgroundColor,
              transition: 'background-color 120ms ease',
              width: '100%',
            }}
            onClick={() => handleCategorySelect(node.categoryId)}
          >
            <Flex align="center" justify="space-between" pl={depth * 16} gap="sm">
              <Group gap={6} align="center">
                {hasChildren ? (
                  <Box
                    w={28}
                    h={28}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      borderRadius: 4,
                      transition: 'background-color 150ms ease',
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCategoryExpansion(node.categoryId);
                    }}
                    onMouseEnter={(event) => {
                      event.currentTarget.style.backgroundColor = 'var(--mantine-color-gray-1)';
                    }}
                    onMouseLeave={(event) => {
                      event.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {isExpanded ? <IconChevronRight size={16} style={{ transform: 'rotate(90deg)' }} /> : <IconChevronRight size={16} />}
                  </Box>
                ) : (
                  <Box w={28} />
                )}
                <Text size="sm" fw={isSelected ? 600 : 500} c={labelColor} style={{ maxWidth: 160 }} truncate>
                  {node.categoryName || '(Untitled category)'}
                </Text>
              </Group>
              <Badge size="sm" variant={isSelected ? 'filled' : 'outline'} color={isSelected ? 'indigo' : 'gray'}>
                {count}
              </Badge>
            </Flex>
          </UnstyledButton>
          {displayChildren && <Stack gap={4}>{renderCategoryNodes(node.children, depth + 1)}</Stack>}
        </Stack>
      );
    });

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
            {!brandId && (
              <Paper withBorder p="lg" mb="xl">
                <Group gap="sm">
                  <IconAlertCircle size={20} color="var(--mantine-color-red-6)" />
                  <Stack gap={4}>
                  <Text fw={600}>Select a brand to manage menu items</Text>
                  <Text size="sm" c="dimmed">
                    Choose a brand from the header selector to load menu data.
                  </Text>
                </Stack>
              </Group>
            </Paper>
            )}

            <Flex
              direction={isDesktopLayout ? 'row' : 'column'}
              gap={0}
              style={{
                ...(isDesktopLayout
                  ? {
                      flex: 1,
                      minHeight: 0,
                      overflow: 'hidden',
                    }
                  : {}),
                paddingInline: isDesktopLayout ? 0 : 'var(--mantine-spacing-md)',
              }}
            >
              {!isCategorySidebarCollapsed && (
                <Box
                  style={{
                    ...(isDesktopLayout
                      ? {
                          width: 320,
                          flexShrink: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: 0,
                        }
                      : { paddingBottom: 'var(--mantine-spacing-lg)' }),
                  }}
                >
                  <Paper
                    shadow="none"
                    p="md"
                    style={{
                      borderRight: isDesktopLayout ? `1px solid ${PANEL_BORDER_COLOR}` : 'none',
                      ...(isDesktopLayout
                        ? {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            minHeight: 0,
                          }
                        : {}),
                    }}
                  >
                    <MenuItemsCategorySidebar
                      isDesktopLayout={isDesktopLayout}
                      categorySearch={categorySearch}
                      onCategorySearchChange={(value) => setCategorySearch(value)}
                      selectedCategoryId={selectedCategoryId}
                      totalCategoryItems={totalCategoryItems}
                      lookupsLoading={lookupsLoading}
                      filteredCategories={filteredCategories}
                      renderCategoryNodes={renderCategoryNodes}
                      onAllItems={() => {
                        setSelectedCategoryId(null);
                        setPage(1);
                      }}
                    />
                  </Paper>
                </Box>
              )}

              <Box
                style={{
                  ...(isDesktopLayout
                    ? {
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                      }
                    : {}),
                }}
              >
              <Stack
                gap={0}
                style={
                  isDesktopLayout
                    ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }
                    : { gap: 'var(--mantine-spacing-md)' }
                }
              >
                <Paper
                  shadow="none"
                  p="md"
                  style={{
                    flexShrink: 0,
                    borderBottom: `1px solid ${PANEL_BORDER_COLOR}`,
                  }}
                >
                  <Group justify="space-between" align="center" gap="md" wrap="wrap">
                    <Group gap="xs" wrap="wrap">
                      <Tooltip
                        label={isCategorySidebarCollapsed ? 'Expand categories panel' : 'Collapse categories panel'}
                        withArrow
                      >
                        <ActionIcon
                          variant={isCategorySidebarCollapsed ? 'filled' : 'light'}
                          color={isCategorySidebarCollapsed ? 'indigo' : 'gray'}
                          size="lg"
                          aria-label={isCategorySidebarCollapsed ? 'Expand categories panel' : 'Collapse categories panel'}
                          aria-pressed={isCategorySidebarCollapsed}
                          onClick={() => setIsCategorySidebarCollapsed((prev) => !prev)}
                        >
                          {isCategorySidebarCollapsed ? (
                            <IconLayoutSidebarLeftExpand size={18} />
                          ) : (
                            <IconLayoutSidebarLeftCollapse size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>

                      {/* Item Type Filter */}
                      <SegmentedControl
                        value={itemTypeFilter}
                        onChange={(value) => { setItemTypeFilter(value); setPage(1); }}
                        data={[
                          { value: 'all', label: 'All' },
                          { value: 'sellable', label: 'Sellable' },
                          { value: 'modifier', label: 'Modifiers' },
                          { value: 'setItem', label: 'Set Items' },
                        ]}
                        size="xs"
                      />

                      <Popover
                        opened={searchPopoverOpened}
                        onChange={setSearchPopoverOpened}
                        withinPortal={false}
                        position="bottom-start"
                        shadow="md"
                        trapFocus={false}
                      >
                        <Popover.Target>
                          <Tooltip label="Search" withArrow>
                            <ActionIcon
                              variant={isSearchActive ? 'filled' : 'light'}
                              color={isSearchActive ? 'indigo' : 'gray'}
                              size="lg"
                              aria-label="Search menu items"
                              onClick={() => setSearchPopoverOpened((prev) => !prev)}
                            >
                              <IconSearch size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <TextInput
                            ref={searchInputRef}
                            placeholder="Search by name or code"
                            value={search}
                            onChange={(event) => {
                              setSearch(event.currentTarget.value);
                              setPage(1);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Escape') {
                                setSearchPopoverOpened(false);
                              }
                            }}
                            rightSection={
                              search ? (
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  aria-label="Clear search"
                                  onClick={() => {
                                    setSearch('');
                                    setPage(1);
                                  }}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              ) : undefined
                            }
                          />
                        </Popover.Dropdown>
                      </Popover>
                      <Popover
                        opened={sortPopoverOpened}
                        onChange={setSortPopoverOpened}
                        withinPortal={false}
                        position="bottom-start"
                        shadow="md"
                        trapFocus={false}
                      >
                        <Popover.Target>
                          <Tooltip label="Sort by" withArrow>
                            <ActionIcon
                              variant={sortPopoverOpened ? 'filled' : 'light'}
                              color={sortPopoverOpened ? 'indigo' : 'gray'}
                              size="lg"
                              aria-label="Sort options"
                              onClick={() => setSortPopoverOpened((prev) => !prev)}
                            >
                              <IconList size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown p="xs" w={220}>
                          <Stack gap="xs">
                            <Text size="xs" fw={600} c="dimmed">
                              Sort by
                            </Text>
                            <Stack gap={6}>
                              {SORT_OPTIONS.map((option) => (
                                <Button
                                  key={option.value}
                                  variant={sortBy === option.value ? 'filled' : 'subtle'}
                                  color={sortBy === option.value ? 'indigo' : 'gray'}
                                  size="xs"
                                  radius="md"
                                  rightSection={sortBy === option.value ? <IconCheck size={14} /> : undefined}
                                  onClick={() => {
                                    if (sortBy !== option.value) {
                                      setSortBy(option.value);
                                      setPage(1);
                                    }
                                    setSortPopoverOpened(false);
                                  }}
                                >
                                  {option.label}
                                </Button>
                              ))}
                            </Stack>
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                      <Popover
                        opened={columnMenuOpened}
                        onChange={setColumnMenuOpened}
                        withinPortal={false}
                        position="bottom-start"
                        shadow="md"
                        trapFocus={false}
                      >
                        <Popover.Target>
                          <Tooltip label="Toggle columns" withArrow>
                            <ActionIcon
                              variant={columnMenuOpened ? 'filled' : 'light'}
                              color={columnMenuOpened ? 'indigo' : 'gray'}
                              size="lg"
                              aria-label="Toggle columns"
                              onClick={() => setColumnMenuOpened((prev) => !prev)}
                            >
                              <IconColumns size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown p="sm" style={{ minWidth: 240 }}>
                          <Stack gap="xs">
                            <Group justify="space-between" align="center">
                              <Text size="sm" fw={600}>
                                Columns
                              </Text>
                              <Button
                                variant="subtle"
                                color="gray"
                                size="xs"
                                onClick={() => handleToggleAllColumns(false)}
                                disabled={!anyToggleColumnsSelected}
                              >
                                Deselect all
                              </Button>
                            </Group>
                            <TextInput
                              placeholder="Search..."
                              value={columnSearch}
                              onChange={(event) => setColumnSearch(event.currentTarget.value)}
                              size="xs"
                              leftSection={<IconSearch size={14} />}
                            />
                            <Divider />
                            <ScrollArea.Autosize mah={220} type="auto">
                              <Stack gap={4}>
                                {filteredToggleColumns.length === 0 ? (
                                  <Text size="xs" c="dimmed">
                                    No matching columns
                                  </Text>
                                ) : (
                                  filteredToggleColumns.map((column) => {
                                    const label = getColumnLabel(column);
                                    const colId = getColumnId(column);
                                    if (!colId) {
                                      return null;
                                    }
                                    const isVisible = columnVisibility[colId] !== false;
                                    return (
                                      <Checkbox
                                        key={colId}
                                        label={label}
                                        checked={isVisible}
                                        onChange={(event) => toggleColumnVisibility(colId, event.currentTarget.checked)}
                                      />
                                    );
                                  })
                                )}
                              </Stack>
                            </ScrollArea.Autosize>
                            <Divider />
                            <Group justify="space-between">
                              <Button
                                variant="light"
                                size="xs"
                                onClick={() => handleToggleAllColumns(true)}
                                disabled={toggleableColumns.length === 0 || allToggleColumnsSelected}
                              >
                                Select all
                              </Button>
                              <Button
                                variant="outline"
                                size="xs"
                                color="gray"
                                onClick={() => setColumnMenuOpened(false)}
                              >
                                Close
                              </Button>
                            </Group>
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                      <Tooltip label={sortDirection === 'asc' ? 'Ascending' : 'Descending'} withArrow>
                        <ActionIcon
                          variant="light"
                          color="indigo"
                          size="lg"
                          onClick={() => {
                            setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                            setPage(1);
                          }}
                        >
                          {sortDirection === 'asc' ? (
                            <IconSortAscending size={18} />
                          ) : (
                            <IconSortDescending size={18} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                      <Button
                        variant="outline"
                        leftSection={<IconArrowsSort size={16} />}
                        onClick={handleOpenReorderModal}
                        disabled={!brandId || selectedCategoryId === null || reorderLoading || reorderSaving}
                        size="sm"
                      >
                        Reorder items
                      </Button>
                      <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={handleCreate}
                        disabled={!brandId}
                        size="sm"
                      >
                        New item
                      </Button>
                    </Group>
                    <Group gap="sm" align="center">
                      <Text size="xs" c="dimmed">
                        {totalItems} rows
                      </Text>
                      <Group gap="xs" align="center">
                        <ActionIcon
                          variant="subtle"
                          size="lg"
                          aria-label="Previous page"
                          onClick={goToPreviousPage}
                          disabled={itemsLoading || page <= 1}
                        >
                          <IconChevronLeft size={16} />
                        </ActionIcon>
                        <Select
                          value={String(page)}
                          onChange={handlePageSelect}
                          data={pageOptions}
                          w={80}
                          disabled={itemsLoading || totalPages <= 1}
                        />
                        <ActionIcon
                          variant="subtle"
                          size="lg"
                          aria-label="Next page"
                          onClick={goToNextPage}
                          disabled={itemsLoading || page >= totalPages}
                        >
                          <IconChevronRight size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </Group>
                </Paper>

                <Box
                  style={
                    isDesktopLayout
                      ? {
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          minHeight: 0,
                        }
                      : {}
                  }
                >
                  <Paper
                    shadow="none"
                    style={
                      isDesktopLayout
                        ? {
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            minHeight: 0,
                          }
                        : {}
                    }
                  >
                    <DataTable
                      data={itemsResponse?.items ?? []}
                      columns={columns}
                      loading={itemsLoading}
                      error={fetchError}
                      onRetry={handleRetry}
                      emptyMessage={
                        <Stack align="center" gap="xs">
                          <Text fw={600}>No items found</Text>
                          <Text size="sm" c="dimmed" ta="center">
                            Adjust filters or add a new item to this category.
                          </Text>
                        </Stack>
                      }
                      totalItems={totalItems}
                      page={page}
                      onPageChange={setPage}
                      manualPagination
                      columnVisibility={columnVisibility}
                      onColumnVisibilityChange={setColumnVisibility}
                      columnSizing={columnSizing}
                      onColumnSizingChange={setColumnSizing}
                      hideFooter={true}
                    />
                  </Paper>
                </Box>
              </Stack>
              </Box>
            </Flex>
      </Box>

      <MenuItemDrawer
        opened={drawerOpen}
        title={drawerMode === 'create' ? 'Create menu item' : 'Edit menu item'}
        saving={saving}
        detailLoading={detailLoading}
        formData={formData}
        lookups={lookups}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={handleDrawerClose}
        onCancel={handleDrawerClose}
        drawerMode={drawerMode}
        updateForm={updateForm}
        selectedDetail={selectedDetail}
        priceEdits={priceEdits}
        availabilityEdits={availabilityEdits}
        updatePriceEdit={updatePriceEdit}
        updateAvailabilityEdit={updateAvailabilityEdit}
        printerEdits={printerEdits}
        updatePrinterEdit={updatePrinterEdit}
        onSubmit={handleSubmit}
        onManageModifiers={
          drawerMode === 'edit' && selectedDetail ? () => handleOpenModifiers(selectedDetail) : undefined
        }
      />
    <ManageItemRelationshipsModal
      opened={Boolean(modifierModalItem)}
      onClose={handleCloseModifiers}
      brandId={brandId}
      item={modifierModalItem}
      modifierGroups={lookups?.modifierGroups ?? null}
      onSaved={(hasModifier) => {
        if (modifierModalItem) {
          handleModifiersSaved(modifierModalItem.itemId, hasModifier);
        }
      }}
    />
    <MenuItemsReorderModal
      opened={reorderModalOpen}
      onClose={handleCloseReorderModal}
      categoryName={reorderCategoryName}
      items={reorderItems}
      loading={reorderLoading}
      saving={reorderSaving}
      onSave={handleSaveReorder}
    />
  </Box>
);
};

export default MenuItemsPage;
