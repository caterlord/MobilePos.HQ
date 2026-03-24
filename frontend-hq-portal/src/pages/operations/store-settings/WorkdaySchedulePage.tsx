import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash, IconClock } from '@tabler/icons-react';
import type { StoreWorkdayEntry, StoreWorkdayPeriod } from '../../../services/storeSettingsService';
import storeSettingsService from '../../../services/storeSettingsService';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';

// ── Day mapping ──

interface DayInfo { code: string; label: string; short: string; order: number }

const DAYS: DayInfo[] = [
  { code: '1', label: 'Monday', short: 'Mon', order: 1 },
  { code: '2', label: 'Tuesday', short: 'Tue', order: 2 },
  { code: '3', label: 'Wednesday', short: 'Wed', order: 3 },
  { code: '4', label: 'Thursday', short: 'Thu', order: 4 },
  { code: '5', label: 'Friday', short: 'Fri', order: 5 },
  { code: '6', label: 'Saturday', short: 'Sat', order: 6 },
  { code: '0', label: 'Sunday', short: 'Sun', order: 7 },
  { code: 'H', label: 'Holiday', short: 'Hol', order: 8 },
];

const dayLabel = (code: string) => DAYS.find((d) => d.code === code)?.label ?? code;

// ── Time helpers ──

/** Parse "HH:MM:SS" or "HH:MM" to minutes from midnight */
const parseTime = (t: string): number => {
  const parts = t.split(':').map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
};

/** Format minutes to "HH:MM" */
const fmtTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Normalize time input to "HH:MM:SS" for API */
const toApiTime = (val: string): string => {
  const clean = val.replace(/[^0-9:]/g, '');
  const parts = clean.split(':');
  const h = String(Math.min(23, Math.max(0, parseInt(parts[0] || '0', 10)))).padStart(2, '0');
  const m = String(Math.min(59, Math.max(0, parseInt(parts[1] || '0', 10)))).padStart(2, '0');
  return `${h}:${m}:00`;
};

/** Get total duration in minutes accounting for dayDelta */
const getDuration = (openMins: number, closeMins: number, dayDelta: number): number => {
  return closeMins + dayDelta * 1440 - openMins;
};

// ── Period colors ──
const PERIOD_COLORS = ['blue', 'teal', 'grape', 'orange', 'cyan', 'pink', 'lime', 'indigo'];

// ── Validation ──

const validateBusinessHours = (openTime: string, closeTime: string, dayDelta: number): string | null => {
  const open = parseTime(openTime);
  const close = parseTime(closeTime);
  const duration = getDuration(open, close, dayDelta);
  if (duration <= 0) return 'Close time must be after open time.';
  if (duration > 1440) return 'Business hours cannot exceed 24 hours.';
  return null;
};

const validatePeriodInHours = (
  pFrom: string, pTo: string, pDayDelta: number,
  openTime: string, closeTime: string, hDayDelta: number,
): string | null => {
  const open = parseTime(openTime);
  const close = parseTime(closeTime) + hDayDelta * 1440;
  const from = parseTime(pFrom);
  const to = parseTime(pTo) + pDayDelta * 1440;
  if (from < open) return 'Period starts before business hours.';
  if (to > close) return 'Period ends after business hours.';
  if (to <= from) return 'Period end must be after start.';
  return null;
};

interface PeriodEdit {
  id: number; // 0 for new
  periodName: string;
  fromTime: string;
  toTime: string;
  dayDelta: number;
  workdayPeriodMasterId: number | null;
}

const findOverlappingPeriods = (periods: PeriodEdit[]): string | null => {
  const sorted = [...periods].sort((a, b) => {
    const aFrom = parseTime(a.fromTime) + a.dayDelta * 1440;
    const bFrom = parseTime(b.fromTime) + b.dayDelta * 1440;
    return aFrom - bFrom;
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const curEnd = parseTime(sorted[i].toTime) + sorted[i].dayDelta * 1440;
    const nextStart = parseTime(sorted[i + 1].fromTime) + sorted[i + 1].dayDelta * 1440;
    if (curEnd > nextStart) {
      return `"${sorted[i].periodName}" overlaps with "${sorted[i + 1].periodName}".`;
    }
  }
  return null;
};

interface GapRange { from: number; to: number }

const findGaps = (periods: PeriodEdit[], openTime: string, closeTime: string, hDayDelta: number): GapRange[] => {
  const open = parseTime(openTime);
  const close = parseTime(closeTime) + hDayDelta * 1440;
  if (periods.length === 0) return [{ from: open, to: close }];
  const sorted = [...periods].sort((a, b) => {
    const aFrom = parseTime(a.fromTime) + a.dayDelta * 1440;
    const bFrom = parseTime(b.fromTime) + b.dayDelta * 1440;
    return aFrom - bFrom;
  });
  const gaps: GapRange[] = [];
  let cursor = open;
  for (const p of sorted) {
    const pFrom = parseTime(p.fromTime) + p.dayDelta * 1440;
    const pTo = parseTime(p.toTime) + p.dayDelta * 1440;
    if (pFrom > cursor + 1) gaps.push({ from: cursor, to: pFrom });
    cursor = Math.max(cursor, pTo);
  }
  if (cursor + 1 < close) gaps.push({ from: cursor, to: close });
  return gaps;
};

// ── Timeline bar component ──

function TimelineBar({ entry, periods }: { entry: StoreWorkdayEntry; periods: PeriodEdit[] }) {
  const open = parseTime(entry.openTime);
  const close = parseTime(entry.closeTime) + entry.dayDelta * 1440;
  const scaleMax = Math.max(close, 1440); // at least 24h
  const toPercent = (mins: number) => (mins / scaleMax) * 100;
  const barLeft = toPercent(open);
  const barWidth = toPercent(close - open);

  const gaps = findGaps(periods, entry.openTime, entry.closeTime, entry.dayDelta);

  return (
    <Box style={{ position: 'relative', height: 40, background: '#f1f3f5', borderRadius: 4, overflow: 'hidden' }}>
      {/* Business hours bar */}
      <Box style={{
        position: 'absolute', left: `${barLeft}%`, width: `${barWidth}%`, top: 0, bottom: 0,
        background: '#d0ebff', borderRadius: 4, border: '1px solid #74c0fc',
      }} />
      {/* Gap indicators */}
      {gaps.map((gap, i) => {
        const gLeft = toPercent(gap.from);
        const gWidth = toPercent(gap.to - gap.from);
        return (
          <Box key={i} style={{
            position: 'absolute', left: `${gLeft}%`, width: `${gWidth}%`, top: 2, bottom: 2,
            borderRadius: 3, border: '1px dashed #ffa94d', background: 'rgba(255,169,77,0.08)',
          }} />
        );
      })}
      {/* Period blocks */}
      {periods.map((p, i) => {
        const pFrom = parseTime(p.fromTime) + p.dayDelta * 1440;
        const pTo = parseTime(p.toTime) + p.dayDelta * 1440;
        const pLeft = toPercent(pFrom);
        const pWidth = toPercent(pTo - pFrom);
        const color = PERIOD_COLORS[i % PERIOD_COLORS.length];
        return (
          <Tooltip key={i} label={`${p.periodName}: ${fmtTime(pFrom)}–${fmtTime(pTo)}`}>
            <Box style={{
              position: 'absolute', left: `${pLeft}%`, width: `${Math.max(pWidth, 1)}%`, top: 4, bottom: 4,
              borderRadius: 3, background: `var(--mantine-color-${color}-4)`, opacity: 0.85,
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <Text size="10px" c="white" fw={600} truncate>{p.periodName}</Text>
            </Box>
          </Tooltip>
        );
      })}
      {/* Time labels */}
      <Text size="10px" c="dimmed" style={{ position: 'absolute', left: `${barLeft}%`, top: -14, whiteSpace: 'nowrap' }}>
        {fmtTime(open)}
      </Text>
      <Text size="10px" c="dimmed" style={{ position: 'absolute', left: `${barLeft + barWidth}%`, top: -14, whiteSpace: 'nowrap', transform: 'translateX(-100%)' }}>
        {fmtTime(close)}{entry.dayDelta > 0 ? ' +1d' : ''}
      </Text>
    </Box>
  );
}

// ── Main page ──

export function WorkdaySchedulePage() {
  const { brandId, shops, selectedShopId, setSelectedShopId } =
    useStoreSettingsShopSelection();

  const [entries, setEntries] = useState<StoreWorkdayEntry[]>([]);
  const [periods, setPeriods] = useState<StoreWorkdayPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modal state
  const [editDay, setEditDay] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState('06:00');
  const [editClose, setEditClose] = useState('23:00');
  const [editDayDelta, setEditDayDelta] = useState(0);
  const [editPeriods, setEditPeriods] = useState<PeriodEdit[]>([]);
  const [editHeaderId, setEditHeaderId] = useState(0);
  const [modalOpened, setModalOpened] = useState(false);
  const [isNewDay, setIsNewDay] = useState(false);

  // ── Load data ──

  const loadData = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setEntries([]);
      setPeriods([]);
      return;
    }
    try {
      setLoading(true);
      const [snapshot, periodsData] = await Promise.all([
        storeSettingsService.getSnapshot(brandId, selectedShopId),
        storeSettingsService.getWorkdayPeriods(brandId, selectedShopId),
      ]);
      setEntries(snapshot.workdayEntries);
      setPeriods(periodsData);
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load' });
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── Group periods by day ──

  const periodsByHeaderId = useMemo(() => {
    const map = new Map<number, StoreWorkdayPeriod[]>();
    for (const p of periods) {
      const list = map.get(p.workdayHeaderId) ?? [];
      list.push(p);
      map.set(p.workdayHeaderId, list);
    }
    return map;
  }, [periods]);

  const entryByDay = useMemo(() => {
    const map = new Map<string, StoreWorkdayEntry>();
    for (const e of entries) map.set(e.day, e);
    return map;
  }, [entries]);

  // ── Open editor ──

  const openDayEditor = (dayCode: string) => {
    const entry = entryByDay.get(dayCode);
    if (entry) {
      setEditDay(dayCode);
      setEditOpen(entry.openTime.substring(0, 5));
      setEditClose(entry.closeTime.substring(0, 5));
      setEditDayDelta(entry.dayDelta);
      setEditHeaderId(entry.workdayHeaderId);
      const dayPeriods = periodsByHeaderId.get(entry.workdayHeaderId) ?? [];
      setEditPeriods(dayPeriods.map((p) => ({
        id: p.workdayPeriodId,
        periodName: p.periodName,
        fromTime: p.fromTime.substring(0, 5),
        toTime: p.toTime.substring(0, 5),
        dayDelta: p.dayDelta,
        workdayPeriodMasterId: p.workdayPeriodMasterId ?? null,
      })));
      setIsNewDay(false);
    } else {
      setEditDay(dayCode);
      setEditOpen('06:00');
      setEditClose('23:00');
      setEditDayDelta(0);
      setEditHeaderId(0);
      setEditPeriods([]);
      setIsNewDay(true);
    }
    setModalOpened(true);
  };

  // ── Save all ──

  const handleSave = async () => {
    if (!brandId || !selectedShopId || !editDay) return;

    // Validate business hours
    const hoursErr = validateBusinessHours(toApiTime(editOpen), toApiTime(editClose), editDayDelta);
    if (hoursErr) { notifications.show({ color: 'red', message: hoursErr }); return; }

    // Validate periods
    for (const p of editPeriods) {
      if (!p.periodName.trim()) { notifications.show({ color: 'red', message: 'All periods need a name.' }); return; }
      const pErr = validatePeriodInHours(toApiTime(p.fromTime), toApiTime(p.toTime), p.dayDelta, toApiTime(editOpen), toApiTime(editClose), editDayDelta);
      if (pErr) { notifications.show({ color: 'red', message: `${p.periodName}: ${pErr}` }); return; }
    }
    const overlapErr = findOverlappingPeriods(editPeriods);
    if (overlapErr) { notifications.show({ color: 'red', message: overlapErr }); return; }

    try {
      setSaving(true);

      // Build new entries array: replace/add the edited day, keep others
      const updatedEntries = entries.filter((e) => e.day !== editDay);
      updatedEntries.push({
        workdayHeaderId: editHeaderId,
        day: editDay,
        openTime: toApiTime(editOpen),
        closeTime: toApiTime(editClose),
        dayDelta: editDayDelta,
        enabled: true,
      });

      // Save schedule → get back entries with assigned WorkdayHeaderIds
      const savedEntries = await storeSettingsService.updateWorkday(brandId, selectedShopId, { entries: updatedEntries });

      // Find the saved header ID for the edited day
      const savedDay = savedEntries.find((e) => e.day === editDay);
      const newHeaderId = savedDay?.workdayHeaderId ?? editHeaderId;

      // Build full periods array: periods for other days + edited day's periods
      const otherPeriods = periods.filter((p) => p.workdayHeaderId !== editHeaderId && p.workdayHeaderId !== newHeaderId);
      const editedDayPeriods: StoreWorkdayPeriod[] = editPeriods.map((p) => ({
        workdayPeriodId: p.id,
        workdayHeaderId: newHeaderId,
        periodName: p.periodName.trim(),
        fromTime: toApiTime(p.fromTime),
        toTime: toApiTime(p.toTime),
        dayDelta: p.dayDelta,
        enabled: true,
        workdayPeriodMasterId: p.workdayPeriodMasterId ?? null,
      }));

      await storeSettingsService.replaceWorkdayPeriods(brandId, selectedShopId, {
        periods: [...otherPeriods, ...editedDayPeriods],
      });

      notifications.show({ color: 'green', message: `${dayLabel(editDay)} schedule saved` });
      setModalOpened(false);
      await loadData();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  // ── Remove day ──

  const handleRemoveDay = async () => {
    if (!brandId || !selectedShopId || !editDay) return;
    try {
      setSaving(true);
      const updatedEntries = entries.filter((e) => e.day !== editDay);
      await storeSettingsService.updateWorkday(brandId, selectedShopId, { entries: updatedEntries });

      // Also remove periods for this day
      const otherPeriods = periods.filter((p) => p.workdayHeaderId !== editHeaderId);
      await storeSettingsService.replaceWorkdayPeriods(brandId, selectedShopId, { periods: otherPeriods });

      notifications.show({ color: 'green', message: `${dayLabel(editDay)} removed` });
      setModalOpened(false);
      await loadData();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to remove' });
    } finally {
      setSaving(false);
    }
  };

  // ── Modal validation state ──

  const modalHoursError = useMemo(
    () => validateBusinessHours(toApiTime(editOpen), toApiTime(editClose), editDayDelta),
    [editOpen, editClose, editDayDelta],
  );

  const modalOverlapError = useMemo(() => findOverlappingPeriods(editPeriods), [editPeriods]);

  const modalGaps = useMemo(
    () => editDay ? findGaps(editPeriods, toApiTime(editOpen), toApiTime(editClose), editDayDelta) : [],
    [editDay, editPeriods, editOpen, editClose, editDayDelta],
  );

  // ── Shop selector ──

  const shopOptions = useMemo(
    () => shops.map((s) => ({ value: String(s.shopId), label: s.shopName })),
    [shops],
  );

  // ── Render ──

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Workday Schedule</Title>
            <Text size="sm" c="dimmed">Configure business hours and service periods per day.</Text>
          </div>
          <Group>
            {shopOptions.length > 0 && (
              <select
                value={selectedShopId ?? ''}
                onChange={(e) => setSelectedShopId(e.target.value ? Number(e.target.value) : null)}
                style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ced4da' }}
              >
                <option value="">Select shop</option>
                {shopOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
            <Button variant="subtle" onClick={() => void loadData()} loading={loading}>Refresh</Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">Select a brand to manage workday schedules.</Alert>
        )}

        {loading && (
          <Group justify="center" py="xl"><Loader size="sm" /><Text size="sm" c="dimmed">Loading...</Text></Group>
        )}

        {!loading && selectedShopId && (
          <Stack gap="xs">
            {DAYS.map((day) => {
              const entry = entryByDay.get(day.code);
              const dayPeriods = entry ? (periodsByHeaderId.get(entry.workdayHeaderId) ?? []) : [];
              const editablePeriods: PeriodEdit[] = dayPeriods.map((p) => ({
                id: p.workdayPeriodId,
                periodName: p.periodName,
                fromTime: p.fromTime.substring(0, 5),
                toTime: p.toTime.substring(0, 5),
                dayDelta: p.dayDelta,
                workdayPeriodMasterId: p.workdayPeriodMasterId ?? null,
              }));

              return (
                <Paper key={day.code} withBorder p="sm" radius="md"
                  style={{ cursor: 'pointer' }}
                  onClick={() => openDayEditor(day.code)}
                >
                  <Group gap="md" wrap="nowrap">
                    <Box w={70}>
                      <Text fw={600} size="sm">{day.short}</Text>
                    </Box>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      {entry ? (
                        <Box pt={14}>
                          <TimelineBar entry={entry} periods={editablePeriods} />
                        </Box>
                      ) : (
                        <Text size="sm" c="dimmed" fs="italic">Closed</Text>
                      )}
                    </Box>
                    <ActionIcon variant="subtle" color={entry ? 'blue' : 'green'}
                      onClick={(e) => { e.stopPropagation(); openDayEditor(day.code); }}>
                      {entry ? <IconEdit size={16} /> : <IconPlus size={16} />}
                    </ActionIcon>
                  </Group>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* ── Day Editor Modal ── */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={`${isNewDay ? 'Add' : 'Edit'} ${editDay ? dayLabel(editDay) : ''}`}
        size="lg"
      >
        <Stack gap="md">
          {/* Business Hours */}
          <Title order={5}>
            <Group gap="xs"><IconClock size={16} /> Business Hours</Group>
          </Title>
          <Group grow>
            <TextInput
              label="Open"
              placeholder="HH:MM"
              value={editOpen}
              onChange={(e) => setEditOpen(e.currentTarget.value)}
            />
            <TextInput
              label="Close"
              placeholder="HH:MM"
              value={editClose}
              onChange={(e) => setEditClose(e.currentTarget.value)}
            />
          </Group>
          <Checkbox
            label="Closes next day (cross-midnight)"
            checked={editDayDelta > 0}
            onChange={(e) => setEditDayDelta(e.currentTarget.checked ? 1 : 0)}
          />

          {modalHoursError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{modalHoursError}</Alert>
          )}

          {/* Gaps warning */}
          {!modalHoursError && modalGaps.length > 0 && editPeriods.length > 0 && (
            <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
              <Text size="sm" fw={500}>Gaps in coverage:</Text>
              {modalGaps.map((g, i) => (
                <Text key={i} size="sm">{fmtTime(g.from)} – {fmtTime(g.to)}</Text>
              ))}
            </Alert>
          )}

          {/* Periods */}
          <Group justify="space-between">
            <Title order={5}>Periods</Title>
            <Button size="xs" variant="light" leftSection={<IconPlus size={14} />}
              onClick={() => setEditPeriods([...editPeriods, {
                id: 0, periodName: '', fromTime: editOpen, toTime: editClose, dayDelta: 0, workdayPeriodMasterId: null,
              }])}>
              Add Period
            </Button>
          </Group>

          {editPeriods.length === 0 && (
            <Text size="sm" c="dimmed" fs="italic">No periods defined. The full business hours will be uncovered.</Text>
          )}

          {editPeriods.map((p, idx) => (
            <Paper key={idx} withBorder p="xs" radius="sm">
              <Group gap="xs" wrap="nowrap" align="flex-end">
                <TextInput
                  label="Name"
                  size="xs"
                  style={{ flex: 1 }}
                  value={p.periodName}
                  onChange={(e) => {
                    const updated = [...editPeriods];
                    updated[idx] = { ...p, periodName: e.currentTarget.value };
                    setEditPeriods(updated);
                  }}
                />
                <TextInput
                  label="From"
                  size="xs"
                  w={80}
                  placeholder="HH:MM"
                  value={p.fromTime}
                  onChange={(e) => {
                    const updated = [...editPeriods];
                    updated[idx] = { ...p, fromTime: e.currentTarget.value };
                    setEditPeriods(updated);
                  }}
                />
                <TextInput
                  label="To"
                  size="xs"
                  w={80}
                  placeholder="HH:MM"
                  value={p.toTime}
                  onChange={(e) => {
                    const updated = [...editPeriods];
                    updated[idx] = { ...p, toTime: e.currentTarget.value };
                    setEditPeriods(updated);
                  }}
                />
                <Checkbox
                  label="+1d"
                  size="xs"
                  checked={p.dayDelta > 0}
                  onChange={(e) => {
                    const updated = [...editPeriods];
                    updated[idx] = { ...p, dayDelta: e.currentTarget.checked ? 1 : 0 };
                    setEditPeriods(updated);
                  }}
                />
                <ActionIcon variant="subtle" color="red" onClick={() => {
                  setEditPeriods(editPeriods.filter((_, i) => i !== idx));
                }}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}

          {modalOverlapError && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">{modalOverlapError}</Alert>
          )}

          {/* Preview bar */}
          {!modalHoursError && editDay && (
            <>
              <Title order={5}>Preview</Title>
              <Box pt={14}>
                <TimelineBar
                  entry={{ workdayHeaderId: 0, day: editDay, openTime: toApiTime(editOpen), closeTime: toApiTime(editClose), dayDelta: editDayDelta, enabled: true }}
                  periods={editPeriods}
                />
              </Box>
            </>
          )}

          {/* Actions */}
          <Group justify="space-between" mt="md">
            {!isNewDay ? (
              <Button variant="subtle" color="red" onClick={() => void handleRemoveDay()} loading={saving}>
                Remove Day
              </Button>
            ) : <div />}
            <Group>
              <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
              <Button onClick={() => void handleSave()} loading={saving}
                disabled={!!modalHoursError || !!modalOverlapError}>
                Save
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
