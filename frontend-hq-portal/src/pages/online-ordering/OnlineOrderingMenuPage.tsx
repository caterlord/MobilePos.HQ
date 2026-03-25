import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from '@mantine/core';
import { IconAlertCircle, IconEdit, IconPlus, IconRefresh } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingDisplayOrderNode } from '../../types/onlineOrdering';

interface FlatNode extends OnlineOrderingDisplayOrderNode {
  depth: number;
}

const flattenNodes = (nodes: OnlineOrderingDisplayOrderNode[], depth = 0): FlatNode[] =>
  nodes.flatMap((node) => [{ ...node, depth }, ...flattenNodes(node.children, depth + 1)]);

export function OnlineOrderingMenuPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [tree, setTree] = useState<OnlineOrderingDisplayOrderNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const flatNodes = useMemo(() => flattenNodes(tree), [tree]);

  const loadData = useCallback(async () => {
    if (!brandId) { setTree([]); return; }
    try {
      setLoading(true);
      setError(null);
      const data = await onlineOrderingService.getDisplayOrder(brandId);
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu data');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadData(); }, [loadData]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Menu</Title>
        <Group>
          <Button variant="subtle" leftSection={<IconRefresh size={16} />} onClick={() => void loadData()} loading={loading}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} component={Link} to="/menus/smart-categories" variant="light">
            New Menu Display Category
          </Button>
        </Group>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO menus.
        </Alert>
      )}

      {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Category Name</Table.Th>
              <Table.Th>Category Name (2nd Language)</Table.Th>
              <Table.Th>Items</Table.Th>
              <Table.Th>Published</Table.Th>
              <Table.Th style={{ width: 80 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {flatNodes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text c="dimmed" ta="center" py="md">
                    {loading ? 'Loading...' : 'No ODO smart categories have been configured yet.'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              flatNodes.map((node) => (
                <Table.Tr key={node.smartCategoryId}>
                  <Table.Td>
                    <Text size="sm" style={{ paddingLeft: node.depth * 24 }}>
                      {node.depth > 0 && <span style={{ color: '#aaa', marginRight: 4 }}>└</span>}
                      {node.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={node.nameAlt ? undefined : 'dimmed'}>
                      {node.nameAlt || '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light">{node.itemCount}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color="green" variant="filled">Yes</Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon variant="subtle" color="blue" component={Link} to={`/menus/smart-categories?id=${node.smartCategoryId}`}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {flatNodes.length > 0 && (
        <Text size="sm" c="dimmed">
          {flatNodes.length} categories · Use <Link to="/online-ordering/menus/display-order" style={{ color: 'inherit' }}>Display Order</Link> to reorder, <Link to="/online-ordering/menus/modifiers" style={{ color: 'inherit' }}>Modifiers</Link> to manage modifier groups, or <Link to="/online-ordering/menus/menu-combinations" style={{ color: 'inherit' }}>Menu Combinations</Link> to build menu sets.
        </Text>
      )}
    </Stack>
  );
}
