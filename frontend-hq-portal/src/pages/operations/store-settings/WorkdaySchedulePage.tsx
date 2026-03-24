import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash, IconClock, IconSettings } from '@tabler/icons-react';
import type { StoreWorkdayEntry, StoreWorkdayPeriod, WorkdayPeriodMaster, UpsertWorkdayPeriodMaster } from '../../../services/storeSettingsService';
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
    const aFrom = parseTime(a.fromTime);
    const bFrom = parseTime(b.fromTime);
    return aFrom - bFrom;
  });
  for (let i = 0; i < sorted.length - 1; i++) {
    const curEnd = parseTime(sorted[i].toTime) + sorted[i].dayDelta * 1440;
    const nextStart = parseTime(sorted[i + 1].fromTime);
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
    const aFrom = parseTime(a.fromTime);
    const bFrom = parseTime(b.fromTime);
    return aFrom - bFrom;
  });
  const gaps: GapRange[] = [];
  let cursor = open;
  for (const p of sorted) {
    const pFrom = parseTime(p.fromTime);
    const pTo = parseTime(p.toTime) + p.dayDelta * 1440;
    if (pFrom > cursor + 1) gaps.push({ from: cursor, to: pFrom });
    cursor = Math.max(cursor, pTo);
  }
  if (cursor + 1 < close) gaps.push({ from: cursor, to: close });
  return gaps;
};

// ── Overflow info: cross-midnight bleed from previous day ──

interface OverflowInfo {
  periodName: string;
  endMinutes: number; // minutes into the next day (e.g., 240 for 04:00)
}

/** Get the next day code in the weekly cycle (Mon→Tue...Sun→Mon). Holiday has no next day. */
const NEXT_DAY: Record<string, string> = { '1': '2', '2': '3', '3': '4', '4': '5', '5': '6', '6': '0', '0': '1' };

/** Compute overflows: periods that bleed into the next day */
function computeOverflows(entries: StoreWorkdayEntry[], periodsByHeaderId: Map<number, StoreWorkdayPeriod[]>): Map<string, OverflowInfo[]> {
  const result = new Map<string, OverflowInfo[]>();
  for (const entry of entries) {
    const nextDay = NEXT_DAY[entry.day]; // undefined for Holiday
    if (!nextDay) continue;
    const dayPeriods = periodsByHeaderId.get(entry.workdayHeaderId) ?? [];
    for (const p of dayPeriods) {
      if (p.dayDelta > 0) {
        const endMins = parseTime(p.toTime); // minutes into the next day
        if (endMins > 0) {
          const list = result.get(nextDay) ?? [];
          list.push({ periodName: p.periodName, endMinutes: endMins });
          result.set(nextDay, list);
        }
      }
    }
    // Also check if business hours overflow bleeds (even without a named period)
    if (entry.dayDelta > 0) {
      const closeMins = parseTime(entry.closeTime);
      const existingOverflows = result.get(nextDay) ?? [];
      const latestPeriodEnd = dayPeriods
        .filter((p) => p.dayDelta > 0)
        .reduce((max, p) => Math.max(max, parseTime(p.toTime)), 0);
      // If business hours extend beyond last period, show business hours overflow
      if (closeMins > latestPeriodEnd && existingOverflows.length === 0) {
        existingOverflows.push({ periodName: `${dayLabel(entry.day)} overflow`, endMinutes: closeMins });
        result.set(nextDay, existingOverflows);
      }
    }
  }
  return result;
}

// ── Timeline bar component ──

function TimelineBar({ entry, periods, overflows }: {
  entry: StoreWorkdayEntry;
  periods: PeriodEdit[];
  overflows?: OverflowInfo[];
}) {
  const open = parseTime(entry.openTime);
  const close = parseTime(entry.closeTime) + entry.dayDelta * 1440;
  const scaleMax = Math.max(close, 1440); // at least 24h
  const toPercent = (mins: number) => (mins / scaleMax) * 100;
  const barLeft = toPercent(open);
  const barWidth = toPercent(close - open);

  const gaps = findGaps(periods, entry.openTime, entry.closeTime, entry.dayDelta);

  return (
    <Box style={{ position: 'relative', height: 40, background: '#f1f3f5', borderRadius: 4, overflow: 'hidden' }}>
      {/* Previous day overflow (hatched/grey) */}
      {overflows && overflows.map((ov, i) => {
        const ovWidth = toPercent(ov.endMinutes);
        return (
          <Tooltip key={`ov-${i}`} label={`${ov.periodName} (prev day overflow until ${fmtTime(ov.endMinutes)})`}>
            <Box style={{
              position: 'absolute', left: 0, width: `${ovWidth}%`, top: 0, bottom: 0,
              background: 'repeating-linear-gradient(45deg, #dee2e6, #dee2e6 4px, #e9ecef 4px, #e9ecef 8px)',
              borderRadius: '4px 0 0 4px', opacity: 0.7,
            }} />
          </Tooltip>
        );
      })}
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
        const pFrom = parseTime(p.fromTime);
        const pTo = parseTime(p.toTime) + p.dayDelta * 1440;
        const pLeft = toPercent(pFrom);
        const pWidth = toPercent(pTo - pFrom);
        const color = PERIOD_COLORS[i % PERIOD_COLORS.length];
        return (
          <Tooltip key={i} label={`${p.periodName}: ${fmtTime(pFrom)}–${fmtTime(pTo % 1440)}${p.dayDelta > 0 ? ' +1d' : ''}`}>
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
        {fmtTime(close % 1440)}{entry.dayDelta > 0 ? ' +1d' : ''}
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

  // Period master state
  const [masters, setMasters] = useState<WorkdayPeriodMaster[]>([]);
  const [masterModalOpened, setMasterModalOpened] = useState(false);
  const [masterEditTarget, setMasterEditTarget] = useState<WorkdayPeriodMaster | null>(null);
  const [masterPayload, setMasterPayload] = useState<UpsertWorkdayPeriodMaster>({ periodName: '', periodCode: '' });
  const [masterRenameWarning, setMasterRenameWarning] = useState<string | null>(null);
  const [masterSubmitting, setMasterSubmitting] = useState(false);

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
      const [snapshot, periodsData, mastersData] = await Promise.all([
        storeSettingsService.getSnapshot(brandId, selectedShopId),
        storeSettingsService.getWorkdayPeriods(brandId, selectedShopId),
        storeSettingsService.getPeriodMasters(brandId),
      ]);
      setEntries(snapshot.workdayEntries);
      setPeriods(periodsData);
      setMasters(mastersData);
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

  const overflowsByDay = useMemo(
    () => computeOverflows(entries, periodsByHeaderId),
    [entries, periodsByHeaderId],
  );

  // ── Period master options for Select dropdown ──

  const masterOptions = useMemo(
    () => masters.map((m) => ({ value: String(m.workdayPeriodMasterId), label: m.periodName })),
    [masters],
  );

  const loadMasters = useCallback(async () => {
    if (!brandId) return;
    try {
      setMasters(await storeSettingsService.getPeriodMasters(brandId));
    } catch { /* ignore */ }
  }, [brandId]);

  const openMasterCreate = () => {
    setMasterEditTarget(null);
    setMasterPayload({ periodName: '', periodCode: '' });
    setMasterRenameWarning(null);
    setMasterModalOpened(true);
  };

  const openMasterEdit = (m: WorkdayPeriodMaster) => {
    setMasterEditTarget(m);
    setMasterPayload({ periodName: m.periodName, periodCode: m.periodCode });
    setMasterRenameWarning(null);
    setMasterModalOpened(true);
  };

  const handleMasterSave = async (cascadeRename = false) => {
    if (!brandId) return;
    if (!masterPayload.periodName.trim()) {
      notifications.show({ color: 'red', message: 'Period name is required' });
      return;
    }
    try {
      setMasterSubmitting(true);
      if (masterEditTarget) {
        // Check if name changed and periods are using it
        if (masterEditTarget.periodName !== masterPayload.periodName.trim() && masterEditTarget.usageCount > 0 && !cascadeRename) {
          setMasterRenameWarning(`${masterEditTarget.usageCount} active period(s) use "${masterEditTarget.periodName}". Rename them too?`);
          setMasterSubmitting(false);
          return;
        }
        await storeSettingsService.updatePeriodMaster(brandId, masterEditTarget.workdayPeriodMasterId, masterPayload, cascadeRename);
        notifications.show({ color: 'green', message: 'Period master updated' });
      } else {
        await storeSettingsService.createPeriodMaster(brandId, masterPayload);
        notifications.show({ color: 'green', message: 'Period master created' });
      }
      setMasterModalOpened(false);
      setMasterRenameWarning(null);
      await loadMasters();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setMasterSubmitting(false);
    }
  };

  const handleMasterDelete = async (m: WorkdayPeriodMaster) => {
    if (!brandId) return;
    try {
      setMasterSubmitting(true);
      await storeSettingsService.deactivatePeriodMaster(brandId, m.workdayPeriodMasterId);
      notifications.show({ color: 'green', message: 'Period master removed' });
      await loadMasters();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to remove' });
    } finally {
      setMasterSubmitting(false);
    }
  };

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
          <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
            {/* Hour header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '56px repeat(24, 1fr) 40px', borderBottom: '1px solid #e9ecef' }}>
              <div style={{ padding: '6px 8px', background: '#f8f9fa', borderRight: '1px solid #e9ecef' }} />
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} style={{
                  padding: '4px 0', textAlign: 'center', fontSize: 10, color: '#868e96',
                  background: '#f8f9fa', borderRight: i < 23 ? '1px solid #f1f3f5' : 'none',
                }}>
                  {String(i).padStart(2, '0')}
                </div>
              ))}
              <div style={{ background: '#f8f9fa' }} />
            </div>
            {/* Day rows */}
            {DAYS.map((day, dayIdx) => {
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
              const dayOverflows = overflowsByDay.get(day.code);

              return (
                <div key={day.code}
                  style={{
                    display: 'grid', gridTemplateColumns: '56px 1fr 40px',
                    borderBottom: dayIdx < DAYS.length - 1 ? '1px solid #e9ecef' : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onClick={() => openDayEditor(day.code)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                >
                  {/* Day label */}
                  <div style={{
                    padding: '8px 8px', borderRight: '1px solid #e9ecef',
                    display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 13,
                    color: day.code === 'H' ? '#e8590c' : undefined,
                  }}>
                    {day.short}
                  </div>
                  {/* Timeline cell */}
                  <div style={{ position: 'relative', height: 44, minWidth: 0 }}>
                    {/* Hour gridlines */}
                    {Array.from({ length: 23 }, (_, i) => (
                      <div key={i} style={{
                        position: 'absolute', left: `${((i + 1) / 24) * 100}%`, top: 0, bottom: 0,
                        width: 1, background: '#f1f3f5',
                      }} />
                    ))}
                    {/* Overflow from previous day */}
                    {dayOverflows && dayOverflows.map((ov, i) => {
                      const ovWidth = (ov.endMinutes / 1440) * 100;
                      return (
                        <Tooltip key={`ov-${i}`} label={`${ov.periodName} (prev day until ${fmtTime(ov.endMinutes)})`}>
                          <div style={{
                            position: 'absolute', left: 0, width: `${ovWidth}%`, top: 2, bottom: 2,
                            background: 'repeating-linear-gradient(45deg, #dee2e6, #dee2e6 3px, #e9ecef 3px, #e9ecef 6px)',
                            borderRadius: 2, opacity: 0.7,
                          }} />
                        </Tooltip>
                      );
                    })}
                    {entry ? (
                      <>
                        {/* Business hours block */}
                        {(() => {
                          const open = parseTime(entry.openTime);
                          const close = parseTime(entry.closeTime) + entry.dayDelta * 1440;
                          const left = (open / 1440) * 100;
                          const width = ((Math.min(close, 1440) - open) / 1440) * 100;
                          return (
                            <div style={{
                              position: 'absolute', left: `${left}%`, width: `${width}%`, top: 2, bottom: 2,
                              background: '#d0ebff', borderRadius: 3, border: '1px solid #74c0fc',
                            }} />
                          );
                        })()}
                        {/* Period blocks */}
                        {editablePeriods.map((p, i) => {
                          const pFrom = parseTime(p.fromTime);
                          const pTo = parseTime(p.toTime) + p.dayDelta * 1440;
                          const left = (pFrom / 1440) * 100;
                          const width = ((Math.min(pTo, 1440) - pFrom) / 1440) * 100;
                          const color = PERIOD_COLORS[i % PERIOD_COLORS.length];
                          return (
                            <Tooltip key={i} label={`${p.periodName}: ${fmtTime(pFrom)}–${fmtTime(pTo % 1440)}${p.dayDelta > 0 ? ' +1d' : ''}`}>
                              <div style={{
                                position: 'absolute', left: `${left}%`, width: `${Math.max(width, 0.5)}%`, top: 5, bottom: 5,
                                borderRadius: 2, background: `var(--mantine-color-${color}-4)`, opacity: 0.9,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                              }}>
                                <span style={{ fontSize: 10, color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>{p.periodName}</span>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 8 }}>
                        <Text size="xs" c="dimmed" fs="italic">Closed</Text>
                      </div>
                    )}
                  </div>
                  {/* Action icon */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ActionIcon variant="subtle" color={entry ? 'blue' : 'green'} size="sm"
                      onClick={(e) => { e.stopPropagation(); openDayEditor(day.code); }}>
                      {entry ? <IconEdit size={14} /> : <IconPlus size={14} />}
                    </ActionIcon>
                  </div>
                </div>
              );
            })}
          </Paper>
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
          <Group grow align="flex-end">
            <TextInput
              label="Open"
              placeholder="HH:MM"
              value={editOpen}
              onChange={(e) => {
                setEditOpen(e.currentTarget.value);
                setEditDayDelta(parseTime(e.currentTarget.value) > parseTime(editClose) ? 1 : 0);
              }}
            />
            <TextInput
              label="Close"
              placeholder="HH:MM"
              value={editClose}
              onChange={(e) => {
                setEditClose(e.currentTarget.value);
                setEditDayDelta(parseTime(editOpen) > parseTime(e.currentTarget.value) ? 1 : 0);
              }}
            />
            {editDayDelta > 0 && (
              <Badge color="blue" variant="light" size="lg" style={{ flexShrink: 0 }}>+1 day</Badge>
            )}
          </Group>

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
            <Group gap="xs">
              <Title order={5}>Periods</Title>
              <ActionIcon variant="subtle" color="gray" size="sm"
                onClick={(e) => { e.stopPropagation(); openMasterCreate(); }}>
                <Tooltip label="Manage period names"><IconSettings size={14} /></Tooltip>
              </ActionIcon>
            </Group>
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
                <Select
                  label="Period"
                  size="xs"
                  style={{ flex: 1 }}
                  data={masterOptions}
                  value={p.workdayPeriodMasterId ? String(p.workdayPeriodMasterId) : null}
                  onChange={(val) => {
                    const master = masters.find((m) => String(m.workdayPeriodMasterId) === val);
                    const updated = [...editPeriods];
                    updated[idx] = {
                      ...p,
                      periodName: master?.periodName ?? p.periodName,
                      workdayPeriodMasterId: master?.workdayPeriodMasterId ?? null,
                    };
                    setEditPeriods(updated);
                  }}
                  placeholder="Select period"
                  searchable
                />
                <TextInput
                  label="From"
                  size="xs"
                  w={80}
                  placeholder="HH:MM"
                  value={p.fromTime}
                  onChange={(e) => {
                    const from = e.currentTarget.value;
                    const updated = [...editPeriods];
                    updated[idx] = { ...p, fromTime: from, dayDelta: parseTime(from) > parseTime(p.toTime) ? 1 : 0 };
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
                    const to = e.currentTarget.value;
                    const updated = [...editPeriods];
                    updated[idx] = { ...p, toTime: to, dayDelta: parseTime(p.fromTime) > parseTime(to) ? 1 : 0 };
                    setEditPeriods(updated);
                  }}
                />
                {p.dayDelta > 0 && (
                  <Badge color="blue" variant="light" size="sm" style={{ flexShrink: 0 }}>+1d</Badge>
                )}
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

      {/* ── Period Master Management Modal ── */}
      <Modal
        opened={masterModalOpened}
        onClose={() => { setMasterModalOpened(false); setMasterRenameWarning(null); }}
        title={masterEditTarget ? 'Edit Period Name' : 'Manage Period Names'}
        size="md"
      >
        {!masterEditTarget ? (
          /* List view */
          <Stack gap="md">
            <Group justify="flex-end">
              <Button size="xs" leftSection={<IconPlus size={14} />} onClick={openMasterCreate}>
                Add Period Name
              </Button>
            </Group>
            {masters.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">No period names defined yet.</Text>
            ) : (
              <Stack gap="xs">
                {masters.map((m) => (
                  <Paper key={m.workdayPeriodMasterId} withBorder p="xs" radius="sm">
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text size="sm" fw={500}>{m.periodName}</Text>
                        {m.usageCount > 0 && (
                          <Badge size="xs" variant="light">{m.usageCount} in use</Badge>
                        )}
                      </Group>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" size="sm" onClick={() => openMasterEdit(m)}>
                          <IconEdit size={14} />
                        </ActionIcon>
                        <Tooltip label={m.usageCount > 0 ? `Cannot remove: ${m.usageCount} period(s) in use` : 'Remove'}>
                          <ActionIcon variant="subtle" color="red" size="sm"
                            disabled={m.usageCount > 0}
                            onClick={() => void handleMasterDelete(m)}
                            loading={masterSubmitting}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            )}
          </Stack>
        ) : (
          /* Edit view */
          <Stack gap="md">
            <TextInput label="Period Name" required value={masterPayload.periodName}
              onChange={(e) => { setMasterPayload({ ...masterPayload, periodName: e.currentTarget.value }); setMasterRenameWarning(null); }} />
            <TextInput label="Period Code" value={masterPayload.periodCode}
              onChange={(e) => setMasterPayload({ ...masterPayload, periodCode: e.currentTarget.value })} />

            {masterRenameWarning && (
              <Alert icon={<IconAlertCircle size={16} />} color="orange" variant="light">
                <Text size="sm">{masterRenameWarning}</Text>
                <Group mt="xs">
                  <Button size="xs" color="orange" onClick={() => void handleMasterSave(true)} loading={masterSubmitting}>
                    Yes, rename all
                  </Button>
                  <Button size="xs" variant="default" onClick={() => setMasterRenameWarning(null)}>
                    Cancel
                  </Button>
                </Group>
              </Alert>
            )}

            <Group justify="space-between" mt="md">
              <Button variant="subtle" onClick={() => { setMasterEditTarget(null); setMasterRenameWarning(null); }}>
                Back to list
              </Button>
              <Group>
                <Button variant="default" onClick={() => { setMasterModalOpened(false); setMasterRenameWarning(null); }}>Cancel</Button>
                {!masterRenameWarning && (
                  <Button onClick={() => void handleMasterSave()} loading={masterSubmitting}>Save</Button>
                )}
              </Group>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
