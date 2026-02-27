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
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconDeviceFloppy,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';
import tableSettingsService, {
  type TableMaster,
  type TableSection,
  type TableSettingsMetadata,
  type UpsertTableMasterRequest,
  type UpsertTableSectionRequest,
} from '../../../services/tableSettingsService';

type TableSettingsTab = 'sections' | 'tables';

const emptySectionForm: UpsertTableSectionRequest = {
  sectionName: '',
  description: '',
};

const emptyTableForm: UpsertTableMasterRequest = {
  tableCode: '',
  sectionId: 0,
  tableTypeId: 0,
  displayIndex: null,
  isTakeAway: false,
  seatNum: null,
  shopPrinterMasterId: null,
};

export function StoreTableSettingsPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [activeTab, setActiveTab] = useState<TableSettingsTab>('sections');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<TableSettingsMetadata | null>(null);
  const [sections, setSections] = useState<TableSection[]>([]);
  const [tables, setTables] = useState<TableMaster[]>([]);

  const [sectionModalOpened, setSectionModalOpened] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<TableSection | null>(null);
  const [sectionForm, setSectionForm] = useState<UpsertTableSectionRequest>(emptySectionForm);

  const [tableModalOpened, setTableModalOpened] = useState(false);
  const [tableSaving, setTableSaving] = useState(false);
  const [editingTable, setEditingTable] = useState<TableMaster | null>(null);
  const [tableForm, setTableForm] = useState<UpsertTableMasterRequest>(emptyTableForm);

  const sectionOptions = useMemo(
    () => sections.map((section) => ({ value: String(section.sectionId), label: section.sectionName })),
    [sections],
  );

  const tableTypeOptions = useMemo(
    () => (metadata?.tableTypes ?? []).map((type) => ({ value: String(type.tableTypeId), label: type.typeName })),
    [metadata],
  );

  const printerOptions = useMemo(
    () => [
      { value: '', label: 'No printer' },
      ...(metadata?.printers ?? []).map((printer) => ({
        value: String(printer.shopPrinterMasterId),
        label: `${printer.printerName} (#${printer.shopPrinterMasterId})`,
      })),
    ],
    [metadata],
  );

  const loadData = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setMetadata(null);
      setSections([]);
      setTables([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [metadataResponse, sectionsResponse, tablesResponse] = await Promise.all([
        tableSettingsService.getMetadata(brandId, selectedShopId),
        tableSettingsService.getSections(brandId, selectedShopId),
        tableSettingsService.getTables(brandId, selectedShopId),
      ]);

      setMetadata(metadataResponse);
      setSections(sectionsResponse);
      setTables(tablesResponse);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load table settings';
      setError(message);
      setMetadata(null);
      setSections([]);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateSectionModal = () => {
    setEditingSection(null);
    setSectionForm(emptySectionForm);
    setSectionModalOpened(true);
  };

  const openEditSectionModal = (section: TableSection) => {
    setEditingSection(section);
    setSectionForm({
      sectionName: section.sectionName,
      description: section.description,
    });
    setSectionModalOpened(true);
  };

  const saveSection = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!sectionForm.sectionName.trim()) {
      notifications.show({ color: 'red', message: 'Section name is required' });
      return;
    }

    const payload: UpsertTableSectionRequest = {
      sectionName: sectionForm.sectionName.trim(),
      description: sectionForm.description.trim(),
    };

    try {
      setSectionSaving(true);

      if (editingSection) {
        await tableSettingsService.updateSection(brandId, selectedShopId, editingSection.sectionId, payload);
      } else {
        await tableSettingsService.createSection(brandId, selectedShopId, payload);
      }

      setSectionModalOpened(false);
      notifications.show({ color: 'green', message: editingSection ? 'Section updated' : 'Section created' });
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save section';
      notifications.show({ color: 'red', message });
    } finally {
      setSectionSaving(false);
    }
  };

  const deleteSection = async (section: TableSection) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!window.confirm(`Delete section "${section.sectionName}"?`)) {
      return;
    }

    try {
      await tableSettingsService.deleteSection(brandId, selectedShopId, section.sectionId);
      notifications.show({ color: 'green', message: 'Section deleted' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete section';
      notifications.show({ color: 'red', message });
    }
  };

  const openCreateTableModal = () => {
    const firstSection = sections[0];
    const firstType = metadata?.tableTypes[0];

    setEditingTable(null);
    setTableForm({
      ...emptyTableForm,
      sectionId: firstSection?.sectionId ?? 0,
      tableTypeId: firstType?.tableTypeId ?? 0,
    });
    setTableModalOpened(true);
  };

  const openEditTableModal = (table: TableMaster) => {
    setEditingTable(table);
    setTableForm({
      tableCode: table.tableCode,
      sectionId: table.sectionId,
      tableTypeId: table.tableTypeId,
      displayIndex: table.displayIndex,
      isTakeAway: table.isTakeAway,
      seatNum: table.seatNum,
      shopPrinterMasterId: table.shopPrinterMasterId,
    });
    setTableModalOpened(true);
  };

  const saveTable = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!tableForm.tableCode.trim()) {
      notifications.show({ color: 'red', message: 'Table code is required' });
      return;
    }

    if (!tableForm.sectionId || tableForm.sectionId <= 0) {
      notifications.show({ color: 'red', message: 'Select a section' });
      return;
    }

    if (!tableForm.tableTypeId || tableForm.tableTypeId <= 0) {
      notifications.show({ color: 'red', message: 'Select a table type' });
      return;
    }

    const payload: UpsertTableMasterRequest = {
      tableCode: tableForm.tableCode.trim().toUpperCase(),
      sectionId: tableForm.sectionId,
      tableTypeId: tableForm.tableTypeId,
      displayIndex: tableForm.displayIndex,
      isTakeAway: tableForm.isTakeAway,
      seatNum: tableForm.seatNum,
      shopPrinterMasterId: tableForm.shopPrinterMasterId,
    };

    try {
      setTableSaving(true);

      if (editingTable) {
        await tableSettingsService.updateTable(brandId, selectedShopId, editingTable.tableId, payload);
      } else {
        await tableSettingsService.createTable(brandId, selectedShopId, payload);
      }

      setTableModalOpened(false);
      notifications.show({ color: 'green', message: editingTable ? 'Table updated' : 'Table created' });
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save table';
      notifications.show({ color: 'red', message });
    } finally {
      setTableSaving(false);
    }
  };

  const deleteTable = async (table: TableMaster) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!window.confirm(`Delete table "${table.tableCode}"?`)) {
      return;
    }

    try {
      await tableSettingsService.deleteTable(brandId, selectedShopId, table.tableId);
      notifications.show({ color: 'green', message: 'Table deleted' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete table';
      notifications.show({ color: 'red', message });
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Table & Section Management</Title>
          <Text size="sm" c="dimmed">
            Configure dine-in sections and table records for each shop.
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
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load table settings">
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
        </Paper>

        <Tabs value={activeTab} onChange={(value) => setActiveTab((value as TableSettingsTab) || 'sections')}>
          <Tabs.List>
            <Tabs.Tab value="sections">Sections</Tabs.Tab>
            <Tabs.Tab value="tables">Tables</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sections" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Sections</Text>
                  {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                </Group>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateSectionModal} disabled={!selectedShopId}>
                  New Section
                </Button>
              </Group>

              {loading ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading sections...</Text>
                </Group>
              ) : (
                <Table.ScrollContainer minWidth={700}>
                  <Table verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Section Name</Table.Th>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Tables</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sections.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={5}>
                            <Text size="sm" c="dimmed">No sections configured for this shop.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        sections.map((section) => (
                          <Table.Tr key={section.sectionId}>
                            <Table.Td>{section.sectionId}</Table.Td>
                            <Table.Td>{section.sectionName}</Table.Td>
                            <Table.Td>{section.description || '-'}</Table.Td>
                            <Table.Td>{section.tableCount}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon variant="subtle" onClick={() => openEditSectionModal(section)}>
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red" onClick={() => void deleteSection(section)}>
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

          <Tabs.Panel value="tables" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Tables</Text>
                  {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                </Group>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={openCreateTableModal}
                  disabled={!selectedShopId || sections.length === 0 || (metadata?.tableTypes.length ?? 0) === 0}
                >
                  New Table
                </Button>
              </Group>

              {loading ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading tables...</Text>
                </Group>
              ) : (
                <Table.ScrollContainer minWidth={920}>
                  <Table verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Table Code</Table.Th>
                        <Table.Th>Section</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Seat #</Table.Th>
                        <Table.Th>Takeaway</Table.Th>
                        <Table.Th>Printer</Table.Th>
                        <Table.Th>Display Index</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {tables.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={9}>
                            <Text size="sm" c="dimmed">No tables configured for this shop.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        tables.map((table) => (
                          <Table.Tr key={table.tableId}>
                            <Table.Td>{table.tableId}</Table.Td>
                            <Table.Td>{table.tableCode}</Table.Td>
                            <Table.Td>{table.sectionName || `Section #${table.sectionId}`}</Table.Td>
                            <Table.Td>{table.tableTypeName || `Type #${table.tableTypeId}`}</Table.Td>
                            <Table.Td>{table.seatNum ?? '-'}</Table.Td>
                            <Table.Td>{table.isTakeAway ? 'Yes' : 'No'}</Table.Td>
                            <Table.Td>{table.shopPrinterName || '-'}</Table.Td>
                            <Table.Td>{table.displayIndex ?? '-'}</Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon variant="subtle" onClick={() => openEditTableModal(table)}>
                                  <IconEdit size={16} />
                                </ActionIcon>
                                <ActionIcon variant="subtle" color="red" onClick={() => void deleteTable(table)}>
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
        opened={sectionModalOpened}
        onClose={() => setSectionModalOpened(false)}
        title={editingSection ? `Edit Section #${editingSection.sectionId}` : 'New Section'}
      >
        <Stack gap="sm">
          <TextInput
            label="Section Name"
            value={sectionForm.sectionName}
            onChange={(event) =>
              setSectionForm((previous) => ({
                ...previous,
                sectionName: event.currentTarget.value,
              }))
            }
            required
          />

          <TextInput
            label="Description"
            value={sectionForm.description}
            onChange={(event) =>
              setSectionForm((previous) => ({
                ...previous,
                description: event.currentTarget.value,
              }))
            }
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setSectionModalOpened(false)}>
              Cancel
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveSection()} loading={sectionSaving}>
              {editingSection ? 'Save Changes' : 'Create Section'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={tableModalOpened}
        onClose={() => setTableModalOpened(false)}
        title={editingTable ? `Edit Table #${editingTable.tableId}` : 'New Table'}
        size="lg"
      >
        <Stack gap="sm">
          <TextInput
            label="Table Code"
            value={tableForm.tableCode}
            onChange={(event) =>
              setTableForm((previous) => ({
                ...previous,
                tableCode: event.currentTarget.value,
              }))
            }
            maxLength={10}
            required
          />

          <Group grow>
            <Select
              label="Section"
              data={sectionOptions}
              value={tableForm.sectionId > 0 ? String(tableForm.sectionId) : null}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  sectionId: value ? Number.parseInt(value, 10) : 0,
                }))
              }
              searchable
              required
            />

            <Select
              label="Table Type"
              data={tableTypeOptions}
              value={tableForm.tableTypeId > 0 ? String(tableForm.tableTypeId) : null}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  tableTypeId: value ? Number.parseInt(value, 10) : 0,
                }))
              }
              searchable
              required
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Seat Number"
              min={0}
              value={tableForm.seatNum ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  seatNum: typeof value === 'number' ? value : null,
                }))
              }
            />

            <NumberInput
              label="Display Index"
              min={0}
              value={tableForm.displayIndex ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  displayIndex: typeof value === 'number' ? value : null,
                }))
              }
            />
          </Group>

          <Select
            label="Printer"
            data={printerOptions}
            value={tableForm.shopPrinterMasterId ? String(tableForm.shopPrinterMasterId) : ''}
            onChange={(value) =>
              setTableForm((previous) => ({
                ...previous,
                shopPrinterMasterId: value ? Number.parseInt(value, 10) : null,
              }))
            }
            searchable
          />

          <Switch
            label="Mark as takeaway table"
            checked={tableForm.isTakeAway}
            onChange={(event) =>
              setTableForm((previous) => ({
                ...previous,
                isTakeAway: event.currentTarget.checked,
              }))
            }
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setTableModalOpened(false)}>
              Cancel
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveTable()} loading={tableSaving}>
              {editingTable ? 'Save Changes' : 'Create Table'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
