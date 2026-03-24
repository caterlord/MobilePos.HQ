import { useCallback, useEffect, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit } from '@tabler/icons-react';
import type { StoreInfoSettings } from '../../../services/storeSettingsService';
import storeSettingsService from '../../../services/storeSettingsService';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';

const emptyInfo: StoreInfoSettings = {
  shopId: 0,
  name: '',
  altName: '',
  description: '',
  altDesc: '',
  addressLine1: '',
  addressLine2: '',
  addressLine3: '',
  addressLine4: '',
  altAddressLine1: '',
  altAddressLine2: '',
  altAddressLine3: '',
  altAddressLine4: '',
  district: '',
  city: '',
  country: '',
  telephone: '',
  fax: '',
  intCallingCode: '',
  contact1: '',
  contactTitle1: '',
  contact2: '',
  contactTitle2: '',
  shopCode: '',
  currencyCode: '',
  currencySymbol: '',
  addressForDelivery: '',
  addressLat: null,
  addressLong: null,
  ianaTimeZone: '',
  timeZoneId: null,
  timeZoneValue: null,
  timeZoneUseDaylightTime: null,
  enabled: true,
};

// Build timezone options from IANA database
interface TzOption { value: string; label: string; offset: number }

const timezoneOptions: TzOption[] = (() => {
  try {
    const zones = Intl.supportedValuesOf('timeZone');
    return zones.map((tz) => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
      const match = offsetPart.match(/GMT([+-]?)(\d+)?(?::(\d+))?/);
      let offsetValue = 0;
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2] || '0', 10);
        const minutes = parseInt(match[3] || '0', 10);
        offsetValue = sign * (hours + minutes / 60);
      }
      return {
        value: tz,
        label: `${tz.replace(/_/g, ' ')} (${offsetPart || 'UTC'})`,
        offset: offsetValue,
      };
    });
  } catch {
    return [];
  }
})();

const tzOffsetMap = new Map(timezoneOptions.map((tz) => [tz.value, tz.offset]));

export function StoreInfoSettingsPage() {
  const { brandId, shopsLoading, shopsError, shops, reloadShops } =
    useStoreSettingsShopSelection();

  const [modalOpened, setModalOpened] = useState(false);
  const [editShopId, setEditShopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<StoreInfoSettings>(emptyInfo);

  const openEdit = useCallback(async (shopId: number) => {
    if (!brandId) return;
    const shop = shops.find((s) => s.shopId === shopId);
    setEditShopId(shopId);
    setInfo({ ...emptyInfo, shopId, name: shop?.shopName ?? '' });
    setModalOpened(true);
    try {
      setLoading(true);
      const response = await storeSettingsService.getShopInfo(brandId, shopId);
      setInfo(response);
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to load shop info' });
    } finally {
      setLoading(false);
    }
  }, [brandId, shops]);

  const saveInfo = async () => {
    if (!brandId || !editShopId) return;

    if (!info.name.trim()) {
      notifications.show({ color: 'red', message: 'Shop name is required' });
      return;
    }
    if (!info.currencyCode.trim() || !info.currencySymbol.trim()) {
      notifications.show({ color: 'red', message: 'Currency code and symbol are required' });
      return;
    }

    try {
      setSaving(true);
      await storeSettingsService.updateShopInfo(brandId, editShopId, {
        name: info.name.trim(),
        altName: info.altName,
        description: info.description,
        altDesc: info.altDesc,
        addressLine1: info.addressLine1,
        addressLine2: info.addressLine2,
        addressLine3: info.addressLine3,
        addressLine4: info.addressLine4,
        altAddressLine1: info.altAddressLine1,
        altAddressLine2: info.altAddressLine2,
        altAddressLine3: info.altAddressLine3,
        altAddressLine4: info.altAddressLine4,
        district: info.district,
        city: info.city,
        country: info.country,
        telephone: info.telephone,
        fax: info.fax,
        intCallingCode: info.intCallingCode,
        contact1: info.contact1,
        contactTitle1: info.contactTitle1,
        contact2: info.contact2,
        contactTitle2: info.contactTitle2,
        shopCode: info.shopCode,
        currencyCode: info.currencyCode.trim().toUpperCase(),
        currencySymbol: info.currencySymbol.trim(),
        addressForDelivery: info.addressForDelivery,
        addressLat: info.addressLat,
        addressLong: info.addressLong,
        ianaTimeZone: info.ianaTimeZone,
        timeZoneId: info.timeZoneId,
        timeZoneValue: info.ianaTimeZone ? (tzOffsetMap.get(info.ianaTimeZone) ?? info.timeZoneValue) : info.timeZoneValue,
        timeZoneUseDaylightTime: info.timeZoneUseDaylightTime,
        enabled: info.enabled,
      });
      notifications.show({ color: 'green', message: 'Store info saved' });
      setModalOpened(false);
      await reloadShops();
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (brandId) void reloadShops();
  }, [brandId, reloadShops]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Store Info</Title>
            <Text size="sm" c="dimmed">Basic store information used by HQ and POS runtime.</Text>
          </div>
          <Button variant="subtle" onClick={() => void reloadShops()} loading={shopsLoading}>
            Refresh
          </Button>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage store info.
          </Alert>
        )}

        {shopsError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {shopsError}
          </Alert>
        )}

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Shop Name</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ width: 80 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {shops.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={3}>
                    <Text c="dimmed" ta="center" py="md">
                      {shopsLoading ? 'Loading...' : 'No shops found.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                shops.map((shop) => (
                  <Table.Tr key={shop.shopId} style={{ cursor: 'pointer' }} onClick={() => void openEdit(shop.shopId)}>
                    <Table.Td>{shop.shopName}</Table.Td>
                    <Table.Td>
                      <Badge size="sm" color={shop.enabled ? 'green' : 'gray'}>
                        {shop.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon variant="subtle" color="blue" onClick={(e) => { e.stopPropagation(); void openEdit(shop.shopId); }}>
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

      {/* Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={`Edit Store: ${info.name || 'Loading...'}`}
        size="lg"
      >
        {loading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading store info...</Text>
          </Group>
        ) : (
        <Stack gap="md">
          {/* Basic Info */}
          <Title order={5}>Basic Info</Title>
          <Group grow>
            <TextInput label="Shop Name" required value={info.name}
              onChange={(e) => setInfo((prev) => ({ ...prev, name: e.currentTarget.value }))} />
            <TextInput label="Alt Name" value={info.altName}
              onChange={(e) => setInfo((prev) => ({ ...prev, altName: e.currentTarget.value }))} />
          </Group>
          <Group grow>
            <TextInput label="Shop Code" value={info.shopCode}
              onChange={(e) => setInfo((prev) => ({ ...prev, shopCode: e.currentTarget.value }))} />
            <TextInput label="Int. Calling Code" value={info.intCallingCode}
              onChange={(e) => setInfo((prev) => ({ ...prev, intCallingCode: e.currentTarget.value }))} />
          </Group>
          <Textarea label="Description" minRows={2} value={info.description}
            onChange={(e) => setInfo((prev) => ({ ...prev, description: e.currentTarget.value }))} />
          <Textarea label="Alt Description" minRows={2} value={info.altDesc}
            onChange={(e) => setInfo((prev) => ({ ...prev, altDesc: e.currentTarget.value }))} />

          {/* Address */}
          <Title order={5} mt="sm">Address</Title>
          <Group grow>
            <TextInput label="Address Line 1" value={info.addressLine1}
              onChange={(e) => setInfo((prev) => ({ ...prev, addressLine1: e.currentTarget.value }))} />
            <TextInput label="Address Line 2" value={info.addressLine2}
              onChange={(e) => setInfo((prev) => ({ ...prev, addressLine2: e.currentTarget.value }))} />
          </Group>
          <Group grow>
            <TextInput label="Address Line 3" value={info.addressLine3}
              onChange={(e) => setInfo((prev) => ({ ...prev, addressLine3: e.currentTarget.value }))} />
            <TextInput label="Address Line 4" value={info.addressLine4}
              onChange={(e) => setInfo((prev) => ({ ...prev, addressLine4: e.currentTarget.value }))} />
          </Group>
          <Group grow>
            <TextInput label="District" value={info.district}
              onChange={(e) => setInfo((prev) => ({ ...prev, district: e.currentTarget.value }))} />
            <TextInput label="City" value={info.city}
              onChange={(e) => setInfo((prev) => ({ ...prev, city: e.currentTarget.value }))} />
            <TextInput label="Country" value={info.country}
              onChange={(e) => setInfo((prev) => ({ ...prev, country: e.currentTarget.value }))} />
          </Group>

          {/* Alt Address (Receipt Footer) */}
          <Title order={5} mt="sm">Alt Address (Receipt Footer)</Title>
          <Group grow>
            <TextInput label="Alt Address Line 1" value={info.altAddressLine1}
              onChange={(e) => setInfo((prev) => ({ ...prev, altAddressLine1: e.currentTarget.value }))} />
            <TextInput label="Alt Address Line 2" value={info.altAddressLine2}
              onChange={(e) => setInfo((prev) => ({ ...prev, altAddressLine2: e.currentTarget.value }))} />
          </Group>
          <Group grow>
            <TextInput label="Alt Address Line 3" value={info.altAddressLine3}
              onChange={(e) => setInfo((prev) => ({ ...prev, altAddressLine3: e.currentTarget.value }))} />
            <TextInput label="Alt Address Line 4" value={info.altAddressLine4}
              onChange={(e) => setInfo((prev) => ({ ...prev, altAddressLine4: e.currentTarget.value }))} />
          </Group>

          {/* Contact */}
          <Title order={5} mt="sm">Contact</Title>
          <Group grow>
            <TextInput label="Telephone" value={info.telephone}
              onChange={(e) => setInfo((prev) => ({ ...prev, telephone: e.currentTarget.value }))} />
            <TextInput label="Fax" value={info.fax}
              onChange={(e) => setInfo((prev) => ({ ...prev, fax: e.currentTarget.value }))} />
          </Group>
          <Group grow>
            <TextInput label="Contact 1" value={info.contact1}
              onChange={(e) => setInfo((prev) => ({ ...prev, contact1: e.currentTarget.value }))} />
            <TextInput label="Title" value={info.contactTitle1}
              onChange={(e) => setInfo((prev) => ({ ...prev, contactTitle1: e.currentTarget.value }))} />
          </Group>
          <Group grow>
            <TextInput label="Contact 2" value={info.contact2}
              onChange={(e) => setInfo((prev) => ({ ...prev, contact2: e.currentTarget.value }))} />
            <TextInput label="Title" value={info.contactTitle2}
              onChange={(e) => setInfo((prev) => ({ ...prev, contactTitle2: e.currentTarget.value }))} />
          </Group>

          {/* Currency & Delivery */}
          <Title order={5} mt="sm">Currency & Delivery</Title>
          <Group grow>
            <TextInput label="Currency Code" value={info.currencyCode}
              onChange={(e) => setInfo((prev) => ({ ...prev, currencyCode: e.currentTarget.value }))} />
            <TextInput label="Currency Symbol" value={info.currencySymbol}
              onChange={(e) => setInfo((prev) => ({ ...prev, currencySymbol: e.currentTarget.value }))} />
          </Group>
          <Textarea label="Delivery Address" minRows={2} value={info.addressForDelivery}
            onChange={(e) => setInfo((prev) => ({ ...prev, addressForDelivery: e.currentTarget.value }))} />

          {/* Timezone */}
          <Title order={5} mt="sm">Timezone</Title>
          <Group grow>
            <Select
              label="Timezone"
              placeholder="Select timezone"
              searchable
              clearable
              data={timezoneOptions}
              value={info.ianaTimeZone || null}
              onChange={(val) => setInfo((prev) => ({ ...prev, ianaTimeZone: val ?? '' }))}
              nothingFoundMessage="No timezone found"
            />
            <Switch label="Uses Daylight Saving Time" checked={!!info.timeZoneUseDaylightTime} mt="xl"
              onChange={(e) => setInfo((prev) => ({ ...prev, timeZoneUseDaylightTime: e.currentTarget.checked }))} />
          </Group>

          <Switch label="Shop Enabled" checked={info.enabled}
            onChange={(e) => setInfo((prev) => ({ ...prev, enabled: e.currentTarget.checked }))} />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void saveInfo()} loading={saving}>Save</Button>
          </Group>
        </Stack>
        )}
      </Modal>
    </Container>
  );
}
