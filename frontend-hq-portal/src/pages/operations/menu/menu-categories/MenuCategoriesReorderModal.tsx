import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import {
  Badge,
  Box,
  Button,
  Group,
  Kbd,
  Modal,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CategoryItem } from '../../../../types/itemCategory';

const DEFAULT_ITEMS_PER_ROW = 4;

interface MenuCategoriesReorderModalProps {
  opened: boolean;
  onClose: () => void;
  categoryName: string; // E.g. Default to 'Root Categories' or 'Category: Drinks'
  categories: CategoryItem[];
  loading: boolean;
  saving: boolean;
  onSave: (orderedCategories: CategoryItem[]) => Promise<void>;
}

interface SortableRowProps {
  category: CategoryItem;
  index: number;
  selected: boolean;
  focused: boolean;
  onSelect: (uniqueId: string) => void;
}

const SortableCard: FC<SortableRowProps> = ({ category, index, selected, focused, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.uniqueId });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const isActive = selected;
  const borderColor = isActive || focused ? 'var(--mantine-color-indigo-5)' : 'var(--mantine-color-gray-3, #dee2e6)';
  const backgroundColor = isActive ? 'var(--mantine-color-indigo-0)' : 'var(--mantine-color-white, #fff)';
  const boxShadow = isDragging
    ? 'var(--mantine-shadow-md)'
    : isActive
      ? 'var(--mantine-shadow-sm)'
      : focused
        ? '0 0 0 1px var(--mantine-color-indigo-3)'
        : 'none';

  return (
    <Box
      component="button"
      ref={setNodeRef}
      type="button"
      onClick={() => onSelect(category.uniqueId)}
      {...listeners}
      {...attributes}
      aria-pressed={selected}
      style={{
        ...style,
        width: '100%',
        textAlign: 'left',
        padding: 0,
        border: 'none',
        background: 'none',
        outline: 'none',
      }}
    >
      <Group
        align="flex-start"
        justify="flex-start"
        px="md"
        py="sm"
        wrap="nowrap"
        style={{
          borderRadius: 8,
          border: `1px solid ${borderColor}`,
          backgroundColor,
          boxShadow,
          minHeight: 120,
          width: '100%',
        }}
      >
        <Stack gap={4} style={{ width: '100%' }}>
          <Group gap="xs" align="center" justify="space-between" style={{ width: '100%' }}>
            <Badge size="sm" variant="light" color="indigo">
              {index + 1}
            </Badge>
            {category.isSmartCategory && (
              <Badge size="xs" variant="light" color="cyan" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                SMART
              </Badge>
            )}
          </Group>
          <Tooltip label={category.categoryName || 'Untitled category'} disabled={!category.categoryName}>
            <Text size="sm" fw={600} lineClamp={2} style={{ width: '100%' }}>
              {category.categoryName || 'Untitled category'}
            </Text>
          </Tooltip>
          {category.categoryNameAlt && (
            <Text size="xs" c="dimmed" lineClamp={1}>
              {category.categoryNameAlt}
            </Text>
          )}
        </Stack>
      </Group>
    </Box>
  );
};

export const MenuCategoriesReorderModal: FC<MenuCategoriesReorderModalProps> = ({
  opened,
  onClose,
  categoryName,
  categories,
  loading,
  saving,
  onSave,
}) => {
  const [orderedCategories, setOrderedCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
  const [cardPositions, setCardPositions] = useState<Array<{ top: number; left: number }>>([]);
  const lastSelectedIdRef = useRef<string | null>(null);
  const initialOrderRef = useRef<string[]>([]);
  const focusRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const updateFocusedCategoryId = useCallback((uniqueId: string | null) => {
    setFocusedCategoryId(uniqueId);
    if (uniqueId !== null) {
      lastSelectedIdRef.current = uniqueId;
    }
  }, []);

  const updateSelectedCategoryId = useCallback(
    (uniqueId: string | null) => {
      setSelectedCategoryId(uniqueId);
      if (uniqueId !== null) {
        lastSelectedIdRef.current = uniqueId;
        updateFocusedCategoryId(uniqueId);
      }
    },
    [updateFocusedCategoryId],
  );

  const updateCardPositions = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) {
      setCardPositions([]);
      return;
    }
    const cards = Array.from(grid.children) as HTMLElement[];
    if (cards.length === 0) {
      setCardPositions([]);
      return;
    }
    const next = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      };
    });
    setCardPositions(next);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!opened) {
      return;
    }

    const cloned = categories.map((item) => ({ ...item }));
    setOrderedCategories(cloned);
    initialOrderRef.current = categories.map((item) => item.uniqueId);
    const firstId = cloned[0]?.uniqueId ?? null;
    if (firstId !== null) {
      updateSelectedCategoryId(firstId);
    } else {
      setSelectedCategoryId(null);
      setFocusedCategoryId(null);
      lastSelectedIdRef.current = null;
    }
  }, [categories, opened, updateSelectedCategoryId]);

  useLayoutEffect(() => {
    if (!opened) return;
    updateCardPositions();
  }, [orderedCategories, opened, updateCardPositions]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new ResizeObserver(() => {
      updateCardPositions();
    });
    observer.observe(grid);
    window.addEventListener('resize', updateCardPositions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateCardPositions);
    };
  }, [updateCardPositions, opened]);

  useEffect(() => {
    if (opened) {
      setTimeout(() => {
        focusRef.current?.focus();
      }, 50);
    }
  }, [opened, orderedCategories.length]);

  const handleSelect = useCallback(
    (uniqueId: string) => {
      updateSelectedCategoryId(uniqueId);
    },
    [updateSelectedCategoryId],
  );

  const moveCategory = (fromIndex: number, toIndex: number) => {
    setOrderedCategories((current) => arrayMove(current, fromIndex, toIndex));
  };

  const layoutReady = cardPositions.length === orderedCategories.length && cardPositions.length > 0;
  const ROW_TOLERANCE = 8;

  const getRowIndices = useCallback(
    (referenceIndex: number) => {
      const reference = cardPositions[referenceIndex];
      if (!reference) return [] as number[];
      return cardPositions
        .map((pos, idx) => ({ pos, idx }))
        .filter(({ pos }) => Math.abs(pos.top - reference.top) <= ROW_TOLERANCE)
        .sort((a, b) => a.pos.left - b.pos.left)
        .map(({ idx }) => idx);
    },
    [cardPositions],
  );

  const findVerticalNeighbor = useCallback(
    (referenceIndex: number, direction: 'up' | 'down') => {
      const reference = cardPositions[referenceIndex];
      if (!reference) return null;

      const targetTopCandidates = cardPositions
        .map((pos) => pos.top)
        .filter((top) =>
          direction === 'down'
            ? top > reference.top + ROW_TOLERANCE
            : top < reference.top - ROW_TOLERANCE,
        );

      if (targetTopCandidates.length === 0) {
        return null;
      }

      const targetTop =
        direction === 'down'
          ? Math.min(...targetTopCandidates)
          : Math.max(...targetTopCandidates);

      const candidates = cardPositions
        .map((pos, idx) => ({ pos, idx }))
        .filter(({ pos }) => Math.abs(pos.top - targetTop) <= ROW_TOLERANCE)
        .map(({ idx }) => idx);

      if (candidates.length === 0) {
        return null;
      }

      const referenceLeft = reference.left;
      let bestIndex = candidates[0];
      let bestDelta = Math.abs(cardPositions[bestIndex].left - referenceLeft);
      candidates.forEach((idx) => {
        const delta = Math.abs(cardPositions[idx].left - referenceLeft);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestIndex = idx;
        }
      });

      return bestIndex;
    },
    [cardPositions],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isSpace = event.key === ' ' || event.key === 'Space' || event.key === 'Spacebar' || event.code === 'Space';
    if (isSpace) {
      event.preventDefault();
      if (selectedCategoryId === null) {
      const fallbackId = focusedCategoryId
        ?? lastSelectedIdRef.current
        ?? orderedCategories[0]?.uniqueId
        ?? null;
        if (fallbackId !== null) {
          updateSelectedCategoryId(fallbackId);
        }
      } else {
        const current = selectedCategoryId;
        setSelectedCategoryId(null);
        updateFocusedCategoryId(current);
      }
      return;
    }

    const activeCategoryId = selectedCategoryId ?? focusedCategoryId;
    if (activeCategoryId === null) {
      return;
    }

    const index = orderedCategories.findIndex((item) => item.uniqueId === activeCategoryId);
    if (index === -1) {
      return;
    }

    const isSelectionActive = selectedCategoryId !== null;

    const moveFocus = (targetIndex: number) => {
      if (targetIndex >= 0 && targetIndex < orderedCategories.length) {
        updateFocusedCategoryId(orderedCategories[targetIndex].uniqueId);
      }
    };

    const getHorizontalNeighbor = (direction: 'left' | 'right') => {
      if (!layoutReady) {
        if (direction === 'left' && index > 0) return index - 1;
        if (direction === 'right' && index < orderedCategories.length - 1) return index + 1;
        return null;
      }

      const rowIndices = getRowIndices(index);
      const positionInRow = rowIndices.indexOf(index);
      if (positionInRow === -1) return null;

      if (direction === 'left' && positionInRow > 0) {
        return rowIndices[positionInRow - 1];
      }

      if (direction === 'right' && positionInRow < rowIndices.length - 1) {
        return rowIndices[positionInRow + 1];
      }

      return null;
    };

    const getVerticalNeighbor = (direction: 'up' | 'down') => {
      if (!layoutReady) {
        return direction === 'down'
          ? Math.min(index + DEFAULT_ITEMS_PER_ROW, orderedCategories.length - 1)
          : Math.max(index - DEFAULT_ITEMS_PER_ROW, 0);
      }

      return findVerticalNeighbor(index, direction);
    };

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const neighborIndex = getHorizontalNeighbor('left');
      if (neighborIndex === null) {
        return;
      }

      if (isSelectionActive) {
        moveCategory(index, neighborIndex);
        updateFocusedCategoryId(selectedCategoryId);
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      const neighborIndex = getHorizontalNeighbor('right');
      if (neighborIndex === null) {
        return;
      }

      if (isSelectionActive) {
        moveCategory(index, neighborIndex);
        updateFocusedCategoryId(selectedCategoryId);
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const neighborIndex = getVerticalNeighbor('up');
      if (neighborIndex === null || neighborIndex === index) {
        return;
      }

      if (isSelectionActive) {
        moveCategory(index, neighborIndex);
        updateFocusedCategoryId(selectedCategoryId);
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      const neighborIndex = getVerticalNeighbor('down');
      if (neighborIndex === null || neighborIndex === index) {
        return;
      }

      if (isSelectionActive) {
        moveCategory(index, neighborIndex);
        updateFocusedCategoryId(selectedCategoryId);
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const neighborIndex = layoutReady ? getRowIndices(index)[0] ?? 0 : 0;
      if (isSelectionActive) {
        if (index !== neighborIndex) {
          moveCategory(index, neighborIndex);
          updateFocusedCategoryId(selectedCategoryId);
        }
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const rowIndices = layoutReady ? getRowIndices(index) : null;
      const neighborIndex = rowIndices && rowIndices.length > 0
        ? rowIndices[rowIndices.length - 1]
        : orderedCategories.length - 1;

      if (isSelectionActive) {
        if (index !== neighborIndex) {
          moveCategory(index, neighborIndex);
          updateFocusedCategoryId(selectedCategoryId);
        }
      } else {
        moveFocus(neighborIndex);
      }
    }
  };

  const handleDragEnd = (event: { active: { id: unknown }; over: { id: unknown } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedCategories.findIndex((item) => item.uniqueId === active.id);
    const newIndex = orderedCategories.findIndex((item) => item.uniqueId === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    setOrderedCategories((current) => arrayMove(current, oldIndex, newIndex));
    updateSelectedCategoryId(String(active.id));
  };

  const isDirty = useMemo(() => {
    const initialIds = initialOrderRef.current;
    if (initialIds.length !== orderedCategories.length) {
      return true;
    }

    return orderedCategories.some((item, idx) => item.uniqueId !== initialIds[idx]);
  }, [orderedCategories]);

  const handleSave = async () => {
    await onSave(orderedCategories);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Reorder ${categoryName}`}
      radius="md"
      size="auto"
      trapFocus
      closeOnEscape={!saving}
      closeOnClickOutside={!saving}
      withinPortal
      styles={{
        content: {
          height: 'calc(100vh - 64px)',
          maxHeight: 'calc(100vh - 64px)',
          maxWidth: 'min(1600px, calc(100vw - 32px))',
          width: 'min(1600px, calc(100vw - 32px))',
          marginTop: 32,
          marginBottom: 32,
          display: 'flex',
          flexDirection: 'column',
        },
        body: {
          flex: 1,
          display: 'flex',
          padding: 0,
        },
        header: {
          padding: '16px 24px',
        },
        inner: {
          alignItems: 'center',
        },
      }}
    >
      <Stack
        gap="md"
        tabIndex={-1}
        ref={focusRef}
        onKeyDown={handleKeyDown}
        style={{ padding: 24, width: '100%', height: '100%' }}
      >
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Drag items or use the shortcuts below.
          </Text>
          <Group gap="md" wrap="wrap">
            <Group gap={6} align="center">
              <Group gap={4}>
                <Kbd>←</Kbd>
                <Kbd>→</Kbd>
              </Group>
              <Text size="xs" c="dimmed">
                Move within a row
              </Text>
            </Group>
            <Group gap={6} align="center">
              <Group gap={4}>
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </Group>
              <Text size="xs" c="dimmed">
                Move between rows
              </Text>
            </Group>
            <Group gap={6} align="center">
              <Group gap={4}>
                <Kbd>Home</Kbd>
                <Kbd>End</Kbd>
              </Group>
              <Text size="xs" c="dimmed">
                Jump to start / end
              </Text>
            </Group>
            <Group gap={6} align="center">
              <Kbd>Space</Kbd>
              <Text size="xs" c="dimmed">
                Select / deselect item
              </Text>
            </Group>
          </Group>
          <Text size="xs" c="dimmed">
            Changes apply only after saving.
          </Text>
        </Stack>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedCategories.map((item) => item.uniqueId)}
            strategy={rectSortingStrategy}
          >
            <ScrollArea style={{ flex: 1 }}>
              {loading ? (
                <Text size="sm" c="dimmed">
                  Loading categories…
                </Text>
              ) : orderedCategories.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No categories found to reorder.
                </Text>
              ) : (
                <Box
                  ref={gridRef}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 'var(--mantine-spacing-md)',
                  }}
                >
                  {orderedCategories.map((cat, index) => (
                    <SortableCard
                      key={cat.uniqueId}
                      category={cat}
                      index={index}
                      selected={cat.uniqueId === selectedCategoryId}
                      focused={cat.uniqueId === focusedCategoryId}
                      onSelect={handleSelect}
                    />
                  ))}
                </Box>
              )}
            </ScrollArea>
          </SortableContext>
        </DndContext>

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || saving || orderedCategories.length === 0}
            loading={saving}
          >
            Save order
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
