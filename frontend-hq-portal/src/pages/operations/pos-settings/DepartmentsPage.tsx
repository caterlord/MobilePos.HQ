import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Container,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import departmentService from '../../../services/departmentService';
import type { DepartmentSummary, UpsertDepartmentPayload } from '../../../types/department';

const defaultPayload: UpsertDepartmentPayload = {
  departmentCode: '',
  departmentName: '',
  description: '',
  revenueCenterCode: '',
  isSubDepartment: true,
  parentDepartmentId: null,
};

export function DepartmentsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [editTarget, setEditTarget] = useState<DepartmentSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentSummary | null>(null);
  const [payload, setPayload] = useState<UpsertDepartmentPayload>({ ...defaultPayload });

  const loadDepartments = useCallback(async () => {
    if (!brandId) { setDepartments([]); return; }
    try {
      setLoading(true);
      setDepartments(await departmentService.list(brandId));
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load departments' });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadDepartments(); }, [loadDepartments]);

  const topDepartments = useMemo(() => departments.filter((d) => !d.isSubDepartment), [departments]);
  const subDepartments = useMemo(() => departments.filter((d) => d.isSubDepartment === true), [departments]);
  const revenueCenters = useMemo(() => departments.filter((d) => d.revenueCenterCode), [departments]);

  const parentOptions = useMemo(
    () =>
      departments
        .filter((d) => !d.isSubDepartment)
        .map((d) => ({ value: String(d.departmentId), label: d.departmentName })),
    [departments],
  );

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setModalOpened(true);
  };

  const openEdit = (dept: DepartmentSummary) => {
    setEditTarget(dept);
    setPayload({
      departmentCode: dept.departmentCode ?? '',
      departmentName: dept.departmentName,
      description: dept.description ?? '',
      revenueCenterCode: dept.revenueCenterCode ?? '',
      isSubDepartment: dept.isSubDepartment,
      parentDepartmentId: dept.parentDepartmentId,
    });
    setModalOpened(true);
  };

  const handleSave = async () => {
    if (!brandId) return;
    if (!payload.departmentName.trim()) {
      notifications.show({ color: 'red', message: 'Department name is required' });
      return;
    }
    try {
      setSubmitting(true);
      const request: UpsertDepartmentPayload = {
        ...payload,
        departmentName: payload.departmentName.trim(),
        departmentCode: payload.departmentCode?.trim() || null,
        description: payload.description?.trim() || null,
        revenueCenterCode: payload.revenueCenterCode?.trim() || null,
      };
      if (editTarget) {
        await departmentService.update(brandId, editTarget.departmentId, request);
        notifications.show({ color: 'green', message: 'Department updated' });
      } else {
        await departmentService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Department created' });
      }
      setModalOpened(false);
      await loadDepartments();
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
      await departmentService.deactivate(brandId, deleteTarget.departmentId);
      notifications.show({ color: 'green', message: 'Department deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadDepartments();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to deactivate' });
    } finally {
      setSubmitting(false);
    }
  };

  const deptTable = (items: DepartmentSummary[], emptyMsg: string, createLabel: string) => (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => void loadDepartments()} loading={loading}>Refresh</Button>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
          {createLabel}
        </Button>
      </Group>
      <Paper withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Code</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Description</Table.Th>
            <Table.Th>Revenue Center</Table.Th>
            <Table.Th style={{ width: 100 }}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.length === 0 ? (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center" py="md">{loading ? 'Loading...' : emptyMsg}</Text>
              </Table.Td>
            </Table.Tr>
          ) : (
            items.map((d) => (
              <Table.Tr key={d.departmentId}>
                <Table.Td>{d.departmentCode || '—'}</Table.Td>
                <Table.Td>{d.departmentName}</Table.Td>
                <Table.Td>{d.description || '—'}</Table.Td>
                <Table.Td>{d.revenueCenterCode || '—'}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(d)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => { setDeleteTarget(d); setDeleteOpened(true); }}>
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
  );

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={2}>Departments</Title>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage departments.
          </Alert>
        )}

        <Tabs defaultValue="departments">
          <Tabs.List>
            <Tabs.Tab value="departments">Departments</Tabs.Tab>
            <Tabs.Tab value="sub-departments">Sub-Departments</Tabs.Tab>
            <Tabs.Tab value="revenue-centers">Revenue Centers</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="departments" pt="md">
            {deptTable(topDepartments, 'No departments found.', 'New Department')}
          </Tabs.Panel>
          <Tabs.Panel value="sub-departments" pt="md">
            {deptTable(subDepartments, 'No sub-departments found.', 'New Sub-Department')}
          </Tabs.Panel>
          <Tabs.Panel value="revenue-centers" pt="md">
            {deptTable(revenueCenters, 'No revenue centers found.', 'New Revenue Center')}
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Department' : 'New Department'} size="md">
        <Stack gap="md">
          <Group grow>
            <TextInput label="Code" maxLength={50} value={payload.departmentCode ?? ''}
              onChange={(e) => setPayload({ ...payload, departmentCode: e.currentTarget.value })} />
            <TextInput label="Name" maxLength={100} required value={payload.departmentName}
              onChange={(e) => setPayload({ ...payload, departmentName: e.currentTarget.value })} />
          </Group>
          <TextInput label="Description" maxLength={200} value={payload.description ?? ''}
            onChange={(e) => setPayload({ ...payload, description: e.currentTarget.value })} />
          <TextInput label="Revenue Center Code" maxLength={50} value={payload.revenueCenterCode ?? ''}
            onChange={(e) => setPayload({ ...payload, revenueCenterCode: e.currentTarget.value })} />
          {parentOptions.length > 0 && (
            <Select
              label="Parent Department"
              placeholder="None"
              clearable
              data={parentOptions}
              value={payload.parentDepartmentId ? String(payload.parentDepartmentId) : null}
              onChange={(val) => setPayload({ ...payload, parentDepartmentId: val ? parseInt(val, 10) : null })}
            />
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>{editTarget ? 'Update' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Department" size="sm">
        <Stack gap="md">
          <Text>Deactivate <strong>{deleteTarget?.departmentName}</strong>?</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleDeactivate()} loading={submitting}>Deactivate</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
