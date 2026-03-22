import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Group,
  Loader,
  Paper,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import type { StoreInfoSettings } from '../../../services/storeSettingsService';
import storeSettingsService from '../../../services/storeSettingsService';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';

const emptyInfo: StoreInfoSettings = {
  shopId: 0,
  name: '',
  altName: '',
  description: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  country: '',
  telephone: '',
  currencyCode: '',
  currencySymbol: '',
  enabled: true,
};

export function StoreInfoSettingsPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<StoreInfoSettings>(emptyInfo);

  const loadInfo = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setInfo(emptyInfo);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await storeSettingsService.getShopInfo(brandId, selectedShopId);
      setInfo(response);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load shop info settings';
      setError(message);
      setInfo(emptyInfo);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadInfo();
  }, [loadInfo]);

  const saveInfo = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    if (!info.name.trim()) {
      notifications.show({ color: 'red', message: 'Shop name is required' });
      return;
    }

    if (!info.currencyCode.trim() || !info.currencySymbol.trim()) {
      notifications.show({ color: 'red', message: 'Currency code and currency symbol are required' });
      return;
    }

    try {
      setSaving(true);
      const response = await storeSettingsService.updateShopInfo(brandId, selectedShopId, {
        name: info.name.trim(),
        altName: info.altName,
        description: info.description,
        addressLine1: info.addressLine1,
        addressLine2: info.addressLine2,
        city: info.city,
        country: info.country,
        telephone: info.telephone,
        currencyCode: info.currencyCode.trim().toUpperCase(),
        currencySymbol: info.currencySymbol.trim(),
        enabled: info.enabled,
      });
      setInfo(response);
      notifications.show({ color: 'green', message: 'Info settings saved' });
      await reloadShops();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save shop info settings';
      notifications.show({ color: 'red', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Box>
          <Title order={2}>Info Settings</Title>
          <Text size="sm" c="dimmed">Basic store information used by HQ and POS runtime.</Text>
        </Box>

        {!brandId ? (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow" title="No Brand Selected">
            Select a brand from the top-left brand switcher.
          </Alert>
        ) : null}

        {shopsError ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load shops">
            {shopsError}
          </Alert>
        ) : null}

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="flex-end">
            <Select
              label="Shop"
              placeholder={shopsLoading ? 'Loading shops...' : 'Select a shop'}
              data={shops.map((shop) => ({ value: String(shop.shopId), label: `${shop.shopName}${shop.enabled ? '' : ' (Disabled)'}` }))}
              value={selectedShopId ? String(selectedShopId) : null}
              onChange={(value) => setSelectedShopId(value ? Number.parseInt(value, 10) : null)}
              disabled={!brandId || shopsLoading || shops.length === 0}
              searchable
              style={{ minWidth: 320 }}
            />
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={() => {
                void reloadShops();
                void loadInfo();
              }}
              disabled={!brandId}
            >
              Refresh
            </Button>
          </Group>
        </Paper>

        {error ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load info settings">
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Paper withBorder p="xl" radius="md">
            <Group justify="center">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading info settings...</Text>
            </Group>
          </Paper>
        ) : null}

        {!loading && selectedShop ? (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Editing: {selectedShop.shopName}</Text>
              <Button size="xs" leftSection={<IconDeviceFloppy size={14} />} onClick={() => void saveInfo()} loading={saving}>
                Save
              </Button>
            </Group>

            <Stack gap="sm">
              <Group grow>
                <TextInput
                  label="Shop Name"
                  value={info.name}
                  onChange={(event) => setInfo((previous) => ({ ...previous, name: event.currentTarget.value }))}
                />
                <TextInput
                  label="Alt Name"
                  value={info.altName}
                  onChange={(event) => setInfo((previous) => ({ ...previous, altName: event.currentTarget.value }))}
                />
              </Group>

              <Textarea
                label="Description"
                minRows={2}
                value={info.description}
                onChange={(event) => setInfo((previous) => ({ ...previous, description: event.currentTarget.value }))}
              />

              <Group grow>
                <TextInput
                  label="Address Line 1"
                  value={info.addressLine1}
                  onChange={(event) => setInfo((previous) => ({ ...previous, addressLine1: event.currentTarget.value }))}
                />
                <TextInput
                  label="Address Line 2"
                  value={info.addressLine2}
                  onChange={(event) => setInfo((previous) => ({ ...previous, addressLine2: event.currentTarget.value }))}
                />
              </Group>

              <Group grow>
                <TextInput
                  label="City"
                  value={info.city}
                  onChange={(event) => setInfo((previous) => ({ ...previous, city: event.currentTarget.value }))}
                />
                <TextInput
                  label="Country"
                  value={info.country}
                  onChange={(event) => setInfo((previous) => ({ ...previous, country: event.currentTarget.value }))}
                />
              </Group>

              <Group grow>
                <TextInput
                  label="Telephone"
                  value={info.telephone}
                  onChange={(event) => setInfo((previous) => ({ ...previous, telephone: event.currentTarget.value }))}
                />
                <TextInput
                  label="Currency Code"
                  value={info.currencyCode}
                  onChange={(event) => setInfo((previous) => ({ ...previous, currencyCode: event.currentTarget.value }))}
                />
                <TextInput
                  label="Currency Symbol"
                  value={info.currencySymbol}
                  onChange={(event) => setInfo((previous) => ({ ...previous, currencySymbol: event.currentTarget.value }))}
                />
              </Group>

              <Switch
                label="Shop Enabled"
                checked={info.enabled}
                onChange={(event) => setInfo((previous) => ({ ...previous, enabled: event.currentTarget.checked }))}
              />
            </Stack>
          </Paper>
        ) : null}
      </Stack>
    </Container>
  );
}
