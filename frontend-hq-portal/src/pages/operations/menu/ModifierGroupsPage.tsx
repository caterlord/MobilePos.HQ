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
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Switch,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import modifierGroupService from '../../../services/modifierGroupService';
import type { ModifierGroupHeader } from '../../../types/modifierGroup';
import {
  NodePropertiesDrawer,
  type NodePropertiesDrawerState,
} from './menu-items/NodePropertiesDrawer';

export function ModifierGroupsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [groups, setGroups] = useState<ModifierGroupHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createOpened, setCreateOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [drawerState, setDrawerState] = useState<NodePropertiesDrawerState | null>(null);

  const [createName, setCreateName] = useState('');
  const [createNameAlt, setCreateNameAlt] = useState('');
  const [createEnabled, setCreateEnabled] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ModifierGroupHeader | null>(null);

  const loadGroups = useCallback(async () => {
    if (!brandId) {
      setGroups([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await modifierGroupService.list(brandId, { isFollowSet: false });
      setGroups(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load modifier groups';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const resetCreateForm = () => {
    setCreateName('');
    setCreateNameAlt('');
    setCreateEnabled(true);
  };

  const handleCreate = async () => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }

    const name = createName.trim();
    if (!name) {
      notifications.show({ color: 'red', message: 'Group name is required' });
      return;
    }

    try {
      setSubmitting(true);
      const created = await modifierGroupService.create(brandId, {
        groupBatchName: name,
        groupBatchNameAlt: createNameAlt.trim() || null,
        enabled: createEnabled,
        isFollowSet: false,
        items: [],
      });

      notifications.show({ color: 'green', message: 'Modifier group created' });
      setCreateOpened(false);
      resetCreateForm();
      await loadGroups();

      setDrawerState({
        kind: 'modifier',
        itemId: created.groupHeaderId,
        groupHeaderId: created.groupHeaderId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create modifier group';
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
      await modifierGroupService.deactivate(brandId, deleteTarget.groupHeaderId);
      notifications.show({ color: 'green', message: 'Modifier group deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate modifier group';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleModifierGroupUpdated = (updated: ModifierGroupHeader) => {
    setGroups((prev) =>
      prev.map((group) => (group.groupHeaderId === updated.groupHeaderId ? { ...group, ...updated } : group))
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Modifier Groups</Title>
            <Text size="sm" c="dimmed">
              Create and maintain modifier groups and membership for the selected brand.
            </Text>
          </div>
          <Group>
            <Button variant="light" onClick={() => void loadGroups()} loading={loading}>
              Refresh
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                resetCreateForm();
                setCreateOpened(true);
              }}
              disabled={!brandId}
            >
              Create Group
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage modifier groups.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          {!loading && groups.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              No modifier groups found.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Alt Name</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {groups.map((group) => (
                  <Table.Tr key={group.groupHeaderId}>
                    <Table.Td>{group.groupHeaderId}</Table.Td>
                    <Table.Td>{group.groupBatchName}</Table.Td>
                    <Table.Td>{group.groupBatchNameAlt || '-'}</Table.Td>
                    <Table.Td>
                      <Badge color={group.enabled ? 'green' : 'gray'}>
                        {group.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() =>
                            setDrawerState({
                              kind: 'modifier',
                              itemId: group.groupHeaderId,
                              groupHeaderId: group.groupHeaderId,
                            })
                          }
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setDeleteTarget(group);
                            setDeleteOpened(true);
                          }}
                          disabled={!group.enabled}
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

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Create Modifier Group" size="md">
        <Stack gap="md">
          <TextInput
            label="Group Name"
            placeholder="Enter group name"
            value={createName}
            onChange={(event) => setCreateName(event.currentTarget.value)}
            required
          />
          <TextInput
            label="Group Name (Alt)"
            placeholder="Optional alternate name"
            value={createNameAlt}
            onChange={(event) => setCreateNameAlt(event.currentTarget.value)}
          />
          <Switch
            label="Enabled"
            checked={createEnabled}
            onChange={(event) => setCreateEnabled(event.currentTarget.checked)}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setCreateOpened(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleCreate}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Modifier Group" size="sm">
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.groupBatchName}</strong>? Existing links will remain but this group will
            no longer be available for new assignments.
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

      <NodePropertiesDrawer
        state={drawerState}
        brandId={brandId}
        onClose={() => setDrawerState(null)}
        onAfterSave={loadGroups}
        onModifierGroupUpdated={handleModifierGroupUpdated}
      />
    </Container>
  );
}
