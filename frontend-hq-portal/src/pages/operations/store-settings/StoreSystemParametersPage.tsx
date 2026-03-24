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
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconDeviceFloppy, IconPlus } from '@tabler/icons-react';
import type { StoreSystemParameter } from '../../../services/storeSettingsService';
import storeSettingsService from '../../../services/storeSettingsService';
import { useStoreSettingsShopSelection } from './useStoreSettingsShopSelection';

interface NewParameterForm {
  paramCode: string;
  description: string;
  paramValue: string;
  enabled: boolean;
}

const defaultNewParameter: NewParameterForm = {
  paramCode: '',
  description: '',
  paramValue: '',
  enabled: true,
};

export function StoreSystemParametersPage() {
  const { brandId, shopsLoading, shopsError, shops, selectedShopId, setSelectedShopId, selectedShop, reloadShops } =
    useStoreSettingsShopSelection();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingParamCode, setSavingParamCode] = useState<string | null>(null);
  const [parameters, setParameters] = useState<StoreSystemParameter[]>([]);
  const [newParameter, setNewParameter] = useState<NewParameterForm>(defaultNewParameter);

  const loadParameters = useCallback(async () => {
    if (!brandId || !selectedShopId) {
      setParameters([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await storeSettingsService.getSnapshot(brandId, selectedShopId);
      setParameters(response.systemParameters);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load system parameters';
      setError(message);
      setParameters([]);
    } finally {
      setLoading(false);
    }
  }, [brandId, selectedShopId]);

  useEffect(() => {
    void loadParameters();
  }, [loadParameters]);

  const saveParameter = async (parameter: StoreSystemParameter) => {
    if (!brandId || !selectedShopId) {
      return;
    }

    const normalizedCode = parameter.paramCode.trim().toUpperCase();
    if (!normalizedCode) {
      notifications.show({ color: 'red', message: 'Parameter code is required' });
      return;
    }

    try {
      setSavingParamCode(normalizedCode);
      const response = await storeSettingsService.upsertSystemParameter(brandId, selectedShopId, normalizedCode, {
        description: parameter.description.trim(),
        paramValue: parameter.paramValue,
        enabled: parameter.enabled,
      });

      setParameters((previous) => {
        const next = [...previous];
        const index = next.findIndex((item) => item.paramCode === normalizedCode);
        if (index >= 0) {
          next[index] = response;
        }
        return next;
      });

      notifications.show({ color: 'green', message: `Parameter ${normalizedCode} saved` });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to save parameter';
      notifications.show({ color: 'red', message });
    } finally {
      setSavingParamCode(null);
    }
  };

  const addParameter = async () => {
    if (!brandId || !selectedShopId) {
      return;
    }

    const paramCode = newParameter.paramCode.trim().toUpperCase();
    const description = newParameter.description.trim();

    if (!paramCode || !description) {
      notifications.show({ color: 'red', message: 'Parameter code and description are required' });
      return;
    }

    try {
      setSavingParamCode(paramCode);
      const response = await storeSettingsService.upsertSystemParameter(brandId, selectedShopId, paramCode, {
        description,
        paramValue: newParameter.paramValue,
        enabled: newParameter.enabled,
      });

      setParameters((previous) => {
        const existingIndex = previous.findIndex((item) => item.paramCode === response.paramCode);
        if (existingIndex >= 0) {
          const next = [...previous];
          next[existingIndex] = response;
          return next;
        }

        return [...previous, response].sort((left, right) => left.paramCode.localeCompare(right.paramCode));
      });

      setNewParameter(defaultNewParameter);
      notifications.show({ color: 'green', message: `Parameter ${paramCode} added` });
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Failed to add parameter';
      notifications.show({ color: 'red', message });
    } finally {
      setSavingParamCode(null);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>System Parameters</Title>
            <Text size="sm" c="dimmed">Manage store-scoped runtime parameters.</Text>
          </div>
          <Group>
            <Select
              placeholder={shopsLoading ? 'Loading shops...' : 'Select shop'}
              data={shops.map((shop) => ({ value: String(shop.shopId), label: `${shop.shopName}${shop.enabled ? '' : ' (Disabled)'}` }))}
              value={selectedShopId ? String(selectedShopId) : null}
              onChange={(value) => setSelectedShopId(value ? Number.parseInt(value, 10) : null)}
              disabled={!brandId || shopsLoading || shops.length === 0}
              searchable
              style={{ minWidth: 240 }}
            />
            <Button variant="subtle" onClick={() => { void reloadShops(); void loadParameters(); }} loading={loading}>
              Refresh
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage system parameters.
          </Alert>
        )}

        {shopsError && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">{shopsError}</Alert>
        )}

        {error ? (
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Failed to load system parameters">
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Paper withBorder p="xl" radius="md">
            <Group justify="center">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading system parameters...</Text>
            </Group>
          </Paper>
        ) : null}

        {!loading && selectedShop ? (
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
              <Text fw={600}>Editing: {selectedShop.shopName}</Text>
              <Text size="xs" c="dimmed">Save each row after editing.</Text>
            </Group>

            <Box style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Code</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Value</Table.Th>
                    <Table.Th>Enabled</Table.Th>
                    <Table.Th></Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {parameters.map((parameter, index) => (
                    <Table.Tr key={`${parameter.paramCode}-${parameter.paramId}`}>
                      <Table.Td>
                        <Text fw={600} size="sm">{parameter.paramCode}</Text>
                      </Table.Td>
                      <Table.Td>
                        <TextInput
                          value={parameter.description}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setParameters((previous) => {
                              const next = [...previous];
                              next[index] = { ...next[index], description: value };
                              return next;
                            });
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Textarea
                          autosize
                          minRows={1}
                          value={parameter.paramValue}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setParameters((previous) => {
                              const next = [...previous];
                              next[index] = { ...next[index], paramValue: value };
                              return next;
                            });
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Switch
                          checked={parameter.enabled}
                          onChange={(event) => {
                            const value = event.currentTarget.checked;
                            setParameters((previous) => {
                              const next = [...previous];
                              next[index] = { ...next[index], enabled: value };
                              return next;
                            });
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="xs"
                          leftSection={<IconDeviceFloppy size={14} />}
                          loading={savingParamCode === parameter.paramCode}
                          onClick={() => void saveParameter(parameter)}
                        >
                          Save
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {parameters.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Text size="sm" c="dimmed">No system parameters found for this shop.</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                </Table.Tbody>
              </Table>
            </Box>

            <Paper withBorder p="md" radius="md" mt="md">
              <Title order={5} mb="sm">Add / Upsert Parameter</Title>
              <Group align="flex-end" grow>
                <TextInput
                  label="Code"
                  placeholder="e.g. POS_TIMEOUT"
                  value={newParameter.paramCode}
                  onChange={(event) => setNewParameter((previous) => ({ ...previous, paramCode: event.currentTarget.value }))}
                />
                <TextInput
                  label="Description"
                  value={newParameter.description}
                  onChange={(event) => setNewParameter((previous) => ({ ...previous, description: event.currentTarget.value }))}
                />
                <TextInput
                  label="Value"
                  value={newParameter.paramValue}
                  onChange={(event) => setNewParameter((previous) => ({ ...previous, paramValue: event.currentTarget.value }))}
                />
                <Switch
                  label="Enabled"
                  checked={newParameter.enabled}
                  onChange={(event) => setNewParameter((previous) => ({ ...previous, enabled: event.currentTarget.checked }))}
                />
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => void addParameter()}
                  loading={Boolean(savingParamCode && savingParamCode === newParameter.paramCode.trim().toUpperCase())}
                >
                  Save
                </Button>
              </Group>
            </Paper>
          </Paper>
        ) : null}
      </Stack>
    </Container>
  );
}
