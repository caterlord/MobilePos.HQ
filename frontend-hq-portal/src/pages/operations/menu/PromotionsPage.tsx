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
import promotionService from '../../../services/promotionService';
import type { PromotionSummary, UpsertPromotionPayload } from '../../../types/promotion';

const defaultPayload: UpsertPromotionPayload = {
  promoCode: '',
  promoName: '',
  promoSaveAmount: 0,
  priority: null,
  enabled: true,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
};

export function PromotionsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [promotions, setPromotions] = useState<PromotionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<PromotionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionSummary | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [payload, setPayload] = useState<UpsertPromotionPayload>(defaultPayload);

  const loadPromotions = useCallback(async () => {
    if (!brandId) {
      setPromotions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await promotionService.list(brandId);
      setPromotions(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load promotions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setModalOpened(true);
  };

  const openEdit = (promotion: PromotionSummary) => {
    setEditTarget(promotion);
    setPayload({
      promoCode: promotion.promoCode,
      promoName: promotion.promoName,
      promoSaveAmount: promotion.promoSaveAmount ?? 0,
      priority: promotion.priority ?? null,
      enabled: promotion.enabled,
      startDate: promotion.startDate ?? null,
      endDate: promotion.endDate ?? null,
      startTime: promotion.startTime ?? null,
      endTime: promotion.endTime ?? null,
    });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }

    if (!payload.promoCode.trim() || !payload.promoName.trim()) {
      notifications.show({ color: 'red', message: 'Promotion code and name are required' });
      return;
    }

    try {
      setSubmitting(true);
      const request: UpsertPromotionPayload = {
        ...payload,
        promoCode: payload.promoCode.trim(),
        promoName: payload.promoName.trim(),
      };

      if (editTarget) {
        await promotionService.update(brandId, editTarget.promoHeaderId, request);
        notifications.show({ color: 'green', message: 'Promotion updated' });
      } else {
        await promotionService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Promotion created' });
      }

      setModalOpened(false);
      setEditTarget(null);
      await loadPromotions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save promotion';
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
      await promotionService.deactivate(brandId, deleteTarget.promoHeaderId);
      notifications.show({ color: 'green', message: 'Promotion deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadPromotions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate promotion';
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
            <Title order={2}>Promotions</Title>
            <Text size="sm" c="dimmed">
              Create and manage promotion headers for the selected brand.
            </Text>
          </div>
          <Group>
            <Button variant="light" onClick={() => void loadPromotions()} loading={loading}>
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              Create Promotion
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage promotions.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          {!loading && promotions.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              No promotions found.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Save Amount</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {promotions.map((promotion) => (
                  <Table.Tr key={promotion.promoHeaderId}>
                    <Table.Td>{promotion.promoCode}</Table.Td>
                    <Table.Td>{promotion.promoName}</Table.Td>
                    <Table.Td>{promotion.promoSaveAmount}</Table.Td>
                    <Table.Td>{promotion.priority ?? '-'}</Table.Td>
                    <Table.Td>
                      <Badge color={promotion.enabled ? 'green' : 'gray'}>
                        {promotion.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="light" color="blue" onClick={() => openEdit(promotion)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setDeleteTarget(promotion);
                            setDeleteOpened(true);
                          }}
                          disabled={!promotion.enabled}
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

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Promotion' : 'Create Promotion'}>
        <Stack gap="md">
          <TextInput
            label="Promotion Code"
            value={payload.promoCode}
            onChange={(event) => setPayload((prev) => ({ ...prev, promoCode: event.currentTarget.value }))}
            required
          />
          <TextInput
            label="Promotion Name"
            value={payload.promoName}
            onChange={(event) => setPayload((prev) => ({ ...prev, promoName: event.currentTarget.value }))}
            required
          />
          <Group grow>
            <NumberInput
              label="Save Amount"
              min={0}
              value={payload.promoSaveAmount}
              onChange={(value) => setPayload((prev) => ({ ...prev, promoSaveAmount: Number(value) || 0 }))}
            />
            <NumberInput
              label="Priority"
              min={0}
              value={payload.priority ?? undefined}
              onChange={(value) => {
                const numberValue = Number(value);
                setPayload((prev) => ({
                  ...prev,
                  priority: Number.isFinite(numberValue) ? numberValue : null,
                }));
              }}
            />
          </Group>
          <Switch
            label="Enabled"
            checked={payload.enabled}
            onChange={(event) => setPayload((prev) => ({ ...prev, enabled: event.currentTarget.checked }))}
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

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Promotion" size="sm">
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.promoName}</strong>? It will no longer be available for new orders.
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
