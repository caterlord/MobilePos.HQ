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
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import paymentMethodService from '../../../services/paymentMethodService';
import type {
  PaymentMethodDetail,
  PaymentMethodShopRule,
  PaymentMethodSummary,
  UpsertPaymentMethodPayload,
} from '../../../types/paymentMethod';

const defaultPayload: UpsertPaymentMethodPayload = {
  paymentMethodCode: '',
  paymentMethodName: '',
  displayIndex: 0,
  isDrawerKick: false,
  isTipEnabled: false,
  isNonSalesPayment: false,
  isCashPayment: false,
  isFixedAmount: false,
  fixedAmount: null,
  isOverPaymentEnabled: false,
  isFxPayment: false,
  isAutoRemarkEnabled: false,
  paymentMethodSurchargeRate: null,
  txChargesRate: null,
  linkedGateway: '',
  remarkFormats: '',
  maxUseCount: null,
  shopRules: null,
};

export function PaymentMethodsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [methods, setMethods] = useState<PaymentMethodSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<PaymentMethodSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodSummary | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [payload, setPayload] = useState<UpsertPaymentMethodPayload>({ ...defaultPayload });
  const [shopRules, setShopRules] = useState<PaymentMethodShopRule[]>([]);

  const loadMethods = useCallback(async () => {
    if (!brandId) {
      setMethods([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await paymentMethodService.list(brandId);
      setMethods(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment methods';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setShopRules([]);
    setModalOpened(true);
  };

  const openEdit = async (method: PaymentMethodSummary) => {
    if (!brandId) return;
    setEditTarget(method);
    setModalOpened(true);
    try {
      setSubmitting(true);
      const detail: PaymentMethodDetail = await paymentMethodService.get(brandId, method.paymentMethodId);
      setPayload({
        paymentMethodCode: detail.paymentMethodCode,
        paymentMethodName: detail.paymentMethodName,
        displayIndex: detail.displayIndex,
        isDrawerKick: detail.isDrawerKick,
        isTipEnabled: detail.isTipEnabled,
        isNonSalesPayment: detail.isNonSalesPayment,
        isCashPayment: detail.isCashPayment,
        isFixedAmount: detail.isFixedAmount,
        fixedAmount: detail.fixedAmount,
        isOverPaymentEnabled: detail.isOverPaymentEnabled,
        isFxPayment: detail.isFxPayment,
        isAutoRemarkEnabled: detail.isAutoRemarkEnabled,
        paymentMethodSurchargeRate: detail.paymentMethodSurchargeRate,
        txChargesRate: detail.txChargesRate,
        linkedGateway: detail.linkedGateway ?? '',
        remarkFormats: detail.remarkFormats ?? '',
        maxUseCount: detail.maxUseCount,
        shopRules: null,
      });
      setShopRules(detail.shopRules);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment method detail';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }
    if (!payload.paymentMethodCode.trim() || !payload.paymentMethodName.trim()) {
      notifications.show({ color: 'red', message: 'Code and name are required' });
      return;
    }
    try {
      setSubmitting(true);
      const request: UpsertPaymentMethodPayload = {
        ...payload,
        paymentMethodCode: payload.paymentMethodCode.trim(),
        paymentMethodName: payload.paymentMethodName.trim(),
        shopRules: editTarget ? shopRules : null,
      };
      if (editTarget) {
        await paymentMethodService.update(brandId, editTarget.paymentMethodId, request);
        notifications.show({ color: 'green', message: 'Payment method updated' });
      } else {
        await paymentMethodService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Payment method created' });
      }
      setModalOpened(false);
      setEditTarget(null);
      await loadMethods();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save payment method';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!brandId || !deleteTarget) return;
    try {
      setSubmitting(true);
      await paymentMethodService.deactivate(brandId, deleteTarget.paymentMethodId);
      notifications.show({ color: 'green', message: 'Payment method deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadMethods();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate payment method';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const boolBadge = (value?: boolean | null) =>
    value ? <Badge color="green" size="sm">Yes</Badge> : <Badge color="gray" size="sm">No</Badge>;

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Payment Methods</Title>
          <Group>
            <Button variant="subtle" onClick={loadMethods} loading={loading}>
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              New Payment Method
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage payment methods.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Cash Drawer</Table.Th>
                <Table.Th>Tips</Table.Th>
                <Table.Th>Surcharge Rate</Table.Th>
                <Table.Th>Non-Sales</Table.Th>
                <Table.Th>3rd Party</Table.Th>
                <Table.Th style={{ width: 100 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && methods.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center" py="md">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : methods.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center" py="md">No payment methods found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                methods.map((m) => (
                  <Table.Tr key={m.paymentMethodId}>
                    <Table.Td>{m.paymentMethodCode}</Table.Td>
                    <Table.Td>{m.paymentMethodName}</Table.Td>
                    <Table.Td>{boolBadge(m.isDrawerKick)}</Table.Td>
                    <Table.Td>{boolBadge(m.isTipEnabled)}</Table.Td>
                    <Table.Td>{m.paymentMethodSurchargeRate != null ? `${m.paymentMethodSurchargeRate}%` : '—'}</Table.Td>
                    <Table.Td>{boolBadge(m.isNonSalesPayment)}</Table.Td>
                    <Table.Td>{m.linkedGateway || '—'}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" onClick={() => void openEdit(m)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => { setDeleteTarget(m); setDeleteOpened(true); }}
                        >
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

      {/* Create / Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editTarget ? 'Edit Payment Method' : 'New Payment Method'}
        size="lg"
      >
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Code"
              maxLength={10}
              required
              value={payload.paymentMethodCode}
              onChange={(e) => setPayload({ ...payload, paymentMethodCode: e.currentTarget.value })}
            />
            <TextInput
              label="Name"
              maxLength={50}
              required
              value={payload.paymentMethodName}
              onChange={(e) => setPayload({ ...payload, paymentMethodName: e.currentTarget.value })}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Display Index"
              value={payload.displayIndex}
              onChange={(val) => setPayload({ ...payload, displayIndex: typeof val === 'number' ? val : 0 })}
            />
            <NumberInput
              label="Surcharge Rate (%)"
              decimalScale={2}
              value={payload.paymentMethodSurchargeRate ?? ''}
              onChange={(val) => setPayload({ ...payload, paymentMethodSurchargeRate: typeof val === 'number' ? val : null })}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Fixed Amount"
              decimalScale={2}
              value={payload.fixedAmount ?? ''}
              onChange={(val) => setPayload({ ...payload, fixedAmount: typeof val === 'number' ? val : null })}
            />
            <NumberInput
              label="Tx Charges Rate"
              decimalScale={2}
              value={payload.txChargesRate ?? ''}
              onChange={(val) => setPayload({ ...payload, txChargesRate: typeof val === 'number' ? val : null })}
            />
          </Group>

          <TextInput
            label="Linked Gateway"
            value={payload.linkedGateway ?? ''}
            onChange={(e) => setPayload({ ...payload, linkedGateway: e.currentTarget.value || null })}
          />

          <Group grow>
            <Switch
              label="Open Cash Drawer"
              checked={!!payload.isDrawerKick}
              onChange={(e) => setPayload({ ...payload, isDrawerKick: e.currentTarget.checked })}
            />
            <Switch
              label="Allow Tips"
              checked={!!payload.isTipEnabled}
              onChange={(e) => setPayload({ ...payload, isTipEnabled: e.currentTarget.checked })}
            />
          </Group>

          <Group grow>
            <Switch
              label="Non-Sales Payment"
              checked={!!payload.isNonSalesPayment}
              onChange={(e) => setPayload({ ...payload, isNonSalesPayment: e.currentTarget.checked })}
            />
            <Switch
              label="Cash Payment"
              checked={!!payload.isCashPayment}
              onChange={(e) => setPayload({ ...payload, isCashPayment: e.currentTarget.checked })}
            />
          </Group>

          <Group grow>
            <Switch
              label="Fixed Amount"
              checked={!!payload.isFixedAmount}
              onChange={(e) => setPayload({ ...payload, isFixedAmount: e.currentTarget.checked })}
            />
            <Switch
              label="Over Payment"
              checked={!!payload.isOverPaymentEnabled}
              onChange={(e) => setPayload({ ...payload, isOverPaymentEnabled: e.currentTarget.checked })}
            />
          </Group>

          <Group grow>
            <Switch
              label="FX Payment"
              checked={!!payload.isFxPayment}
              onChange={(e) => setPayload({ ...payload, isFxPayment: e.currentTarget.checked })}
            />
            <Switch
              label="Auto Remark"
              checked={!!payload.isAutoRemarkEnabled}
              onChange={(e) => setPayload({ ...payload, isAutoRemarkEnabled: e.currentTarget.checked })}
            />
          </Group>

          {/* Shop Rules (only shown when editing) */}
          {editTarget && shopRules.length > 0 && (
            <>
              <Title order={5} mt="md">Shop Settings</Title>
              <Paper withBorder p="xs">
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Shop</Table.Th>
                      <Table.Th>Enabled</Table.Th>
                      <Table.Th>FX Rate</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {shopRules.map((rule, idx) => (
                      <Table.Tr key={rule.shopId}>
                        <Table.Td>{rule.shopName}</Table.Td>
                        <Table.Td>
                          <Switch
                            checked={rule.enabled}
                            onChange={(e) => {
                              const updated = [...shopRules];
                              updated[idx] = { ...rule, enabled: e.currentTarget.checked };
                              setShopRules(updated);
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            decimalScale={4}
                            value={rule.paymentFxRate ?? ''}
                            onChange={(val) => {
                              const updated = [...shopRules];
                              updated[idx] = { ...rule, paymentFxRate: typeof val === 'number' ? val : null };
                              setShopRules(updated);
                            }}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title="Deactivate Payment Method"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.paymentMethodName}</strong> ({deleteTarget?.paymentMethodCode})?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleDeactivate()} loading={submitting}>
              Deactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
