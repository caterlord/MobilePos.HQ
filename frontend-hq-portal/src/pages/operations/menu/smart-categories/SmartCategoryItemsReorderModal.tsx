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
import type { SmartCategoryItemAssignment } from '../../../../types/smartCategory';

const DEFAULT_ITEMS_PER_ROW = 4;

interface SmartCategoryItemsReorderModalProps {
  opened: boolean;
  onClose: () => void;
  categoryName: string;
  items: SmartCategoryItemAssignment[];
  loading: boolean;
  saving: boolean;
  onSave: (orderedItems: SmartCategoryItemAssignment[]) => Promise<void>;
}

interface SortableRowProps {
  item: SmartCategoryItemAssignment;
  index: number;
  selected: boolean;
  focused: boolean;
  onSelect: (itemId: number) => void;
}

const SortableCard: FC<SortableRowProps> = ({ item, index, selected, focused, onSelect }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.itemId });

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
      onClick={() => onSelect(item.itemId)}
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
          <Group gap="xs" align="center">
            <Badge size="sm" variant="light" color="indigo">
              {index + 1}
            </Badge>
            {(item.itemCode === 'Smart Category' || item.itemCode === 'Category') && (
              <Badge size="xs" variant="light" color={item.itemCode === 'Smart Category' ? 'violet' : 'blue'}>
                {item.itemCode}
              </Badge>
            )}
          </Group>
          <Tooltip label={item.itemName || 'Untitled item'} disabled={!item.itemName}>
            <Text size="sm" fw={600} lineClamp={2} style={{ width: '100%' }}>
              {item.itemName || 'Untitled item'}
            </Text>
          </Tooltip>
          {item.itemNameAlt ? (
            <Text size="xs" c="dimmed" lineClamp={1}>{item.itemNameAlt}</Text>
          ) : item.itemCode && item.itemCode !== 'Smart Category' && item.itemCode !== 'Category' ? (
            <Text size="xs" c="dimmed">{item.itemCode}</Text>
          ) : null}
        </Stack>
      </Group>
    </Box>
  );
};

export const SmartCategoryItemsReorderModal: FC<SmartCategoryItemsReorderModalProps> = ({
  opened,
  onClose,
  categoryName,
  items,
  loading,
  saving,
  onSave,
}) => {
  const [orderedItems, setOrderedItems] = useState<SmartCategoryItemAssignment[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<number | null>(null);
  const [cardPositions, setCardPositions] = useState<Array<{ top: number; left: number }>>([]);
  const lastSelectedIdRef = useRef<number | null>(null);
  const initialOrderRef = useRef<number[]>([]);
  const focusRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const updateFocusedItemId = useCallback((itemId: number | null) => {
    setFocusedItemId(itemId);
    if (itemId !== null) {
      lastSelectedIdRef.current = itemId;
    }
  }, []);

  const updateSelectedItemId = useCallback(
    (itemId: number | null) => {
      setSelectedItemId(itemId);
      if (itemId !== null) {
        lastSelectedIdRef.current = itemId;
        updateFocusedItemId(itemId);
      }
    },
    [updateFocusedItemId],
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

    const sorted = items.slice().sort((a, b) => a.displayIndex - b.displayIndex);
    const cloned = sorted.map((item) => ({ ...item }));
    setOrderedItems(cloned);
    initialOrderRef.current = sorted.map((item) => item.itemId);
    const firstId = cloned[0]?.itemId ?? null;
    if (firstId !== null) {
      updateSelectedItemId(firstId);
    } else {
      setSelectedItemId(null);
      setFocusedItemId(null);
      lastSelectedIdRef.current = null;
    }
  }, [items, opened, updateSelectedItemId]);

  useLayoutEffect(() => {
    if (!opened) return;
    updateCardPositions();
  }, [orderedItems, opened, updateCardPositions]);

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
  }, [opened, orderedItems.length]);

  const handleSelect = useCallback(
    (itemId: number) => {
      updateSelectedItemId(itemId);
    },
    [updateSelectedItemId],
  );

  const moveItem = (fromIndex: number, toIndex: number) => {
    setOrderedItems((current) => arrayMove(current, fromIndex, toIndex));
  };

  const layoutReady = cardPositions.length === orderedItems.length && cardPositions.length > 0;
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
      if (selectedItemId === null) {
      const fallbackId = focusedItemId
        ?? lastSelectedIdRef.current
        ?? orderedItems[0]?.itemId
        ?? null;
        if (fallbackId !== null) {
          updateSelectedItemId(fallbackId);
        }
      } else {
        const current = selectedItemId;
        setSelectedItemId(null);
        updateFocusedItemId(current);
      }
      return;
    }

    const activeItemId = selectedItemId ?? focusedItemId;
    if (activeItemId === null) {
      return;
    }

    const index = orderedItems.findIndex((item) => item.itemId === activeItemId);
    if (index === -1) {
      return;
    }

    const isSelectionActive = selectedItemId !== null;

    const moveFocus = (targetIndex: number) => {
      if (targetIndex >= 0 && targetIndex < orderedItems.length) {
        updateFocusedItemId(orderedItems[targetIndex].itemId);
      }
    };

    const getHorizontalNeighbor = (direction: 'left' | 'right') => {
      if (!layoutReady) {
        if (direction === 'left' && index > 0) return index - 1;
        if (direction === 'right' && index < orderedItems.length - 1) return index + 1;
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
          ? Math.min(index + DEFAULT_ITEMS_PER_ROW, orderedItems.length - 1)
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
        moveItem(index, neighborIndex);
        updateFocusedItemId(selectedItemId);
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
        moveItem(index, neighborIndex);
        updateFocusedItemId(selectedItemId);
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
        moveItem(index, neighborIndex);
        updateFocusedItemId(selectedItemId);
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
        moveItem(index, neighborIndex);
        updateFocusedItemId(selectedItemId);
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'Home') {
      event.preventDefault();
      const neighborIndex = layoutReady ? getRowIndices(index)[0] ?? 0 : 0;
      if (isSelectionActive) {
        if (index !== neighborIndex) {
          moveItem(index, neighborIndex);
          updateFocusedItemId(selectedItemId);
        }
      } else {
        moveFocus(neighborIndex);
      }
    } else if (event.key === 'End') {
      event.preventDefault();
      const rowIndices = layoutReady ? getRowIndices(index) : null;
      const neighborIndex = rowIndices && rowIndices.length > 0
        ? rowIndices[rowIndices.length - 1]
        : orderedItems.length - 1;

      if (isSelectionActive) {
        if (index !== neighborIndex) {
          moveItem(index, neighborIndex);
          updateFocusedItemId(selectedItemId);
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

    const oldIndex = orderedItems.findIndex((item) => item.itemId === active.id);
    const newIndex = orderedItems.findIndex((item) => item.itemId === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    setOrderedItems((current) => arrayMove(current, oldIndex, newIndex));
    updateSelectedItemId(Number(active.id));
  };

  const isDirty = useMemo(() => {
    const initialIds = initialOrderRef.current;
    if (initialIds.length !== orderedItems.length) {
      return true;
    }

    return orderedItems.some((item, idx) => item.itemId !== initialIds[idx]);
  }, [orderedItems]);

  const handleSave = async () => {
    await onSave(orderedItems);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Reorder items in ${categoryName}`}
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
            items={orderedItems.map((item) => item.itemId)}
            strategy={rectSortingStrategy}
          >
            <ScrollArea style={{ flex: 1 }}>
              {loading ? (
                <Text size="sm" c="dimmed">
                  Loading items…
                </Text>
              ) : orderedItems.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No items found in this category.
                </Text>
              ) : (
                <Box
                  ref={gridRef}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: orderedItems.length <= 3
                      ? `repeat(${orderedItems.length}, minmax(180px, 260px))`
                      : 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--mantine-spacing-md)',
                  }}
                >
                  {orderedItems.map((item, index) => (
                    <SortableCard
                      key={item.itemId}
                      item={item}
                      index={index}
                      selected={item.itemId === selectedItemId}
                      focused={item.itemId === focusedItemId}
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
            disabled={!isDirty || saving || orderedItems.length === 0}
            loading={saving}
          >
            Save order
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
