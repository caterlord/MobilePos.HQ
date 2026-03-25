import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Checkbox,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowBackUp,
  IconDeviceFloppy,
  IconDownload,
  IconLock,
  IconLockOpen,
  IconPlus,
  IconUpload,
} from '@tabler/icons-react';
import type { StoreSystemParameter } from '../../../services/storeSettingsService';
import storeSettingsService from '../../../services/storeSettingsService';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';

interface NewParameterForm {
  paramCode: string;
  description: string;
  paramValue: string;
  enabled: boolean;
}

const defaultNewParameter: NewParameterForm = {
  paramCode: '',
  description: '',
  paramValue: '',
  enabled: true,
};

// ── Import diff types ──
interface ImportDiffRow {
  paramCode: string;
  description: string;
  paramValue: string;
  enabled: boolean;
  action: 'insert' | 'update' | 'remove';
  oldValue?: string;
  selected: boolean;
}

export function StoreSystemParametersPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, reloadShops } =
    useStoreSettingsShopSelection();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingParamCode, setSavingParamCode] = useState<string | null>(null);
  const [parameters, setParameters] = useState<StoreSystemParameter[]>([]);
  const [originalParameters, setOriginalParameters] = useState<StoreSystemParameter[]>([]);

  // Lock state — all rows locked by default
  const [unlocked, setUnlocked] = useState(false);
  const [showUnlockWarning, setShowUnlockWarning] = useState(false);

  // Add new param modal
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [newParameter, setNewParameter] = useState<NewParameterForm>(defaultNewParameter);

  // Import modal
  const [importModalOpened, setImportModalOpened] = useState(false);
  const [importDiff, setImportDiff] = useState<ImportDiffRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadParameters = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setParameters([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await storeSettingsService.getSnapshot(brandId, selectedShopId);
      setParameters(response.systemParameters);
      setOriginalParameters(response.systemParameters);
      setUnlocked(false); // Re-lock on load
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load system parameters';
      setError(message);
      setParameters([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadParameters();
  }, [loadParameters]);

  // ── Save parameter ──
  const saveParameter = async (parameter: StoreSystemParameter) => {
    if (!brandId || !selectedShopId) return;
    const normalizedCode = parameter.paramCode.trim().toUpperCase();
    if (!normalizedCode) {
      notifications.show({ color: 'red', message: 'Parameter code is required' });
      return;
    }
    try {
      setSavingParamCode(normalizedCode);
      const response = await storeSettingsService.upsertSystemParameter(brandId, selectedShopId, normalizedCode, {
        description: parameter.description.trim(),
        paramValue: parameter.paramValue,
        enabled: parameter.enabled,
      });
      setParameters((prev) => {
        const next = [...prev];
        const idx = next.findIndex((p) => p.paramCode === normalizedCode);
        if (idx >= 0) next[idx] = response;
        return next;
      });
      setOriginalParameters((prev) => {
        const next = [...prev];
        const idx = next.findIndex((p) => p.paramCode === normalizedCode);
        if (idx >= 0) next[idx] = response;
        else next.push(response);
        return next;
      });
      notifications.show({ color: 'green', message: `Parameter ${normalizedCode} saved` });
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSavingParamCode(null);
    }
  };

  // ── Add new parameter ──
  const addParameter = async () => {
    if (!brandId || !selectedShopId) return;
    const paramCode = newParameter.paramCode.trim().toUpperCase();
    if (!paramCode || !newParameter.description.trim()) {
      notifications.show({ color: 'red', message: 'Code and description are required' });
      return;
    }
    try {
      setSavingParamCode(paramCode);
      const response = await storeSettingsService.upsertSystemParameter(brandId, selectedShopId, paramCode, {
        description: newParameter.description.trim(),
        paramValue: newParameter.paramValue,
        enabled: newParameter.enabled,
      });
      setParameters((prev) => {
        const idx = prev.findIndex((p) => p.paramCode === response.paramCode);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = response;
          return next;
        }
        return [...prev, response].sort((a, b) => a.paramCode.localeCompare(b.paramCode));
      });
      setNewParameter(defaultNewParameter);
      setAddModalOpened(false);
      notifications.show({ color: 'green', message: `Parameter ${paramCode} added` });
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to add' });
    } finally {
      setSavingParamCode(null);
    }
  };

  // ── Unlock toggle ──
  const handleUnlockToggle = () => {
    if (unlocked) {
      setUnlocked(false);
    } else {
      setShowUnlockWarning(true);
    }
  };

  const confirmUnlock = () => {
    setUnlocked(true);
    setShowUnlockWarning(false);
  };

  // ── Export to JSON ──
  const exportToJson = () => {
    const data = parameters.map((p) => ({
      paramCode: p.paramCode,
      description: p.description,
      paramValue: p.paramValue,
      enabled: p.enabled,
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-params-shop-${selectedShopId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notifications.show({ color: 'green', message: `Exported ${data.length} parameters` });
  };

  // ── Import from JSON ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as Array<{
          paramCode: string; description: string; paramValue: string; enabled: boolean;
        }>;
        if (!Array.isArray(imported)) throw new Error('Expected array');

        const existingMap = new Map(parameters.map((p) => [p.paramCode, p]));
        const importedCodes = new Set(imported.map((p) => p.paramCode));
        const diff: ImportDiffRow[] = [];

        // Inserts and Updates
        for (const row of imported) {
          const existing = existingMap.get(row.paramCode);
          if (!existing) {
            diff.push({ ...row, action: 'insert', selected: true });
          } else if (existing.paramValue !== row.paramValue || existing.description !== row.description || existing.enabled !== row.enabled) {
            diff.push({ ...row, action: 'update', oldValue: existing.paramValue, selected: true });
          }
        }

        // Removals (in existing but not in import)
        for (const p of parameters) {
          if (!importedCodes.has(p.paramCode)) {
            diff.push({
              paramCode: p.paramCode, description: p.description, paramValue: p.paramValue,
              enabled: p.enabled, action: 'remove', selected: false,
            });
          }
        }

        if (diff.length === 0) {
          notifications.show({ color: 'blue', message: 'No differences found between import and current data.' });
          return;
        }

        setImportDiff(diff);
        setImportModalOpened(true);
      } catch {
        notifications.show({ color: 'red', message: 'Invalid JSON file' });
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const applyImport = async () => {
    if (!brandId || !selectedShopId) return;
    const selected = importDiff.filter((d) => d.selected);
    if (selected.length === 0) {
      notifications.show({ color: 'yellow', message: 'No changes selected' });
      return;
    }
    try {
      setImporting(true);
      for (const row of selected) {
        if (row.action === 'remove') {
          await storeSettingsService.upsertSystemParameter(brandId, selectedShopId, row.paramCode, {
            description: row.description, paramValue: row.paramValue, enabled: false,
          });
        } else {
          await storeSettingsService.upsertSystemParameter(brandId, selectedShopId, row.paramCode, {
            description: row.description, paramValue: row.paramValue, enabled: row.enabled,
          });
        }
      }
      notifications.show({ color: 'green', message: `Applied ${selected.length} changes` });
      setImportModalOpened(false);
      setImportDiff([]);
      await loadParameters();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  // ── Dirty detection and reset ──
  const originalMap = useMemo(
    () => new Map(originalParameters.map((p) => [p.paramCode, p])),
    [originalParameters],
  );

  const isRowDirty = (param: StoreSystemParameter): boolean => {
    const orig = originalMap.get(param.paramCode);
    if (!orig) return true; // newly added
    return orig.description !== param.description
      || orig.paramValue !== param.paramValue
      || orig.enabled !== param.enabled;
  };

  const resetRow = (paramCode: string) => {
    const orig = originalMap.get(paramCode);
    if (!orig) return;
    setParameters((prev) => {
      const next = [...prev];
      const idx = next.findIndex((p) => p.paramCode === paramCode);
      if (idx >= 0) next[idx] = { ...orig };
      return next;
    });
  };

  const shopOptions = useMemo(
    () => shops.map((s) => ({ value: String(s.shopId), label: `${s.shopName}${s.enabled ? '' : ' (Disabled)'}` })),
    [shops],
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>System Parameters</Title>
            <Text size="sm" c="dimmed">Manage store-scoped runtime parameters.</Text>
          </div>
          <Group>
            <Select
              placeholder={shopsLoading ? 'Loading shops...' : 'Select shop'}
              data={shopOptions}
              value={selectedShopId ? String(selectedShopId) : null}
              onChange={(value) => setSelectedShopId(value ? Number.parseInt(value, 10) : null)}
              disabled={!brandId || shopsLoading || shopOptions.length === 0}
              searchable
              style={{ minWidth: 240 }}
            />
            <Button variant="subtle" onClick={() => { void reloadShops(); void loadParameters(); }} loading={loading}>
              Refresh
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage system parameters.
          </Alert>
        )}
        {shopsError && <Alert icon={<IconAlertCircle size={16} />} color="red">{shopsError}</Alert>}
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

        {loading && (
          <Paper withBorder p="xl" radius="md">
            <Group justify="center"><Loader size="sm" /><Text size="sm" c="dimmed">Loading...</Text></Group>
          </Paper>
        )}

        {!loading && selectedShopId && (
          <Paper withBorder p="md" radius="md">
            {/* Toolbar */}
            <Group justify="space-between" mb="sm">
              <Group gap="sm">
                <Tooltip label={unlocked ? 'Lock editing' : 'Unlock editing'}>
                  <ActionIcon
                    variant={unlocked ? 'filled' : 'light'}
                    color={unlocked ? 'orange' : 'gray'}
                    size="lg"
                    onClick={handleUnlockToggle}
                  >
                    {unlocked ? <IconLockOpen size={18} /> : <IconLock size={18} />}
                  </ActionIcon>
                </Tooltip>
                {unlocked && (
                  <Badge color="orange" variant="light" size="lg">Editing unlocked</Badge>
                )}
              </Group>
              <Group gap="xs">
                <Button size="xs" variant="light" leftSection={<IconDownload size={14} />}
                  onClick={exportToJson} disabled={parameters.length === 0}>
                  Export JSON
                </Button>
                <Button size="xs" variant="light" leftSection={<IconUpload size={14} />}
                  onClick={() => fileInputRef.current?.click()} disabled={!unlocked}>
                  Import JSON
                </Button>
                <input type="file" ref={fileInputRef} accept=".json" style={{ display: 'none' }}
                  onChange={handleFileSelect} />
                <Button size="xs" leftSection={<IconPlus size={14} />}
                  onClick={() => { setNewParameter(defaultNewParameter); setAddModalOpened(true); }}
                  disabled={!unlocked}>
                  Add Parameter
                </Button>
              </Group>
            </Group>

            {/* Table */}
            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ width: 180 }}>Code</Table.Th>
                    <Table.Th style={{ width: 250 }}>Description</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th style={{ width: 80 }}>Enabled</Table.Th>
                    <Table.Th style={{ width: 64 }}></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parameters.map((param, idx) => (
                    <Table.Tr key={`${param.paramCode}-${param.paramId}`}>
                      <Table.Td><Text fw={600} size="sm">{param.paramCode}</Text></Table.Td>
                      <Table.Td>
                        {unlocked ? (
                          <TextInput size="xs" value={param.description}
                            onChange={(e) => {
                              const val = e.currentTarget.value;
                              setParameters((prev) => { const n = [...prev]; n[idx] = { ...n[idx], description: val }; return n; });
                            }} />
                        ) : (
                          <Text size="sm">{param.description}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {unlocked ? (
                          <Textarea size="xs" autosize minRows={1} value={param.paramValue}
                            onChange={(e) => {
                              const val = e.currentTarget.value;
                              setParameters((prev) => { const n = [...prev]; n[idx] = { ...n[idx], paramValue: val }; return n; });
                            }} />
                        ) : (
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{param.paramValue}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Switch size="xs" checked={param.enabled} disabled={!unlocked}
                          onChange={(e) => {
                            const val = e.currentTarget.checked;
                            setParameters((prev) => { const n = [...prev]; n[idx] = { ...n[idx], enabled: val }; return n; });
                          }} />
                      </Table.Td>
                      <Table.Td>
                        {unlocked && (
                          <Group gap={4} wrap="nowrap">
                            <Tooltip label="Save">
                              <ActionIcon variant="subtle" color="blue" size="sm"
                                disabled={!isRowDirty(param)}
                                loading={savingParamCode === param.paramCode}
                                onClick={() => void saveParameter(param)}>
                                <IconDeviceFloppy size={14} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Reset">
                              <ActionIcon variant="subtle" color="gray" size="sm"
                                disabled={!isRowDirty(param)}
                                onClick={() => resetRow(param.paramCode)}>
                                <IconArrowBackUp size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {parameters.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text size="sm" c="dimmed" ta="center" py="md">No system parameters found.</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </Box>
          </Paper>
        )}
      </Stack>

      {/* ── Unlock Warning Modal ── */}
      <Modal opened={showUnlockWarning} onClose={() => setShowUnlockWarning(false)} title="Unlock System Parameters" size="md">
        <Stack gap="md">
          <Alert icon={<IconAlertTriangle size={20} />} color="red" variant="filled">
            <Text size="sm" fw={600}>Warning: Modifying system parameters can cause serious issues</Text>
          </Alert>
          <Text size="sm">
            System parameters control critical POS runtime behavior. Incorrect values can cause:
          </Text>
          <Box component="ul" style={{ margin: 0, paddingLeft: 20 }}>
            <li><Text size="sm">POS terminals to malfunction or crash</Text></li>
            <li><Text size="sm">Transaction processing errors</Text></li>
            <li><Text size="sm">Data corruption or loss</Text></li>
            <li><Text size="sm">Integration failures with payment gateways</Text></li>
          </Box>
          <Text size="sm" fw={600} c="red">
            Only modify parameters under guidance from the Everyware support team.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setShowUnlockWarning(false)}>Cancel</Button>
            <Button color="red" leftSection={<IconLockOpen size={16} />} onClick={confirmUnlock}>
              I understand, unlock editing
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Add Parameter Modal ── */}
      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add System Parameter" size="md">
        <Stack gap="md">
          <TextInput label="Parameter Code" placeholder="e.g. POS_TIMEOUT" required
            value={newParameter.paramCode}
            onChange={(e) => setNewParameter((prev) => ({ ...prev, paramCode: e.currentTarget.value }))} />
          <TextInput label="Description" required
            value={newParameter.description}
            onChange={(e) => setNewParameter((prev) => ({ ...prev, description: e.currentTarget.value }))} />
          <Textarea label="Value" autosize minRows={2}
            value={newParameter.paramValue}
            onChange={(e) => setNewParameter((prev) => ({ ...prev, paramValue: e.currentTarget.value }))} />
          <Switch label="Enabled" checked={newParameter.enabled}
            onChange={(e) => setNewParameter((prev) => ({ ...prev, enabled: e.currentTarget.checked }))} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>Cancel</Button>
            <Button leftSection={<IconPlus size={16} />} onClick={() => void addParameter()}
              loading={Boolean(savingParamCode)}>
              Add Parameter
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Import Diff Modal ── */}
      <Modal opened={importModalOpened} onClose={() => setImportModalOpened(false)} title="Import System Parameters" size="xl">
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            Review the changes below. Select which changes to apply.
          </Alert>

          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ width: 40 }}>Apply</Table.Th>
                <Table.Th style={{ width: 80 }}>Action</Table.Th>
                <Table.Th>Code</Table.Th>
                <Table.Th>New Value</Table.Th>
                <Table.Th>Old Value</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {importDiff.map((row, idx) => (
                <Table.Tr key={row.paramCode}>
                  <Table.Td>
                    <Checkbox checked={row.selected}
                      onChange={(e) => {
                        const updated = [...importDiff];
                        updated[idx] = { ...row, selected: e.currentTarget.checked };
                        setImportDiff(updated);
                      }} />
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={row.action === 'insert' ? 'green' : row.action === 'update' ? 'blue' : 'red'}>
                      {row.action}
                    </Badge>
                  </Table.Td>
                  <Table.Td><Text size="sm" fw={500}>{row.paramCode}</Text></Table.Td>
                  <Table.Td>
                    <Text size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {row.action === 'remove' ? '(will be disabled)' : row.paramValue}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {row.oldValue ?? '(new)'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          <Group justify="space-between">
            <Group gap="xs">
              <Button size="xs" variant="subtle"
                onClick={() => setImportDiff((prev) => prev.map((r) => ({ ...r, selected: true })))}>
                Select all
              </Button>
              <Button size="xs" variant="subtle"
                onClick={() => setImportDiff((prev) => prev.map((r) => ({ ...r, selected: false })))}>
                Deselect all
              </Button>
            </Group>
            <Group>
              <Button variant="default" onClick={() => setImportModalOpened(false)}>Cancel</Button>
              <Button onClick={() => void applyImport()} loading={importing}
                disabled={importDiff.filter((d) => d.selected).length === 0}>
                Apply {importDiff.filter((d) => d.selected).length} changes
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
