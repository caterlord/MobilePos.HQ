import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconChevronDown,
  IconChevronRight,
  IconDeviceFloppy,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useBrands } from '../../../../contexts/BrandContext';
import smartCategoryService from '../../../../services/smartCategoryService';
import { SmartCategoryItemsTab } from './SmartCategoryItemsTab';
import type {
  SmartCategoryDetail,
  LookupOptions,
  SmartCategoryTreeNode,
  SmartCategoryUpsertPayload,
  SmartCategoryShopSchedule,
  SmartCategoryOrderChannel,
} from '../../../../types/smartCategory';
import type { ButtonStyle } from '../../../../types/buttonStyle';

const FALLBACK_CATEGORY_NAME = 'Untitled smart category';
const FALLBACK_ITEM_MODIFIER = 'Unknown';

const formatCategoryName = (name?: string | null, id?: number) => {
  const trimmed = name?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return id ? `${FALLBACK_CATEGORY_NAME} (#${id})` : FALLBACK_CATEGORY_NAME;
};

const formatShopName = (name?: string | null, id?: number) => {
  const trimmed = name?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return id ? `Shop #${id}` : 'Unknown shop';
};

const formatOrderChannelName = (name?: string | null, id?: number) => {
  const trimmed = name?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return id ? `Order channel #${id}` : 'Order channel';
};

interface SmartCategoryFormState extends Omit<SmartCategoryUpsertPayload, 'displayIndex'> {
  displayIndex: number | '';
}

const buildInitialFormState = (
  lookups: LookupOptions | null,
  parentId?: number | null,
  displayIndexHint: number | '' = '',
): SmartCategoryFormState => ({
  name: '',
  nameAlt: '',
  parentSmartCategoryId: parentId ?? null,
  displayIndex: displayIndexHint,
  enabled: true,
  isTerminal: false,
  isPublicDisplay: true,
  buttonStyleId: lookups?.buttonStyles[0]?.buttonStyleId ?? 0,
  description: '',
  descriptionAlt: '',
  imageFileName: '',
  imageFileName2: '',
  imageFileName3: '',
  isSelfOrderingDisplay: null,
  isOnlineStoreDisplay: null,
  isOdoDisplay: null,
  isKioskDisplay: null,
  isTableOrderingDisplay: null,
  onlineStoreRefCategoryId: null,
  remark: '',
  remarkAlt: '',
});

const filterTree = (nodes: SmartCategoryTreeNode[], searchTerm: string): SmartCategoryTreeNode[] => {
  if (!searchTerm) {
    return nodes;
  }

  const lowerSearch = searchTerm.toLowerCase();

  const filterRecursive = (items: SmartCategoryTreeNode[]): SmartCategoryTreeNode[] => {
    return items
      .map((item) => {
        const matches = item.name.toLowerCase().includes(lowerSearch) || item.nameAlt?.toLowerCase().includes(lowerSearch);
        const filteredChildren = filterRecursive(item.children);
        if (matches || filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
          };
        }
        return null;
      })
      .filter((item): item is SmartCategoryTreeNode => item !== null);
  };

  return filterRecursive(nodes);
};

const flattenTree = (nodes: SmartCategoryTreeNode[]): Record<number, SmartCategoryTreeNode> => {
  const map: Record<number, SmartCategoryTreeNode> = {};
  const walk = (items: SmartCategoryTreeNode[]) => {
    items.forEach((item) => {
      map[item.smartCategoryId] = item;
      if (item.children.length > 0) {
        walk(item.children);
      }
    });
  };

  walk(nodes);
  return map;
};

const SmartCategoriesPage: FC = () => {
  const { selectedBrand } = useBrands();
  const brandId = selectedBrand ? parseInt(selectedBrand, 10) : null;
  const isDesktopLayout = useMediaQuery('(min-width: 62em)');

  const [lookups, setLookups] = useState<LookupOptions | null>(null);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const [tree, setTree] = useState<SmartCategoryTreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const selectedCategoryIdRef = useRef<number | null>(null);
  const [detail, setDetail] = useState<SmartCategoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [formState, setFormState] = useState<SmartCategoryFormState>(() => buildInitialFormState(null));
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [deleteConfirmOpened, { open: openDeleteConfirm, close: closeDeleteConfirm }] = useDisclosure(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const lookupsRequestRef = useRef<{ brandId: number | null; status: 'idle' | 'pending' | 'done' }>({
    brandId: null,
    status: 'idle',
  });
  const lookupsPromiseRef = useRef<Promise<LookupOptions> | null>(null);

  const treeLookup = useMemo(() => flattenTree(tree), [tree]);
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);

  const buttonStyleOptions: ButtonStyle[] = useMemo(() => {
    if (!lookups) return [];
    return lookups.buttonStyles;
  }, [lookups]);

  const getNextDisplayIndex = useCallback(
    (parentId?: number | null) => {
      if (typeof parentId === 'number' && treeLookup[parentId]) {
        return (treeLookup[parentId].children.length ?? 0) + 1;
      }

      return tree.length + 1;
    },
    [tree, treeLookup],
  );

  const ensureLookups = useCallback(async (): Promise<LookupOptions | null> => {
    if (!brandId) {
      return null;
    }

    const { brandId: currentBrand, status: currentStatus } = lookupsRequestRef.current;

    if (lookups && currentBrand === brandId && currentStatus === 'done') {
      return lookups;
    }

    if (lookupsPromiseRef.current) {
      try {
        return await lookupsPromiseRef.current;
      } catch {
        return null;
      }
    }

    lookupsRequestRef.current = {
      brandId,
      status: 'pending',
    };

    const promise = smartCategoryService.getLookups(brandId);
    lookupsPromiseRef.current = promise;
    setLookupsLoading(true);

    try {
      const result = await promise;
      setLookups(result);
      setFormState((prev) => ({
        ...prev,
        buttonStyleId: result.buttonStyles[0]?.buttonStyleId ?? prev.buttonStyleId,
      }));
      lookupsRequestRef.current = {
        brandId,
        status: 'done',
      };
      return result;
    } catch (error) {
      console.error(error);
      notifications.show({
        color: 'red',
        title: 'Failed to load lookups',
        message: 'Please try again.',
      });
      lookupsRequestRef.current = {
        brandId,
        status: 'idle',
      };
      return null;
    } finally {
      lookupsPromiseRef.current = null;
      setLookupsLoading(false);
    }
  }, [brandId, lookups]);

  const fetchDetail = useCallback(
    async (categoryId: number) => {
      if (!brandId) return;
      setDetailLoading(true);
      try {
        const data = await smartCategoryService.getDetail(brandId, categoryId);
        setDetail(data);
      } catch (error) {
        console.error(error);
        notifications.show({
          color: 'red',
          title: 'Failed to load smart category',
          message: 'Please try again.',
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [brandId],
  );

  const fetchTree = useCallback(async () => {
    if (!brandId) return;
    setTreeLoading(true);
    setTreeError(null);
    try {
      const data = await smartCategoryService.getTree(brandId);
      const activeCategoryId = selectedCategoryIdRef.current;

      if (activeCategoryId) {
        const nodeLookup = flattenTree(data);
        if (!nodeLookup[activeCategoryId]) {
          selectedCategoryIdRef.current = null;
          setSelectedCategoryId(null);
          setDetail(null);
        }
      }

      setTree(data);

      if (!selectedCategoryIdRef.current && data.length > 0) {
        const firstCategoryId = data[0].smartCategoryId;
        selectedCategoryIdRef.current = firstCategoryId;
        setSelectedCategoryId(firstCategoryId);
        fetchDetail(firstCategoryId);
      }
    } catch (error) {
      console.error(error);
      setTreeError('Unable to load smart categories.');
    } finally {
      setTreeLoading(false);
    }
  }, [brandId, fetchDetail]);

  useEffect(() => {
    selectedCategoryIdRef.current = null;
    setSelectedCategoryId(null);
    setDetail(null);

    if (!brandId) {
      setTree([]);
      setLookups(null);
      lookupsRequestRef.current = { brandId: null, status: 'idle' };
      lookupsPromiseRef.current = null;
      return;
    }

    if (lookupsRequestRef.current.brandId !== brandId) {
      lookupsRequestRef.current = { brandId, status: 'idle' };
      lookupsPromiseRef.current = null;
      setLookups(null);
    }

    fetchTree();
  }, [brandId, fetchTree]);

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      selectedCategoryIdRef.current = categoryId;
      setSelectedCategoryId(categoryId);
      fetchDetail(categoryId);
    },
    [fetchDetail],
  );

  const handleRefresh = useCallback(() => {
    fetchTree();
    if (selectedCategoryId) {
      fetchDetail(selectedCategoryId);
    }
  }, [fetchTree, fetchDetail, selectedCategoryId]);

  const handleDetailRefresh = useCallback(() => {
    if (selectedCategoryId) {
      fetchDetail(selectedCategoryId);
    }
  }, [fetchDetail, selectedCategoryId]);

  const toggleNode = useCallback((categoryId: number) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const openCreateModal = useCallback(
    async (parentId?: number | null) => {
      const loadedLookups = await ensureLookups();
      if (!loadedLookups) {
        return;
      }

      const displayIndexHint = getNextDisplayIndex(parentId);

      setFormMode('create');
      setFormState(buildInitialFormState(loadedLookups, parentId, displayIndexHint));
      openForm();
    },
    [ensureLookups, openForm, getNextDisplayIndex],
  );

  const openEditModal = useCallback(async () => {
    if (!detail) return;
    const loadedLookups = await ensureLookups();
    if (!loadedLookups) {
      return;
    }
    const { category } = detail;
    setFormMode('edit');
    setFormState({
      name: category.name ?? '',
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
      isSelfOrderingDisplay: category.isSelfOrderingDisplay ?? null,
      isOnlineStoreDisplay: category.isOnlineStoreDisplay ?? null,
      isOdoDisplay: category.isOdoDisplay ?? null,
      isKioskDisplay: category.isKioskDisplay ?? null,
      isTableOrderingDisplay: category.isTableOrderingDisplay ?? null,
      onlineStoreRefCategoryId: category.onlineStoreRefCategoryId ?? null,
      remark: category.remark ?? '',
      remarkAlt: category.remarkAlt ?? '',
    });
    openForm();
  }, [detail, ensureLookups, openForm]);

  const handleFormSubmit = useCallback(async () => {
    if (!brandId) return;

    if (!formState.name.trim()) {
      notifications.show({
        color: 'red',
        title: 'Name is required',
        message: 'Please enter a name for the smart category.',
      });
      return;
    }

    if (!formState.buttonStyleId) {
      notifications.show({
        color: 'red',
        title: 'Button style required',
        message: 'Please select a button style.',
      });
      return;
    }

    setFormSubmitting(true);

    const payload: SmartCategoryUpsertPayload = {
      ...formState,
      displayIndex: typeof formState.displayIndex === 'number' ? formState.displayIndex : 0,
    };

    try {
      if (formMode === 'create') {
        const response = await smartCategoryService.create(brandId, payload);
        const createdName = formatCategoryName(response.category.name, response.category.smartCategoryId);
        notifications.show({
          color: 'green',
          title: 'Smart category created',
          message: `${createdName} was created successfully.`,
        });
        closeForm();
        fetchTree();
        selectedCategoryIdRef.current = response.category.smartCategoryId;
        setSelectedCategoryId(response.category.smartCategoryId);
        setDetail(response);
      } else if (selectedCategoryId) {
        await smartCategoryService.update(brandId, selectedCategoryId, payload);
        const updatedName = formatCategoryName(formState.name, selectedCategoryId);
        notifications.show({
          color: 'green',
          title: 'Smart category updated',
          message: `${updatedName} was updated successfully.`,
        });
        closeForm();
        fetchTree();
        fetchDetail(selectedCategoryId);
      }
    } catch (error) {
      console.error(error);
      notifications.show({
        color: 'red',
        title: 'Save failed',
        message: 'Unable to save smart category. Please try again.',
      });
    } finally {
      setFormSubmitting(false);
    }
  }, [
    brandId,
    formState,
    formMode,
    selectedCategoryId,
    fetchTree,
    fetchDetail,
    closeForm,
  ]);

  const handleDelete = useCallback(async () => {
    if (!brandId || !selectedCategoryId || !detail) return;
    setDeleteSubmitting(true);
    try {
      await smartCategoryService.remove(brandId, selectedCategoryId);
      const deletedName = formatCategoryName(detail.category.name, detail.category.smartCategoryId);
      notifications.show({
        color: 'green',
        title: 'Smart category deleted',
        message: `${deletedName} was deleted.`,
      });
      closeDeleteConfirm();
      selectedCategoryIdRef.current = null;
      setSelectedCategoryId(null);
      setDetail(null);
      fetchTree();
    } catch (error) {
      console.error(error);
      notifications.show({
        color: 'red',
        title: 'Delete failed',
        message: 'Unable to delete smart category. Ensure it has no children or items assigned.',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  }, [brandId, selectedCategoryId, detail, closeDeleteConfirm, fetchTree]);

  const renderTree = useCallback(
    (nodes: SmartCategoryTreeNode[], depth = 0): React.ReactNode[] => {
      return nodes.flatMap((node) => {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedNodes.has(node.smartCategoryId) || !!search;
        const isSelected = node.smartCategoryId === selectedCategoryId;

        const row = (
          <Box key={`${node.smartCategoryId}-node`} pl={depth * 16}>
            <UnstyledTreeRow
              node={node}
              hasChildren={hasChildren}
              isExpanded={isExpanded}
              isSelected={isSelected}
              onToggle={() => toggleNode(node.smartCategoryId)}
              onSelect={() => handleSelectCategory(node.smartCategoryId)}
            />
          </Box>
        );

        if (hasChildren && isExpanded) {
          return [row, ...renderTree(node.children, depth + 1)];
        }

        return [row];
      });
    },
    [expandedNodes, handleSelectCategory, selectedCategoryId, toggleNode, search],
  );

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
        <Flex
          gap={isDesktopLayout ? 0 : 'var(--mantine-spacing-md)'}
          direction={isDesktopLayout ? 'row' : 'column'}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            paddingInline: isDesktopLayout ? 0 : 'var(--mantine-spacing-md)',
            paddingBlock: isDesktopLayout ? 0 : 'var(--mantine-spacing-md)',
          }}
        >
          {!isSidebarCollapsed && (
            <Box
              style={{
                width: isDesktopLayout ? 320 : '100%',
                flexShrink: isDesktopLayout ? 0 : undefined,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              <Paper
                shadow="none"
                radius={0}
                p="md"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  borderRight: isDesktopLayout ? '1px solid var(--mantine-color-gray-3)' : 'none',
                  borderBottom: isDesktopLayout ? 'none' : '1px solid var(--mantine-color-gray-3)',
                  backgroundColor: 'white',
                }}
              >
                <PaperSidebar
                  lookupsLoading={lookupsLoading}
                  treeLoading={treeLoading}
                  treeError={treeError}
                  search={search}
                  onSearchChange={setSearch}
                  onRefresh={handleRefresh}
                  onCreate={openCreateModal}
                  childrenContent={
                    treeLoading ? (
                      <Center py="xl">
                        <Loader />
                      </Center>
                    ) : filteredTree.length > 0 ? (
                      <Stack gap={4}>{renderTree(filteredTree)}</Stack>
                    ) : (
                      <Stack gap="xs" py="xl" align="center">
                        <Text size="sm" c="dimmed">
                          No smart categories match your search.
                        </Text>
                        <Button variant="light" size="xs" onClick={() => setSearch('')}>
                          Clear search
                        </Button>
                      </Stack>
                    )
                  }
                />
              </Paper>
            </Box>
          )}

            <Box
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Stack
                gap={0}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Paper
                  shadow="none"
                  radius={0}
                  p="md"
                  style={{
                    flexShrink: 0,
                    borderBottom: '1px solid var(--mantine-color-gray-3)',
                    backgroundColor: 'white',
                  }}
                >
                  <SmartCategoryDetailHeader
                    detail={detail}
                    detailLoading={detailLoading}
                    onCreateChild={() => openCreateModal(selectedCategoryId)}
                    onEdit={openEditModal}
                    onDelete={openDeleteConfirm}
                  />
                </Paper>
                <Box
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  <Paper
                    shadow="none"
                    radius={0}
                    pt="md"
                    px={0}
                    pb={0}
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'white',
                    }}
                  >
                    <SmartCategoryDetailContent
                      detail={detail}
                      detailLoading={detailLoading}
                      buttonStyles={buttonStyleOptions}
                      onReload={handleDetailRefresh}
                      isSidebarCollapsed={isSidebarCollapsed}
                      onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
                    />
                  </Paper>
                </Box>
              </Stack>
            </Box>
        </Flex>
      </Box>

      <SmartCategoryFormModal
        opened={formOpened}
        mode={formMode}
        formState={formState}
        onClose={closeForm}
        onChange={setFormState}
        onSubmit={handleFormSubmit}
        submitting={formSubmitting}
        buttonStyles={buttonStyleOptions}
        treeLookup={treeLookup}
        currentCategoryId={formMode === 'edit' ? selectedCategoryId : null}
      />

      <Modal
        opened={deleteConfirmOpened}
        onClose={closeDeleteConfirm}
        title="Delete smart category"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete{' '}
            <Text span fw={600}>
              {detail ? formatCategoryName(detail.category.name, detail.category.smartCategoryId) : 'this smart category'}
            </Text>
            ? This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="outline" onClick={closeDeleteConfirm}>
              Cancel
            </Button>
            <Button color="red" loading={deleteSubmitting} onClick={handleDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

interface SidebarProps {
  lookupsLoading: boolean;
  treeLoading: boolean;
  treeError: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onCreate: () => void;
  childrenContent: React.ReactNode;
}

const PaperSidebar: FC<SidebarProps> = ({
  lookupsLoading,
  treeLoading,
  treeError,
  search,
  onSearchChange,
  onRefresh,
  onCreate,
  childrenContent,
}) => (
  <Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
    <Group justify="space-between" align="center">
      <Text fw={700} size="lg">
        Smart Categories
      </Text>
      <Group gap="xs">
        <Tooltip label="Refresh">
          <ActionIcon variant="subtle" onClick={onRefresh} disabled={treeLoading}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Create smart category">
          <ActionIcon variant="filled" color="indigo" onClick={onCreate} disabled={lookupsLoading}>
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
    <TextInput
      placeholder="Search smart categories"
      value={search}
      onChange={(event) => onSearchChange(event.currentTarget.value)}
      leftSection={<IconSearch size={16} />}
    />
    <Divider />
    {treeError ? (
      <Stack align="center" gap="xs">
        <Text size="sm" c="red">
          {treeError}
        </Text>
        <Button variant="light" size="xs" onClick={onRefresh}>
          Retry
        </Button>
      </Stack>
    ) : (
      <ScrollArea style={{ flex: 1, minHeight: 0 }}>{childrenContent}</ScrollArea>
    )}
  </Stack>
);

interface TreeRowProps {
  node: SmartCategoryTreeNode;
  hasChildren: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

const UnstyledTreeRow: FC<TreeRowProps> = ({ node, hasChildren, isExpanded, isSelected, onToggle, onSelect }) => {
  const displayName = formatCategoryName(node.name, node.smartCategoryId);

  return (
    <Group
      justify="space-between"
      align="center"
      px="xs"
      py={6}
      style={{
        borderRadius: 8,
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--mantine-color-indigo-0)' : undefined,
        border: isSelected ? '1px solid var(--mantine-color-indigo-4)' : '1px solid transparent',
      }}
      onClick={onSelect}
    >
      <Group gap={6} align="center">
        {hasChildren ? (
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </ActionIcon>
        ) : (
          <Box w={26} />
        )}
        <Stack gap={2}>
          <Group gap={6} align="center">
            <Text fw={600} size="sm">
              {displayName}
            </Text>
            {!node.enabled && (
              <Badge color="gray" size="xs" variant="light">
                Disabled
              </Badge>
            )}
          </Group>
          <Text size="xs" c="dimmed">
            {node.itemCount} items
          </Text>
        </Stack>
      </Group>
      <Badge size="sm" variant="light" color="indigo">
        #{node.displayIndex}
      </Badge>
    </Group>
  );
};

interface DetailHeaderProps {
  detail: SmartCategoryDetail | null;
  detailLoading: boolean;
  onCreateChild: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const SmartCategoryDetailHeader: FC<DetailHeaderProps> = ({
  detail,
  detailLoading,
  onCreateChild,
  onEdit,
  onDelete,
}) => {
  const actionsDisabled = detailLoading || !detail;

  return (
    <Group justify="flex-end" align="center" gap="xs">
      <Button
        variant="light"
        onClick={onCreateChild}
        leftSection={<IconPlus size={16} />}
        disabled={actionsDisabled}
      >
        Add child
      </Button>
      <Button variant="light" onClick={onEdit} leftSection={<IconPencil size={16} />} disabled={actionsDisabled}>
        Edit
      </Button>
      <Button
        color="red"
        variant="light"
        onClick={onDelete}
        leftSection={<IconTrash size={16} />}
        disabled={actionsDisabled}
      >
        Delete
      </Button>
    </Group>
  );
};

interface DetailContentProps {
  detail: SmartCategoryDetail | null;
  detailLoading: boolean;
  buttonStyles: ButtonStyle[];
  onReload: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const SmartCategoryDetailContent: FC<DetailContentProps> = ({
  detail,
  detailLoading,
  buttonStyles,
  onReload,
  isSidebarCollapsed,
  onToggleSidebar,
}) => {
  if (detailLoading) {
    return (
      <Center style={{ flex: 1 }}>
        <Loader />
      </Center>
    );
  }

  if (!detail) {
    return (
      <Center style={{ flex: 1 }}>
        <Stack gap="xs" align="center">
          <Text fw={600}>Select a smart category to view details</Text>
          <Text size="sm" c="dimmed">
            Choose a category from the left panel to manage its items, details, and display options.
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Tabs defaultValue="items" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Tabs.List>
        <Tabs.Tab value="items">Items</Tabs.Tab>
        <Tabs.Tab value="details">Details</Tabs.Tab>
        <Tabs.Tab value="shop-schedules">Shop schedules</Tabs.Tab>
        <Tabs.Tab value="order-channels">Order channel visibility</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="items" pt="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <SmartCategoryItemsTab
          smartCategoryId={detail.category.smartCategoryId}
          categoryName={detail.category.name}
          initialItems={detail.items}
          onReload={onReload}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={onToggleSidebar}
        />
      </Tabs.Panel>
      <Tabs.Panel value="details" pt="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <DetailsTab detail={detail} buttonStyles={buttonStyles} />
      </Tabs.Panel>
      <Tabs.Panel value="shop-schedules" pt="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ShopSchedulesTab schedules={detail.shopSchedules} />
      </Tabs.Panel>
      <Tabs.Panel value="order-channels" pt="md" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <OrderChannelsTab channels={detail.orderChannels} />
      </Tabs.Panel>
    </Tabs>
  );
};



interface DetailsTabProps {
  detail: SmartCategoryDetail;
  buttonStyles: ButtonStyle[];
}

const DetailsTab: FC<DetailsTabProps> = ({ detail, buttonStyles }) => {
  const { category } = detail;

  const nameDisplay = formatCategoryName(category.name, category.smartCategoryId);
  const buttonStyleName = buttonStyles
    .find((style) => style.buttonStyleId === category.buttonStyleId)
    ?.styleName?.trim();
  const modifiedByDisplay = category.modifiedBy ? category.modifiedBy.trim() : '';
  const createdByDisplay = category.createdBy ? category.createdBy.trim() : '';
  const modifiedByText = modifiedByDisplay || FALLBACK_ITEM_MODIFIER;
  const createdByText = createdByDisplay || FALLBACK_ITEM_MODIFIER;
  const modifiedAtText = category.modifiedDate ? new Date(category.modifiedDate).toLocaleString() : '—';
  const createdAtText = category.createdDate ? new Date(category.createdDate).toLocaleString() : '—';

  return (
    <ScrollArea style={{ flex: 1, minHeight: 0 }}>
    <Stack gap="sm">
      <Group align="flex-start" gap="xl">
        <Stack gap={6} flex={1}>
          <Text fw={600}>General</Text>
          <Text size="sm">
            <Text span fw={600}>
              Name:
            </Text>{' '}
            {nameDisplay}
          </Text>
          {category.nameAlt && (
            <Text size="sm">
              <Text span fw={600}>
                Name (alt):
              </Text>{' '}
              {category.nameAlt}
            </Text>
          )}
          <Text size="sm">
            <Text span fw={600}>
              Parent:
            </Text>{' '}
            {category.parentSmartCategoryId ?? 'Root'}
          </Text>
          <Text size="sm">
            <Text span fw={600}>
              Display index:
            </Text>{' '}
            {category.displayIndex}
          </Text>
          <Text size="sm">
            <Text span fw={600}>
              Button style:
            </Text>{' '}
            {buttonStyleName ?? `#${category.buttonStyleId}`}
          </Text>
        </Stack>
        <Stack gap={6} flex={1}>
          <Text fw={600}>Status</Text>
          <Group gap="xs">
            <Badge color={category.enabled ? 'teal' : 'gray'} variant="light">
              {category.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
            {category.isTerminal && (
              <Badge color="orange" variant="light">
                Terminal
              </Badge>
            )}
            {category.isPublicDisplay && (
              <Badge color="blue" variant="light">
                Public
              </Badge>
            )}
          </Group>
          <Text size="sm">
            <Text span fw={600}>
              Modified:
            </Text>{' '}
            {modifiedAtText} by {modifiedByText}
          </Text>
          <Text size="sm">
            <Text span fw={600}>
              Created:
            </Text>{' '}
            {createdAtText} by {createdByText}
          </Text>
        </Stack>
      </Group>

      <Divider />

      <Stack gap={4}>
        <Text fw={600}>Description</Text>
        {category.description ? (
          <Textarea value={category.description} readOnly autosize minRows={2} />
        ) : (
          <Text size="sm" c="dimmed">
            No description provided.
          </Text>
        )}
      </Stack>
      {category.remark && (
        <Stack gap={4}>
          <Text fw={600}>Remark</Text>
          <Textarea value={category.remark} readOnly autosize minRows={2} />
        </Stack>
      )}
    </Stack>
    </ScrollArea>
  );
};

interface ShopSchedulesTabProps {
  schedules: SmartCategoryShopSchedule[];
}

const ShopSchedulesTab: FC<ShopSchedulesTabProps> = ({ schedules }) => {
  const hasSchedules = schedules.length > 0;

  return (
    <ScrollArea style={{ flex: 1, minHeight: 0 }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>Shop schedules</Text>
          <Button variant="light" leftSection={<IconPencil size={16} />}>
            Manage schedules
          </Button>
        </Group>
        {hasSchedules ? (
          <Stack gap="xs">
            {schedules
              .slice()
              .sort((a, b) => a.displayIndex - b.displayIndex)
              .map((schedule) => {
                const shopName = formatShopName(schedule.shopName, schedule.shopId);
                return (
                  <Box
                    key={`${schedule.shopId}-${schedule.displayIndex}`}
                    px="md"
                    py="sm"
                    style={{
                      borderRadius: 10,
                      border: '1px solid var(--mantine-color-gray-3)',
                      backgroundColor: 'var(--mantine-color-gray-0)',
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Stack gap={4}>
                        <Text fw={600}>{shopName}</Text>
                        <Text size="xs" c="dimmed">
                          Display index {schedule.displayIndex}
                        </Text>
                      </Stack>
                      <Badge color={schedule.enabled ? 'teal' : 'gray'} variant="light">
                        {schedule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Group>
                  </Box>
                );
              })}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            No shop display schedules configured yet.
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
};

interface OrderChannelsTabProps {
  channels: SmartCategoryOrderChannel[];
}

const OrderChannelsTab: FC<OrderChannelsTabProps> = ({ channels }) => {
  const hasChannels = channels.length > 0;

  return (
    <ScrollArea style={{ flex: 1, minHeight: 0 }}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text fw={600}>Order channel visibility</Text>
          <Button variant="light" leftSection={<IconPencil size={16} />}>
            Manage order channels
          </Button>
        </Group>
        {hasChannels ? (
          <Stack gap="xs">
            {channels.map((channel) => {
              const channelName = formatOrderChannelName(channel.name, channel.orderChannelId);
              const shopName = formatShopName(channel.shopName, channel.shopId);
              return (
                <Box
                  key={`${channel.shopId}-${channel.orderChannelId}`}
                  px="md"
                  py="sm"
                  style={{
                    borderRadius: 10,
                    border: '1px solid var(--mantine-color-gray-3)',
                    backgroundColor: 'var(--mantine-color-gray-0)',
                  }}
                >
                  <Group justify="space-between">
                    <Stack gap={4}>
                      <Text fw={600}>
                        {channelName}{' '}
                        <Text span size="xs" c="dimmed">
                          (Shop {shopName})
                        </Text>
                      </Text>
                    </Stack>
                    <Badge color={channel.enabled ? 'teal' : 'gray'} variant="light">
                      {channel.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Group>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Text size="sm" c="dimmed">
            No order channels configured.
          </Text>
        )}
      </Stack>
    </ScrollArea>
  );
};

interface SmartCategoryFormModalProps {
  opened: boolean;
  mode: 'create' | 'edit';
  formState: SmartCategoryFormState;
  onClose: () => void;
  onChange: (next: SmartCategoryFormState) => void;
  onSubmit: () => void;
  submitting: boolean;
  buttonStyles: ButtonStyle[];
  treeLookup: Record<number, SmartCategoryTreeNode>;
  currentCategoryId?: number | null;
}

const displayPreferenceOptions = [
  { value: 'inherit', label: 'Inherit default' },
  { value: 'true', label: 'Show' },
  { value: 'false', label: 'Hide' },
];

const toTriStateValue = (value?: boolean | null): string => {
  if (value === null || value === undefined) {
    return 'inherit';
  }
  return value ? 'true' : 'false';
};

const fromTriStateValue = (value: string | null): boolean | null => {
  if (!value || value === 'inherit') {
    return null;
  }
  return value === 'true';
};

const SmartCategoryFormModal: FC<SmartCategoryFormModalProps> = ({
  opened,
  mode,
  formState,
  onClose,
  onChange,
  onSubmit,
  submitting,
  buttonStyles,
  treeLookup,
  currentCategoryId,
}) => {
  const handleFieldChange = <K extends keyof SmartCategoryFormState>(key: K, value: SmartCategoryFormState[K]) => {
    onChange({ ...formState, [key]: value });
  };

  const parentOptions = useMemo(() => {
    const entries = Object.values(treeLookup)
      .filter((node) => (currentCategoryId ? node.smartCategoryId !== currentCategoryId : true))
      .map((node) => ({
        value: String(node.smartCategoryId),
        label: formatCategoryName(node.name, node.smartCategoryId),
      }));

    return [{ value: 'null', label: 'Root (no parent)' }, ...entries];
  }, [treeLookup, currentCategoryId]);

  const buttonStyleSelectData = useMemo(
    () =>
      buttonStyles.map((style) => ({
        value: String(style.buttonStyleId),
        label: style.styleName ? `${style.styleName} (#${style.buttonStyleId})` : `Style #${style.buttonStyleId}`,
      })),
    [buttonStyles],
  );

  const buttonStyleValue =
    formState.buttonStyleId && formState.buttonStyleId > 0 ? String(formState.buttonStyleId) : null;

  const handleTriStateChange =
    (field: keyof Pick<
      SmartCategoryFormState,
      | 'isSelfOrderingDisplay'
      | 'isOnlineStoreDisplay'
      | 'isOdoDisplay'
      | 'isKioskDisplay'
      | 'isTableOrderingDisplay'
    >) =>
    (value: string | null) => {
      handleFieldChange(field, fromTriStateValue(value));
    };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={mode === 'create' ? 'Create smart category' : 'Edit smart category'}
      size="lg"
    >
      <Stack gap="lg">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput
            label="Name"
            required
            value={formState.name}
            onChange={(event) => handleFieldChange('name', event.currentTarget.value)}
          />
          <TextInput
            label="Alternative name"
            value={formState.nameAlt ?? ''}
            onChange={(event) => handleFieldChange('nameAlt', event.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <NumberInput
            label="Display index"
            min={0}
            value={formState.displayIndex === '' ? undefined : formState.displayIndex}
            onChange={(value) => handleFieldChange('displayIndex', typeof value === 'number' ? value : '')}
          />
          <Select
            label="Parent smart category"
            data={parentOptions}
            searchable
            clearable
            comboboxProps={{ withinPortal: true }}
            nothingFoundMessage="No categories"
            value={
              formState.parentSmartCategoryId === null || formState.parentSmartCategoryId === undefined
                ? 'null'
                : String(formState.parentSmartCategoryId)
            }
            onChange={(value) => {
              if (!value || value === 'null') {
                handleFieldChange('parentSmartCategoryId', null);
              } else {
                handleFieldChange('parentSmartCategoryId', Number(value));
              }
            }}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Button style"
            placeholder={buttonStyleSelectData.length ? 'Select button style' : 'No button styles available'}
            data={buttonStyleSelectData}
            searchable
            comboboxProps={{ withinPortal: true }}
            value={buttonStyleValue}
            onChange={(value) => {
              if (value) {
                handleFieldChange('buttonStyleId', Number(value));
              }
            }}
            disabled={buttonStyleSelectData.length === 0}
            required
          />
          <TextInput
            label="Online store reference category ID"
            type="number"
            value={
              formState.onlineStoreRefCategoryId === null || formState.onlineStoreRefCategoryId === undefined
                ? ''
                : String(formState.onlineStoreRefCategoryId)
            }
            onChange={(event) =>
              handleFieldChange(
                'onlineStoreRefCategoryId',
                event.currentTarget.value ? Number(event.currentTarget.value) : null,
              )
            }
          />
        </SimpleGrid>

        <Group grow align="flex-start">
          <Switch
            label="Enabled"
            checked={formState.enabled}
            onChange={(event) => handleFieldChange('enabled', event.currentTarget.checked)}
          />
          <Switch
            label="Terminal node"
            checked={formState.isTerminal}
            onChange={(event) => handleFieldChange('isTerminal', event.currentTarget.checked)}
          />
          <Switch
            label="Public display"
            checked={formState.isPublicDisplay}
            onChange={(event) => handleFieldChange('isPublicDisplay', event.currentTarget.checked)}
          />
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Select
            label="Self-ordering display"
            data={displayPreferenceOptions}
            value={toTriStateValue(formState.isSelfOrderingDisplay)}
            onChange={handleTriStateChange('isSelfOrderingDisplay')}
          />
          <Select
            label="Online store display"
            data={displayPreferenceOptions}
            value={toTriStateValue(formState.isOnlineStoreDisplay)}
            onChange={handleTriStateChange('isOnlineStoreDisplay')}
          />
          <Select
            label="ODO display"
            data={displayPreferenceOptions}
            value={toTriStateValue(formState.isOdoDisplay)}
            onChange={handleTriStateChange('isOdoDisplay')}
          />
          <Select
            label="Kiosk display"
            data={displayPreferenceOptions}
            value={toTriStateValue(formState.isKioskDisplay)}
            onChange={handleTriStateChange('isKioskDisplay')}
          />
          <Select
            label="Table ordering display"
            data={displayPreferenceOptions}
            value={toTriStateValue(formState.isTableOrderingDisplay)}
            onChange={handleTriStateChange('isTableOrderingDisplay')}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <TextInput
            label="Image filename"
            value={formState.imageFileName ?? ''}
            onChange={(event) => handleFieldChange('imageFileName', event.currentTarget.value)}
          />
          <TextInput
            label="Image filename 2"
            value={formState.imageFileName2 ?? ''}
            onChange={(event) => handleFieldChange('imageFileName2', event.currentTarget.value)}
          />
          <TextInput
            label="Image filename 3"
            value={formState.imageFileName3 ?? ''}
            onChange={(event) => handleFieldChange('imageFileName3', event.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Textarea
            label="Description"
            minRows={2}
            value={formState.description ?? ''}
            onChange={(event) => handleFieldChange('description', event.currentTarget.value)}
          />
          <Textarea
            label="Description (alt)"
            minRows={2}
            value={formState.descriptionAlt ?? ''}
            onChange={(event) => handleFieldChange('descriptionAlt', event.currentTarget.value)}
          />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Textarea
            label="Remark"
            minRows={2}
            value={formState.remark ?? ''}
            onChange={(event) => handleFieldChange('remark', event.currentTarget.value)}
          />
          <Textarea
            label="Remark (alt)"
            minRows={2}
            value={formState.remarkAlt ?? ''}
            onChange={(event) => handleFieldChange('remarkAlt', event.currentTarget.value)}
          />
        </SimpleGrid>

        <Group justify="flex-end" mt="sm">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={onSubmit} loading={submitting}>
            {mode === 'create' ? 'Create' : 'Save changes'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export { SmartCategoriesPage };
