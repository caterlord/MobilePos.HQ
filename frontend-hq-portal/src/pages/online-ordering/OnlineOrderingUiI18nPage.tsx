import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Alert,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';
import type { OnlineOrderingUiI18nEntry, OnlineOrderingUiI18nResponse } from '../../types/onlineOrdering';

type FlatTranslations = Record<string, string>;

interface DocumentDraft {
  orderChannelId: number;
  orderChannelName: string;
  entries: Array<{
    languageCode: string;
    values: FlatTranslations;
  }>;
}

const emptyState: OnlineOrderingUiI18nResponse = {
  languages: [],
  documents: [],
};

function flattenObject(value: unknown, prefix = ''): FlatTranslations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? { [prefix]: String(value ?? '') } : {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<FlatTranslations>((acc, [key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      Object.assign(acc, flattenObject(child, nextPrefix));
    } else {
      acc[nextPrefix] = String(child ?? '');
    }
    return acc;
  }, {});
}

function unflattenObject(values: FlatTranslations): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  Object.entries(values).forEach(([path, rawValue]) => {
    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) {
      return;
    }

    let cursor: Record<string, unknown> = result;
    segments.forEach((segment, index) => {
      if (index === segments.length - 1) {
        cursor[segment] = rawValue;
        return;
      }

      const next = cursor[segment];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    });
  });

  return result;
}

function parseContent(content?: string) {
  if (!content?.trim()) {
    return {};
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toDraft(response: OnlineOrderingUiI18nResponse): DocumentDraft[] {
  return response.documents.map((document) => ({
    orderChannelId: document.orderChannelId ?? 0,
    orderChannelName: document.orderChannelName ?? `Channel #${document.orderChannelId ?? 0}`,
    entries: document.entries.map((entry) => ({
      languageCode: entry.languageCode,
      values: flattenObject(parseContent(entry.content)),
    })),
  }));
}

function getKeys(document: DocumentDraft) {
  return Array.from(
    new Set(document.entries.flatMap((entry) => Object.keys(entry.values))),
  ).sort((a, b) => a.localeCompare(b));
}

export function OnlineOrderingUiI18nPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const [response, setResponse] = useState<OnlineOrderingUiI18nResponse>(emptyState);
  const [documents, setDocuments] = useState<DocumentDraft[]>([]);
  const [newKeys, setNewKeys] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!brandId) {
      setResponse(emptyState);
      setDocuments([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await onlineOrderingService.getUiI18n(brandId);
      setResponse(result);
      setDocuments(toDraft(result));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ODO UI i18n');
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
      const payload: OnlineOrderingUiI18nEntry[] = documents.flatMap((document) =>
        document.entries.map((entry) => ({
          orderChannelId: document.orderChannelId,
          languageCode: entry.languageCode,
          content: JSON.stringify(unflattenObject(entry.values), null, 2),
        })),
      );

      const updated = await onlineOrderingService.updateUiI18n(brandId, payload);
      setResponse(updated);
      setDocuments(toDraft(updated));
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
            Manage storefront translation overrides by order channel and language. X1 persists these overrides as per-channel JSON documents in HQ instead of the legacy GitLab + EW API flow.
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

      <Paper p="md" radius="md" style={{ border: '1px solid #E3E8EE', backgroundColor: 'white' }}>
        <Text size="sm" c="dimmed">
          Languages: {(response.languages.length > 0 ? response.languages : ['en', 'zh-HK']).join(', ')}
        </Text>
      </Paper>

      <Accordion multiple defaultValue={documents.map((document) => String(document.orderChannelId))}>
        {documents.map((document) => {
          const keys = getKeys(document);
          return (
            <Accordion.Item key={document.orderChannelId} value={String(document.orderChannelId)}>
              <Accordion.Control>{document.orderChannelName}</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <Group>
                    <TextInput
                      placeholder="New translation key, e.g. cart.checkoutButton"
                      value={newKeys[document.orderChannelId] ?? ''}
                      onChange={(event) =>
                        setNewKeys((current) => ({
                          ...current,
                          [document.orderChannelId]: event.currentTarget.value,
                        }))
                      }
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="light"
                      leftSection={<IconPlus size={16} />}
                      onClick={() => {
                        const newKey = (newKeys[document.orderChannelId] ?? '').trim();
                        if (!newKey) {
                          return;
                        }

                        setDocuments((current) =>
                          current.map((entry) =>
                            entry.orderChannelId === document.orderChannelId
                              ? {
                                  ...entry,
                                  entries: entry.entries.map((languageEntry) => ({
                                    ...languageEntry,
                                    values: {
                                      ...languageEntry.values,
                                      [newKey]: languageEntry.values[newKey] ?? '',
                                    },
                                  })),
                                }
                              : entry,
                          ),
                        );
                        setNewKeys((current) => ({ ...current, [document.orderChannelId]: '' }));
                      }}
                    >
                      Add Key
                    </Button>
                  </Group>

                  {keys.length === 0 ? (
                    <Alert color="blue">No translation overrides exist yet for this order channel. Add a key to start managing overrides.</Alert>
                  ) : (
                    <Table withTableBorder striped>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Key</Table.Th>
                          {document.entries.map((entry) => (
                            <Table.Th key={entry.languageCode}>{entry.languageCode}</Table.Th>
                          ))}
                          <Table.Th />
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {keys.map((key) => (
                          <Table.Tr key={key}>
                            <Table.Td>
                              <Text fw={600}>{key}</Text>
                            </Table.Td>
                            {document.entries.map((entry) => (
                              <Table.Td key={`${key}-${entry.languageCode}`}>
                                <Textarea
                                  autosize
                                  minRows={2}
                                  value={entry.values[key] ?? ''}
                                  onChange={(event) =>
                                    setDocuments((current) =>
                                      current.map((currentDocument) =>
                                        currentDocument.orderChannelId === document.orderChannelId
                                          ? {
                                              ...currentDocument,
                                              entries: currentDocument.entries.map((languageEntry) =>
                                                languageEntry.languageCode === entry.languageCode
                                                  ? {
                                                      ...languageEntry,
                                                      values: {
                                                        ...languageEntry.values,
                                                        [key]: event.currentTarget.value,
                                                      },
                                                    }
                                                  : languageEntry,
                                              ),
                                            }
                                          : currentDocument,
                                      ),
                                    )
                                  }
                                />
                              </Table.Td>
                            ))}
                            <Table.Td>
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() =>
                                  setDocuments((current) =>
                                    current.map((currentDocument) =>
                                      currentDocument.orderChannelId === document.orderChannelId
                                        ? {
                                            ...currentDocument,
                                            entries: currentDocument.entries.map((languageEntry) => {
                                              const nextValues = { ...languageEntry.values };
                                              delete nextValues[key];
                                              return {
                                                ...languageEntry,
                                                values: nextValues,
                                              };
                                            }),
                                          }
                                        : currentDocument,
                                    ),
                                  )
                                }
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Stack>
  );
}
