import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import reasonService from '../../../services/reasonService';
import type { ReasonSummary, UpsertReasonPayload } from '../../../types/reason';

const reasonGroupOptions = [
  { value: 'TX_DISABLE', label: 'Cancel / Void' },
  { value: 'PAYIN', label: 'Pay-in' },
  { value: 'PAYOUT', label: 'Pay-out' },
  { value: 'ISO', label: 'Item Sold Out' },
];

const getGroupLabel = (code: string) =>
  reasonGroupOptions.find((o) => o.value === code)?.label ?? (code || 'Other');

const getGroupColor = (code: string) => {
  switch (code) {
    case 'TX_DISABLE': return 'red';
    case 'PAYIN': return 'green';
    case 'PAYOUT': return 'orange';
    case 'ISO': return 'blue';
    default: return 'gray';
  }
};

const defaultPayload: UpsertReasonPayload = {
  reasonGroupCode: 'TX_DISABLE',
  reasonCode: '',
  reasonDesc: '',
};

export function ReasonsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [reasons, setReasons] = useState<ReasonSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string | null>(null);

  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [editTarget, setEditTarget] = useState<ReasonSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReasonSummary | null>(null);
  const [payload, setPayload] = useState<UpsertReasonPayload>({ ...defaultPayload });

  const loadReasons = useCallback(async () => {
    if (!brandId) { setReasons([]); return; }
    try {
      setLoading(true);
      setReasons(await reasonService.list(brandId));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load reasons' });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadReasons(); }, [loadReasons]);

  const filtered = useMemo(
    () => filterGroup ? reasons.filter((r) => r.reasonGroupCode === filterGroup) : reasons,
    [reasons, filterGroup],
  );

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setModalOpened(true);
  };

  const openEdit = (r: ReasonSummary) => {
    setEditTarget(r);
    setPayload({
      reasonGroupCode: r.reasonGroupCode,
      reasonCode: r.reasonCode,
      reasonDesc: r.reasonDesc,
    });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!brandId) return;
    if (!payload.reasonCode.trim() || !payload.reasonDesc.trim()) {
      notifications.show({ color: 'red', message: 'Code and description are required' });
      return;
    }
    try {
      setSubmitting(true);
      const request: UpsertReasonPayload = {
        reasonGroupCode: payload.reasonGroupCode,
        reasonCode: payload.reasonCode.trim(),
        reasonDesc: payload.reasonDesc.trim(),
      };
      if (editTarget) {
        await reasonService.update(brandId, editTarget.reasonId, request);
        notifications.show({ color: 'green', message: 'Reason updated' });
      } else {
        await reasonService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Reason created' });
      }
      setModalOpened(false);
      await loadReasons();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!brandId || !deleteTarget) return;
    try {
      setSubmitting(true);
      await reasonService.deactivate(brandId, deleteTarget.reasonId);
      notifications.show({ color: 'green', message: 'Reason deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadReasons();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Reasons</Title>
          <Group>
            <Button variant="subtle" onClick={() => void loadReasons()} loading={loading}>Refresh</Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              New Reason
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage reasons.
          </Alert>
        )}

        <Select
          label="Filter by Type"
          placeholder="All types"
          clearable
          data={reasonGroupOptions}
          value={filterGroup}
          onChange={setFilterGroup}
          w={250}
        />

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reason Type</Table.Th>
                <Table.Th>Reason Code</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th style={{ width: 100 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center" py="md">{loading ? 'Loading...' : 'No reasons found.'}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filtered.map((r) => (
                  <Table.Tr key={r.reasonId}>
                    <Table.Td>
                      <Badge size="sm" color={getGroupColor(r.reasonGroupCode)}>
                        {getGroupLabel(r.reasonGroupCode)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{r.reasonCode}</Table.Td>
                    <Table.Td>{r.reasonDesc}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(r)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(r); setDeleteOpened(true); }}>
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

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Reason' : 'New Reason'} size="md">
        <Stack gap="md">
          <Select
            label="Reason Type"
            required
            data={reasonGroupOptions}
            value={payload.reasonGroupCode}
            onChange={(val) => setPayload({ ...payload, reasonGroupCode: val ?? 'TX_DISABLE' })}
          />
          <TextInput label="Reason Code" maxLength={10} required value={payload.reasonCode}
            onChange={(e) => setPayload({ ...payload, reasonCode: e.currentTarget.value })} />
          <TextInput label="Description" maxLength={500} required value={payload.reasonDesc}
            onChange={(e) => setPayload({ ...payload, reasonDesc: e.currentTarget.value })} />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>{editTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Reason" size="sm">
        <Stack gap="md">
          <Text>Deactivate <strong>{deleteTarget?.reasonDesc}</strong> ({deleteTarget?.reasonCode})?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleDeactivate()} loading={submitting}>Deactivate</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
