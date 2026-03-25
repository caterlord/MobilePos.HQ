import { useCallback, useMemo, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowsMove,
  IconLayoutAlignBottom,
  IconLayoutAlignCenter,
  IconLayoutAlignLeft,
  IconLayoutAlignMiddle,
  IconLayoutAlignRight,
  IconLayoutAlignTop,
  IconPlus,
  IconRotate,
  IconRotateClockwise,
  IconTrash,
} from '@tabler/icons-react';
import {
  DndContext,
  useDraggable,
  useSensor,
  useSensors,
  PointerSensor,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import type { TableMaster, UpsertTableMasterRequest } from '../../../services/tableSettingsService';
import tableSettingsService from '../../../services/tableSettingsService';

// ── Constants ──

const GRID_SIZE = 24;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 600;

const getShapeBorderRadius = (shape: string) => {
  switch ((shape ?? '').toLowerCase()) {
    case 'circle': return '999px';
    case 'square': return '8px';
    default: return '8px';
  }
};

const snapToGrid = (value: number, gridSize: number) =>
  Math.round(value / gridSize) * gridSize;

// ── Draggable Table Component ──

function DraggableTable({
  table,
  isSelected,
  snap,
  onClick,
}: {
  table: TableMaster;
  isSelected: boolean;
  snap: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: table.tableId,
    data: { table },
  });

  const x = table.positionX ?? 0;
  const y = table.positionY ?? 0;
  const w = table.iconWidth ?? 100;
  const h = table.iconHeight ?? 60;
  const dx = transform ? (snap ? snapToGrid(transform.x, GRID_SIZE) : transform.x) : 0;
  const dy = transform ? (snap ? snapToGrid(transform.y, GRID_SIZE) : transform.y) : 0;

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        position: 'absolute',
        left: x + dx,
        top: y + dy,
        width: w,
        height: h,
        transform: `rotate(${table.rotation ?? 0}deg)`,
        borderRadius: getShapeBorderRadius(table.shapeType),
        border: isSelected
          ? '2px solid var(--mantine-color-blue-6)'
          : '1px solid var(--mantine-color-blue-3)',
        background: isSelected
          ? 'linear-gradient(180deg, rgba(59,130,246,0.30) 0%, rgba(29,78,216,0.15) 100%)'
          : 'linear-gradient(180deg, rgba(59,130,246,0.15) 0%, rgba(29,78,216,0.06) 100%)',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59,130,246,0.2), 0 4px 12px rgba(0,0,0,0.1)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 100 : isSelected ? 50 : 1,
        transition: isDragging ? 'none' : 'box-shadow 0.15s, border 0.15s',
        userSelect: 'none',
      }}
    >
      <Text size="xs" fw={700} c="blue.9" truncate style={{ maxWidth: w - 8 }}>
        {table.tableCode}
      </Text>
      <Text size="10px" c="blue.7" truncate style={{ maxWidth: w - 8 }}>
        {table.sectionName}
      </Text>
      {table.seatNum != null && (
        <Text size="9px" c="dimmed">{table.seatNum} seats</Text>
      )}
    </Box>
  );
}

// ── Main Component ──

interface FloorplanDesignerProps {
  brandId: number;
  shopId: number;
  tables: TableMaster[];
  sectionOptions: { value: string; label: string }[];
  sectionFilter: string;
  onSectionFilterChange: (value: string) => void;
  loading: boolean;
  onTablesChange: (tables: TableMaster[]) => void;
  onEditTable: (table: TableMaster) => void;
}

export function FloorplanDesigner({
  brandId,
  shopId,
  tables,
  sectionOptions,
  sectionFilter,
  onSectionFilterChange,
  loading,
  onTablesChange,
  onEditTable,
}: FloorplanDesignerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  // ── Filter tables ──

  const canvasTables = useMemo(() => {
    const filtered = sectionFilter === 'all'
      ? tables
      : tables.filter((t) => String(t.sectionId) === sectionFilter);
    return filtered.filter((t) => t.isAppearOnFloorPlan);
  }, [tables, sectionFilter]);

  const offCanvasTables = useMemo(() => {
    const filtered = sectionFilter === 'all'
      ? tables
      : tables.filter((t) => String(t.sectionId) === sectionFilter);
    return filtered.filter((t) => !t.isAppearOnFloorPlan);
  }, [tables, sectionFilter]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.tableId === selectedId) ?? null,
    [tables, selectedId],
  );

  // ── Save position ──

  const saveTablePosition = useCallback(async (table: TableMaster, newX: number, newY: number) => {
    try {
      setSaving(true);
      const payload: UpsertTableMasterRequest = {
        tableCode: table.tableCode,
        sectionId: table.sectionId,
        tableTypeId: table.tableTypeId,
        displayIndex: table.displayIndex,
        isTakeAway: table.isTakeAway,
        seatNum: table.seatNum,
        shopPrinterMasterId: table.shopPrinterMasterId,
        positionX: Math.max(0, newX),
        positionY: Math.max(0, newY),
        isAppearOnFloorPlan: table.isAppearOnFloorPlan,
        shapeType: table.shapeType || 'rectangle',
        iconWidth: table.iconWidth,
        iconHeight: table.iconHeight,
        rotation: table.rotation,
      };
      await tableSettingsService.updateTable(brandId, shopId, table.tableId, payload);
      onTablesChange(tables.map((t) =>
        t.tableId === table.tableId ? { ...t, positionX: payload.positionX, positionY: payload.positionY } : t,
      ));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save position' });
    } finally {
      setSaving(false);
    }
  }, [brandId, shopId, tables, onTablesChange]);

  // ── Drag end ──

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const table = tables.find((t) => t.tableId === active.id);
    if (!table || (delta.x === 0 && delta.y === 0)) return;

    const rawX = (table.positionX ?? 0) + delta.x;
    const rawY = (table.positionY ?? 0) + delta.y;
    const newX = snapEnabled ? snapToGrid(rawX, GRID_SIZE) : Math.round(rawX);
    const newY = snapEnabled ? snapToGrid(rawY, GRID_SIZE) : Math.round(rawY);

    // Optimistic update
    onTablesChange(tables.map((t) =>
      t.tableId === table.tableId ? { ...t, positionX: newX, positionY: newY } : t,
    ));

    void saveTablePosition(table, newX, newY);
  }, [tables, snapEnabled, onTablesChange, saveTablePosition]);

  // ── Add to / Remove from canvas ──

  const addToCanvas = useCallback(async (table: TableMaster) => {
    try {
      setSaving(true);
      const payload: UpsertTableMasterRequest = {
        tableCode: table.tableCode,
        sectionId: table.sectionId,
        tableTypeId: table.tableTypeId,
        displayIndex: table.displayIndex,
        isTakeAway: table.isTakeAway,
        seatNum: table.seatNum,
        shopPrinterMasterId: table.shopPrinterMasterId,
        positionX: GRID_SIZE * 2,
        positionY: GRID_SIZE * 2,
        isAppearOnFloorPlan: true,
        shapeType: table.shapeType || 'rectangle',
        iconWidth: table.iconWidth ?? 100,
        iconHeight: table.iconHeight ?? 60,
        rotation: table.rotation ?? 0,
      };
      await tableSettingsService.updateTable(brandId, shopId, table.tableId, payload);
      onTablesChange(tables.map((t) =>
        t.tableId === table.tableId
          ? { ...t, isAppearOnFloorPlan: true, positionX: payload.positionX, positionY: payload.positionY }
          : t,
      ));
      notifications.show({ color: 'green', message: `${table.tableCode} added to canvas` });
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }, [brandId, shopId, tables, onTablesChange]);

  const removeFromCanvas = useCallback(async (table: TableMaster) => {
    try {
      setSaving(true);
      const payload: UpsertTableMasterRequest = {
        tableCode: table.tableCode,
        sectionId: table.sectionId,
        tableTypeId: table.tableTypeId,
        displayIndex: table.displayIndex,
        isTakeAway: table.isTakeAway,
        seatNum: table.seatNum,
        shopPrinterMasterId: table.shopPrinterMasterId,
        positionX: table.positionX,
        positionY: table.positionY,
        isAppearOnFloorPlan: false,
        shapeType: table.shapeType || 'rectangle',
        iconWidth: table.iconWidth,
        iconHeight: table.iconHeight,
        rotation: table.rotation,
      };
      await tableSettingsService.updateTable(brandId, shopId, table.tableId, payload);
      onTablesChange(tables.map((t) =>
        t.tableId === table.tableId ? { ...t, isAppearOnFloorPlan: false } : t,
      ));
      setSelectedId(null);
      notifications.show({ color: 'green', message: `${table.tableCode} removed from canvas` });
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }, [brandId, shopId, tables, onTablesChange]);

  // ── Rotation ──

  const rotateSelected = useCallback(async (degrees: number) => {
    if (!selectedTable) return;
    const newRotation = ((selectedTable.rotation ?? 0) + degrees) % 360;
    try {
      setSaving(true);
      const payload: UpsertTableMasterRequest = {
        tableCode: selectedTable.tableCode,
        sectionId: selectedTable.sectionId,
        tableTypeId: selectedTable.tableTypeId,
        displayIndex: selectedTable.displayIndex,
        isTakeAway: selectedTable.isTakeAway,
        seatNum: selectedTable.seatNum,
        shopPrinterMasterId: selectedTable.shopPrinterMasterId,
        positionX: selectedTable.positionX,
        positionY: selectedTable.positionY,
        isAppearOnFloorPlan: selectedTable.isAppearOnFloorPlan,
        shapeType: selectedTable.shapeType || 'rectangle',
        iconWidth: selectedTable.iconWidth,
        iconHeight: selectedTable.iconHeight,
        rotation: newRotation,
      };
      await tableSettingsService.updateTable(brandId, shopId, selectedTable.tableId, payload);
      onTablesChange(tables.map((t) =>
        t.tableId === selectedTable.tableId ? { ...t, rotation: newRotation } : t,
      ));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }, [brandId, shopId, selectedTable, tables, onTablesChange]);

  // ── Alignment (multi-select would be needed for full alignment, but for now align selected to canvas) ──

  const alignSelected = useCallback(async (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedTable) return;
    const w = selectedTable.iconWidth ?? 100;
    const h = selectedTable.iconHeight ?? 60;
    let newX = selectedTable.positionX ?? 0;
    let newY = selectedTable.positionY ?? 0;

    switch (alignment) {
      case 'left': newX = 0; break;
      case 'center': newX = Math.round((CANVAS_WIDTH - w) / 2); break;
      case 'right': newX = CANVAS_WIDTH - w; break;
      case 'top': newY = 0; break;
      case 'middle': newY = Math.round((CANVAS_HEIGHT - h) / 2); break;
      case 'bottom': newY = CANVAS_HEIGHT - h; break;
    }

    if (snapEnabled) {
      newX = snapToGrid(newX, GRID_SIZE);
      newY = snapToGrid(newY, GRID_SIZE);
    }

    void saveTablePosition(selectedTable, newX, newY);
  }, [selectedTable, snapEnabled, saveTablePosition]);

  // ── Render ──

  return (
    <Stack gap="sm">
      {/* Toolbar */}
      <Paper withBorder p="xs" radius="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Select
              size="xs"
              data={[{ value: 'all', label: 'All sections' }, ...sectionOptions]}
              value={sectionFilter}
              onChange={(v) => onSectionFilterChange(v || 'all')}
              style={{ minWidth: 180 }}
            />
            <Switch size="xs" label="Snap to grid" checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.currentTarget.checked)} />
            {saving && <Loader size={14} />}
          </Group>

          <Group gap={4}>
            <Tooltip label="Align left"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void alignSelected('left')}><IconLayoutAlignLeft size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align center"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void alignSelected('center')}><IconLayoutAlignCenter size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align right"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void alignSelected('right')}><IconLayoutAlignRight size={14} /></ActionIcon></Tooltip>
            <Box w={8} />
            <Tooltip label="Align top"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void alignSelected('top')}><IconLayoutAlignTop size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align middle"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void alignSelected('middle')}><IconLayoutAlignMiddle size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align bottom"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void alignSelected('bottom')}><IconLayoutAlignBottom size={14} /></ActionIcon></Tooltip>
            <Box w={8} />
            <Tooltip label="Rotate -90°"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void rotateSelected(-90)}><IconRotate size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Rotate +90°"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => void rotateSelected(90)}><IconRotateClockwise size={14} /></ActionIcon></Tooltip>
            <Box w={8} />
            <Tooltip label="Remove from canvas"><ActionIcon size="sm" variant="subtle" color="red" disabled={!selectedTable}
              onClick={() => selectedTable && void removeFromCanvas(selectedTable)}><IconTrash size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Edit properties"><ActionIcon size="sm" variant="subtle" color="blue" disabled={!selectedTable}
              onClick={() => selectedTable && onEditTable(selectedTable)}><IconArrowsMove size={14} /></ActionIcon></Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Canvas + Palette */}
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Canvas */}
        <Paper withBorder radius="md" style={{ flex: 1, overflow: 'hidden' }}>
          {loading ? (
            <Group justify="center" py="xl"><Loader size="sm" /><Text size="sm" c="dimmed">Loading...</Text></Group>
          ) : (
            <ScrollArea>
              <DndContext sensors={sensors} modifiers={[restrictToParentElement]} onDragEnd={handleDragEnd}>
                <Box
                  onClick={() => setSelectedId(null)}
                  style={{
                    position: 'relative',
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    background: snapEnabled
                      ? `linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / ${GRID_SIZE}px ${GRID_SIZE}px, linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / ${GRID_SIZE}px ${GRID_SIZE}px, #fafbfc`
                      : '#fafbfc',
                    cursor: 'default',
                  }}
                >
                  {canvasTables.length === 0 && (
                    <Group justify="center" style={{ position: 'absolute', inset: 0 }}>
                      <Text size="sm" c="dimmed">
                        {tables.length === 0 ? 'No tables exist yet.' : 'No tables on canvas. Add from the palette →'}
                      </Text>
                    </Group>
                  )}
                  {canvasTables.map((table) => (
                    <DraggableTable
                      key={table.tableId}
                      table={table}
                      isSelected={table.tableId === selectedId}
                      snap={snapEnabled}
                      onClick={() => setSelectedId(table.tableId)}
                    />
                  ))}
                </Box>
              </DndContext>
            </ScrollArea>
          )}
        </Paper>

        {/* Palette / off-canvas tables */}
        <Paper withBorder p="sm" radius="md" w={220} style={{ flexShrink: 0 }}>
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">Off Canvas</Text>
            {offCanvasTables.length === 0 ? (
              <Text size="xs" c="dimmed" fs="italic">All tables are on the canvas.</Text>
            ) : (
              <ScrollArea h={CANVAS_HEIGHT - 60}>
                <Stack gap={4}>
                  {offCanvasTables.map((table) => (
                    <Paper key={table.tableId} withBorder p="xs" radius="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => void addToCanvas(table)}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text size="xs" fw={600}>{table.tableCode}</Text>
                          <Text size="10px" c="dimmed">{table.sectionName}</Text>
                        </div>
                        <Tooltip label="Add to canvas">
                          <ActionIcon size="xs" variant="light" color="green">
                            <IconPlus size={12} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea>
            )}

            {/* Selected table info */}
            {selectedTable && (
              <>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" mt="md">Selected</Text>
                <Paper withBorder p="xs" radius="sm" bg="blue.0">
                  <Stack gap={2}>
                    <Text size="xs" fw={600}>{selectedTable.tableCode}</Text>
                    <Text size="10px" c="dimmed">{selectedTable.sectionName}</Text>
                    <Text size="10px" c="dimmed">
                      {selectedTable.shapeType} · {selectedTable.iconWidth}×{selectedTable.iconHeight}
                    </Text>
                    <Text size="10px" c="dimmed">
                      Pos: ({selectedTable.positionX}, {selectedTable.positionY})
                      {selectedTable.rotation ? ` · ${selectedTable.rotation}°` : ''}
                    </Text>
                    <Group gap={4} mt={4}>
                      <Button size="compact-xs" variant="light" onClick={() => onEditTable(selectedTable)}>
                        Edit
                      </Button>
                      <Button size="compact-xs" variant="light" color="red"
                        onClick={() => void removeFromCanvas(selectedTable)}>
                        Remove
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              </>
            )}
          </Stack>
        </Paper>
      </div>
    </Stack>
  );
}
