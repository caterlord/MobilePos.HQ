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

export function MealSetPage() {
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
      const response = await modifierGroupService.list(brandId, { isFollowSet: true });
      setGroups(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load meal set groups';
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
      notifications.show({ color: 'red', message: 'Meal set group name is required' });
      return;
    }

    try {
      setSubmitting(true);
      const created = await modifierGroupService.create(brandId, {
        groupBatchName: name,
        groupBatchNameAlt: createNameAlt.trim() || null,
        enabled: createEnabled,
        isFollowSet: true,
        items: [],
      });

      notifications.show({ color: 'green', message: 'Meal set group created' });
      setCreateOpened(false);
      resetCreateForm();
      await loadGroups();

      setDrawerState({
        kind: 'item-set',
        itemId: created.groupHeaderId,
        groupHeaderId: created.groupHeaderId,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create meal set group';
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
      notifications.show({ color: 'green', message: 'Meal set group deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadGroups();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate meal set group';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupUpdated = (updated: ModifierGroupHeader) => {
    setGroups((prev) =>
      prev.map((group) => (group.groupHeaderId === updated.groupHeaderId ? { ...group, ...updated } : group))
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Meal Set Groups</Title>
            <Text size="sm" c="dimmed">
              Manage item-set groups and set-item membership for the selected brand.
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
              Create Meal Set Group
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage meal set groups.
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
              No meal set groups found.
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
                              kind: 'item-set',
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

      <Modal opened={createOpened} onClose={() => setCreateOpened(false)} title="Create Meal Set Group" size="md">
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

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Meal Set Group" size="sm">
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.groupBatchName}</strong>? Existing assignments remain, but this group
            will no longer be available for new meal set links.
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
        onModifierGroupUpdated={handleGroupUpdated}
      />
    </Container>
  );
}
