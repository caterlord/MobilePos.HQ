import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FC } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Checkbox,
  Divider,
  Flex,
  Group,
  Loader,
  Modal,
  Popover,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconArrowsSort,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconList,
  IconCheck,
  IconSortAscending,
  IconSortDescending,
  IconColumns,
  IconChevronLeft,
  IconChevronRight,
  IconX,
} from '@tabler/icons-react';
import type { ColumnDef, VisibilityState, ColumnSizingState } from '@tanstack/react-table';

import smartCategoryService from '../../../../services/smartCategoryService';
import menuItemService from '../../../../services/menuItemService';
import { useBrands } from '../../../../contexts/BrandContext';
import type { SmartCategoryItemAssignment, SmartCategoryItemAssignmentEntry } from '../../../../types/smartCategory';
import type { MenuItemSummary } from '../../../../types/menuItem';
import type { ItemCategory } from '../../../../types/itemCategory';
import { SmartCategoryItemsReorderModal } from './SmartCategoryItemsReorderModal';
import { DataTable } from '../../../../components/DataTable';

interface ItemsTabProps {
  smartCategoryId: number;
  categoryName: string;
  initialItems: SmartCategoryItemAssignment[];
  onReload: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

const SORT_OPTIONS: Array<{
  label: string;
  value: 'displayIndex' | 'itemCode' | 'itemName';
}> = [
  { label: 'Display order', value: 'displayIndex' },
  { label: 'Item code', value: 'itemCode' },
  { label: 'Name', value: 'itemName' },
];

const PAGE_SIZE = 50;

type SmartCategoryColumnDef = ColumnDef<SmartCategoryItemAssignment> & { accessorKey?: string | number };

const getColumnId = (column: SmartCategoryColumnDef): string => {
  if (typeof column.accessorKey === 'string' || typeof column.accessorKey === 'number') {
    return column.accessorKey.toString();
  }
  return column.id ?? '';
};

const getColumnLabel = (column: SmartCategoryColumnDef): string => {
  if (typeof column.header === 'string') {
    return column.header;
  }
  return getColumnId(column) || 'Column';
};

export const SmartCategoryItemsTab: FC<ItemsTabProps> = ({ 
  smartCategoryId, 
  categoryName, 
  initialItems, 
  onReload,
  isSidebarCollapsed,
  onToggleSidebar 
}) => {
  const { selectedBrand } = useBrands();
  const brandId = selectedBrand ? parseInt(selectedBrand, 10) : null;

  const [items, setItems] = useState<SmartCategoryItemAssignment[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);

  const [addModalOpened, { open: openAddModal, close: closeAddModal }] = useDisclosure(false);
  const [reorderModalOpened, { open: openReorderModal, close: closeReorderModal }] = useDisclosure(false);
  const [searchPopoverOpened, setSearchPopoverOpened] = useState(false);
  const [search, setSearch] = useState('');
  const [sortPopoverOpened, setSortPopoverOpened] = useState(false);
  const [sortBy, setSortBy] = useState<typeof SORT_OPTIONS[number]['value']>('displayIndex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnMenuOpened, setColumnMenuOpened] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [page, setPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isSearchActive = searchPopoverOpened || Boolean(search.trim());

  useEffect(() => {
    setItems(initialItems.slice().sort((a, b) => a.displayIndex - b.displayIndex));
    setPage(1);
  }, [initialItems]);

  useEffect(() => {
    if (!searchPopoverOpened) {
      return;
    }
    const id = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [searchPopoverOpened]);

  const handleSaveOrder = async (orderedItems: SmartCategoryItemAssignment[]) => {
    if (!brandId) return;
    setIsSaving(true);

    try {
      const payload: SmartCategoryItemAssignmentEntry[] = orderedItems.map((item, index) => ({
        itemId: item.itemId,
        displayIndex: index + 1,
        enabled: item.enabled,
      }));

      await smartCategoryService.upsertItems(brandId, smartCategoryId, { items: payload });
      
      notifications.show({
        color: 'green',
        title: 'Order saved',
        message: 'Item order has been updated.',
      });
      closeReorderModal();
      onReload();
    } catch (error) {
      console.error(error);
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: 'Could not save item order.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveItem = useCallback(async (itemId: number) => {
      if (!brandId) return;
      
      const confirm = window.confirm('Are you sure you want to remove this item from the smart category?');
      if (!confirm) return;

      setIsSaving(true);
      try {
          const remainingItems = items.filter(i => i.itemId !== itemId);
          const payload: SmartCategoryItemAssignmentEntry[] = remainingItems.map((item, index) => ({
              itemId: item.itemId,
              displayIndex: index + 1,
              enabled: item.enabled,
          }));

          await smartCategoryService.upsertItems(brandId, smartCategoryId, { items: payload });
          notifications.show({ color: 'green', message: 'Item removed.' });
          onReload();
      } catch(error) {
          console.error(error);
          notifications.show({ color: 'red', title: 'Error', message: 'Could not remove item.' });
      } finally {
          setIsSaving(false);
      }
  }, [brandId, items, smartCategoryId, onReload]);

  const columns = useMemo<ColumnDef<SmartCategoryItemAssignment>[]>(
    () => [
      {
        accessorKey: 'itemId',
        header: 'Item ID',
        size: 120,
        enableHiding: false,
        cell: ({ row }) => (
          <Box style={{ minWidth: 0, width: '100%' }}>
            <Text size="sm" fw={600} lineClamp={1} title={String(row.original.itemId)}>
              {row.original.itemId}
            </Text>
          </Box>
        ),
      },
      {
        accessorKey: 'itemCode',
        header: 'Code',
        size: 100,
        cell: ({ row }) => (
          <Box style={{ minWidth: 0, width: '100%' }}>
            <Text size="sm" fw={500} lineClamp={1} title={row.original.itemCode}>
              {row.original.itemCode}
            </Text>
          </Box>
        ),
      },
      {
        accessorKey: 'displayIndex',
        header: 'Display Index',
        size: 140,
        cell: ({ row }) => <Text size="sm">{row.original.displayIndex}</Text>,
      },
      {
        accessorKey: 'itemName',
        header: 'Item Name',
        size: 280,
        cell: ({ row }) => {
          const primaryName = row.original.itemName?.trim() || 'Untitled Item';
          const altName = row.original.itemNameAlt?.trim();
          const title = altName ? `${primaryName} (${altName})` : primaryName;
          return (
            <Box style={{ minWidth: 0, width: '100%' }}>
              <Text size="sm" fw={600} truncate title={title} lineClamp={1}>
                {primaryName}
              </Text>
            </Box>
          );
        },
      },
      {
        accessorKey: 'modifiedDate',
        header: 'Last Updated',
        size: 180,
        cell: ({ row }) => {
            const date = row.original.modifiedDate ? new Date(row.original.modifiedDate).toLocaleString() : '—';
            return (
                <Box style={{ minWidth: 0, width: '100%' }}>
                  <Text size="sm" truncate title={date} lineClamp={1}>
                      {date}
                  </Text>
                </Box>
            );
        },
      },
      {
        accessorKey: 'modifiedBy',
        header: 'Last Updated By',
        size: 160,
        cell: ({ row }) => {
            const by = row.original.modifiedBy?.trim() || 'Unknown';
            return (
                <Box style={{ minWidth: 0, width: '100%' }}>
                  <Text size="sm" truncate title={by} lineClamp={1}>
                      {by}
                  </Text>
                </Box>
            );
        },
      },
      {
        accessorKey: 'enabled',
        header: 'Enabled',
        size: 100,
        cell: ({ row }) => (
          <Badge variant="light" color={row.original.enabled ? 'green' : 'gray'} size="sm">
            {row.original.enabled ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 80,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <Group justify="flex-end">
            <Tooltip label="Remove item">
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => handleRemoveItem(row.original.itemId)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [handleRemoveItem]
  );

  const filteredItems = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) {
      return items;
    }

    return items.filter((item) => {
      const nameMatch = item.itemName?.toLowerCase().includes(searchTerm);
      const codeMatch = item.itemCode?.toLowerCase().includes(searchTerm);
      const altNameMatch = item.itemNameAlt?.toLowerCase().includes(searchTerm);
      return Boolean(nameMatch || codeMatch || altNameMatch);
    });
  }, [items, search]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    sorted.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortBy === 'displayIndex') {
        return direction * ((a.displayIndex ?? 0) - (b.displayIndex ?? 0));
      }

      const aValue = (a[sortBy] ?? '').toString().toLowerCase();
      const bValue = (b[sortBy] ?? '').toString().toLowerCase();
      if (aValue < bValue) {
        return -1 * direction;
      }
      if (aValue > bValue) {
        return 1 * direction;
      }
      return 0;
    });
    return sorted;
  }, [filteredItems, sortBy, sortDirection]);

  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return sortedItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [sortedItems, currentPage]);

  const pageOptions = useMemo(
    () =>
      Array.from({ length: totalPages }, (_, index) => ({
        value: String(index + 1),
        label: String(index + 1),
      })),
    [totalPages],
  );

  const goToPreviousPage = () => setPage((prev) => Math.max(1, prev - 1));
  const goToNextPage = () => setPage((prev) => Math.min(totalPages, prev + 1));
  const handlePageSelect = (value: string | null) => {
    if (!value) return;
    setPage(Number(value));
  };

  const toggleableColumns = useMemo<SmartCategoryColumnDef[]>(
    () =>
      columns
        .filter((col) => col.enableHiding !== false)
        .map((col) => col as SmartCategoryColumnDef),
    [columns],
  );

  const filteredToggleColumns = useMemo(() => {
    const searchTerm = columnSearch.trim().toLowerCase();
    if (!searchTerm) {
      return toggleableColumns;
    }

    return toggleableColumns.filter((column) => getColumnLabel(column).toLowerCase().includes(searchTerm));
  }, [toggleableColumns, columnSearch]);

  const allToggleColumnsSelected =
    toggleableColumns.length > 0 &&
    toggleableColumns.every((column) => {
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

  const toggleColumnVisibility = useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: visible,
    }));
  }, []);

  const sidebarIsCollapsed = Boolean(isSidebarCollapsed);
  const toolbarHorizontalPadding = 'var(--mantine-spacing-md)';

  return (
    <Flex direction="column" gap="sm" style={{ flex: 1, minHeight: 0 }}>
      <Group
        justify="space-between"
        align="center"
        gap="md"
        wrap="wrap"
        style={{
          width: '100%',
          paddingLeft: toolbarHorizontalPadding,
          paddingRight: toolbarHorizontalPadding,
        }}
      >
        <Group gap="xs" align="center" wrap="wrap">
          {onToggleSidebar && (
            <Tooltip
              label={sidebarIsCollapsed ? 'Expand categories panel' : 'Collapse categories panel'}
              withArrow
            >
              <ActionIcon
                variant={sidebarIsCollapsed ? 'filled' : 'light'}
                color={sidebarIsCollapsed ? 'indigo' : 'gray'}
                size="lg"
                aria-label={sidebarIsCollapsed ? 'Expand categories panel' : 'Collapse categories panel'}
                aria-pressed={sidebarIsCollapsed}
                onClick={onToggleSidebar}
              >
                {sidebarIsCollapsed ? (
                  <IconLayoutSidebarLeftExpand size={18} />
                ) : (
                  <IconLayoutSidebarLeftCollapse size={18} />
                )}
              </ActionIcon>
            </Tooltip>
          )}
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
                  aria-label="Search assigned items"
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
                  leftSection={<IconSearch size={12} />}
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
                  <Button variant="outline" size="xs" color="gray" onClick={() => setColumnMenuOpened(false)}>
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
              {sortDirection === 'asc' ? <IconSortAscending size={18} /> : <IconSortDescending size={18} />}
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Refresh items">
            <ActionIcon variant="subtle" onClick={onReload} disabled={isSaving}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Button
            leftSection={<IconArrowsSort size={16} />}
            variant="light"
            onClick={openReorderModal}
            disabled={isSaving || items.length === 0}
          >
            Reorder items
          </Button>
          <Button leftSection={<IconPlus size={16} />} variant="light" onClick={openAddModal} disabled={isSaving}>
            Add items
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
              disabled={currentPage <= 1 || totalItems === 0}
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Select
              value={String(currentPage)}
              onChange={handlePageSelect}
              data={pageOptions}
              w={80}
              disabled={totalPages <= 1}
            />
            <ActionIcon
              variant="subtle"
              size="lg"
              aria-label="Next page"
              onClick={goToNextPage}
              disabled={currentPage >= totalPages || totalItems === 0}
            >
              <IconChevronRight size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Group>
      <Divider />

      <Box style={{ flex: 1, minHeight: 0 }}>
        <DataTable
          data={paginatedItems}
          columns={columns}
          emptyMessage="No items assigned to this category."
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnSizing={columnSizing}
          onColumnSizingChange={setColumnSizing}
          hideFooter
        />
      </Box>

      <AddItemsModal 
        opened={addModalOpened} 
        onClose={closeAddModal} 
        existingItemIds={new Set(items.map(i => i.itemId))}
        smartCategoryId={smartCategoryId}
        currentItems={items}
        onSuccess={() => {
            closeAddModal();
            onReload();
        }}
      />

      <SmartCategoryItemsReorderModal
        opened={reorderModalOpened}
        onClose={closeReorderModal}
        categoryName={categoryName}
        items={items}
        loading={false}
        saving={isSaving}
        onSave={handleSaveOrder}
      />
    </Flex>
  );
};

interface AddItemsModalProps {
    opened: boolean;
    onClose: () => void;
    existingItemIds: Set<number>;
    smartCategoryId: number;
    currentItems: SmartCategoryItemAssignment[];
    onSuccess: () => void;
}

const AddItemsModal: FC<AddItemsModalProps> = ({ 
    opened, 
    onClose, 
    existingItemIds, 
    smartCategoryId,
    currentItems,
    onSuccess 
}) => {
    const { selectedBrand } = useBrands();
    const brandId = selectedBrand ? parseInt(selectedBrand, 10) : null;

    const [search, setSearch] = useState('');
    const [items, setItems] = useState<MenuItemSummary[]>([]);
    const [categories, setCategories] = useState<ItemCategory[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    // Load items when modal opens
    const loadItems = useCallback(async () => {
        if (!brandId) return;
        setLoading(true);
        try {
            // Fetch all items (pagination might be needed for huge menus, but starting with 200 limit or searching)
            // The existing endpoint supports search. For now, let's fetch a reasonable batch or default.
            // Since we want "Add Items" to potentially show everything, we might need a "Load More" or search-driven.
            // For now, let's fetch page 1 with a large size to see what we get.
            const [itemsResponse, lookupsResponse] = await Promise.all([
              menuItemService.getMenuItems(brandId, { 
                  pageSize: 1000, // Attempt to get many
                  includeDisabled: true 
              }),
              menuItemService.getLookups(brandId)
            ]);
            
            setItems(itemsResponse.items);
            setCategories(lookupsResponse.categories);
        } catch (error) {
            console.error(error);
            notifications.show({ color: 'red', message: 'Failed to load menu items.' });
        } finally {
            setLoading(false);
        }
    }, [brandId]);

    useEffect(() => {
        if (opened && brandId) {
            loadItems();
            setSelectedIds(new Set()); // Reset selection on open
            setSearch('');
            setCategoryFilter(null);
        }
    }, [opened, brandId, loadItems]);

    const filteredItems = useMemo(() => {
        let filtered = items;
        if (search) {
            const term = search.toLowerCase();
            filtered = filtered.filter(i => 
                (i.itemName || '').toLowerCase().includes(term) ||
                (i.itemCode || '').toLowerCase().includes(term)
            );
        }
        if (categoryFilter) {
            filtered = filtered.filter(i => String(i.categoryId) === categoryFilter);
        }
        // Filter out already assigned items? Or show them disabled?
        // User requirement: "Select from existing items"
        // Usually better to hide already assigned ones to avoid confusion, or show disabled.
        return filtered.filter(i => !existingItemIds.has(i.itemId));
    }, [items, search, categoryFilter, existingItemIds]);

    const handleToggle = (itemId: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!brandId) return;
        setSubmitting(true);
        try {
            const newItems = items.filter(i => selectedIds.has(i.itemId));
            
            // Calculate new indices starting after the last existing item
            const maxIndex = currentItems.length > 0 
                ? Math.max(...currentItems.map(i => i.displayIndex)) 
                : 0;

            const newAssignments: SmartCategoryItemAssignmentEntry[] = newItems.map((item, index) => ({
                itemId: item.itemId,
                displayIndex: maxIndex + index + 1,
                enabled: true // Default to enabled
            }));

            // Merge with existing items
            const existingAssignments: SmartCategoryItemAssignmentEntry[] = currentItems.map(i => ({
                itemId: i.itemId,
                displayIndex: i.displayIndex,
                enabled: i.enabled
            }));

            const payload = [...existingAssignments, ...newAssignments];

            await smartCategoryService.upsertItems(brandId, smartCategoryId, { items: payload });
            
            notifications.show({ color: 'green', message: `${newItems.length} items added.` });
            onSuccess();
        } catch (error) {
            console.error(error);
            notifications.show({ color: 'red', message: 'Failed to add items.' });
        } finally {
            setSubmitting(false);
        }
    };

    const categoryOptions = useMemo(() => 
        categories.map(c => ({ value: String(c.categoryId), label: c.categoryName })),
        [categories]
    );

    return (
        <Modal opened={opened} onClose={onClose} title="Add items to smart category" size="lg">
            <Stack gap="md" style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
                <Group grow>
                  <TextInput
                      placeholder="Search by name or code..."
                      leftSection={<IconSearch size={16} />}
                      value={search}
                      onChange={(e) => setSearch(e.currentTarget.value)}
                  />
                  <Select
                    placeholder="Filter by category"
                    data={categoryOptions}
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    searchable
                    clearable
                  />
                </Group>
                
                <Box style={{ flex: 1, minHeight: 0, border: '1px solid var(--mantine-color-gray-3)', borderRadius: 4 }}>
                    {loading ? (
                        <Center h="100%"><Loader /></Center>
                    ) : (
                        <ScrollArea h="100%">
                            <Stack gap={0}>
                                {filteredItems.length === 0 ? (
                                    <Center p="xl">
                                        <Text c="dimmed">No matching items found.</Text>
                                    </Center>
                                ) : (
                                    filteredItems.map(item => (
                                        <Box 
                                            key={item.itemId} 
                                            p="sm"
                                            style={{ 
                                                borderBottom: '1px solid var(--mantine-color-gray-2)',
                                                cursor: 'pointer',
                                                backgroundColor: selectedIds.has(item.itemId) ? 'var(--mantine-color-blue-0)' : undefined
                                            }}
                                            onClick={() => handleToggle(item.itemId)}
                                        >
                                            <Group>
                                                <Checkbox 
                                                    checked={selectedIds.has(item.itemId)} 
                                                    readOnly
                                                    style={{ pointerEvents: 'none' }} 
                                                />
                                                <Stack gap={2}>
                                                    <Text size="sm" fw={500}>{item.itemName}</Text>
                                                    <Text size="xs" c="dimmed">{item.itemCode}</Text>
                                                </Stack>
                                            </Group>
                                        </Box>
                                    ))
                                )}
                            </Stack>
                        </ScrollArea>
                    )}
                </Box>

                <Group justify="space-between">
                    <Text size="sm" c="dimmed">{selectedIds.size} items selected</Text>
                    <Group>
                        <Button variant="default" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSubmit} loading={submitting} disabled={selectedIds.size === 0}>
                            Add Selected
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </Modal>
    );
};
