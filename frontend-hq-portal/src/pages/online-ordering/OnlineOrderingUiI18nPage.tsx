import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  Alert,
  Button,
  Group,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingUiI18nEntry, OnlineOrderingUiI18nResponse } from '../../types/onlineOrdering';

const emptyState: OnlineOrderingUiI18nResponse = {
  languages: [],
  documents: [],
};

export function OnlineOrderingUiI18nPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [response, setResponse] = useState<OnlineOrderingUiI18nResponse>(emptyState);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setResponse(emptyState);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await onlineOrderingService.getUiI18n(brandId);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ODO UI i18n');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateEntry = (orderChannelId: number, languageCode: string, content: string) => {
    setResponse((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.orderChannelId === orderChannelId
          ? {
              ...document,
              entries: document.entries.map((entry) =>
                entry.languageCode === languageCode ? { ...entry, content } : entry,
              ),
            }
          : document,
      ),
    }));
  };

  const handleSave = async () => {
    if (!brandId) return;

    try {
      setSaving(true);
      const payload: OnlineOrderingUiI18nEntry[] = response.documents.flatMap((document) => document.entries);
      const updated = await onlineOrderingService.updateUiI18n(brandId, payload);
      setResponse(updated);
      notifications.show({
        color: 'green',
        message: 'ODO UI i18n updated.',
      });
    } catch (err) {
      notifications.show({
        color: 'red',
        message: err instanceof Error ? err.message : 'Failed to save ODO UI i18n',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>UI i18n</Title>
          <Text size="sm" c="dimmed">
            Maintain storefront translation payloads by order channel and language.
          </Text>
        </div>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => void load()} loading={loading}>
            Refresh
          </Button>
          <Button leftSection={<IconDeviceFloppy size={16} />} onClick={() => void handleSave()} loading={saving} disabled={!brandId}>
            Save Translations
          </Button>
        </Group>
      </Group>

      {!brandId && (
        <Alert icon={<IconAlertCircle size={16} />} color="yellow">
          Select a brand to manage ODO UI i18n.
        </Alert>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red">
          {error}
        </Alert>
      )}

      <Accordion multiple defaultValue={response.documents.map((document) => String(document.orderChannelId))}>
        {response.documents.map((document) => (
          <Accordion.Item key={document.orderChannelId} value={String(document.orderChannelId)}>
            <Accordion.Control>{document.orderChannelName}</Accordion.Control>
            <Accordion.Panel>
              <Stack gap="md">
                {document.entries.map((entry) => (
                  <Textarea
                    key={`${document.orderChannelId}-${entry.languageCode}`}
                    label={entry.languageCode}
                    minRows={8}
                    autosize
                    value={entry.content}
                    onChange={(event) => updateEntry(document.orderChannelId ?? 0, entry.languageCode, event.currentTarget.value)}
                  />
                ))}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  );
}
