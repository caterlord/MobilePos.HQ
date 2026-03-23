import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingDisplayOrderEntry, OnlineOrderingDisplayOrderNode } from '../../types/onlineOrdering';

interface EditableNode extends OnlineOrderingDisplayOrderEntry {
  name: string;
  nameAlt?: string | null;
  itemCount: number;
  depth: number;
}

const flattenTree = (nodes: OnlineOrderingDisplayOrderNode[], depth = 0): EditableNode[] =>
  nodes.flatMap((node) => [
    {
      smartCategoryId: node.smartCategoryId,
      parentSmartCategoryId: node.parentSmartCategoryId,
      displayIndex: node.displayIndex,
      name: node.name,
      nameAlt: node.nameAlt,
      itemCount: node.itemCount,
      depth,
    },
    ...flattenTree(node.children, depth + 1),
  ]);

export function OnlineOrderingDisplayOrderPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [rows, setRows] = useState<EditableNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await onlineOrderingService.getDisplayOrder(brandId);
      setRows(flattenTree(response));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ODO display order');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const parentOptions = useMemo(
    () => [
      { value: 'ROOT', label: 'Root' },
      ...rows.map((row) => ({
        value: String(row.smartCategoryId),
        label: `${'· '.repeat(row.depth)}${row.name}`,
      })),
    ],
    [rows],
  );

  const updateRow = (smartCategoryId: number, patch: Partial<EditableNode>) => {
    setRows((current) =>
      current.map((row) => (row.smartCategoryId === smartCategoryId ? { ...row, ...patch } : row)),
    );
  };

  const moveWithinParent = (smartCategoryId: number, direction: -1 | 1) => {
    setRows((current) => {
      const target = current.find((row) => row.smartCategoryId === smartCategoryId);
      if (!target) return current;

      const siblings = current
        .filter((row) => row.parentSmartCategoryId === target.parentSmartCategoryId)
        .sort((a, b) => a.displayIndex - b.displayIndex);
      const index = siblings.findIndex((row) => row.smartCategoryId === smartCategoryId);
      const swapWith = siblings[index + direction];
      if (!swapWith) return current;

      return current.map((row) => {
        if (row.smartCategoryId === target.smartCategoryId) {
          return { ...row, displayIndex: swapWith.displayIndex };
        }
        if (row.smartCategoryId === swapWith.smartCategoryId) {
          return { ...row, displayIndex: target.displayIndex };
        }
        return row;
      });
    });
  };

  const handleSave = async () => {
    if (!brandId) return;

    try {
      setSaving(true);
      await onlineOrderingService.updateDisplayOrder(
        brandId,
        rows.map(({ smartCategoryId, parentSmartCategoryId, displayIndex }) => ({
          smartCategoryId,
          parentSmartCategoryId,
          displayIndex,
        })),
      );
      notifications.show({
        color: 'green',
        message: 'ODO display order updated.',
      });
      await load();
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to save ODO display order',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Menu Display Order</Title>
          <Text size="sm" c="dimmed">
            Adjust parent placement and sibling ordering for ODO-visible smart categories.
          </Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving} disabled={!brandId}>
            Save Order
          </Button>
        </Group>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO display order.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Category</Table.Th>
              <Table.Th>Parent</Table.Th>
              <Table.Th>Order</Table.Th>
              <Table.Th>Items</Table.Th>
              <Table.Th>Quick move</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((row) => (
              <Table.Tr key={row.smartCategoryId}>
                <Table.Td>
                  <div style={{ paddingLeft: row.depth * 16 }}>
                    <Text fw={600}>{row.name}</Text>
                    {row.nameAlt && (
                      <Text size="xs" c="dimmed">
                        {row.nameAlt}
                      </Text>
                    )}
                  </div>
                </Table.Td>
                <Table.Td style={{ minWidth: 220 }}>
                  <Select
                    data={parentOptions.filter((option) => option.value !== String(row.smartCategoryId))}
                    value={row.parentSmartCategoryId === null ? 'ROOT' : String(row.parentSmartCategoryId)}
                    onChange={(value) =>
                      updateRow(row.smartCategoryId, {
                        parentSmartCategoryId: value === 'ROOT' || !value ? null : parseInt(value, 10),
                      })
                    }
                  />
                </Table.Td>
                <Table.Td style={{ width: 120 }}>
                  <NumberInput
                    value={row.displayIndex}
                    min={1}
                    onChange={(value) => updateRow(row.smartCategoryId, { displayIndex: Number(value) || 1 })}
                  />
                </Table.Td>
                <Table.Td>{row.itemCount}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button variant="light" size="xs" onClick={() => moveWithinParent(row.smartCategoryId, -1)}>
                      Up
                    </Button>
                    <Button variant="light" size="xs" onClick={() => moveWithinParent(row.smartCategoryId, 1)}>
                      Down
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
