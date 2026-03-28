import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { FC } from 'react';
import {
  Box,
  Paper,
  Group,
  Button,
  TextInput,
  Modal,
  Stack,
  Text,
  Alert,
  ActionIcon,
  Badge,
  Loader,
  Center,
  Switch,
  Select,
  Tooltip,
  Popover,
  ScrollArea,
  Divider,
  Checkbox
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconChevronRight,
  IconChevronDown,
  IconSearch,
  IconArrowsSort,
  IconColumns,
  IconX,
  IconChevronLeft,
  IconList,
  IconCheck,
  IconSortAscending,
  IconSortDescending
} from '@tabler/icons-react';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';

import { DataTable } from '../../../components/DataTable';
import { MenuCategoriesReorderModal } from './menu-categories/MenuCategoriesReorderModal';

import { useBrands } from '../../../contexts/BrandContext';
import itemCategoryService from '../../../services/itemCategoryService';
import buttonStyleService from '../../../services/buttonStyleService';
import type { CategoryItem, CreateItemCategory, UpdateItemCategory } from '../../../types/itemCategory';
import type { ButtonStyle } from '../../../types/buttonStyle';

interface CategoryTreeNode extends CategoryItem {
  children: CategoryTreeNode[];
  level: number;
}

const PAGE_SIZE = 50;

type CategoryColumnDef = ColumnDef<CategoryTreeNode> & { accessorKey?: string | number };

const getColumnId = (column: CategoryColumnDef): string => {
  if (typeof column.accessorKey === 'string' || typeof column.accessorKey === 'number') {
    return column.accessorKey.toString();
  }
  return column.id ?? '';
};

const getColumnLabel = (column: CategoryColumnDef): string => {
  if (typeof column.header === 'string') {
    return column.header;
  }
  return getColumnId(column) || 'Column';
};

const MenuCategoriesPage: FC = () => {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);
  
  const [filterText, setFilterText] = useState('');
  const [searchPopoverOpened, setSearchPopoverOpened] = useState(false);
  const isSearchActive = searchPopoverOpened || Boolean(filterText);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Columns toggle state
  const [columnMenuOpened, setColumnMenuOpened] = useState(false);
  const [columnSearch, setColumnSearch] = useState('');
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    categoryNameAlt: false
  });
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'displayIndex' | 'categoryId' | 'categoryName'>('displayIndex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortPopoverOpened, setSortPopoverOpened] = useState(false);
  
  // Reorder State
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderParentId, setReorderParentId] = useState<string | null | 'ROOT'>('ROOT');
  const [savingOrder, setSavingOrder] = useState(false);
  const [reorderStack, setReorderStack] = useState<{ parentId: string | null | 'ROOT'; name: string }[]>([]);

  // Reordering Modal Data
  const reorderCategoriesList = useMemo(() => {
    const parentId = reorderParentId === 'ROOT' ? null : reorderParentId;
    return categories
      .filter(c => (c.parentUniqueId ?? null) === parentId)
      .sort((a, b) => a.displayIndex - b.displayIndex);
  }, [categories, reorderParentId]);

  const reorderExpandableIds = useMemo(() => {
    const ids = new Set<number>();
    for (const c of categories) {
      if (c.parentCategoryId) ids.add(c.parentCategoryId);
    }
    return ids;
  }, [categories]);

  const reorderBreadcrumb = useMemo(() =>
    reorderStack.map(s => ({ id: typeof s.parentId === 'string' ? 0 : (s.parentId ?? 0), name: s.name })),
  [reorderStack]);

  const reorderCategoryName = useMemo(() => {
    if (reorderParentId === 'ROOT') return 'Root Categories';
    return categories.find(c => c.uniqueId === reorderParentId)?.categoryName || 'Sub-categories';
  }, [reorderParentId, categories]);

  const handleReorderDrillDown = (categoryId: number) => {
    const cat = categories.find(c => c.categoryId === categoryId);
    if (!cat) return;
    setReorderStack(prev => [...prev, {
      parentId: reorderParentId,
      name: reorderParentId === 'ROOT' ? 'Root' : (categories.find(c => c.uniqueId === reorderParentId)?.categoryName ?? 'Parent'),
    }]);
    setReorderParentId(cat.uniqueId);
  };

  const handleReorderBreadcrumbClick = (index: number) => {
    const target = reorderStack[index];
    setReorderStack(prev => prev.slice(0, index));
    setReorderParentId(target.parentId);
  };

  const [formData, setFormData] = useState<CreateItemCategory>({
    categoryName: '',
    categoryNameAlt: '',
    displayIndex: 0,
    isTerminal: true,
    isPublicDisplay: true,
    isModifier: false,
    isSelfOrderingDisplay: true,
    isOnlineStoreDisplay: true
  });
  
  const [buttonStyles, setButtonStyles] = useState<ButtonStyle[]>([]);
  const [loadingButtonStyles, setLoadingButtonStyles] = useState(false);

  const { selectedBrand } = useBrands();
  const selectedBrandId = selectedBrand ? parseInt(selectedBrand) : null;

  const fetchCategories = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoading(true);
    try {
      const itemCats = await itemCategoryService.getItemCategories(selectedBrandId);
      setCategories((itemCats || []).map(c => ({
        ...c,
        uniqueId: `real_${c.categoryId}`,
        isSmartCategory: false,
        parentUniqueId: c.parentCategoryId ? `real_${c.parentCategoryId}` : null,
      })));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      notifications.show({ title: 'Error', message: 'Failed to load categories', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [selectedBrandId]);

  const fetchButtonStyles = useCallback(async () => {
    if (!selectedBrandId) return;
    setLoadingButtonStyles(true);
    try {
      const data = await buttonStyleService.getButtonStyles(selectedBrandId);
      setButtonStyles(data || []);
    } catch (error) {
      console.error('Failed to fetch button styles:', error);
    } finally {
      setLoadingButtonStyles(false);
    }
  }, [selectedBrandId]);

  useEffect(() => {
    if (selectedBrandId) {
      fetchCategories();
      fetchButtonStyles();
    }
  }, [selectedBrandId, fetchCategories, fetchButtonStyles]);

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

  const openCreateCategoryModal = useCallback((overrides: Partial<CreateItemCategory> = {}) => {
    setSelectedCategory(null);
    setFormData({
      categoryName: '',
      categoryNameAlt: '',
      displayIndex: categories.length,
      isTerminal: true,
      isPublicDisplay: true,
      isModifier: false,
      isSelfOrderingDisplay: true,
      isOnlineStoreDisplay: true,
      ...overrides
    });
    setDialogOpen(true);
  }, [categories.length]);

  const handleAddReal = () => openCreateCategoryModal();

  const handleAddChild = useCallback((parentCategory: CategoryItem) => {
    const siblingCount = categories.filter(cat => cat.parentUniqueId === parentCategory.uniqueId).length;
    openCreateCategoryModal({
      parentCategoryId: parentCategory.categoryId,
      displayIndex: siblingCount
    });
  }, [categories, openCreateCategoryModal]);

  const handleEdit = useCallback((category: CategoryItem) => {
    setSelectedCategory(category);
    setFormData({
      categoryName: category.categoryName,
      categoryNameAlt: category.categoryNameAlt,
      displayIndex: category.displayIndex,
      parentCategoryId: category.parentCategoryId, // Note: For Smart Categories, this maps to parentSmartCategoryId in save
      isTerminal: category.isTerminal,
      isPublicDisplay: category.isPublicDisplay,
      buttonStyleId: category.buttonStyleId,
      printerName: category.printerName,
      isModifier: category.isModifier,
      enabled: category.enabled,
      categoryTypeId: category.categoryTypeId,
      imageFileName: category.imageFileName,
      isSelfOrderingDisplay: category.isSelfOrderingDisplay,
      isOnlineStoreDisplay: category.isOnlineStoreDisplay,
      categoryCode: category.categoryCode
    });
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((category: CategoryItem) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  }, []);

  const handleSave = async () => {
    if (!selectedBrandId) return;
    setSaving(true);
    try {
      if (selectedCategory) {
        await itemCategoryService.updateItemCategory(selectedBrandId, selectedCategory.categoryId, formData as UpdateItemCategory);
        setCategories(prev => prev.map(cat => cat.uniqueId === selectedCategory.uniqueId ? { ...cat, ...formData } : cat));
        notifications.show({ title: 'Success', message: 'Category updated successfully', color: 'green' });
      } else {
        const createdCategory = await itemCategoryService.createItemCategory(selectedBrandId, { ...formData, enabled: true });
        setCategories(prev => [...prev, {
            ...createdCategory,
            uniqueId: `real_${createdCategory.categoryId}`,
            isSmartCategory: false,
            parentUniqueId: createdCategory.parentCategoryId ? `real_${createdCategory.parentCategoryId}` : null,
        }]);
        notifications.show({ title: 'Success', message: 'Category created successfully', color: 'green' });
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
      notifications.show({ title: 'Error', message: 'Failed to save category', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedBrandId || !selectedCategory) return;
    setDeleting(true);
    try {
      await itemCategoryService.deleteItemCategory(selectedBrandId, selectedCategory.categoryId);
      setCategories(prev => prev.filter(cat => cat.uniqueId !== selectedCategory.uniqueId));
      notifications.show({ title: 'Success', message: 'Category deleted successfully', color: 'green' });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete:', error);
      notifications.show({ title: 'Error', message: 'Failed to delete category', color: 'red' });
    } finally {
      setDeleting(false);
    }
  };

  const toggleExpand = useCallback((uniqueId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(uniqueId)) next.delete(uniqueId);
      else next.add(uniqueId);
      return next;
    });
  }, []);

  // Tree Building
  const categoryTree = useMemo(() => {
    const buildTree = (parentUniqueId: string | null | undefined, level: number = 0): CategoryTreeNode[] => {
      return categories
        .filter(cat => (cat.parentUniqueId ?? null) === (parentUniqueId ?? null))
        .sort((a, b) => {
          let comparison = 0;
          if (sortBy === 'categoryId') comparison = a.categoryId - b.categoryId;
          else if (sortBy === 'categoryName') comparison = a.categoryName.localeCompare(b.categoryName);
          else comparison = a.displayIndex - b.displayIndex;
          return sortDirection === 'asc' ? comparison : -comparison;
        })
        .map(cat => ({
          ...cat,
          level,
          children: buildTree(cat.uniqueId, level + 1)
        }));
    };
    return buildTree(null);
  }, [categories, sortBy, sortDirection]);

  const flattenedTree = useMemo(() => {
    const nodeMatchesFilter = (node: CategoryTreeNode, searchText: string): boolean => {
      if (!searchText) return true;
      const lower = searchText.toLowerCase();
      if (node.categoryName.toLowerCase().includes(lower) || node.categoryId.toString().includes(searchText)) return true;
      return node.children.some(child => nodeMatchesFilter(child, searchText));
    };

    const flatten = (nodes: CategoryTreeNode[], result: CategoryTreeNode[] = []): CategoryTreeNode[] => {
      for (const node of nodes) {
        if (nodeMatchesFilter(node, filterText)) {
          result.push(node);
          if (expandedCategories.has(node.uniqueId) && node.children.length > 0) {
            flatten(node.children, result);
          }
        }
      }
      return result;
    };
    return flatten(categoryTree);
  }, [categoryTree, expandedCategories, filterText]);

  // Pagination Logic exactly like Items
  const totalItems = flattenedTree.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pagedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return flattenedTree.slice(start, start + PAGE_SIZE);
  }, [flattenedTree, page]);

  useEffect(() => {
    setPage((prev) => {
      if (prev > totalPages) return totalPages;
      return prev;
    });
  }, [totalPages]);

  const goToPreviousPage = useCallback(() => setPage((prev) => Math.max(1, prev - 1)), []);
  const goToNextPage = useCallback(() => setPage((prev) => Math.min(totalPages, prev + 1)), [totalPages]);
  const handlePageSelect = useCallback((value: string | null) => {
    if (!value) return;
    const nextPage = Number(value);
    if (!Number.isNaN(nextPage)) setPage(nextPage);
  }, []);

  const pageOptions = useMemo(() => {
    return Array.from({ length: totalPages }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    }));
  }, [totalPages]);

  // Auto-expand on search
  useEffect(() => {
    if (filterText) {
      const toExpand = new Set<string>();
      const hasMatchingDescendant = (node: CategoryTreeNode): boolean => {
        const lower = filterText.toLowerCase();
        const childMatches = node.children.some(c => c.categoryName.toLowerCase().includes(lower) || c.categoryId.toString().includes(filterText));
        if (childMatches) {
          toExpand.add(node.uniqueId);
          return true;
        }
        return node.children.some(c => {
          if (hasMatchingDescendant(c)) {
            toExpand.add(node.uniqueId);
            return true;
          }
          return false;
        });
      };
      categoryTree.forEach(node => hasMatchingDescendant(node));
      setExpandedCategories(toExpand);
      setPage(1);
    }
  }, [filterText, categoryTree]);

  // Styling Helpers
  const getButtonStyleColor = useCallback((style: ButtonStyle) => {
    let color = style.backgroundColorTop || style.backgroundColorMiddle || style.backgroundColorBottom || '#E0E0E0';
    if (color.length === 9 && color.startsWith('#')) color = '#' + color.substring(3);
    return color;
  }, []);

  const getButtonStyleById = useCallback((id?: number) => buttonStyles.find(s => s.buttonStyleId === id), [buttonStyles]);

  const getAvailableParents = (excludeId?: string): CategoryItem[] => {
    const isEditingSmart = selectedCategory?.isSmartCategory ?? false;
    const sameTypeCategories = categories.filter(c => c.isSmartCategory === isEditingSmart);
    
    if (!excludeId) return sameTypeCategories;
    
    const descendants = new Set<string>();
    const findDescendants = (id: string) => {
      descendants.add(id);
      categories.filter(c => c.parentUniqueId === id).forEach(child => findDescendants(child.uniqueId));
    };
    findDescendants(excludeId);
    return sameTypeCategories.filter(c => !descendants.has(c.uniqueId) && c.uniqueId !== excludeId);
  };



  const handleSaveReorder = async (orderedCategories: CategoryItem[]) => {
    if (!selectedBrandId) return;
    setSavingOrder(true);
    try {
      const payload = orderedCategories.map((c, i) => ({
         ...c,
         displayIndex: i * 10
      }));
      
      await Promise.all(
        payload.map(category =>
          itemCategoryService.updateItemCategory(selectedBrandId, category.categoryId, category)
        )
      );

      // We should fully fetch to refresh tree cleanly given complex state
      await fetchCategories();

      notifications.show({ title: 'Success', message: 'Display order updated!', color: 'green' });
      setReorderModalOpen(false);
    } catch (e) {
      console.error(e);
      notifications.show({ title: 'Error', message: 'Failed to update order', color: 'red' });
    } finally {
      setSavingOrder(false);
    }
  };

  const maxLevel = useMemo(() => Math.max(0, ...flattenedTree.map(cat => cat.level)), [flattenedTree]);

  // DataTable Columns definition
  const columns = useMemo<ColumnDef<CategoryTreeNode>[]>(() => [
    {
      id: 'expand',
      header: '',
      size: maxLevel > 0 ? maxLevel * 24 + 40 : 50,
      enableResizing: false,
      cell: ({ row }) => {
        const cat = row.original;
        
        return (
          <Box style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 28 }}>
            {/* Hierarchy vertical lines for each ancestor level */}
            {Array.from({ length: cat.level }).map((_, idx) => (
              <Box
                key={idx}
                style={{
                  position: 'absolute',
                  left: idx * 24 + 13, // align center to typical 26px action icon width 
                  top: -24, // stretch up to overflow cell padding
                  bottom: -24, // stretch down to overflow cell padding
                  width: 2,
                  backgroundColor: 'var(--mantine-color-blue-filled, #228be6)',
                  zIndex: 0
                }}
              />
            ))}
            
            <Box style={{ paddingLeft: cat.level * 24, zIndex: 1, display: 'flex' }}>
              {cat.children.length > 0 && (
                <ActionIcon variant="subtle" size="sm" onClick={() => toggleExpand(cat.uniqueId)} color="blue" style={{ backgroundColor: 'var(--mantine-color-body, white)' }}>
                  {expandedCategories.has(cat.uniqueId) ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </ActionIcon>
              )}
            </Box>
          </Box>
        );
      }
    },
    {
      accessorKey: 'categoryId',
      header: 'ID',
      size: 80,
      cell: ({ row }) => <Text size="sm" fw={600}>{row.original.categoryId}</Text>
    },
    {
      accessorKey: 'categoryName',
      header: 'Category Name',
      size: 250,
      cell: ({ row }) => {
        return (
          <Group gap="xs" wrap="nowrap">
            <Text fw={500} size="sm" truncate="end">{row.original.categoryName}</Text>
            {row.original.isSmartCategory && (
              <Badge size="xs" variant="light" color="cyan" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                SMART
              </Badge>
            )}
          </Group>
        );
      }
    },
    {
      accessorKey: 'categoryNameAlt',
      header: 'Alternative Name',
      size: 200,
      cell: ({ row }) => {
        return <Text size="sm" truncate="end" c="dimmed">{row.original.categoryNameAlt || '—'}</Text>;
      }
    },
    {
      accessorKey: 'displayIndex',
      header: 'Display Index',
      size: 140,
      cell: ({ row }) => <Badge variant="light" color="blue">{row.original.displayIndex}</Badge>
    },
    {
      id: 'buttonStyle',
      header: 'Style',
      size: 100,
      cell: ({ row }) => {
        const style = getButtonStyleById(row.original.buttonStyleId);
        if (!style) {
          return <Box style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: '#E0E0E0', border: '1px dashed #999' }} />;
        }
        return <Box style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: getButtonStyleColor(style), border: '1px solid rgba(0,0,0,0.1)' }} title={style.styleName} />;
      }
    },
    {
      accessorKey: 'isPublicDisplay',
      header: 'Visibility',
      size: 120,
      cell: ({ row }) => (
        <Badge variant="light" color={row.original.isPublicDisplay ? 'green' : 'gray'}>
          {row.original.isPublicDisplay ? 'Visible' : 'Hidden'}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 180,
      enableResizing: false,
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Tooltip label="Add child category" withArrow position="top">
              <ActionIcon variant="subtle" color="green" onClick={() => handleAddChild(cat)}>
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit category" withArrow position="top">
              <ActionIcon variant="subtle" color="blue" onClick={() => handleEdit(cat)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            {cat.children.length > 0 && (
              <Tooltip label="Reorder children" withArrow position="top">
                <ActionIcon variant="subtle" color="indigo" onClick={() => { setReorderParentId(cat.uniqueId); setReorderStack([]); setReorderModalOpen(true); }}>
                  <IconArrowsSort size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Delete category" withArrow position="top">
              <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(cat)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        );
      }
    }
  ], [expandedCategories, toggleExpand, getButtonStyleById, getButtonStyleColor, handleAddChild, handleEdit, handleDelete, maxLevel]);

  // Column Toggle Logic
  const toggleableColumns = useMemo(() => columns.filter(c => c.id !== 'actions' && c.id !== 'expand'), [columns]);
  const filteredToggleColumns = useMemo(() => {
    if (!columnSearch) return toggleableColumns;
    return toggleableColumns.filter(c => getColumnLabel(c).toLowerCase().includes(columnSearch.toLowerCase()));
  }, [toggleableColumns, columnSearch]);

  const toggleColumnVisibility = useCallback((colId: string, isVisible: boolean) => {
    setColumnVisibility(prev => ({ ...prev, [colId]: isVisible }));
  }, []);

  const handleToggleAllColumns = useCallback((isVisible: boolean) => {
    setColumnVisibility(prev => {
      const next = { ...prev };
      toggleableColumns.forEach(c => {
        const id = getColumnId(c);
        if (id) next[id] = isVisible;
      });
      return next;
    });
  }, [toggleableColumns]);

  const anyToggleColumnsSelected = toggleableColumns.some(c => columnVisibility[getColumnId(c)] !== false);
  const allToggleColumnsSelected = toggleableColumns.every(c => columnVisibility[getColumnId(c)] !== false);

  if (!selectedBrand) {
    return (
      <Box p="md">
        <Alert icon={<IconAlertCircle size={16} />} title="Brand Selection Required" color="blue">
          Please select a brand to manage menu categories.
        </Alert>
      </Box>
    );
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <Box style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Stack gap={0} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          
          <Paper shadow="none" p="md" style={{ flexShrink: 0, borderBottom: '1px solid #dee2e6' }}>
            <Box mb="sm">
              <Text size="xl" fw={700}>Menu Categories</Text>
            </Box>
            <Group justify="space-between" align="center" gap="md" wrap="wrap">
              <Group gap="xs" wrap="wrap">
                {/* Search Popover */}
                <Popover opened={searchPopoverOpened} onChange={setSearchPopoverOpened} withinPortal={false} position="bottom-start" shadow="md">
                  <Popover.Target>
                    <Tooltip label="Search" withArrow>
                      <ActionIcon variant={isSearchActive ? 'filled' : 'light'} color={isSearchActive ? 'indigo' : 'gray'} size="lg" aria-label="Search categories" onClick={() => setSearchPopoverOpened((prev) => !prev)}>
                        <IconSearch size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Popover.Target>
                  <Popover.Dropdown>
                    <TextInput ref={searchInputRef} placeholder="Search by name or ID" value={filterText} onChange={(e) => setFilterText(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Escape') setSearchPopoverOpened(false); }} rightSection={filterText ? (<ActionIcon variant="subtle" color="gray" size="sm" onClick={() => setFilterText('')}><IconX size={14} /></ActionIcon>) : undefined} />
                  </Popover.Dropdown>
                </Popover>

                {/* Sort Popover */}
                <Popover opened={sortPopoverOpened} onChange={setSortPopoverOpened} withinPortal={false} position="bottom-start" shadow="md">
                  <Popover.Target>
                    <Tooltip label="Sort by" withArrow>
                      <ActionIcon variant={sortPopoverOpened ? 'filled' : 'light'} color={sortPopoverOpened ? 'indigo' : 'gray'} size="lg" onClick={() => setSortPopoverOpened((prev) => !prev)}>
                        <IconList size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Popover.Target>
                  <Popover.Dropdown p="xs" w={220}>
                    <Stack gap="xs">
                      <Text size="xs" fw={600} c="dimmed">Sort by</Text>
                      <Stack gap={6}>
                        {[
                          { label: 'Display order', value: 'displayIndex' },
                          { label: 'Category ID', value: 'categoryId' },
                          { label: 'Name', value: 'categoryName' }
                        ].map((option) => (
                          <Button key={option.value} variant={sortBy === option.value ? 'filled' : 'subtle'} color={sortBy === option.value ? 'indigo' : 'gray'} size="xs" radius="md" rightSection={sortBy === option.value ? <IconCheck size={14} /> : undefined} onClick={() => { setSortBy(option.value as 'displayIndex' | 'categoryId' | 'categoryName'); setSortPopoverOpened(false); setPage(1); }}>
                            {option.label}
                          </Button>
                        ))}
                      </Stack>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>

                {/* Columns Popover */}
                <Popover opened={columnMenuOpened} onChange={setColumnMenuOpened} withinPortal={false} position="bottom-start" shadow="md">
                  <Popover.Target>
                    <Tooltip label="Toggle columns" withArrow>
                      <ActionIcon variant={columnMenuOpened ? 'filled' : 'light'} color={columnMenuOpened ? 'indigo' : 'gray'} size="lg" onClick={() => setColumnMenuOpened((prev) => !prev)}>
                        <IconColumns size={16} />
                      </ActionIcon>
                    </Tooltip>
                  </Popover.Target>
                  <Popover.Dropdown p="sm" style={{ minWidth: 240 }}>
                    <Stack gap="xs">
                      <Group justify="space-between" align="center">
                        <Text size="sm" fw={600}>Columns</Text>
                        <Button variant="subtle" color="gray" size="xs" onClick={() => handleToggleAllColumns(false)} disabled={!anyToggleColumnsSelected}>Deselect all</Button>
                      </Group>
                      <TextInput placeholder="Search..." value={columnSearch} onChange={(e) => setColumnSearch(e.currentTarget.value)} size="xs" leftSection={<IconSearch size={14} />} />
                      <Divider />
                      <ScrollArea.Autosize mah={220} type="auto">
                        <Stack gap={4}>
                          {filteredToggleColumns.length === 0 ? (
                            <Text size="xs" c="dimmed">No matching columns</Text>
                          ) : (
                            filteredToggleColumns.map((col) => {
                              const id = getColumnId(col);
                              const label = getColumnLabel(col);
                              if (!id) return null;
                              return (
                                <Checkbox key={id} label={label} checked={columnVisibility[id] !== false} onChange={(e) => toggleColumnVisibility(id, e.currentTarget.checked)} />
                              );
                            })
                          )}
                        </Stack>
                      </ScrollArea.Autosize>
                      <Divider />
                      <Group justify="space-between">
                        <Button variant="light" size="xs" onClick={() => handleToggleAllColumns(true)} disabled={toggleableColumns.length === 0 || allToggleColumnsSelected}>Select all</Button>
                        <Button variant="outline" size="xs" color="gray" onClick={() => setColumnMenuOpened(false)}>Close</Button>
                      </Group>
                    </Stack>
                  </Popover.Dropdown>
                </Popover>
                <Tooltip label={sortDirection === 'asc' ? 'Ascending' : 'Descending'} withArrow>
                  <ActionIcon variant="light" color="indigo" size="lg" onClick={() => { setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc')); setPage(1); }}>
                    {sortDirection === 'asc' ? <IconSortAscending size={18} /> : <IconSortDescending size={18} />}
                  </ActionIcon>
                </Tooltip>

                <Button variant="outline" size="sm" leftSection={<IconArrowsSort size={16} />} onClick={() => { setReorderParentId('ROOT'); setReorderStack([]); setReorderModalOpen(true); }}>
                  Reorder categories
                </Button>
                <Button size="sm" leftSection={<IconPlus size={16} />} onClick={handleAddReal}>
                  New category
                </Button>
              </Group>

              {/* Pagination Controls */}
              <Group gap="sm" align="center">
                <Text size="xs" c="dimmed">{totalItems} rows</Text>
                <Group gap="xs" align="center">
                  <ActionIcon variant="subtle" size="lg" onClick={goToPreviousPage} disabled={loading || page <= 1}>
                    <IconChevronLeft size={16} />
                  </ActionIcon>
                  <Select value={String(page)} onChange={handlePageSelect} data={pageOptions} w={80} disabled={loading || totalPages <= 1} />
                  <ActionIcon variant="subtle" size="lg" onClick={goToNextPage} disabled={loading || page >= totalPages}>
                    <IconChevronRight size={16} />
                  </ActionIcon>
                </Group>
              </Group>
            </Group>
          </Paper>

          <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
            <Paper shadow="none" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <DataTable<CategoryTreeNode>
                data={pagedData}
                columns={columns}
                loading={loading}
                emptyMessage={filterText ? 'No categories match your search.' : 'No categories found. Create your first category!'}
                enableSearch={false}
                hideFooter={true}
                manualPagination={true}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                actionColumnId="actions"
              />
            </Paper>
          </Box>
        </Stack>
      </Box>

      {/* Add/Edit Modal */}
      <Modal opened={dialogOpen} onClose={() => setDialogOpen(false)} title={selectedCategory ? 'Edit Category' : 'Create New Category'} size="lg">
        <Stack gap="md">
          <TextInput label="Category Name" placeholder="e.g., Appetizers" value={formData.categoryName} onChange={(e) => setFormData({ ...formData, categoryName: e.currentTarget.value })} required />
          <TextInput label="Alternative Name (Optional)" placeholder="e.g., 前菜" value={formData.categoryNameAlt || ''} onChange={(e) => setFormData({ ...formData, categoryNameAlt: e.currentTarget.value })} />
          <Select
            label="Parent Category (Optional)"
            description={selectedCategory ? "Cannot select this category or its children" : "Leave empty to create a root-level category"}
            placeholder="Select parent category or leave empty for root"
            value={formData.parentCategoryId?.toString() || null}
            onChange={(value) => setFormData({ ...formData, parentCategoryId: value ? parseInt(value) : undefined })}
            data={getAvailableParents(selectedCategory?.uniqueId).map(cat => ({ value: cat.categoryId.toString(), label: cat.categoryName }))}
            clearable searchable
          />
          <TextInput label="Display Order" type="number" value={formData.displayIndex} onChange={(e) => setFormData({ ...formData, displayIndex: parseInt(e.currentTarget.value) || 0 })} />
          <Box>
             <Text size="sm" fw={500} mb={8}>Button Style</Text>
             <Text size="xs" c="dimmed" mb={12}>Select a style for the category button appearance</Text>
             {loadingButtonStyles ? (
               <Center py="lg"><Loader size="sm" /></Center>
             ) : (
               <Box style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', border: '1px solid #E3E8EE', borderRadius: '8px', backgroundColor: '#F8F9FA' }}>
                 <Box onClick={() => setFormData({ ...formData, buttonStyleId: undefined })} style={{ cursor: 'pointer', textAlign: 'center', padding: '8px', borderRadius: '8px', border: formData.buttonStyleId === undefined ? '2px solid #5469D4' : '2px solid transparent', transition: 'all 0.2s ease' }}>
                   <Box style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E0E0E0', border: '2px dashed #999', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text size="xs" c="dimmed">None</Text></Box>
                   <Text size="xs" mt={4}>Default</Text>
                 </Box>
                 {buttonStyles.map((style) => (
                   <Box key={style.buttonStyleId} onClick={() => setFormData({ ...formData, buttonStyleId: style.buttonStyleId })} style={{ cursor: 'pointer', textAlign: 'center', padding: '8px', borderRadius: '8px', border: formData.buttonStyleId === style.buttonStyleId ? '2px solid #5469D4' : '2px solid transparent', transition: 'all 0.2s ease' }}>
                     <Box style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: getButtonStyleColor(style), border: '1px solid rgba(0,0,0,0.1)', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                     <Text size="xs" mt={4} lineClamp={2} style={{ maxWidth: '64px' }}>{style.styleName}</Text>
                   </Box>
                 ))}
               </Box>
             )}
          </Box>
          <Switch label="Visible in Menu" description="Show this category in POS and online ordering" checked={formData.isPublicDisplay} onChange={(e) => setFormData({ ...formData, isPublicDisplay: e.currentTarget.checked })} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.categoryName.trim() || saving} loading={saving} color="green">{selectedCategory ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} title="Confirm Delete" size="sm">
        <Text mb="lg">Are you sure you want to delete the category "{selectedCategory?.categoryName}"? This action cannot be undone.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button color="red" onClick={confirmDelete} loading={deleting} disabled={deleting}>Delete</Button>
        </Group>
      </Modal>

      <MenuCategoriesReorderModal
        opened={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        categoryName={reorderCategoryName}
        categories={reorderCategoriesList}
        loading={false}
        saving={savingOrder}
        onSave={handleSaveReorder}
        expandableIds={reorderExpandableIds}
        onDrillDown={handleReorderDrillDown}
        breadcrumb={reorderBreadcrumb}
        onBreadcrumbClick={handleReorderBreadcrumbClick}
      />
    </Box>
  );
};

export { MenuCategoriesPage };
