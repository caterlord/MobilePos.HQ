import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Modal,
  NumberInput,
  Paper,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import taxSurchargeService from '../../../services/taxSurchargeService';
import type {
  TaxationSummary,
  TaxationDetail,
  UpsertTaxationPayload,
  SurchargeSummary,
  SurchargeDetail,
  UpsertSurchargePayload,
  TaxShopRule,
} from '../../../types/taxSurcharge';

// ── Default payloads ──

const defaultTaxPayload: UpsertTaxationPayload = {
  taxationCode: '',
  taxationName: '',
  priority: 0,
  taxationPercent: null,
  isFixedAmount: false,
  taxationAmount: null,
  isDateSpecific: false,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  isAutoCalculate: true,
  isOpenAmount: false,
  shopRules: null,
};

const defaultSurchargePayload: UpsertSurchargePayload = {
  serviceChargeCode: '',
  serviceChargeName: '',
  priority: 0,
  serviceChargePercent: null,
  isFixedAmount: false,
  serviceChargeAmount: null,
  isDateSpecific: false,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
  isAutoCalculate: true,
  isOpenAmount: false,
  shopRules: null,
};

export function TaxSurchargePage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  // ── Taxation state ──
  const [taxations, setTaxations] = useState<TaxationSummary[]>([]);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxModalOpened, setTaxModalOpened] = useState(false);
  const [taxDeleteOpened, setTaxDeleteOpened] = useState(false);
  const [taxEditTarget, setTaxEditTarget] = useState<TaxationSummary | null>(null);
  const [taxDeleteTarget, setTaxDeleteTarget] = useState<TaxationSummary | null>(null);
  const [taxPayload, setTaxPayload] = useState<UpsertTaxationPayload>({ ...defaultTaxPayload });
  const [taxShopRules, setTaxShopRules] = useState<TaxShopRule[]>([]);

  // ── Surcharge state ──
  const [surcharges, setSurcharges] = useState<SurchargeSummary[]>([]);
  const [surchargeLoading, setSurchargeLoading] = useState(false);
  const [surchargeModalOpened, setSurchargeModalOpened] = useState(false);
  const [surchargeDeleteOpened, setSurchargeDeleteOpened] = useState(false);
  const [surchargeEditTarget, setSurchargeEditTarget] = useState<SurchargeSummary | null>(null);
  const [surchargeDeleteTarget, setSurchargeDeleteTarget] = useState<SurchargeSummary | null>(null);
  const [surchargePayload, setSurchargePayload] = useState<UpsertSurchargePayload>({ ...defaultSurchargePayload });
  const [surchargeShopRules, setSurchargeShopRules] = useState<TaxShopRule[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // ── Loaders ──

  const loadTaxations = useCallback(async () => {
    if (!brandId) { setTaxations([]); return; }
    try {
      setTaxLoading(true);
      setTaxations(await taxSurchargeService.listTaxation(brandId));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load taxations' });
    } finally {
      setTaxLoading(false);
    }
  }, [brandId]);

  const loadSurcharges = useCallback(async () => {
    if (!brandId) { setSurcharges([]); return; }
    try {
      setSurchargeLoading(true);
      setSurcharges(await taxSurchargeService.listSurcharge(brandId));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load surcharges' });
    } finally {
      setSurchargeLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadTaxations(); }, [loadTaxations]);
  useEffect(() => { void loadSurcharges(); }, [loadSurcharges]);

  // ── Taxation handlers ──

  const openTaxCreate = () => {
    setTaxEditTarget(null);
    setTaxPayload({ ...defaultTaxPayload });
    setTaxShopRules([]);
    setTaxModalOpened(true);
  };

  const openTaxEdit = async (item: TaxationSummary) => {
    if (!brandId) return;
    try {
      setSubmitting(true);
      const detail: TaxationDetail = await taxSurchargeService.getTaxation(brandId, item.taxationId);
      setTaxEditTarget(item);
      setTaxPayload({
        taxationCode: detail.taxationCode,
        taxationName: detail.taxationName,
        priority: detail.priority,
        taxationPercent: detail.taxationPercent,
        isFixedAmount: detail.isFixedAmount,
        taxationAmount: detail.taxationAmount,
        isDateSpecific: detail.isDateSpecific,
        startDate: detail.startDate,
        endDate: detail.endDate,
        startTime: detail.startTime,
        endTime: detail.endTime,
        isAutoCalculate: detail.isAutoCalculate,
        isOpenAmount: detail.isOpenAmount,
        shopRules: null,
      });
      setTaxShopRules(detail.shopRules);
      setTaxModalOpened(true);
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load detail' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaxSave = async () => {
    if (!brandId) return;
    if (!taxPayload.taxationCode.trim() || !taxPayload.taxationName.trim()) {
      notifications.show({ color: 'red', message: 'Code and name are required' });
      return;
    }
    try {
      setSubmitting(true);
      const request: UpsertTaxationPayload = {
        ...taxPayload,
        taxationCode: taxPayload.taxationCode.trim(),
        taxationName: taxPayload.taxationName.trim(),
        shopRules: taxEditTarget ? taxShopRules : null,
      };
      if (taxEditTarget) {
        await taxSurchargeService.updateTaxation(brandId, taxEditTarget.taxationId, request);
        notifications.show({ color: 'green', message: 'Taxation updated' });
      } else {
        await taxSurchargeService.createTaxation(brandId, request);
        notifications.show({ color: 'green', message: 'Taxation created' });
      }
      setTaxModalOpened(false);
      await loadTaxations();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaxDeactivate = async () => {
    if (!brandId || !taxDeleteTarget) return;
    try {
      setSubmitting(true);
      await taxSurchargeService.deactivateTaxation(brandId, taxDeleteTarget.taxationId);
      notifications.show({ color: 'green', message: 'Taxation deactivated' });
      setTaxDeleteOpened(false);
      setTaxDeleteTarget(null);
      await loadTaxations();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Surcharge handlers ──

  const openSurchargeCreate = () => {
    setSurchargeEditTarget(null);
    setSurchargePayload({ ...defaultSurchargePayload });
    setSurchargeShopRules([]);
    setSurchargeModalOpened(true);
  };

  const openSurchargeEdit = async (item: SurchargeSummary) => {
    if (!brandId) return;
    try {
      setSubmitting(true);
      const detail: SurchargeDetail = await taxSurchargeService.getSurcharge(brandId, item.serviceChargeId);
      setSurchargeEditTarget(item);
      setSurchargePayload({
        serviceChargeCode: detail.serviceChargeCode,
        serviceChargeName: detail.serviceChargeName,
        priority: detail.priority,
        serviceChargePercent: detail.serviceChargePercent,
        isFixedAmount: detail.isFixedAmount,
        serviceChargeAmount: detail.serviceChargeAmount,
        isDateSpecific: detail.isDateSpecific,
        startDate: detail.startDate,
        endDate: detail.endDate,
        startTime: detail.startTime,
        endTime: detail.endTime,
        isAutoCalculate: detail.isAutoCalculate,
        isOpenAmount: detail.isOpenAmount,
        shopRules: null,
      });
      setSurchargeShopRules(detail.shopRules);
      setSurchargeModalOpened(true);
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load detail' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSurchargeSave = async () => {
    if (!brandId) return;
    if (!surchargePayload.serviceChargeCode.trim() || !surchargePayload.serviceChargeName.trim()) {
      notifications.show({ color: 'red', message: 'Code and name are required' });
      return;
    }
    try {
      setSubmitting(true);
      const request: UpsertSurchargePayload = {
        ...surchargePayload,
        serviceChargeCode: surchargePayload.serviceChargeCode.trim(),
        serviceChargeName: surchargePayload.serviceChargeName.trim(),
        shopRules: surchargeEditTarget ? surchargeShopRules : null,
      };
      if (surchargeEditTarget) {
        await taxSurchargeService.updateSurcharge(brandId, surchargeEditTarget.serviceChargeId, request);
        notifications.show({ color: 'green', message: 'Surcharge updated' });
      } else {
        await taxSurchargeService.createSurcharge(brandId, request);
        notifications.show({ color: 'green', message: 'Surcharge created' });
      }
      setSurchargeModalOpened(false);
      await loadSurcharges();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSurchargeDeactivate = async () => {
    if (!brandId || !surchargeDeleteTarget) return;
    try {
      setSubmitting(true);
      await taxSurchargeService.deactivateSurcharge(brandId, surchargeDeleteTarget.serviceChargeId);
      notifications.show({ color: 'green', message: 'Surcharge deactivated' });
      setSurchargeDeleteOpened(false);
      setSurchargeDeleteTarget(null);
      await loadSurcharges();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ──

  const formatPercent = (val?: number | null) =>
    val != null ? `${(val * 100).toFixed(2)}%` : '—';

  const formatAmount = (val?: number | null) =>
    val != null ? `$${val.toFixed(2)}` : '—';

  const shopRulesSection = (rules: TaxShopRule[], setRules: (r: TaxShopRule[]) => void) =>
    rules.length > 0 && (
      <>
        <Title order={5} mt="md">Shop Settings</Title>
        <Paper withBorder p="xs">
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Shop</Table.Th>
                <Table.Th>Enabled</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rules.map((rule, idx) => (
                <Table.Tr key={rule.shopId}>
                  <Table.Td>{rule.shopName}</Table.Td>
                  <Table.Td>
                    <Switch
                      checked={rule.enabled}
                      onChange={(e) => {
                        const updated = [...rules];
                        updated[idx] = { ...rule, enabled: e.currentTarget.checked };
                        setRules(updated);
                      }}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      </>
    );

  // ── Render ──

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={2}>Tax & Surcharge</Title>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage tax and surcharge settings.
          </Alert>
        )}

        <Tabs defaultValue="taxation">
          <Tabs.List>
            <Tabs.Tab value="taxation">Taxation</Tabs.Tab>
            <Tabs.Tab value="surcharge">Surcharge</Tabs.Tab>
          </Tabs.List>

          {/* ── Taxation Tab ── */}
          <Tabs.Panel value="taxation" pt="md">
            <Stack gap="md">
              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => void loadTaxations()} loading={taxLoading}>Refresh</Button>
                <Button leftSection={<IconPlus size={16} />} onClick={openTaxCreate} disabled={!brandId}>
                  New Taxation
                </Button>
              </Group>
              <Paper withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Tax Code</Table.Th>
                      <Table.Th>Tax Name</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Rate / Amount</Table.Th>
                      <Table.Th>Auto</Table.Th>
                      <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {taxations.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text c="dimmed" ta="center" py="md">
                            {taxLoading ? 'Loading...' : 'No taxation entries found.'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      taxations.map((t) => (
                        <Table.Tr key={t.taxationId}>
                          <Table.Td>{t.taxationCode}</Table.Td>
                          <Table.Td>{t.taxationName}</Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={t.isFixedAmount ? 'orange' : 'blue'}>
                              {t.isFixedAmount ? 'Fixed' : 'Percent'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{t.isFixedAmount ? formatAmount(t.taxationAmount) : formatPercent(t.taxationPercent)}</Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={t.isAutoCalculate ? 'green' : 'gray'}>
                              {t.isAutoCalculate ? 'Yes' : 'No'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon variant="subtle" color="blue" onClick={() => void openTaxEdit(t)}>
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => { setTaxDeleteTarget(t); setTaxDeleteOpened(true); }}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>

          {/* ── Surcharge Tab ── */}
          <Tabs.Panel value="surcharge" pt="md">
            <Stack gap="md">
              <Group justify="flex-end">
                <Button variant="subtle" onClick={() => void loadSurcharges()} loading={surchargeLoading}>Refresh</Button>
                <Button leftSection={<IconPlus size={16} />} onClick={openSurchargeCreate} disabled={!brandId}>
                  New Surcharge
                </Button>
              </Group>
              <Paper withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Code</Table.Th>
                      <Table.Th>Name</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Rate / Amount</Table.Th>
                      <Table.Th>Auto</Table.Th>
                      <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {surcharges.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={6}>
                          <Text c="dimmed" ta="center" py="md">
                            {surchargeLoading ? 'Loading...' : 'No surcharge entries found.'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      surcharges.map((s) => (
                        <Table.Tr key={s.serviceChargeId}>
                          <Table.Td>{s.serviceChargeCode}</Table.Td>
                          <Table.Td>{s.serviceChargeName}</Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={s.isFixedAmount ? 'orange' : 'blue'}>
                              {s.isFixedAmount ? 'Fixed' : 'Percent'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{s.isFixedAmount ? formatAmount(s.serviceChargeAmount) : formatPercent(s.serviceChargePercent)}</Table.Td>
                          <Table.Td>
                            <Badge size="sm" color={s.isAutoCalculate ? 'green' : 'gray'}>
                              {s.isAutoCalculate ? 'Yes' : 'No'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <ActionIcon variant="subtle" color="blue" onClick={() => void openSurchargeEdit(s)}>
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon variant="subtle" color="red" onClick={() => { setSurchargeDeleteTarget(s); setSurchargeDeleteOpened(true); }}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* ── Taxation Modal ── */}
      <Modal opened={taxModalOpened} onClose={() => setTaxModalOpened(false)} title={taxEditTarget ? 'Edit Taxation' : 'New Taxation'} size="lg">
        <Stack gap="md">
          <Group grow>
            <TextInput label="Tax Code" maxLength={50} required value={taxPayload.taxationCode}
              onChange={(e) => setTaxPayload({ ...taxPayload, taxationCode: e.currentTarget.value })} />
            <TextInput label="Tax Name" maxLength={200} required value={taxPayload.taxationName}
              onChange={(e) => setTaxPayload({ ...taxPayload, taxationName: e.currentTarget.value })} />
          </Group>
          <Group grow>
            <NumberInput label="Priority" value={taxPayload.priority}
              onChange={(val) => setTaxPayload({ ...taxPayload, priority: typeof val === 'number' ? val : 0 })} />
            <Switch label="Fixed Amount (vs Percentage)" checked={taxPayload.isFixedAmount} mt="xl"
              onChange={(e) => setTaxPayload({ ...taxPayload, isFixedAmount: e.currentTarget.checked })} />
          </Group>
          {taxPayload.isFixedAmount ? (
            <NumberInput label="Tax Amount" decimalScale={2} value={taxPayload.taxationAmount ?? ''}
              onChange={(val) => setTaxPayload({ ...taxPayload, taxationAmount: typeof val === 'number' ? val : null })} />
          ) : (
            <NumberInput label="Tax Percentage (%)" decimalScale={4} min={0} max={100}
              value={taxPayload.taxationPercent != null ? taxPayload.taxationPercent * 100 : ''}
              onChange={(val) => setTaxPayload({ ...taxPayload, taxationPercent: typeof val === 'number' ? val / 100 : null })} />
          )}
          <Group grow>
            <Switch label="Auto Calculate" checked={taxPayload.isAutoCalculate}
              onChange={(e) => setTaxPayload({ ...taxPayload, isAutoCalculate: e.currentTarget.checked })} />
            <Switch label="Open Amount" checked={taxPayload.isOpenAmount}
              onChange={(e) => setTaxPayload({ ...taxPayload, isOpenAmount: e.currentTarget.checked })} />
          </Group>
          {taxEditTarget && shopRulesSection(taxShopRules, setTaxShopRules)}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setTaxModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleTaxSave()} loading={submitting}>{taxEditTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Taxation Delete Modal ── */}
      <Modal opened={taxDeleteOpened} onClose={() => setTaxDeleteOpened(false)} title="Deactivate Taxation" size="sm">
        <Stack gap="md">
          <Text>Deactivate <strong>{taxDeleteTarget?.taxationName}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTaxDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleTaxDeactivate()} loading={submitting}>Deactivate</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Surcharge Modal ── */}
      <Modal opened={surchargeModalOpened} onClose={() => setSurchargeModalOpened(false)} title={surchargeEditTarget ? 'Edit Surcharge' : 'New Surcharge'} size="lg">
        <Stack gap="md">
          <Group grow>
            <TextInput label="Code" maxLength={50} required value={surchargePayload.serviceChargeCode}
              onChange={(e) => setSurchargePayload({ ...surchargePayload, serviceChargeCode: e.currentTarget.value })} />
            <TextInput label="Name" maxLength={200} required value={surchargePayload.serviceChargeName}
              onChange={(e) => setSurchargePayload({ ...surchargePayload, serviceChargeName: e.currentTarget.value })} />
          </Group>
          <Group grow>
            <NumberInput label="Priority" value={surchargePayload.priority}
              onChange={(val) => setSurchargePayload({ ...surchargePayload, priority: typeof val === 'number' ? val : 0 })} />
            <Switch label="Fixed Amount (vs Percentage)" checked={surchargePayload.isFixedAmount} mt="xl"
              onChange={(e) => setSurchargePayload({ ...surchargePayload, isFixedAmount: e.currentTarget.checked })} />
          </Group>
          {surchargePayload.isFixedAmount ? (
            <NumberInput label="Surcharge Amount" decimalScale={2} value={surchargePayload.serviceChargeAmount ?? ''}
              onChange={(val) => setSurchargePayload({ ...surchargePayload, serviceChargeAmount: typeof val === 'number' ? val : null })} />
          ) : (
            <NumberInput label="Surcharge Percentage (%)" decimalScale={4} min={0} max={100}
              value={surchargePayload.serviceChargePercent != null ? surchargePayload.serviceChargePercent * 100 : ''}
              onChange={(val) => setSurchargePayload({ ...surchargePayload, serviceChargePercent: typeof val === 'number' ? val / 100 : null })} />
          )}
          <Group grow>
            <Switch label="Auto Calculate" checked={surchargePayload.isAutoCalculate}
              onChange={(e) => setSurchargePayload({ ...surchargePayload, isAutoCalculate: e.currentTarget.checked })} />
            <Switch label="Open Amount" checked={surchargePayload.isOpenAmount}
              onChange={(e) => setSurchargePayload({ ...surchargePayload, isOpenAmount: e.currentTarget.checked })} />
          </Group>
          {surchargeEditTarget && shopRulesSection(surchargeShopRules, setSurchargeShopRules)}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setSurchargeModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSurchargeSave()} loading={submitting}>{surchargeEditTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* ── Surcharge Delete Modal ── */}
      <Modal opened={surchargeDeleteOpened} onClose={() => setSurchargeDeleteOpened(false)} title="Deactivate Surcharge" size="sm">
        <Stack gap="md">
          <Text>Deactivate <strong>{surchargeDeleteTarget?.serviceChargeName}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setSurchargeDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleSurchargeDeactivate()} loading={submitting}>Deactivate</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
