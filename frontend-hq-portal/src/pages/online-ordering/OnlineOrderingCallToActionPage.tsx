import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Grid, Paper, Select, Stack, Switch, Text, TextInput, Textarea, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type {
  OnlineOrderingCallToActionSettings,
  OnlineOrderingCallToActionSlot,
  OnlineOrderingLookups,
} from '../../types/onlineOrdering';

const defaultSettings: OnlineOrderingCallToActionSettings = {
  slots: [
    {
      placement: 'cart',
      enabled: false,
      title: 'Need something else?',
      titleAlt: '',
      description: '',
      descriptionAlt: '',
      actionLabel: '',
      actionLabelAlt: '',
      actionUrl: '',
      smartCategoryId: null,
    },
    {
      placement: 'order-history',
      enabled: false,
      title: 'Order again',
      titleAlt: '',
      description: '',
      descriptionAlt: '',
      actionLabel: '',
      actionLabelAlt: '',
      actionUrl: '',
      smartCategoryId: null,
    },
  ],
};

function getPlacementLabel(placement: string) {
  if (placement === 'cart') return 'Cart Page CTA';
  if (placement === 'order-history') return 'Order History CTA';
  return placement;
}

function SlotEditor({
  slot,
  lookups,
  onChange,
}: {
  slot: OnlineOrderingCallToActionSlot;
  lookups: OnlineOrderingLookups | null;
  onChange: (next: OnlineOrderingCallToActionSlot) => void;
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Stack gap={2}>
          <Text fw={600}>{getPlacementLabel(slot.placement)}</Text>
          <Text size="sm" c="dimmed">
            X1 stores CTA content as structured ODO settings instead of relying on hidden smart categories. You can still target a smart category when needed.
          </Text>
        </Stack>

        <Switch label="Enabled" checked={slot.enabled} onChange={(event) => onChange({ ...slot, enabled: event.currentTarget.checked })} />

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput label="Title" value={slot.title} onChange={(event) => onChange({ ...slot, title: event.currentTarget.value })} />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Title (Alt)"
              value={slot.titleAlt ?? ''}
              onChange={(event) => onChange({ ...slot, titleAlt: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="Description"
              minRows={3}
              value={slot.description ?? ''}
              onChange={(event) => onChange({ ...slot, description: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Textarea
              label="Description (Alt)"
              minRows={3}
              value={slot.descriptionAlt ?? ''}
              onChange={(event) => onChange({ ...slot, descriptionAlt: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Action Label"
              value={slot.actionLabel}
              onChange={(event) => onChange({ ...slot, actionLabel: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Action Label (Alt)"
              value={slot.actionLabelAlt ?? ''}
              onChange={(event) => onChange({ ...slot, actionLabelAlt: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Action URL"
              value={slot.actionUrl ?? ''}
              onChange={(event) => onChange({ ...slot, actionUrl: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Select
              label="Target Smart Category"
              placeholder="Optional"
              clearable
              searchable
              data={(lookups?.smartCategories ?? []).map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              value={slot.smartCategoryId ? String(slot.smartCategoryId) : null}
              onChange={(value) => onChange({ ...slot, smartCategoryId: value ? Number.parseInt(value, 10) : null })}
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Paper>
  );
}

export function OnlineOrderingCallToActionPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? Number.parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<OnlineOrderingCallToActionSettings>(defaultSettings);
  const [lookups, setLookups] = useState<OnlineOrderingLookups | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setSettings(defaultSettings);
      setLookups(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [settingsResponse, lookupsResponse] = await Promise.all([
        onlineOrderingService.getCallToActionSettings(brandId),
        onlineOrderingService.getLookups(brandId),
      ]);
      setSettings(settingsResponse.slots.length > 0 ? settingsResponse : defaultSettings);
      setLookups(lookupsResponse);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load call-to-action settings.';
      setError(message);
      notifications.show({ color: 'red', message });
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!brandId) return;
    try {
      setSaving(true);
      const saved = await onlineOrderingService.updateCallToActionSettings(brandId, settings);
      setSettings(saved);
      notifications.show({ color: 'green', message: 'Call-to-action settings saved.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save call-to-action settings.';
      notifications.show({ color: 'red', message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Title order={3}>Call To Action</Title>
        <Text size="sm" c="dimmed">
          Configure CTA content for the cart and order-history surfaces in online ordering.
        </Text>
      </Stack>

      {!brandId && (
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          Select a brand to manage online ordering CTA content.
        </Alert>
      )}

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Paper withBorder radius="md" p="md">
          <Text size="sm" c="dimmed">
            Loading CTA settings...
          </Text>
        </Paper>
      ) : (
        settings.slots.map((slot, index) => (
          <SlotEditor
            key={`${slot.placement}-${index}`}
            slot={slot}
            lookups={lookups}
            onChange={(next) =>
              setSettings((current) => ({
                ...current,
                slots: current.slots.map((entry, entryIndex) => (entryIndex === index ? next : entry)),
              }))
            }
          />
        ))
      )}

      <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving}>
        Save CTA
      </Button>
    </Stack>
  );
}
