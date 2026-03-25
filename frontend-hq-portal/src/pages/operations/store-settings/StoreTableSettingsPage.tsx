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
  IconLink,
  IconMap2,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';
import tableSettingsService, {
  type LinkTableSectionToShopRequest,
  type TableMaster,
  type TableSectionLibraryItem,
  type TableSectionShopLink,
  type TableSettingsMetadata,
  type UpdateTableSectionShopLinkRequest,
  type UpsertTableMasterRequest,
  type UpsertTableSectionRequest,
} from '../../../services/tableSettingsService';

type TableSettingsTab = 'library' | 'relationships' | 'floorplan';

const emptySectionForm: UpsertTableSectionRequest = {
  sectionName: '',
  description: '',
};

const emptyLinkForm: LinkTableSectionToShopRequest = {
  sectionId: 0,
  tableMapBackgroundImagePath: '',
  tableMapBackgroundImageWidth: null,
  tableMapBackgroundImageHeight: null,
};

const emptyTableForm: UpsertTableMasterRequest = {
  tableCode: '',
  sectionId: 0,
  tableTypeId: 0,
  displayIndex: null,
  isTakeAway: false,
  seatNum: null,
  shopPrinterMasterId: null,
  positionX: null,
  positionY: null,
  isAppearOnFloorPlan: true,
  shapeType: 'rectangle',
  iconWidth: 120,
  iconHeight: 64,
  rotation: 0,
};

export function StoreTableSettingsPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [activeTab, setActiveTab] = useState<TableSettingsTab>('library');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metadata, setMetadata] = useState<TableSettingsMetadata | null>(null);
  const [sectionLibrary, setSectionLibrary] = useState<TableSectionLibraryItem[]>([]);
  const [shopSectionLinks, setShopSectionLinks] = useState<TableSectionShopLink[]>([]);
  const [tables, setTables] = useState<TableMaster[]>([]);
  const [floorplanSectionFilter, setFloorplanSectionFilter] = useState<string>('all');

  const [sectionModalOpened, setSectionModalOpened] = useState(false);
  const [sectionSaving, setSectionSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<TableSectionLibraryItem | null>(null);
  const [sectionForm, setSectionForm] = useState<UpsertTableSectionRequest>(emptySectionForm);

  const [linkModalOpened, setLinkModalOpened] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const [editingLink, setEditingLink] = useState<TableSectionShopLink | null>(null);
  const [linkForm, setLinkForm] = useState<LinkTableSectionToShopRequest>(emptyLinkForm);

  const [tableModalOpened, setTableModalOpened] = useState(false);
  const [tableSaving, setTableSaving] = useState(false);
  const [editingTable, setEditingTable] = useState<TableMaster | null>(null);
  const [tableForm, setTableForm] = useState<UpsertTableMasterRequest>(emptyTableForm);

  const linkedSectionOptions = useMemo(
    () => shopSectionLinks.map((section) => ({ value: String(section.sectionId), label: section.sectionName })),
    [shopSectionLinks],
  );

  const linkableSectionOptions = useMemo(() => {
    const linkedSectionIds = new Set(shopSectionLinks.map((section) => section.sectionId));

    return sectionLibrary
      .filter((section) => !linkedSectionIds.has(section.sectionId) || section.sectionId === editingLink?.sectionId)
      .map((section) => ({ value: String(section.sectionId), label: section.sectionName }));
  }, [editingLink?.sectionId, sectionLibrary, shopSectionLinks]);

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

  const filteredFloorplanTables = useMemo(() => {
    if (floorplanSectionFilter === 'all') {
      return tables;
    }

    const sectionId = Number.parseInt(floorplanSectionFilter, 10);
    return tables.filter((table) => table.sectionId === sectionId);
  }, [floorplanSectionFilter, tables]);

  const loadData = useCallback(async () => {
    if (!brandId) {
      setMetadata(null);
      setSectionLibrary([]);
      setShopSectionLinks([]);
      setTables([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [metadataResult, libraryResult, linksResult, tablesResult] = await Promise.allSettled([
        selectedShopId ? tableSettingsService.getMetadata(brandId, selectedShopId) : Promise.resolve(null),
        tableSettingsService.getSectionLibrary(brandId),
        selectedShopId ? tableSettingsService.getShopSectionLinks(brandId, selectedShopId) : Promise.resolve([]),
        selectedShopId ? tableSettingsService.getTables(brandId, selectedShopId) : Promise.resolve([]),
      ]);

      setMetadata(metadataResult.status === 'fulfilled' ? metadataResult.value : null);
      setSectionLibrary(libraryResult.status === 'fulfilled' ? libraryResult.value : []);
      setShopSectionLinks(linksResult.status === 'fulfilled' ? linksResult.value : []);
      setTables(tablesResult.status === 'fulfilled' ? tablesResult.value : []);

      // Show error for any failed requests
      const failures = [metadataResult, libraryResult, linksResult, tablesResult]
        .filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        const firstError = (failures[0] as PromiseRejectedResult).reason;
        setError(firstError instanceof Error ? firstError.message : 'Some data failed to load');
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load table settings';
      setError(message);
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

  const openEditSectionModal = (section: TableSectionLibraryItem) => {
    setEditingSection(section);
    setSectionForm({
      sectionName: section.sectionName,
      description: section.description,
    });
    setSectionModalOpened(true);
  };

  const saveSection = async () => {
    if (!brandId) {
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
        await tableSettingsService.updateSectionLibrary(brandId, editingSection.sectionId, payload);
      } else {
        await tableSettingsService.createSectionLibrary(brandId, payload);
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

  const deleteSection = async (section: TableSectionLibraryItem) => {
    if (!brandId) {
      return;
    }

    if (!window.confirm(`Delete section "${section.sectionName}"?`)) {
      return;
    }

    try {
      await tableSettingsService.deleteSectionLibrary(brandId, section.sectionId);
      notifications.show({ color: 'green', message: 'Section deleted' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to delete section';
      notifications.show({ color: 'red', message });
    }
  };

  const openCreateLinkModal = () => {
    setEditingLink(null);
    setLinkForm({
      ...emptyLinkForm,
      sectionId: linkableSectionOptions.length > 0 ? Number.parseInt(linkableSectionOptions[0].value, 10) : 0,
    });
    setLinkModalOpened(true);
  };

  const openEditLinkModal = (link: TableSectionShopLink) => {
    setEditingLink(link);
    setLinkForm({
      sectionId: link.sectionId,
      tableMapBackgroundImagePath: link.tableMapBackgroundImagePath,
      tableMapBackgroundImageWidth: link.tableMapBackgroundImageWidth,
      tableMapBackgroundImageHeight: link.tableMapBackgroundImageHeight,
    });
    setLinkModalOpened(true);
  };

  const saveLink = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!linkForm.sectionId || linkForm.sectionId <= 0) {
      notifications.show({ color: 'red', message: 'Select a table section' });
      return;
    }

    try {
      setLinkSaving(true);

      if (editingLink) {
        const payload: UpdateTableSectionShopLinkRequest = {
          tableMapBackgroundImagePath: linkForm.tableMapBackgroundImagePath.trim(),
          tableMapBackgroundImageWidth: linkForm.tableMapBackgroundImageWidth,
          tableMapBackgroundImageHeight: linkForm.tableMapBackgroundImageHeight,
        };
        await tableSettingsService.updateShopSectionLink(brandId, selectedShopId, editingLink.sectionId, payload);
      } else {
        await tableSettingsService.createShopSectionLink(brandId, selectedShopId, {
          sectionId: linkForm.sectionId,
          tableMapBackgroundImagePath: linkForm.tableMapBackgroundImagePath.trim(),
          tableMapBackgroundImageWidth: linkForm.tableMapBackgroundImageWidth,
          tableMapBackgroundImageHeight: linkForm.tableMapBackgroundImageHeight,
        });
      }

      setLinkModalOpened(false);
      notifications.show({ color: 'green', message: editingLink ? 'Shop relationship updated' : 'Section linked to shop' });
      await loadData();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save shop relationship';
      notifications.show({ color: 'red', message });
    } finally {
      setLinkSaving(false);
    }
  };

  const deleteLink = async (link: TableSectionShopLink) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!window.confirm(`Remove section "${link.sectionName}" from shop "${selectedShop?.shopName ?? selectedShopId}"?`)) {
      return;
    }

    try {
      await tableSettingsService.deleteShopSectionLink(brandId, selectedShopId, link.sectionId);
      notifications.show({ color: 'green', message: 'Shop relationship removed' });
      await loadData();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Failed to remove shop relationship';
      notifications.show({ color: 'red', message });
    }
  };

  const openCreateTableModal = () => {
    const firstSection = shopSectionLinks[0];
    const firstType = metadata?.tableTypes[0];

    setEditingTable(null);
    setTableForm({
      ...emptyTableForm,
      sectionId: firstSection?.sectionId ?? 0,
      tableTypeId: firstType?.tableTypeId ?? 0,
      positionX: 40,
      positionY: 40,
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
      positionX: table.positionX,
      positionY: table.positionY,
      isAppearOnFloorPlan: table.isAppearOnFloorPlan,
      shapeType: table.shapeType || 'rectangle',
      iconWidth: table.iconWidth,
      iconHeight: table.iconHeight,
      rotation: table.rotation,
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
      notifications.show({ color: 'red', message: 'Select a linked section' });
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
      positionX: tableForm.positionX,
      positionY: tableForm.positionY,
      isAppearOnFloorPlan: tableForm.isAppearOnFloorPlan,
      shapeType: tableForm.shapeType.trim() || 'rectangle',
      iconWidth: tableForm.iconWidth,
      iconHeight: tableForm.iconHeight,
      rotation: tableForm.rotation,
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
        <Group justify="space-between">
          <div>
            <Title order={2}>Table & Section Management</Title>
            <Text size="sm" c="dimmed">Manage section masters, shop relationships, and table floorplan layout.</Text>
          </div>
          <Group>
            <Select
              placeholder={shopsLoading ? 'Loading shops...' : 'Select shop'}
              data={shops.map((shop) => ({ value: String(shop.shopId), label: `${shop.shopName}${shop.enabled ? '' : ' (Disabled)'}` }))}
              value={selectedShopId ? String(selectedShopId) : null}
              onChange={(value) => setSelectedShopId(value ? Number.parseInt(value, 10) : null)}
              disabled={!brandId || shopsLoading || shops.length === 0}
              searchable
              style={{ minWidth: 240 }}
            />
            <Button variant="subtle" onClick={() => { void reloadShops(); void loadData(); }} loading={loading}>
              Refresh
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage table settings.
          </Alert>
        )}

        {shopsError && <Alert icon={<IconAlertCircle size={16} />} color="red">{shopsError}</Alert>}
        {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

        <Tabs value={activeTab} onChange={(value) => setActiveTab((value as TableSettingsTab) || 'library')}>
          <Tabs.List>
            <Tabs.Tab value="library">Table Sections</Tabs.Tab>
            <Tabs.Tab value="relationships" disabled={!selectedShopId}>Section-Shop Relationships</Tabs.Tab>
            <Tabs.Tab value="tables" disabled={!selectedShopId}>Tables</Tabs.Tab>
            <Tabs.Tab value="floorplan" disabled={!selectedShopId}>Floorplan</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="library" pt="md">
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <Text fw={600}>Section Master Records</Text>
                  <Badge variant="light">{sectionLibrary.length}</Badge>
                </Group>
                <Button leftSection={<IconPlus size={16} />} onClick={openCreateSectionModal} disabled={!brandId}>
                  New Section
                </Button>
              </Group>

              {loading ? (
                <Group justify="center" py="xl">
                  <Loader size="sm" />
                  <Text size="sm" c="dimmed">Loading sections...</Text>
                </Group>
              ) : (
                <Table.ScrollContainer minWidth={760}>
                  <Table verticalSpacing="sm" striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>ID</Table.Th>
                        <Table.Th>Section Name</Table.Th>
                        <Table.Th>Description</Table.Th>
                        <Table.Th>Linked Shops</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {sectionLibrary.length === 0 ? (
                        <Table.Tr>
                          <Table.Td colSpan={5}>
                            <Text size="sm" c="dimmed">No table sections exist for this brand.</Text>
                          </Table.Td>
                        </Table.Tr>
                      ) : (
                        sectionLibrary.map((section) => (
                          <Table.Tr key={section.sectionId}>
                            <Table.Td>{section.sectionId}</Table.Td>
                            <Table.Td>{section.sectionName}</Table.Td>
                            <Table.Td>{section.description || '-'}</Table.Td>
                            <Table.Td>{section.shopCount}</Table.Td>
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

          <Tabs.Panel value="relationships" pt="md">
            {!selectedShopId ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                Select a shop to manage section relationships.
              </Alert>
            ) : (
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <Text fw={600}>Section to Shop Relationships</Text>
                    {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                  </Group>
                  <Button
                    leftSection={<IconLink size={16} />}
                    onClick={openCreateLinkModal}
                    disabled={linkableSectionOptions.length === 0}
                  >
                    Link Section
                  </Button>
                </Group>

                {loading ? (
                  <Group justify="center" py="xl">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">Loading relationships...</Text>
                  </Group>
                ) : (
                  <Table.ScrollContainer minWidth={980}>
                    <Table verticalSpacing="sm" striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Section</Table.Th>
                          <Table.Th>Description</Table.Th>
                          <Table.Th>Tables</Table.Th>
                          <Table.Th>Background Path</Table.Th>
                          <Table.Th>Canvas Size</Table.Th>
                          <Table.Th>Actions</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {shopSectionLinks.length === 0 ? (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Text size="sm" c="dimmed">No sections are linked to this shop.</Text>
                            </Table.Td>
                          </Table.Tr>
                        ) : (
                          shopSectionLinks.map((link) => (
                            <Table.Tr key={`${link.shopId}-${link.sectionId}`}>
                              <Table.Td>{link.sectionName}</Table.Td>
                              <Table.Td>{link.description || '-'}</Table.Td>
                              <Table.Td>{link.tableCount}</Table.Td>
                              <Table.Td>{link.tableMapBackgroundImagePath || '-'}</Table.Td>
                              <Table.Td>
                                {link.tableMapBackgroundImageWidth && link.tableMapBackgroundImageHeight
                                  ? `${link.tableMapBackgroundImageWidth} x ${link.tableMapBackgroundImageHeight}`
                                  : '-'}
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <ActionIcon variant="subtle" onClick={() => openEditLinkModal(link)}>
                                    <IconEdit size={16} />
                                  </ActionIcon>
                                  <ActionIcon variant="subtle" color="red" onClick={() => void deleteLink(link)}>
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
            )}
          </Tabs.Panel>

          {/* ── Tables Tab ── */}
          <Tabs.Panel value="tables" pt="md">
            {!selectedShopId ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                Select a shop to manage its tables.
              </Alert>
            ) : (
              <Stack gap="md">
                <Paper withBorder p="md" radius="md">
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <Text fw={600}>Tables</Text>
                      {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                    </Group>
                    <Group>
                      <Select
                        data={[
                          { value: 'all', label: 'All linked sections' },
                          ...linkedSectionOptions,
                        ]}
                        value={floorplanSectionFilter}
                        onChange={(value) => setFloorplanSectionFilter(value || 'all')}
                        disabled={linkedSectionOptions.length === 0}
                        style={{ minWidth: 220 }}
                      />
                      <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={openCreateTableModal}
                        disabled={shopSectionLinks.length === 0 || (metadata?.tableTypes.length ?? 0) === 0}
                      >
                        New Table
                      </Button>
                    </Group>
                  </Group>

                  {loading ? (
                    <Group justify="center" py="xl">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed">Loading tables...</Text>
                    </Group>
                  ) : (
                    <Table.ScrollContainer minWidth={900}>
                      <Table verticalSpacing="sm" striped>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Code</Table.Th>
                              <Table.Th>Section</Table.Th>
                              <Table.Th>Type</Table.Th>
                              <Table.Th>Seats</Table.Th>
                              <Table.Th>Visible</Table.Th>
                              <Table.Th>X</Table.Th>
                              <Table.Th>Y</Table.Th>
                              <Table.Th>W</Table.Th>
                              <Table.Th>H</Table.Th>
                              <Table.Th>Rotation</Table.Th>
                              <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {filteredFloorplanTables.length === 0 ? (
                              <Table.Tr>
                                <Table.Td colSpan={11}>
                                  <Text size="sm" c="dimmed">No tables exist for the current floorplan filter.</Text>
                                </Table.Td>
                              </Table.Tr>
                            ) : (
                              filteredFloorplanTables.map((table) => (
                                <Table.Tr key={table.tableId}>
                                  <Table.Td>{table.tableCode}</Table.Td>
                                  <Table.Td>{table.sectionName || `Section #${table.sectionId}`}</Table.Td>
                                  <Table.Td>{table.tableTypeName || `Type #${table.tableTypeId}`}</Table.Td>
                                  <Table.Td>{table.seatNum ?? '-'}</Table.Td>
                                  <Table.Td>
                                    <Badge color={table.isAppearOnFloorPlan ? 'green' : 'gray'} variant="light">
                                      {table.isAppearOnFloorPlan ? 'Visible' : 'Hidden'}
                                    </Badge>
                                  </Table.Td>
                                  <Table.Td>{table.positionX ?? '-'}</Table.Td>
                                  <Table.Td>{table.positionY ?? '-'}</Table.Td>
                                  <Table.Td>{table.iconWidth ?? '-'}</Table.Td>
                                  <Table.Td>{table.iconHeight ?? '-'}</Table.Td>
                                  <Table.Td>{table.rotation ?? '-'}</Table.Td>
                                  <Table.Td>
                                    <Group gap="xs">
                                      <ActionIcon variant="subtle" onClick={() => openEditTableModal(table)}>
                                        <IconMap2 size={16} />
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
              </Stack>
            )}
          </Tabs.Panel>

          {/* ── Floorplan Tab ── */}
          <Tabs.Panel value="floorplan" pt="md">
            {!selectedShopId ? (
              <Alert icon={<IconAlertCircle size={16} />} color="yellow">
                Select a shop to view its floorplan.
              </Alert>
            ) : (
              <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <Text fw={600}>Floorplan Designer</Text>
                    {selectedShop ? <Badge variant="light">{selectedShop.shopName}</Badge> : null}
                  </Group>
                  <Select
                    data={[
                      { value: 'all', label: 'All linked sections' },
                      ...linkedSectionOptions,
                    ]}
                    value={floorplanSectionFilter}
                    onChange={(value) => setFloorplanSectionFilter(value || 'all')}
                    disabled={linkedSectionOptions.length === 0}
                    style={{ minWidth: 220 }}
                  />
                </Group>

                {loading ? (
                  <Group justify="center" py="xl">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">Loading floorplan...</Text>
                  </Group>
                ) : (
                  <Paper withBorder p="md" radius="md" bg="gray.0">
                    <Group justify="space-between" mb="sm">
                      <Text size="sm" fw={600}>Preview</Text>
                      <Text size="xs" c="dimmed">Click a table to edit its layout.</Text>
                    </Group>
                    <Box
                      style={{
                        position: 'relative',
                        minHeight: 460,
                        overflow: 'auto',
                        borderRadius: 12,
                        border: '1px dashed var(--mantine-color-gray-4)',
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%)',
                      }}
                    >
                      {filteredFloorplanTables.filter((t) => t.isAppearOnFloorPlan).length === 0 ? (
                        <Group justify="center" py="xl">
                          <Text size="sm" c="dimmed">No visible tables in the current filter.</Text>
                        </Group>
                      ) : (
                        filteredFloorplanTables
                          .filter((t) => t.isAppearOnFloorPlan)
                          .map((table) => (
                            <Box
                              key={table.tableId}
                              component="button"
                              type="button"
                              onClick={() => openEditTableModal(table)}
                              style={{
                                position: 'absolute',
                                left: table.positionX ?? 24,
                                top: table.positionY ?? 24,
                                width: table.iconWidth ?? 120,
                                height: table.iconHeight ?? 64,
                                transform: `rotate(${table.rotation ?? 0}deg)`,
                                borderRadius: (table.shapeType ?? '').toLowerCase() === 'circle' ? '999px' : 14,
                                border: '1px solid var(--mantine-color-blue-4)',
                                background: 'linear-gradient(180deg, rgba(59,130,246,0.18) 0%, rgba(29,78,216,0.08) 100%)',
                                color: 'var(--mantine-color-blue-9)',
                                boxShadow: '0 10px 24px rgba(30, 64, 175, 0.12)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 8,
                              }}
                            >
                              <Text size="sm" fw={700}>{table.tableCode}</Text>
                              <Text size="xs">{table.sectionName || `Section ${table.sectionId}`}</Text>
                            </Box>
                          ))
                      )}
                    </Box>
                  </Paper>
                )}
              </Paper>
            )}
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
        opened={linkModalOpened}
        onClose={() => setLinkModalOpened(false)}
        title={editingLink ? `Edit Shop Relationship: ${editingLink.sectionName}` : 'Link Section to Shop'}
      >
        <Stack gap="sm">
          <Select
            label="Section"
            data={linkableSectionOptions}
            value={linkForm.sectionId > 0 ? String(linkForm.sectionId) : null}
            onChange={(value) =>
              setLinkForm((previous) => ({
                ...previous,
                sectionId: value ? Number.parseInt(value, 10) : 0,
              }))
            }
            disabled={Boolean(editingLink)}
            searchable
            required
          />

          <TextInput
            label="Background Image Path"
            value={linkForm.tableMapBackgroundImagePath}
            onChange={(event) =>
              setLinkForm((previous) => ({
                ...previous,
                tableMapBackgroundImagePath: event.currentTarget.value,
              }))
            }
            placeholder="Optional floorplan image path"
          />

          <Group grow>
            <NumberInput
              label="Canvas Width"
              min={0}
              value={linkForm.tableMapBackgroundImageWidth ?? undefined}
              onChange={(value) =>
                setLinkForm((previous) => ({
                  ...previous,
                  tableMapBackgroundImageWidth: typeof value === 'number' ? value : null,
                }))
              }
            />
            <NumberInput
              label="Canvas Height"
              min={0}
              value={linkForm.tableMapBackgroundImageHeight ?? undefined}
              onChange={(value) =>
                setLinkForm((previous) => ({
                  ...previous,
                  tableMapBackgroundImageHeight: typeof value === 'number' ? value : null,
                }))
              }
            />
          </Group>

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={() => setLinkModalOpened(false)}>
              Cancel
            </Button>
            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void saveLink()} loading={linkSaving}>
              {editingLink ? 'Save Changes' : 'Link Section'}
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
              label="Linked Section"
              data={linkedSectionOptions}
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

          <Switch
            label="Show on floorplan"
            checked={tableForm.isAppearOnFloorPlan}
            onChange={(event) =>
              setTableForm((previous) => ({
                ...previous,
                isAppearOnFloorPlan: event.currentTarget.checked,
              }))
            }
          />

          <Group grow>
            <NumberInput
              label="Position X"
              value={tableForm.positionX ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  positionX: typeof value === 'number' ? value : null,
                }))
              }
            />

            <NumberInput
              label="Position Y"
              value={tableForm.positionY ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  positionY: typeof value === 'number' ? value : null,
                }))
              }
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Width"
              min={0}
              value={tableForm.iconWidth ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  iconWidth: typeof value === 'number' ? value : null,
                }))
              }
            />

            <NumberInput
              label="Height"
              min={0}
              value={tableForm.iconHeight ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  iconHeight: typeof value === 'number' ? value : null,
                }))
              }
            />

            <NumberInput
              label="Rotation"
              value={tableForm.rotation ?? undefined}
              onChange={(value) =>
                setTableForm((previous) => ({
                  ...previous,
                  rotation: typeof value === 'number' ? value : null,
                }))
              }
            />
          </Group>

          <TextInput
            label="Shape Type"
            value={tableForm.shapeType}
            onChange={(event) =>
              setTableForm((previous) => ({
                ...previous,
                shapeType: event.currentTarget.value,
              }))
            }
            placeholder="rectangle, circle, square..."
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
