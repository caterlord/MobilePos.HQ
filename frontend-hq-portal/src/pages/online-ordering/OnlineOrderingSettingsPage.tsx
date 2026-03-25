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
import { IconAlertCircle, IconEdit } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';

interface ShopSettingsRow {
  shopId: number;
  shopName: string;
  hasSettings: boolean;
  odoEnabled: boolean;
}

export function OnlineOrderingSettingsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const navigate = useNavigate();

  const [shops, setShops] = useState<ShopSettingsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShops = useCallback(async () => {
    if (!brandId) { setShops([]); return; }
    try {
      setLoading(true);
      setError(null);
      const data = await onlineOrderingService.getShopSettingsList(brandId);
      setShops(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => { void loadShops(); }, [loadShops]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>General Settings</Title>
          <Text size="sm" c="dimmed">Configure the base storefront settings for online ordering.</Text>
        </div>
        <Button variant="subtle" onClick={() => void loadShops()} loading={loading}>
          Refresh
        </Button>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage online ordering settings.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>
      )}

      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Store Name</Table.Th>
              <Table.Th>In use</Table.Th>
              <Table.Th style={{ width: 100 }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {shops.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={3}>
                  <Text c="dimmed" ta="center" py="md">
                    {loading ? 'Loading...' : 'No shops found.'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              shops.map((shop) => (
                <Table.Tr key={shop.shopId}>
                  <Table.Td>{shop.shopName}</Table.Td>
                  <Table.Td>
                    {shop.hasSettings ? (
                      <Badge color="green" size="sm" variant="filled">Yes</Badge>
                    ) : (
                      <Badge color="gray" size="sm" variant="light">No</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => navigate(`/online-ordering/general-settings/${shop.shopId}`)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
