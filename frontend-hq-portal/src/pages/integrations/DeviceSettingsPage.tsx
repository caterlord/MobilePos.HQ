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
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  SegmentedControl,
  Stack,
  Switch,
  Table,
  Tabs,
  Textarea,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconDeviceFloppy,
  IconEdit,
  IconFileText,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import deviceSettingsService, {
  type CashDrawer,
  type DevicePrinter,
  type DeviceTerminal,
  type DeviceTerminalConfigFile,
  type DeviceTerminalModelOption,
  type UpsertCashDrawerRequest,
  type UpsertDevicePrinterRequest,
  type UpsertDeviceTerminalRequest,
} from '../../services/deviceSettingsService';
import { useStoreSettingsShopSelection } from '../operations/store-settings/useStoreSettingsShopSelection';

type DeviceSettingsTab = 'terminals' | 'printers' | 'cash-drawers';
type PrinterType = 'printer' | 'kds' | 'label';

const emptyTerminalForm: UpsertDeviceTerminalRequest = {
  posCode: '',
  posIpAddress: '',
  isServer: false,
  isCashRegister: false,
  cashRegisterCode: '',
  deviceTerminalModelId: 0,
  resolutionWidth: 0,
  resolutionHeight: 0,
};

const emptyPrinterForm = {
  printerName: '',
  printerType: 'printer' as PrinterType,
  isDinein: true,
  isTakeaway: true,
  autoRedirectPrinterIdList: [] as string[],
};

const emptyCashDrawerForm: UpsertCashDrawerRequest = {
  cashDrawerName: '',
};

const resolvePrinterType = (printer: DevicePrinter): PrinterType => {
  if (printer.isKds) {
    return 'kds';
  }

  if (printer.isLabelPrinter) {
    return 'label';
  }

  return 'printer';
};

export function DeviceSettingsPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [activeTab, setActiveTab] = useState<DeviceSettingsTab>('terminals');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [terminalModels, setTerminalModels] = useState<DeviceTerminalModelOption[]>([]);
  const [terminals, setTerminals] = useState<DeviceTerminal[]>([]);
  const [printers, setPrinters] = useState<DevicePrinter[]>([]);
  const [cashDrawers, setCashDrawers] = useState<CashDrawer[]>([]);

  const [terminalModalOpened, setTerminalModalOpened] = useState(false);
  const [terminalSaving, setTerminalSaving] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<DeviceTerminal | null>(null);
  const [terminalForm, setTerminalForm] = useState<UpsertDeviceTerminalRequest>(emptyTerminalForm);
  const [terminalConfigModalOpened, setTerminalConfigModalOpened] = useState(false);
  const [terminalConfigLoading, setTerminalConfigLoading] = useState(false);
  const [terminalConfigError, setTerminalConfigError] = useState<string | null>(null);
  const [terminalConfigData, setTerminalConfigData] = useState<DeviceTerminalConfigFile | null>(null);

  const [printerModalOpened, setPrinterModalOpened] = useState(false);
  const [printerSaving, setPrinterSaving] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<DevicePrinter | null>(null);
  const [printerForm, setPrinterForm] = useState(emptyPrinterForm);

  const [cashDrawerModalOpened, setCashDrawerModalOpened] = useState(false);
  const [cashDrawerSaving, setCashDrawerSaving] = useState(false);
  const [editingCashDrawer, setEditingCashDrawer] = useState<CashDrawer | null>(null);
  const [cashDrawerForm, setCashDrawerForm] = useState<UpsertCashDrawerRequest>(emptyCashDrawerForm);

  const terminalModelOptions = useMemo(
    () =>
      terminalModels.map((model) => ({
        value: String(model.deviceTerminalModelId),
        label: `${model.deviceTerminalModelName} (${model.defaultResolutionWidth}x${model.defaultResolutionHeight})`,
      })),
    [terminalModels],
  );

  const loadData = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setTerminalModels([]);
      setTerminals([]);
      setPrinters([]);
      setCashDrawers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [modelsResponse, terminalsResponse, printersResponse, cashDrawersResponse] = await Promise.all([
        deviceSettingsService.getTerminalModels(brandId, selectedShopId),
        deviceSettingsService.getTerminals(brandId, selectedShopId),
        deviceSettingsService.getPrinters(brandId, selectedShopId),
        deviceSettingsService.getCashDrawers(brandId, selectedShopId),
      ]);

      setTerminalModels(modelsResponse);
      setTerminals(terminalsResponse);
      setPrinters(printersResponse);
      setCashDrawers(cashDrawersResponse);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load device settings';
      setError(message);
      setTerminalModels([]);
      setTerminals([]);
      setPrinters([]);
      setCashDrawers([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateTerminalModal = () => {
    const firstModel = terminalModels[0];
    setEditingTerminal(null);
    setTerminalForm({
      ...emptyTerminalForm,
      deviceTerminalModelId: firstModel?.deviceTerminalModelId ?? 0,
      resolutionWidth: firstModel?.defaultResolutionWidth ?? 0,
      resolutionHeight: firstModel?.defaultResolutionHeight ?? 0,
    });
    setTerminalModalOpened(true);
  };

  const openEditTerminalModal = (terminal: DeviceTerminal) => {
    setEditingTerminal(terminal);
    setTerminalForm({
      posCode: terminal.posCode,
      posIpAddress: terminal.posIpAddress,
      isServer: terminal.isServer,
      isCashRegister: terminal.isCashRegister,
      cashRegisterCode: terminal.cashRegisterCode,
      deviceTerminalModelId: terminal.deviceTerminalModelId,
      resolutionWidth: terminal.resolutionWidth,
      resolutionHeight: terminal.resolutionHeight,
    });
    setTerminalModalOpened(true);
  };

  const saveTerminal = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!terminalForm.posCode.trim()) {
      notifications.show({ color: 'red', message: 'POS code is required' });
      return;
    }

    if (!terminalForm.deviceTerminalModelId || terminalForm.deviceTerminalModelId <= 0) {
      notifications.show({ color: 'red', message: 'Select a terminal model' });
      return;
    }

    if (terminalForm.resolutionWidth <= 0 || terminalForm.resolutionHeight <= 0) {
      notifications.show({ color: 'red', message: 'Resolution width and height must be greater than 0' });
      return;
    }

    try {
      setTerminalSaving(true);
      if (editingTerminal) {
        await deviceSettingsService.updateTerminal(brandId, selectedShopId, editingTerminal.terminalId, terminalForm);
      } else {
        await deviceSettingsService.createTerminal(brandId, selectedShopId, terminalForm);
      }

      setTerminalModalOpened(false);
      notifications.show({ color: 'green', message: editingTerminal ? 'Terminal updated' : 'Terminal created' });
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save terminal';
      notifications.show({ color: 'red', message });
    } finally {
      setTerminalSaving(false);
    }
  };

  const deleteTerminal = async (terminal: DeviceTerminal) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!window.confirm(`Delete terminal "${terminal.posCode}"?`)) {
      return;
    }

    try {
      await deviceSettingsService.deleteTerminal(brandId, selectedShopId, terminal.terminalId);
      notifications.show({ color: 'green', message: 'Terminal deleted' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete terminal';
      notifications.show({ color: 'red', message });
    }
  };

  const openTerminalConfigModal = async (terminal: DeviceTerminal) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    setTerminalConfigModalOpened(true);
    setTerminalConfigLoading(true);
    setTerminalConfigError(null);
    setTerminalConfigData(null);

    try {
      const config = await deviceSettingsService.getTerminalConfigFile(brandId, selectedShopId, terminal.terminalId);
      setTerminalConfigData(config);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load terminal config file';
      setTerminalConfigError(message);
    } finally {
      setTerminalConfigLoading(false);
    }
  };

  const openCreatePrinterModal = () => {
    setEditingPrinter(null);
    setPrinterForm(emptyPrinterForm);
    setPrinterModalOpened(true);
  };

  const openEditPrinterModal = (printer: DevicePrinter) => {
    setEditingPrinter(printer);
    setPrinterForm({
      printerName: printer.printerName,
      printerType: resolvePrinterType(printer),
      isDinein: printer.isDinein,
      isTakeaway: printer.isTakeaway,
      autoRedirectPrinterIdList: printer.autoRedirectPrinterIdList.map((id) => String(id)),
    });
    setPrinterModalOpened(true);
  };

  const savePrinter = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!printerForm.printerName.trim()) {
      notifications.show({ color: 'red', message: 'Printer name is required' });
      return;
    }

    const payload: UpsertDevicePrinterRequest = {
      printerName: printerForm.printerName.trim(),
      isKds: printerForm.printerType === 'kds',
      isLabelPrinter: printerForm.printerType === 'label',
      isDinein: printerForm.isDinein,
      isTakeaway: printerForm.isTakeaway,
      autoRedirectPrinterIdList: printerForm.autoRedirectPrinterIdList
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value > 0),
    };

    try {
      setPrinterSaving(true);
      if (editingPrinter) {
        await deviceSettingsService.updatePrinter(brandId, selectedShopId, editingPrinter.shopPrinterMasterId, payload);
      } else {
        await deviceSettingsService.createPrinter(brandId, selectedShopId, payload);
      }

      setPrinterModalOpened(false);
      notifications.show({ color: 'green', message: editingPrinter ? 'Printer updated' : 'Printer created' });
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save printer';
      notifications.show({ color: 'red', message });
    } finally {
      setPrinterSaving(false);
    }
  };

  const deletePrinter = async (printer: DevicePrinter) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!window.confirm(`Delete printer "${printer.printerName}"?`)) {
      return;
    }

    try {
      await deviceSettingsService.deletePrinter(brandId, selectedShopId, printer.shopPrinterMasterId);
      notifications.show({ color: 'green', message: 'Printer deleted' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete printer';
      notifications.show({ color: 'red', message });
    }
  };

  const openCreateCashDrawerModal = () => {
    setEditingCashDrawer(null);
    setCashDrawerForm(emptyCashDrawerForm);
    setCashDrawerModalOpened(true);
  };

  const openEditCashDrawerModal = (cashDrawer: CashDrawer) => {
    setEditingCashDrawer(cashDrawer);
    setCashDrawerForm({ cashDrawerName: cashDrawer.cashDrawerName });
    setCashDrawerModalOpened(true);
  };

  const saveCashDrawer = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!cashDrawerForm.cashDrawerName.trim()) {
      notifications.show({ color: 'red', message: 'Cash drawer name is required' });
      return;
    }

    try {
      setCashDrawerSaving(true);
      if (editingCashDrawer) {
        await deviceSettingsService.updateCashDrawer(
          brandId,
          selectedShopId,
          editingCashDrawer.cashDrawerCode,
          cashDrawerForm,
        );
      } else {
        await deviceSettingsService.createCashDrawer(brandId, selectedShopId, cashDrawerForm);
      }

      setCashDrawerModalOpened(false);
      notifications.show({ color: 'green', message: editingCashDrawer ? 'Cash drawer updated' : 'Cash drawer created' });
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save cash drawer';
      notifications.show({ color: 'red', message });
    } finally {
      setCashDrawerSaving(false);
    }
  };

  const deleteCashDrawer = async (cashDrawer: CashDrawer) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!window.confirm(`Delete cash drawer "${cashDrawer.cashDrawerCode}"?`)) {
      return;
    }

    try {
      await deviceSettingsService.deleteCashDrawer(brandId, selectedShopId, cashDrawer.cashDrawerCode);
      notifications.show({ color: 'green', message: 'Cash drawer deleted' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete cash drawer';
      notifications.show({ color: 'red', message });
    }
  };

  const redirectPrinterOptions = useMemo(
    () =>
      printers
        .filter((printer) => !editingPrinter || printer.shopPrinterMasterId !== editingPrinter.shopPrinterMasterId)
        .map((printer) => ({
          value: String(printer.shopPrinterMasterId),
          label: `${printer.printerName} (#${printer.shopPrinterMasterId})`,
        })),
    [editingPrinter, printers],
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Device Settings</Title>
          <Text size="sm" c="dimmed">
            Manage POS terminals, kitchen/label printers, and cash drawers for each shop.
          </Text>
        </Box>

        {!brandId ? (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="No Brand Selected">
            Select a brand from the top-left brand switcher.
          </Alert>
        ) : null}

        {shopsError ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load shops">
            {shopsError}
          </Alert>
        ) : null}

        {error ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load device settings">
            {error}
          </Alert>
        ) : null}

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="flex-end">
            <Select
              label="Shop"
              placeholder={shopsLoading ? 'Loading shops...' : 'Select a shop'}
              data={shops.map((shop) => ({ value: String(shop.shopId), label: `${shop.shopName}${shop.enabled ? '' : ' (Disabled)'}` }))}
              value={selectedShopId ? String(selectedShopId) : null}
              onChange={(value) => setSelectedShopId(value ? Number.parseInt(value, 10) : null)}
              disabled={!brandId || shopsLoading || shops.length === 0}
              searchable
              style={{ minWidth: 320 }}
            />
            <Group gap="sm">
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={() => {
                  void reloadShops();
                  void loadData();
                }}
                disabled={!brandId}
              >
                Refresh
              </Button>
            </Group>
          </Group>
        </Paper>

        <Tabs value={activeTab} onChange={(value) => setActiveTab((value as DeviceSettingsTab) || 'terminals')}>
          <Tabs.List>
            <Tabs.Tab value="terminals">POS Terminals</Tabs.Tab>
            <Tabs.Tab value="printers">Printers / KDS</Tabs.Tab>
            <Tabs.Tab value="cash-drawers">Cash Drawers</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="terminals" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Terminals</Text>
                  {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                </Group>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateTerminalModal} disabled={!selectedShopId}>
                  New Terminal
                </Button>
              </Group>

              {loading ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading terminals...</Text>
                </Group>
              ) : (
                <Table.ScrollContainer minWidth={900}>
                  <Table verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>POS Code</Table.Th>
                        <Table.Th>IP Address</Table.Th>
                        <Table.Th>Model</Table.Th>
                        <Table.Th>Resolution</Table.Th>
                        <Table.Th>Server</Table.Th>
                        <Table.Th>Cash Register</Table.Th>
                        <Table.Th>Config</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {terminals.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={9}>
                            <Text size="sm" c="dimmed">No terminals configured for this shop.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        terminals.map((terminal) => (
                          <Table.Tr key={terminal.terminalId}>
                            <Table.Td>{terminal.terminalId}</Table.Td>
                            <Table.Td>{terminal.posCode}</Table.Td>
                            <Table.Td>{terminal.posIpAddress || '-'}</Table.Td>
                            <Table.Td>{terminal.deviceModelName || `Model #${terminal.deviceTerminalModelId}`}</Table.Td>
                            <Table.Td>{terminal.resolutionForDisplay}</Table.Td>
                            <Table.Td>{terminal.isServer ? 'Yes' : 'No'}</Table.Td>
                            <Table.Td>{terminal.isCashRegister ? (terminal.cashRegisterCode || 'Yes') : 'No'}</Table.Td>
                            <Table.Td>{terminal.isConfigFileUploaded ? 'Uploaded' : 'Not uploaded'}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon
                                  variant="subtle"
                                  onClick={() => void openTerminalConfigModal(terminal)}
                                  disabled={!terminal.isConfigFileUploaded}
                                >
                                  <IconFileText size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" onClick={() => openEditTerminalModal(terminal)}>
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red" onClick={() => void deleteTerminal(terminal)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="printers" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Printers and KDS</Text>
                  {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                </Group>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreatePrinterModal} disabled={!selectedShopId}>
                  New Printer
                </Button>
              </Group>

              {loading ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading printers...</Text>
                </Group>
              ) : (
                <Table.ScrollContainer minWidth={860}>
                  <Table verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Dine-in</Table.Th>
                        <Table.Th>Takeaway</Table.Th>
                        <Table.Th>Auto Redirect</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {printers.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={7}>
                            <Text size="sm" c="dimmed">No printers configured for this shop.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        printers.map((printer) => (
                          <Table.Tr key={printer.shopPrinterMasterId}>
                            <Table.Td>{printer.shopPrinterMasterId}</Table.Td>
                            <Table.Td>{printer.printerName}</Table.Td>
                            <Table.Td>
                              {printer.isKds
                                ? 'KDS'
                                : printer.isLabelPrinter
                                  ? 'Label Printer'
                                  : 'Kitchen Printer'}
                            </Table.Td>
                            <Table.Td>{printer.isDinein ? 'Yes' : 'No'}</Table.Td>
                            <Table.Td>{printer.isTakeaway ? 'Yes' : 'No'}</Table.Td>
                            <Table.Td>
                              {printer.autoRedirectPrinterIdList.length > 0
                                ? printer.autoRedirectPrinterIdList.join(', ')
                                : '-'}
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon variant="subtle" onClick={() => openEditPrinterModal(printer)}>
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red" onClick={() => void deletePrinter(printer)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="cash-drawers" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Cash Drawers</Text>
                  {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                </Group>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateCashDrawerModal} disabled={!selectedShopId}>
                  New Cash Drawer
                </Button>
              </Group>

              {loading ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading cash drawers...</Text>
                </Group>
              ) : (
                <Table.ScrollContainer minWidth={680}>
                  <Table verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Code</Table.Th>
                        <Table.Th>Name</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {cashDrawers.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={3}>
                            <Text size="sm" c="dimmed">No cash drawers configured for this shop.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        cashDrawers.map((cashDrawer) => (
                          <Table.Tr key={cashDrawer.cashDrawerCode}>
                            <Table.Td>{cashDrawer.cashDrawerCode}</Table.Td>
                            <Table.Td>{cashDrawer.cashDrawerName}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon variant="subtle" onClick={() => openEditCashDrawerModal(cashDrawer)}>
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red" onClick={() => void deleteCashDrawer(cashDrawer)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={terminalConfigModalOpened}
        onClose={() => setTerminalConfigModalOpened(false)}
        title={
          terminalConfigData
            ? `Terminal Config #${terminalConfigData.terminalId} (${terminalConfigData.posCode || 'N/A'})`
            : 'Terminal Config File'
        }
        size="lg"
      >
        <Stack gap="sm">
          {terminalConfigLoading ? (
            <Group justify="center" py="md">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading config file...</Text>
            </Group>
          ) : null}

          {!terminalConfigLoading && terminalConfigError ? (
            <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load terminal config">
              {terminalConfigError}
            </Alert>
          ) : null}

          {!terminalConfigLoading && !terminalConfigError && terminalConfigData ? (
            terminalConfigData.isConfigFileUploaded ? (
              <Textarea
                value={terminalConfigData.configFile}
                readOnly
                autosize
                minRows={12}
                maxRows={24}
                styles={{
                  input: {
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    fontSize: '12px',
                  },
                }}
              />
            ) : (
              <Text size="sm" c="dimmed">No config file uploaded for this terminal.</Text>
            )
          ) : null}
        </Stack>
      </Modal>

      <Modal
        opened={terminalModalOpened}
        onClose={() => setTerminalModalOpened(false)}
        title={editingTerminal ? `Edit Terminal #${editingTerminal.terminalId}` : 'New Terminal'}
        size="lg"
      >
        <Stack gap="sm">
          <TextInput
            label="POS Code"
            value={terminalForm.posCode}
            onChange={(event) => setTerminalForm((previous) => ({ ...previous, posCode: event.currentTarget.value }))}
            required
          />

          <TextInput
            label="POS IP Address"
            value={terminalForm.posIpAddress}
            onChange={(event) =>
              setTerminalForm((previous) => ({
                ...previous,
                posIpAddress: event.currentTarget.value,
              }))
            }
          />

          <Select
            label="Terminal Model"
            data={terminalModelOptions}
            value={terminalForm.deviceTerminalModelId > 0 ? String(terminalForm.deviceTerminalModelId) : null}
            onChange={(value) => {
              const selected = terminalModels.find((model) => model.deviceTerminalModelId === Number.parseInt(value || '0', 10));
              setTerminalForm((previous) => ({
                ...previous,
                deviceTerminalModelId: selected?.deviceTerminalModelId ?? 0,
                resolutionWidth: selected?.defaultResolutionWidth ?? previous.resolutionWidth,
                resolutionHeight: selected?.defaultResolutionHeight ?? previous.resolutionHeight,
              }));
            }}
            searchable
            required
          />

          <Group grow>
            <NumberInput
              label="Resolution Width"
              min={1}
              value={terminalForm.resolutionWidth}
              onChange={(value) =>
                setTerminalForm((previous) => ({
                  ...previous,
                  resolutionWidth: typeof value === 'number' ? value : 0,
                }))
              }
            />
            <NumberInput
              label="Resolution Height"
              min={1}
              value={terminalForm.resolutionHeight}
              onChange={(value) =>
                setTerminalForm((previous) => ({
                  ...previous,
                  resolutionHeight: typeof value === 'number' ? value : 0,
                }))
              }
            />
          </Group>

          <Switch
            label="This terminal is a POS server"
            checked={terminalForm.isServer}
            onChange={(event) => setTerminalForm((previous) => ({ ...previous, isServer: event.currentTarget.checked }))}
          />

          <Switch
            label="This terminal is a cash register"
            checked={terminalForm.isCashRegister}
            onChange={(event) =>
              setTerminalForm((previous) => ({
                ...previous,
                isCashRegister: event.currentTarget.checked,
                cashRegisterCode: event.currentTarget.checked ? previous.cashRegisterCode : '',
              }))
            }
          />

          {terminalForm.isCashRegister ? (
            <TextInput
              label="Cash Register Code (optional)"
              description="Leave empty to auto-generate a cash drawer code."
              value={terminalForm.cashRegisterCode}
              onChange={(event) =>
                setTerminalForm((previous) => ({
                  ...previous,
                  cashRegisterCode: event.currentTarget.value,
                }))
              }
            />
          ) : null}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setTerminalModalOpened(false)}>
              Cancel
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveTerminal()} loading={terminalSaving}>
              {editingTerminal ? 'Save Changes' : 'Create Terminal'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={printerModalOpened}
        onClose={() => setPrinterModalOpened(false)}
        title={editingPrinter ? `Edit Printer #${editingPrinter.shopPrinterMasterId}` : 'New Printer'}
        size="lg"
      >
        <Stack gap="sm">
          <TextInput
            label="Printer Name"
            value={printerForm.printerName}
            onChange={(event) =>
              setPrinterForm((previous) => ({
                ...previous,
                printerName: event.currentTarget.value,
              }))
            }
            required
          />

          <Box>
            <Text size="sm" fw={500} mb={6}>Device Type</Text>
            <SegmentedControl
              fullWidth
              value={printerForm.printerType}
              onChange={(value) =>
                setPrinterForm((previous) => ({
                  ...previous,
                  printerType: value as PrinterType,
                }))
              }
              data={[
                { label: 'Kitchen Printer', value: 'printer' },
                { label: 'KDS', value: 'kds' },
                { label: 'Label Printer', value: 'label' },
              ]}
            />
          </Box>

          <Group grow>
            <Switch
              label="Dine-in enabled"
              checked={printerForm.isDinein}
              onChange={(event) =>
                setPrinterForm((previous) => ({
                  ...previous,
                  isDinein: event.currentTarget.checked,
                }))
              }
            />
            <Switch
              label="Takeaway enabled"
              checked={printerForm.isTakeaway}
              onChange={(event) =>
                setPrinterForm((previous) => ({
                  ...previous,
                  isTakeaway: event.currentTarget.checked,
                }))
              }
            />
          </Group>

          <MultiSelect
            label="Auto Redirect Printers"
            description="Optional: redirect this printer's jobs to additional printers."
            data={redirectPrinterOptions}
            value={printerForm.autoRedirectPrinterIdList}
            onChange={(value) =>
              setPrinterForm((previous) => ({
                ...previous,
                autoRedirectPrinterIdList: value,
              }))
            }
            searchable
            clearable
            nothingFoundMessage="No printers available"
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setPrinterModalOpened(false)}>
              Cancel
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void savePrinter()} loading={printerSaving}>
              {editingPrinter ? 'Save Changes' : 'Create Printer'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={cashDrawerModalOpened}
        onClose={() => setCashDrawerModalOpened(false)}
        title={editingCashDrawer ? `Edit Cash Drawer ${editingCashDrawer.cashDrawerCode}` : 'New Cash Drawer'}
      >
        <Stack gap="sm">
          {editingCashDrawer ? (
            <Text size="sm" c="dimmed">Code: {editingCashDrawer.cashDrawerCode}</Text>
          ) : (
            <Text size="sm" c="dimmed">Code will be auto-generated after save.</Text>
          )}

          <TextInput
            label="Cash Drawer Name"
            value={cashDrawerForm.cashDrawerName}
            onChange={(event) =>
              setCashDrawerForm((previous) => ({
                ...previous,
                cashDrawerName: event.currentTarget.value,
              }))
            }
            required
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setCashDrawerModalOpened(false)}>
              Cancel
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveCashDrawer()} loading={cashDrawerSaving}>
              {editingCashDrawer ? 'Save Changes' : 'Create Cash Drawer'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
