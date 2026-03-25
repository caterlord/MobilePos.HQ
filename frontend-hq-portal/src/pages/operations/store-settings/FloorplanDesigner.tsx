import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  NumberInput,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceFloppy,
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
const MIN_TABLE_SIZE = 40;
const RESIZE_HANDLE_SIZE = 10;

const SHAPE_OPTIONS = [
  { value: 'rectangle', label: 'Rectangle' },
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
];

const getShapeBorderRadius = (shape: string) =>
  (shape ?? '').toLowerCase() === 'circle' ? '50%' : '8px';

const snapToGrid = (value: number, gridSize: number) =>
  Math.round(value / gridSize) * gridSize;

const buildPayload = (table: TableMaster, overrides: Partial<UpsertTableMasterRequest> = {}): UpsertTableMasterRequest => ({
  tableCode: table.tableCode,
  sectionId: table.sectionId,
  tableTypeId: table.tableTypeId,
  displayIndex: table.displayIndex,
  isTakeAway: table.isTakeAway,
  seatNum: table.seatNum,
  shopPrinterMasterId: table.shopPrinterMasterId,
  positionX: table.positionX,
  positionY: table.positionY,
  isAppearOnFloorPlan: table.isAppearOnFloorPlan,
  shapeType: table.shapeType || 'rectangle',
  iconWidth: table.iconWidth,
  iconHeight: table.iconHeight,
  rotation: table.rotation,
  ...overrides,
});

// ── Draggable Table Component ──

function DraggableTable({
  table, isSelected, snap, onClick, onResizeStart,
}: {
  table: TableMaster;
  isSelected: boolean;
  snap: boolean;
  onClick: () => void;
  onResizeStart: (tableId: number, e: React.PointerEvent) => void;
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
        border: isSelected ? '2px solid var(--mantine-color-blue-6)' : '1px solid var(--mantine-color-blue-3)',
        background: isSelected
          ? 'linear-gradient(180deg, rgba(59,130,246,0.30) 0%, rgba(29,78,216,0.15) 100%)'
          : 'linear-gradient(180deg, rgba(59,130,246,0.15) 0%, rgba(29,78,216,0.06) 100%)',
        boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.2), 0 4px 12px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.7 : 1,
        zIndex: isDragging ? 100 : isSelected ? 50 : 1,
        transition: isDragging ? 'none' : 'box-shadow 0.15s, border 0.15s',
        userSelect: 'none',
      }}
    >
      <Text size="xs" fw={700} c="blue.9" truncate style={{ maxWidth: w - 8 }}>{table.tableCode}</Text>
      <Text size="10px" c="blue.7" truncate style={{ maxWidth: w - 8 }}>{table.sectionName}</Text>
      {table.seatNum != null && <Text size="9px" c="dimmed">{table.seatNum} seats</Text>}
      {/* Resize handle */}
      {isSelected && !isDragging && (
        <div
          onPointerDown={(e) => { e.stopPropagation(); onResizeStart(table.tableId, e); }}
          style={{
            position: 'absolute', right: -4, bottom: -4,
            width: RESIZE_HANDLE_SIZE, height: RESIZE_HANDLE_SIZE,
            background: 'var(--mantine-color-blue-5)', borderRadius: 2,
            cursor: 'nwse-resize', zIndex: 200,
          }}
        />
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
  brandId, shopId, tables, sectionOptions, sectionFilter,
  onSectionFilterChange, loading, onTablesChange, onEditTable,
}: FloorplanDesignerProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<number, Partial<UpsertTableMasterRequest>>>(new Map());
  const [rightTab, setRightTab] = useState<string | null>('palette');

  // Resize state
  const resizeRef = useRef<{ tableId: number; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const canvasTables = useMemo(() => {
    const filtered = sectionFilter === 'all' ? tables : tables.filter((t) => String(t.sectionId) === sectionFilter);
    return filtered.filter((t) => t.isAppearOnFloorPlan);
  }, [tables, sectionFilter]);

  const offCanvasTables = useMemo(() => {
    const filtered = sectionFilter === 'all' ? tables : tables.filter((t) => String(t.sectionId) === sectionFilter);
    return filtered.filter((t) => !t.isAppearOnFloorPlan);
  }, [tables, sectionFilter]);

  const selectedTable = useMemo(() => tables.find((t) => t.tableId === selectedId) ?? null, [tables, selectedId]);

  const hasPendingChanges = pendingChanges.size > 0;

  // Auto-switch to properties tab when selecting
  useEffect(() => {
    if (selectedId) setRightTab('properties');
  }, [selectedId]);

  // ── Track changes (no auto-save) ──

  const trackChange = useCallback((tableId: number, changes: Partial<UpsertTableMasterRequest>) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const existing = next.get(tableId) ?? {};
      next.set(tableId, { ...existing, ...changes });
      return next;
    });
  }, []);

  // ── Save all pending changes ──

  const saveAllChanges = useCallback(async () => {
    if (pendingChanges.size === 0) return;
    try {
      setSaving(true);
      for (const [tableId, changes] of pendingChanges) {
        const table = tables.find((t) => t.tableId === tableId);
        if (!table) continue;
        await tableSettingsService.updateTable(brandId, shopId, tableId, buildPayload(table, changes));
      }
      notifications.show({ color: 'green', message: `Saved ${pendingChanges.size} table(s)` });
      setPendingChanges(new Map());
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }, [brandId, shopId, tables, pendingChanges]);

  // ── Drag end ──

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const table = tables.find((t) => t.tableId === active.id);
    if (!table || (delta.x === 0 && delta.y === 0)) return;

    const rawX = (table.positionX ?? 0) + delta.x;
    const rawY = (table.positionY ?? 0) + delta.y;
    const newX = Math.max(0, snapEnabled ? snapToGrid(rawX, GRID_SIZE) : Math.round(rawX));
    const newY = Math.max(0, snapEnabled ? snapToGrid(rawY, GRID_SIZE) : Math.round(rawY));

    onTablesChange(tables.map((t) => t.tableId === table.tableId ? { ...t, positionX: newX, positionY: newY } : t));
    trackChange(table.tableId, { positionX: newX, positionY: newY });
  }, [tables, snapEnabled, onTablesChange, trackChange]);

  // ── Resize ──

  const handleResizeStart = useCallback((tableId: number, e: React.PointerEvent) => {
    const table = tables.find((t) => t.tableId === tableId);
    if (!table) return;
    resizeRef.current = {
      tableId, startX: e.clientX, startY: e.clientY,
      startW: table.iconWidth ?? 100, startH: table.iconHeight ?? 60,
    };

    const onMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;
      const dy = ev.clientY - resizeRef.current.startY;
      let newW = Math.max(MIN_TABLE_SIZE, resizeRef.current.startW + dx);
      let newH = Math.max(MIN_TABLE_SIZE, resizeRef.current.startH + dy);
      if (snapEnabled) { newW = snapToGrid(newW, GRID_SIZE); newH = snapToGrid(newH, GRID_SIZE); }
      onTablesChange(tables.map((t) => t.tableId === tableId ? { ...t, iconWidth: newW, iconHeight: newH } : t));
    };

    const onUp = () => {
      if (resizeRef.current) {
        const table = tables.find((t) => t.tableId === resizeRef.current!.tableId);
        if (table) {
          trackChange(tableId, { iconWidth: table.iconWidth, iconHeight: table.iconHeight });
        }
      }
      resizeRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [tables, snapEnabled, onTablesChange, trackChange]);

  // ── Add to / Remove from canvas ──

  const addToCanvas = useCallback(async (table: TableMaster) => {
    try {
      setSaving(true);
      await tableSettingsService.updateTable(brandId, shopId, table.tableId, buildPayload(table, {
        positionX: GRID_SIZE * 2, positionY: GRID_SIZE * 2, isAppearOnFloorPlan: true,
        iconWidth: table.iconWidth ?? 100, iconHeight: table.iconHeight ?? 60,
      }));
      onTablesChange(tables.map((t) => t.tableId === table.tableId
        ? { ...t, isAppearOnFloorPlan: true, positionX: GRID_SIZE * 2, positionY: GRID_SIZE * 2 } : t));
      notifications.show({ color: 'green', message: `${table.tableCode} added to canvas` });
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }, [brandId, shopId, tables, onTablesChange]);

  const removeFromCanvas = useCallback((table: TableMaster) => {
    onTablesChange(tables.map((t) => t.tableId === table.tableId
      ? { ...t, isAppearOnFloorPlan: false, positionX: null, positionY: null, iconWidth: null, iconHeight: null, rotation: null, shapeType: '' }
      : t,
    ));
    trackChange(table.tableId, {
      isAppearOnFloorPlan: false, positionX: null, positionY: null,
      iconWidth: null, iconHeight: null, rotation: null, shapeType: '',
    });
    setSelectedId(null);
    setRightTab('palette');
  }, [tables, onTablesChange, trackChange]);

  // ── Rotation ──

  const rotateSelected = useCallback((degrees: number) => {
    if (!selectedTable) return;
    const newRotation = ((selectedTable.rotation ?? 0) + degrees) % 360;
    onTablesChange(tables.map((t) => t.tableId === selectedTable.tableId ? { ...t, rotation: newRotation } : t));
    trackChange(selectedTable.tableId, { rotation: newRotation });
  }, [selectedTable, tables, onTablesChange, trackChange]);

  // ── Alignment ──

  const alignSelected = useCallback((alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
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
    if (snapEnabled) { newX = snapToGrid(newX, GRID_SIZE); newY = snapToGrid(newY, GRID_SIZE); }

    onTablesChange(tables.map((t) => t.tableId === selectedTable.tableId ? { ...t, positionX: newX, positionY: newY } : t));
    trackChange(selectedTable.tableId, { positionX: newX, positionY: newY });
  }, [selectedTable, snapEnabled, tables, onTablesChange, trackChange]);

  // ── Update selected table property (inline edit) ──

  const updateSelectedProp = useCallback((changes: Partial<TableMaster & UpsertTableMasterRequest>) => {
    if (!selectedTable) return;
    onTablesChange(tables.map((t) => t.tableId === selectedTable.tableId ? { ...t, ...changes } : t));
    trackChange(selectedTable.tableId, changes);
  }, [selectedTable, tables, onTablesChange, trackChange]);

  // ── Render ──

  return (
    <Stack gap="sm">
      {/* Toolbar */}
      <Paper withBorder p="xs" radius="md">
        <Group justify="space-between">
          <Group gap="xs">
            <Select size="xs" data={[{ value: 'all', label: 'All sections' }, ...sectionOptions]}
              value={sectionFilter} onChange={(v) => onSectionFilterChange(v || 'all')} style={{ minWidth: 180 }} />
            <Switch size="xs" label="Snap to grid" checked={snapEnabled}
              onChange={(e) => setSnapEnabled(e.currentTarget.checked)} />
            {saving && <Loader size={14} />}
          </Group>

          <Group gap={4}>
            <Tooltip label="Save all changes">
              <ActionIcon size="sm" variant={hasPendingChanges ? 'filled' : 'subtle'} color="blue"
                disabled={!hasPendingChanges} loading={saving}
                onClick={() => void saveAllChanges()}>
                <IconDeviceFloppy size={14} />
              </ActionIcon>
            </Tooltip>
            <Box w={4} />
            <Tooltip label="Align left"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => alignSelected('left')}><IconLayoutAlignLeft size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align center"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => alignSelected('center')}><IconLayoutAlignCenter size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align right"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => alignSelected('right')}><IconLayoutAlignRight size={14} /></ActionIcon></Tooltip>
            <Box w={4} />
            <Tooltip label="Align top"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => alignSelected('top')}><IconLayoutAlignTop size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align middle"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => alignSelected('middle')}><IconLayoutAlignMiddle size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Align bottom"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => alignSelected('bottom')}><IconLayoutAlignBottom size={14} /></ActionIcon></Tooltip>
            <Box w={4} />
            <Tooltip label="Rotate -90°"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => rotateSelected(-90)}><IconRotate size={14} /></ActionIcon></Tooltip>
            <Tooltip label="Rotate +90°"><ActionIcon size="sm" variant="subtle" disabled={!selectedTable}
              onClick={() => rotateSelected(90)}><IconRotateClockwise size={14} /></ActionIcon></Tooltip>
            <Box w={4} />
            <Tooltip label="Remove from canvas"><ActionIcon size="sm" variant="subtle" color="red" disabled={!selectedTable}
              onClick={() => selectedTable && removeFromCanvas(selectedTable)}><IconTrash size={14} /></ActionIcon></Tooltip>
          </Group>
        </Group>
      </Paper>

      {/* Canvas + Right Panel */}
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Canvas */}
        <Paper withBorder radius="md" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Group><Loader size="sm" /><Text size="sm" c="dimmed">Loading...</Text></Group>
            </div>
          )}
            <ScrollArea>
              <DndContext sensors={sensors} modifiers={[restrictToParentElement]} onDragEnd={handleDragEnd}>
                <Box onClick={() => setSelectedId(null)} style={{
                  position: 'relative', width: CANVAS_WIDTH, height: CANVAS_HEIGHT, cursor: 'default',
                  background: snapEnabled
                    ? `linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / ${GRID_SIZE}px ${GRID_SIZE}px, linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px) 0 0 / ${GRID_SIZE}px ${GRID_SIZE}px, #fafbfc`
                    : '#fafbfc',
                }}>
                  {canvasTables.length === 0 && !loading && (
                    <Group justify="center" style={{ position: 'absolute', inset: 0 }}>
                      <Text size="sm" c="dimmed">
                        {tables.length === 0 ? 'No tables exist yet.' : 'No tables on canvas. Add from the palette.'}
                      </Text>
                    </Group>
                  )}
                  {canvasTables.map((table) => (
                    <DraggableTable key={table.tableId} table={table}
                      isSelected={table.tableId === selectedId} snap={snapEnabled}
                      onClick={() => setSelectedId(table.tableId)}
                      onResizeStart={handleResizeStart} />
                  ))}
                </Box>
              </DndContext>
            </ScrollArea>
        </Paper>

        {/* Right Panel with Tabs */}
        <Paper withBorder radius="md" w={240} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <Tabs value={rightTab} onChange={setRightTab} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Tabs.List>
              <Tabs.Tab value="palette" style={{ flex: 1 }}>Off Canvas</Tabs.Tab>
              <Tabs.Tab value="properties" style={{ flex: 1 }} disabled={!selectedTable}>Properties</Tabs.Tab>
            </Tabs.List>

            {/* Palette Tab */}
            <Tabs.Panel value="palette" p="xs" style={{ flex: 1, overflow: 'hidden' }}>
              {offCanvasTables.length === 0 ? (
                <Text size="xs" c="dimmed" fs="italic" ta="center" py="md">All tables on canvas.</Text>
              ) : (
                <ScrollArea h={CANVAS_HEIGHT - 50}>
                  <Stack gap={4}>
                    {offCanvasTables.map((table) => (
                      <Paper key={table.tableId} withBorder p="xs" radius="sm" style={{ cursor: 'pointer' }}
                        onClick={() => void addToCanvas(table)}>
                        <Group justify="space-between" wrap="nowrap">
                          <div>
                            <Text size="xs" fw={600}>{table.tableCode}</Text>
                            <Text size="10px" c="dimmed">{table.sectionName}</Text>
                          </div>
                          <Tooltip label="Add to canvas">
                            <ActionIcon size="xs" variant="light" color="green"><IconPlus size={12} /></ActionIcon>
                          </Tooltip>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea>
              )}
            </Tabs.Panel>

            {/* Properties Tab */}
            <Tabs.Panel value="properties" p="xs" style={{ flex: 1, overflow: 'auto' }}>
              {selectedTable ? (
                <Stack gap="xs">
                  <Text size="xs" fw={600}>{selectedTable.tableCode}</Text>
                  <Text size="10px" c="dimmed" mb="xs">{selectedTable.sectionName}</Text>

                  <Select size="xs" label="Shape" data={SHAPE_OPTIONS}
                    value={(selectedTable.shapeType || 'rectangle').toLowerCase()}
                    onChange={(v) => updateSelectedProp({ shapeType: v ?? 'rectangle' })} />

                  <Group grow gap="xs">
                    <NumberInput size="xs" label="Width" min={MIN_TABLE_SIZE} step={GRID_SIZE}
                      value={selectedTable.iconWidth ?? 100}
                      onChange={(v) => updateSelectedProp({ iconWidth: typeof v === 'number' ? v : 100 })} />
                    <NumberInput size="xs" label="Height" min={MIN_TABLE_SIZE} step={GRID_SIZE}
                      value={selectedTable.iconHeight ?? 60}
                      onChange={(v) => updateSelectedProp({ iconHeight: typeof v === 'number' ? v : 60 })} />
                  </Group>

                  <Group grow gap="xs">
                    <NumberInput size="xs" label="X" min={0} step={GRID_SIZE}
                      value={selectedTable.positionX ?? 0}
                      onChange={(v) => updateSelectedProp({ positionX: typeof v === 'number' ? v : 0 })} />
                    <NumberInput size="xs" label="Y" min={0} step={GRID_SIZE}
                      value={selectedTable.positionY ?? 0}
                      onChange={(v) => updateSelectedProp({ positionY: typeof v === 'number' ? v : 0 })} />
                  </Group>

                  <NumberInput size="xs" label="Rotation" min={0} max={359} step={90}
                    value={selectedTable.rotation ?? 0}
                    onChange={(v) => updateSelectedProp({ rotation: typeof v === 'number' ? v : 0 })} />

                  <NumberInput size="xs" label="Seats"
                    value={selectedTable.seatNum ?? undefined}
                    onChange={(v) => updateSelectedProp({ seatNum: typeof v === 'number' ? v : null })} />

                  <Group gap={4} mt="xs">
                    <Button size="compact-xs" variant="light" fullWidth
                      onClick={() => onEditTable(selectedTable)}>
                      Full Edit
                    </Button>
                    <Button size="compact-xs" variant="light" color="red" fullWidth
                      onClick={() => removeFromCanvas(selectedTable)}>
                      Remove
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Text size="xs" c="dimmed" fs="italic" ta="center" py="md">Select a table on the canvas.</Text>
              )}
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </div>
    </Stack>
  );
}
