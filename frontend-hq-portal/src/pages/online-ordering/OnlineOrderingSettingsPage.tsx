import { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingGeneralSettings, OnlineOrderingLookups } from '../../types/onlineOrdering';

const countryCodeOptions = [
  { value: '852', label: '(+852) Hong Kong' },
  { value: '61', label: '(+61) Australia' },
  { value: '65', label: '(+65) Singapore' },
  { value: '886', label: '(+886) Taiwan' },
  { value: '1', label: '(+1) United States / Canada' },
  { value: '44', label: '(+44) United Kingdom' },
];

const roundingMethodOptions = [
  { value: '', label: 'Setting by POS' },
  { value: 'UP', label: 'Round up' },
  { value: 'DOWN', label: 'Round down' },
  { value: 'ROUND', label: 'Round' },
  { value: 'N5C', label: 'Nearest 5 cents' },
  { value: 'NONE', label: 'No round' },
];

const infoAlignOptions = [
  { value: '', label: 'Default' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
];

const displayImageSizeOptions = [
  { value: '', label: 'Default' },
  { value: 'sm', label: 'Small' },
];

const gapOptions = [
  { value: 'sm', label: 'Default' },
  { value: 'no', label: 'No gap' },
];

const defaultSettings: OnlineOrderingGeneralSettings = {
  websiteUrl: '',
  countryCode: '852',
  timeZone: 8,
  orderTokenValidTime: 30,
  disableNavigateWhenTokenExpired: false,
  whenTokenExpiredTips: '',
  quota: 0,
  quotaOfItem: 0,
  quotaOfEachItem: 0,
  modifySetQuantity: true,
  roundingMethod: '',
  roundingPlace: null,
  businessDaySections: [],
  categorySettings: [],
};

function normalizeSettings(
  settings: OnlineOrderingGeneralSettings,
  lookups: OnlineOrderingLookups | null,
): OnlineOrderingGeneralSettings {
  if (!lookups) {
    return settings;
  }

  const existing = new Map(settings.categorySettings.map((entry) => [entry.categoryId, entry]));
  return {
    ...settings,
    categorySettings: lookups.smartCategories.map((category) => existing.get(category.id) ?? {
      categoryId: category.id,
      infoAlign: '',
      displayImageSize: '',
      gap: 'sm',
      isNecessary: false,
      prioritySubmission: false,
      hiddenAfterSubmission: false,
      hiddenRemark: false,
      displayThresholdItemIds: [],
    }),
  };
}

export function OnlineOrderingSettingsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [settings, setSettings] = useState<OnlineOrderingGeneralSettings>(defaultSettings);
  const [lookups, setLookups] = useState<OnlineOrderingLookups | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setSettings(defaultSettings);
      setLookups(null);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([onlineOrderingService.getSettings(brandId), onlineOrderingService.getLookups(brandId)])
      .then(([settingsResponse, lookupsResponse]) => {
        setLookups(lookupsResponse);
        setSettings(normalizeSettings(settingsResponse, lookupsResponse));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ODO settings'))
      .finally(() => setLoading(false));
  }, [brandId]);

  const handleSave = async () => {
    if (!brandId) return;

    try {
      setSaving(true);
      const response = await onlineOrderingService.updateSettings(brandId, settings);
      setSettings(normalizeSettings(response, lookups));
      notifications.show({
        color: 'green',
        message: 'ODO general settings updated.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to save ODO settings',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>General Settings</Title>
          <Text size="sm" c="dimmed">
            Configure the base storefront settings for online ordering.
          </Text>
        </div>
        <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving} disabled={!brandId}>
          Save Settings
        </Button>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO settings.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white', opacity: loading ? 0.7 : 1 }}>
        <Stack gap="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <TextInput label="Website URL" value={settings.websiteUrl} onChange={(event) => setSettings((current) => ({ ...current, websiteUrl: event.currentTarget.value }))} />
            <Select
              label="Country Code"
              data={countryCodeOptions}
              searchable
              value={settings.countryCode}
              onChange={(value) => setSettings((current) => ({ ...current, countryCode: value ?? '852' }))}
            />
            <NumberInput label="Time Zone" value={settings.timeZone} onChange={(value) => setSettings((current) => ({ ...current, timeZone: Number(value) || 0 }))} />
            <NumberInput label="Order Token Valid Time (min)" value={settings.orderTokenValidTime} onChange={(value) => setSettings((current) => ({ ...current, orderTokenValidTime: Number(value) || 0 }))} />
            <NumberInput label="Quota" value={settings.quota} onChange={(value) => setSettings((current) => ({ ...current, quota: Number(value) || 0 }))} />
            <NumberInput label="Quota Of Item" value={settings.quotaOfItem} onChange={(value) => setSettings((current) => ({ ...current, quotaOfItem: Number(value) || 0 }))} />
            <NumberInput label="Quota Of Each Item" value={settings.quotaOfEachItem} onChange={(value) => setSettings((current) => ({ ...current, quotaOfEachItem: Number(value) || 0 }))} />
            <Select
              label="Rounding Method"
              data={roundingMethodOptions}
              value={settings.roundingMethod}
              onChange={(value) => setSettings((current) => ({ ...current, roundingMethod: value ?? '' }))}
            />
            <NumberInput label="Rounding Place" value={settings.roundingPlace ?? 0} onChange={(value) => setSettings((current) => ({ ...current, roundingPlace: Number(value) || 0 }))} />
            <TextInput label="Expired Token Message" value={settings.whenTokenExpiredTips ?? ''} onChange={(event) => setSettings((current) => ({ ...current, whenTokenExpiredTips: event.currentTarget.value }))} />
          </SimpleGrid>

          <Group>
            <Switch
              label="Disable navigation when token expired"
              checked={settings.disableNavigateWhenTokenExpired}
              onChange={(event) =>
                setSettings((current) => ({ ...current, disableNavigateWhenTokenExpired: event.currentTarget.checked }))
              }
            />
            <Switch
              label="Allow set quantity modifications"
              checked={settings.modifySetQuantity}
              onChange={(event) =>
                setSettings((current) => ({ ...current, modifySetQuantity: event.currentTarget.checked }))
              }
            />
          </Group>
        </Stack>
      </Paper>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>Category Presentation</Title>
            <Text size="sm" c="dimmed">
              Override layout and submission behavior for published ODO smart categories.
            </Text>
          </div>
        </Group>

        <Table withTableBorder striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Category</Table.Th>
              <Table.Th>Info Align</Table.Th>
              <Table.Th>Image Size</Table.Th>
              <Table.Th>Gap</Table.Th>
              <Table.Th>Flags</Table.Th>
              <Table.Th>Display Threshold Item IDs</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {settings.categorySettings.map((categorySetting, index) => {
              const category = lookups?.smartCategories.find((entry) => entry.id === categorySetting.categoryId);
              return (
                <Table.Tr key={categorySetting.categoryId}>
                  <Table.Td>
                    <Text fw={600}>{category?.name ?? `Category #${categorySetting.categoryId}`}</Text>
                    {category?.altName && (
                      <Text size="xs" c="dimmed">
                        {category.altName}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Select
                      data={infoAlignOptions}
                      value={categorySetting.infoAlign}
                      onChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          categorySettings: current.categorySettings.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, infoAlign: value ?? '' } : entry,
                          ),
                        }))
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      data={displayImageSizeOptions}
                      value={categorySetting.displayImageSize}
                      onChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          categorySettings: current.categorySettings.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, displayImageSize: value ?? '' } : entry,
                          ),
                        }))
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Select
                      data={gapOptions}
                      value={categorySetting.gap}
                      onChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          categorySettings: current.categorySettings.map((entry, entryIndex) =>
                            entryIndex === index ? { ...entry, gap: value ?? 'sm' } : entry,
                          ),
                        }))
                      }
                    />
                  </Table.Td>
                  <Table.Td>
                    <Stack gap={6}>
                      <Switch
                        label="Necessary"
                        checked={categorySetting.isNecessary}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            categorySettings: current.categorySettings.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, isNecessary: event.currentTarget.checked } : entry,
                            ),
                          }))
                        }
                      />
                      <Switch
                        label="Priority submission"
                        checked={categorySetting.prioritySubmission}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            categorySettings: current.categorySettings.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, prioritySubmission: event.currentTarget.checked } : entry,
                            ),
                          }))
                        }
                      />
                      <Switch
                        label="Hide after submission"
                        checked={categorySetting.hiddenAfterSubmission}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            categorySettings: current.categorySettings.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, hiddenAfterSubmission: event.currentTarget.checked } : entry,
                            ),
                          }))
                        }
                      />
                      <Switch
                        label="Hide remark"
                        checked={categorySetting.hiddenRemark}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            categorySettings: current.categorySettings.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, hiddenRemark: event.currentTarget.checked } : entry,
                            ),
                          }))
                        }
                      />
                    </Stack>
                  </Table.Td>
                  <Table.Td>
                    <TextInput
                      placeholder="e.g. 101, 202"
                      value={categorySetting.displayThresholdItemIds.join(', ')}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          categorySettings: current.categorySettings.map((entry, entryIndex) =>
                            entryIndex === index
                              ? {
                                  ...entry,
                                  displayThresholdItemIds: event.currentTarget.value
                                    .split(',')
                                    .map((part) => Number.parseInt(part.trim(), 10))
                                    .filter((value) => Number.isFinite(value)),
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>

      <Paper p="lg" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>Business Day Sections</Title>
            <Text size="sm" c="dimmed">
              Optional storefront-specific business day overrides.
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={() =>
              setSettings((current) => ({
                ...current,
                businessDaySections: [...current.businessDaySections, { label: '', daysOfWeek: '', fromTime: '', toTime: '' }],
              }))
            }
          >
            Add Section
          </Button>
        </Group>

        <Table withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Label</Table.Th>
              <Table.Th>Days</Table.Th>
              <Table.Th>From</Table.Th>
              <Table.Th>To</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {settings.businessDaySections.map((section, index) => (
              <Table.Tr key={`${section.label}-${index}`}>
                <Table.Td>
                  <TextInput
                    value={section.label}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, label: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={section.daysOfWeek ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, daysOfWeek: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={section.fromTime ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, fromTime: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <TextInput
                    value={section.toTime ?? ''}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, toTime: event.currentTarget.value } : entry,
                        ),
                      }))
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        businessDaySections: current.businessDaySections.filter((_, entryIndex) => entryIndex !== index),
                      }))
                    }
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
