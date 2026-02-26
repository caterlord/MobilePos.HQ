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
  Select,
  Stack,
  Switch,
  Table,
  Textarea,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import discountService from '../../../services/discountService';
import type { DiscountSummary, UpsertDiscountPayload } from '../../../types/discount';

const discountTypeOptions = [
  { value: '6', label: 'Discount: Fixed' },
  { value: '7', label: 'Discount: Percent' },
  { value: '10', label: 'Discount: Open' },
  { value: '12', label: 'Discount: Fixed Item' },
  { value: '13', label: 'Discount: Percent Item' },
  { value: '14', label: 'Discount: Upgrade Item' },
];

const getDiscountTypeLabel = (typeId: number) =>
  discountTypeOptions.find((option) => option.value === String(typeId))?.label ?? `Type ${typeId}`;

const defaultPayload: UpsertDiscountPayload = {
  discountCode: '',
  discountName: '',
  bundlePromoDesc: '',
  bundlePromoHeaderTypeId: 7,
  isFixedAmount: false,
  discountPercent: 0,
  discountAmount: null,
  priority: 0,
  enabled: true,
  isAvailable: true,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
};

export function DiscountsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [discounts, setDiscounts] = useState<DiscountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<DiscountSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountSummary | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [payload, setPayload] = useState<UpsertDiscountPayload>(defaultPayload);

  const loadDiscounts = useCallback(async () => {
    if (!brandId) {
      setDiscounts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await discountService.list(brandId);
      setDiscounts(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load discounts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadDiscounts();
  }, [loadDiscounts]);

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setModalOpened(true);
  };

  const openEdit = (discount: DiscountSummary) => {
    setEditTarget(discount);
    setPayload({
      discountCode: discount.discountCode,
      discountName: discount.discountName,
      bundlePromoDesc: discount.bundlePromoDesc ?? '',
      bundlePromoHeaderTypeId: discount.bundlePromoHeaderTypeId,
      isFixedAmount: discount.isFixedAmount,
      discountPercent: discount.discountPercent ?? null,
      discountAmount: discount.discountAmount ?? null,
      priority: discount.priority,
      enabled: true,
      isAvailable: discount.isAvailable,
      startDate: discount.startDate ?? null,
      endDate: discount.endDate ?? null,
      startTime: discount.startTime ?? null,
      endTime: discount.endTime ?? null,
    });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }

    if (!payload.discountCode.trim() || !payload.discountName.trim()) {
      notifications.show({ color: 'red', message: 'Discount code and name are required' });
      return;
    }

    if (!payload.isFixedAmount && (payload.discountPercent ?? 0) < 0) {
      notifications.show({ color: 'red', message: 'Discount percent must be 0 or greater' });
      return;
    }

    if (payload.isFixedAmount && (payload.discountAmount ?? 0) < 0) {
      notifications.show({ color: 'red', message: 'Discount amount must be 0 or greater' });
      return;
    }

    try {
      setSubmitting(true);
      const request: UpsertDiscountPayload = {
        ...payload,
        discountCode: payload.discountCode.trim(),
        discountName: payload.discountName.trim(),
        bundlePromoDesc: payload.bundlePromoDesc?.trim() || null,
        discountPercent: payload.isFixedAmount ? null : payload.discountPercent ?? 0,
        discountAmount: payload.isFixedAmount ? payload.discountAmount ?? 0 : null,
        enabled: true,
      };

      if (editTarget) {
        await discountService.update(brandId, editTarget.discountId, request);
        notifications.show({ color: 'green', message: 'Discount updated' });
      } else {
        await discountService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Discount created' });
      }

      setModalOpened(false);
      setEditTarget(null);
      await loadDiscounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save discount';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!brandId || !deleteTarget) {
      return;
    }

    try {
      setSubmitting(true);
      await discountService.deactivate(brandId, deleteTarget.discountId);
      notifications.show({ color: 'green', message: 'Discount deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadDiscounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate discount';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Discounts</Title>
            <Text size="sm" c="dimmed">
              Configure discount headers and status for the selected brand.
            </Text>
          </div>
          <Group>
            <Button variant="light" onClick={() => void loadDiscounts()} loading={loading}>
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              Create Discount
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage discounts.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          {!loading && discounts.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              No discounts found.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Rule Type</Table.Th>
                  <Table.Th>Value Type</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {discounts.map((discount) => (
                  <Table.Tr key={discount.discountId}>
                    <Table.Td>{discount.discountCode}</Table.Td>
                    <Table.Td>{discount.discountName}</Table.Td>
                    <Table.Td>{getDiscountTypeLabel(discount.bundlePromoHeaderTypeId)}</Table.Td>
                    <Table.Td>{discount.isFixedAmount ? 'Fixed Amount' : 'Percentage'}</Table.Td>
                    <Table.Td>{discount.isFixedAmount ? discount.discountAmount ?? 0 : discount.discountPercent ?? 0}</Table.Td>
                    <Table.Td>{discount.priority}</Table.Td>
                    <Table.Td>
                      <Badge color={discount.isAvailable ? 'green' : 'gray'}>
                        {discount.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="light" color="blue" onClick={() => openEdit(discount)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setDeleteTarget(discount);
                            setDeleteOpened(true);
                          }}
                          disabled={!discount.isAvailable}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Discount' : 'Create Discount'}>
        <Stack gap="md">
          <TextInput
            label="Discount Code"
            value={payload.discountCode}
            onChange={(event) => setPayload((prev) => ({ ...prev, discountCode: event.currentTarget.value }))}
            required
          />
          <TextInput
            label="Discount Name"
            value={payload.discountName}
            onChange={(event) => setPayload((prev) => ({ ...prev, discountName: event.currentTarget.value }))}
            required
          />
          <Select
            label="Rule Type"
            data={discountTypeOptions}
            value={String(payload.bundlePromoHeaderTypeId)}
            onChange={(value) =>
              setPayload((prev) => ({
                ...prev,
                bundlePromoHeaderTypeId: value ? parseInt(value, 10) : prev.bundlePromoHeaderTypeId,
              }))
            }
            required
          />
          <Textarea
            label="Description"
            minRows={2}
            value={payload.bundlePromoDesc ?? ''}
            onChange={(event) => setPayload((prev) => ({ ...prev, bundlePromoDesc: event.currentTarget.value }))}
          />
          <Switch
            label="Fixed Amount Discount"
            checked={payload.isFixedAmount}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                isFixedAmount: event.currentTarget.checked,
                discountPercent: event.currentTarget.checked ? null : prev.discountPercent ?? 0,
                discountAmount: event.currentTarget.checked ? prev.discountAmount ?? 0 : null,
              }))
            }
          />
          <Group grow>
            {payload.isFixedAmount ? (
              <NumberInput
                label="Discount Amount"
                min={0}
                value={payload.discountAmount ?? undefined}
                onChange={(value) => setPayload((prev) => ({ ...prev, discountAmount: Number(value) || 0 }))}
              />
            ) : (
              <NumberInput
                label="Discount Percent"
                min={0}
                value={payload.discountPercent ?? undefined}
                onChange={(value) => setPayload((prev) => ({ ...prev, discountPercent: Number(value) || 0 }))}
              />
            )}
            <NumberInput
              label="Priority"
              min={0}
              value={payload.priority}
              onChange={(value) => setPayload((prev) => ({ ...prev, priority: Number(value) || 0 }))}
            />
          </Group>
          <Switch
            label="Available"
            checked={payload.isAvailable}
            onChange={(event) => setPayload((prev) => ({ ...prev, isAvailable: event.currentTarget.checked }))}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSave}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Discount" size="sm">
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.discountName}</strong>? It will no longer be applied to new orders.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setDeleteOpened(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" loading={submitting} onClick={handleDeactivate}>
              Deactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
