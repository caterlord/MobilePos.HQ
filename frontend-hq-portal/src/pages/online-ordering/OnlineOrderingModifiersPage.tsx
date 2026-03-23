import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconRefresh } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import modifierGroupService from '../../services/modifierGroupService';
import type { ModifierGroupHeader, ModifierGroupProperties } from '../../types/modifierGroup';
import { NodePropertiesDrawer, type NodePropertiesDrawerState } from '../operations/menu/menu-items/NodePropertiesDrawer';

type ModifierRow = ModifierGroupHeader & { isOdoDisplay: boolean };

const toHeader = (properties: ModifierGroupProperties): ModifierRow => ({
  groupHeaderId: properties.groupHeaderId,
  accountId: properties.accountId,
  groupBatchName: properties.groupBatchName,
  groupBatchNameAlt: properties.groupBatchNameAlt,
  enabled: properties.enabled,
  isFollowSet: properties.isFollowSet,
  isOdoDisplay: properties.isOdoDisplay,
});

export function OnlineOrderingModifiersPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [rows, setRows] = useState<ModifierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'modifier' | 'meal-set'>('modifier');
  const [visibility, setVisibility] = useState<'odo-only' | 'all'>('odo-only');
  const [drawerState, setDrawerState] = useState<NodePropertiesDrawerState | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const headers = await modifierGroupService.list(brandId, { isFollowSet: scope === 'meal-set' });
      const properties = await Promise.all(headers.map((header) => modifierGroupService.getProperties(brandId, header.groupHeaderId)));
      setRows(properties.map(toHeader));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load modifier groups');
    } finally {
      setLoading(false);
    }
  }, [brandId, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleRows = useMemo(
    () => rows.filter((row) => (visibility === 'odo-only' ? row.isOdoDisplay : true)),
    [rows, visibility],
  );

  const handleUpdated = (updated: ModifierGroupHeader) => {
    if (!brandId) return;
    modifierGroupService.getProperties(brandId, updated.groupHeaderId)
      .then((properties) => {
        setRows((current) =>
          current.map((row) => (row.groupHeaderId === updated.groupHeaderId ? toHeader(properties) : row)),
        );
      })
      .catch((err) => {
        notifications.show({
          color: 'red',
          message: err instanceof Error ? err.message : 'Failed to refresh modifier group',
        });
      });
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Modifier</Title>
          <Text size="sm" c="dimmed">
            Review modifier groups and meal sets that are visible in online ordering, then edit their ODO-specific flags and membership.
          </Text>
        </div>
        <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO modifiers.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Group justify="space-between">
        <SegmentedControl
          value={scope}
          onChange={(value) => setScope(value as 'modifier' | 'meal-set')}
          data={[
            { label: 'Modifier Groups', value: 'modifier' },
            { label: 'Meal Sets', value: 'meal-set' },
          ]}
        />
        <SegmentedControl
          value={visibility}
          onChange={(value) => setVisibility(value as 'odo-only' | 'all')}
          data={[
            { label: 'ODO only', value: 'odo-only' },
            { label: 'Show all', value: 'all' },
          ]}
        />
      </Group>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Alt Name</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>ODO</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visibleRows.map((row) => (
              <Table.Tr key={row.groupHeaderId}>
                <Table.Td>{row.groupHeaderId}</Table.Td>
                <Table.Td>{row.groupBatchName}</Table.Td>
                <Table.Td>{row.groupBatchNameAlt || '-'}</Table.Td>
                <Table.Td>
                  <Badge color={row.enabled ? 'green' : 'gray'}>{row.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color={row.isOdoDisplay ? 'indigo' : 'gray'}>{row.isOdoDisplay ? 'Visible' : 'Hidden'}</Badge>
                </Table.Td>
                <Table.Td>
                  <Button
                    variant="light"
                    size="xs"
                    leftSection={<IconEdit size={14} />}
                    onClick={() =>
                      setDrawerState({
                        kind: scope === 'meal-set' ? 'item-set' : 'modifier',
                        itemId: row.groupHeaderId,
                        groupHeaderId: row.groupHeaderId,
                        originContext: 'online',
                      })
                    }
                  >
                    Edit
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <NodePropertiesDrawer
        state={drawerState}
        brandId={brandId}
        onClose={() => setDrawerState(null)}
        onAfterSave={load}
        onModifierGroupUpdated={handleUpdated}
      />
    </Stack>
  );
}
