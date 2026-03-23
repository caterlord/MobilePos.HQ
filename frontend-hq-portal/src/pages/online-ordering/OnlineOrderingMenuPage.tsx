import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Anchor,
  Badge,
  Card,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAdjustments,
  IconAlertCircle,
  IconArrowsSort,
  IconExternalLink,
  IconLanguage,
  IconLayoutGrid,
  IconSettings,
  IconShoppingCart,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingDisplayOrderNode, OnlineOrderingLookups } from '../../types/onlineOrdering';

const flattenNodes = (nodes: OnlineOrderingDisplayOrderNode[], depth = 0): Array<OnlineOrderingDisplayOrderNode & { depth: number }> =>
  nodes.flatMap((node) => [{ ...node, depth }, ...flattenNodes(node.children, depth + 1)]);

const featureCards = [
  {
    title: 'Display Order',
    description: 'Reorder the ODO smart-category tree and keep the storefront structure aligned.',
    icon: IconArrowsSort,
    color: 'indigo',
    to: '/online-ordering/display-order',
  },
  {
    title: 'Channel Mapping',
    description: 'Control which categories appear on which channel for each shop.',
    icon: IconShoppingCart,
    color: 'teal',
    to: '/online-ordering/channel-mapping',
  },
  {
    title: 'Modifiers',
    description: 'Review modifier groups and meal sets that are visible in ODO.',
    icon: IconAdjustments,
    color: 'grape',
    to: '/online-ordering/modifiers',
  },
  {
    title: 'Settings & Content',
    description: 'Manage storefront settings, CTA content, menu combinations, and UI i18n.',
    icon: IconSettings,
    color: 'orange',
    to: '/online-ordering/settings',
  },
];

export function OnlineOrderingMenuPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [lookups, setLookups] = useState<OnlineOrderingLookups | null>(null);
  const [tree, setTree] = useState<OnlineOrderingDisplayOrderNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setLookups(null);
      setTree([]);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);

    Promise.all([onlineOrderingService.getLookups(brandId), onlineOrderingService.getDisplayOrder(brandId)])
      .then(([lookupsResponse, treeResponse]) => {
        if (ignore) return;
        setLookups(lookupsResponse);
        setTree(treeResponse);
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : 'Failed to load online ordering data');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [brandId]);

  const flattened = useMemo(() => flattenNodes(tree), [tree]);

  return (
    <Stack gap="xl">
      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage online ordering.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
        <Card padding="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">
            ODO smart categories
          </Text>
          <Title order={2} mt="xs">
            {lookups?.summary.odoCategoryCount ?? 0}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Categories currently flagged for ODO display.
          </Text>
        </Card>
        <Card padding="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">
            Menu items surfaced
          </Text>
          <Title order={2} mt="xs">
            {lookups?.summary.odoItemCount ?? 0}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Distinct items reachable through ODO smart categories.
          </Text>
        </Card>
        <Card padding="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">
            ODO modifier groups
          </Text>
          <Title order={2} mt="xs">
            {lookups?.summary.odoModifierGroupCount ?? 0}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Modifier groups currently enabled for online ordering.
          </Text>
        </Card>
        <Card padding="lg" radius="md" style={{ border: '1px solid #E3E8EE' }}>
          <Text size="sm" c="dimmed">
            ODO meal sets
          </Text>
          <Title order={2} mt="xs">
            {lookups?.summary.odoMealSetCount ?? 0}
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Meal-set groups currently visible on ODO.
          </Text>
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="lg">
        {featureCards.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} padding="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
              <Group justify="space-between" mb="md">
                <ThemeIcon size="xl" radius="md" variant="light" color={feature.color}>
                  <Icon size={22} />
                </ThemeIcon>
                <Anchor component={Link} to={feature.to} size="sm">
                  Open <IconExternalLink size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </Anchor>
              </Group>
              <Title order={3} size={18} mb={8}>
                {feature.title}
              </Title>
              <Text size="sm" c="dimmed">
                {feature.description}
              </Text>
            </Card>
          );
        })}
      </SimpleGrid>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>Published ODO category tree</Title>
            <Text size="sm" c="dimmed">
              Current smart-category structure visible to online ordering.
            </Text>
          </div>
          <Badge color="indigo" variant="light">
            {flattened.length} nodes
          </Badge>
        </Group>

        {loading ? (
          <Text size="sm" c="dimmed">
            Loading ODO menu structure...
          </Text>
        ) : flattened.length === 0 ? (
          <Alert icon={<IconLayoutGrid size={16} />} color="blue">
            No ODO smart categories have been configured yet.
          </Alert>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Category</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {flattened.map((node) => (
                <Table.Tr key={node.smartCategoryId}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <div style={{ width: node.depth * 16 }} />
                      <div>
                        <Text fw={600}>{node.name}</Text>
                        {node.nameAlt && (
                          <Text size="xs" c="dimmed">
                            {node.nameAlt}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>{node.itemCount}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Anchor component={Link} to="/online-ordering/display-order" size="sm">
                        Reorder
                      </Anchor>
                      <Anchor component={Link} to="/online-ordering/channel-mapping" size="sm">
                        Map channels
                      </Anchor>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>Language and channel coverage</Title>
            <Text size="sm" c="dimmed">
              Current language pack and order-channel references detected for ODO.
            </Text>
          </div>
          <ThemeIcon size="lg" variant="light" color="blue">
            <IconLanguage size={18} />
          </ThemeIcon>
        </Group>
        <Group gap="xs">
          {(lookups?.languages ?? []).map((language) => (
            <Badge key={language} variant="light" color="blue">
              {language}
            </Badge>
          ))}
          {(lookups?.orderChannels ?? []).map((channel) => (
            <Badge key={channel.id} variant="outline" color="gray">
              {channel.name}
            </Badge>
          ))}
        </Group>
      </Paper>
    </Stack>
  );
}
