import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Grid, Paper, Stack, Switch, Text, TextInput, Textarea, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingCallToAction, OnlineOrderingCallToActionSlot } from '../../types/onlineOrdering';

const emptySlot: OnlineOrderingCallToActionSlot = {
  enabled: false,
  title: '',
  titleAlt: '',
  description: '',
  descriptionAlt: '',
  buttonLabel: '',
  buttonLabelAlt: '',
  targetPath: '',
  itemIds: [],
};

const emptyDocument: OnlineOrderingCallToAction = {
  cartPage: { ...emptySlot },
  orderHistoryPage: { ...emptySlot },
};

function SlotEditor({
  title,
  slot,
  onChange,
}: {
  title: string;
  slot: OnlineOrderingCallToActionSlot;
  onChange: (next: OnlineOrderingCallToActionSlot) => void;
}) {
  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="md">
        <Text fw={600}>{title}</Text>
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
              label="Button Label"
              value={slot.buttonLabel}
              onChange={(event) => onChange({ ...slot, buttonLabel: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Button Label (Alt)"
              value={slot.buttonLabelAlt ?? ''}
              onChange={(event) => onChange({ ...slot, buttonLabelAlt: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Target Path"
              value={slot.targetPath ?? ''}
              onChange={(event) => onChange({ ...slot, targetPath: event.currentTarget.value })}
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <TextInput
              label="Linked Item IDs"
              description="Comma-separated item IDs"
              value={slot.itemIds.join(', ')}
              onChange={(event) =>
                onChange({
                  ...slot,
                  itemIds: event.currentTarget.value
                    .split(',')
                    .map((part) => Number.parseInt(part.trim(), 10))
                    .filter((value) => Number.isFinite(value)),
                })
              }
            />
          </Grid.Col>
        </Grid>
      </Stack>
    </Paper>
  );
}

export function OnlineOrderingCallToActionPage() {
  const { selectedBrand } = useBrands();
  const brandId = selectedBrand ? Number.parseInt(selectedBrand, 10) : null;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<OnlineOrderingCallToAction>(emptyDocument);

  const load = useCallback(async () => {
    if (!brandId) {
      setDocument(emptyDocument);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDocument(await onlineOrderingService.getCallToAction(brandId));
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
      const saved = await onlineOrderingService.updateCallToAction(brandId, document);
      setDocument(saved);
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
        <>
          <SlotEditor title="Cart Page CTA" slot={document.cartPage} onChange={(next) => setDocument((current) => ({ ...current, cartPage: next }))} />
          <SlotEditor
            title="Order History CTA"
            slot={document.orderHistoryPage}
            onChange={(next) => setDocument((current) => ({ ...current, orderHistoryPage: next }))}
          />
        </>
      )}

      <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving}>
        Save CTA
      </Button>
    </Stack>
  );
}
