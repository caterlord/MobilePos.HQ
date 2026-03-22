import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Textarea,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconSettings, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import promotionService from '../../../services/promotionService';
import type {
  PromotionRuleDetail,
  PromotionRuleDetailGroup,
  PromotionRuleEditor,
  PromotionSummary,
  UpdatePromotionRuleEditorPayload,
  UpsertPromotionPayload,
} from '../../../types/promotion';

const promotionTypeOptions = [
  { value: '1', label: 'Promo: Meal Set Free Discount Item' },
  { value: '2', label: 'Promo: Buy One Get One Free' },
  { value: '3', label: 'Promo: Buy Multi Get One Free' },
  { value: '4', label: 'Promo: Combo Deal Fix Discount' },
  { value: '5', label: 'Promo: Combo Deal Percent Discount' },
  { value: '11', label: 'Promo: Buy Multi Get Multi' },
];

const detailTypeOptions = [
  { value: '1', label: 'By Category' },
  { value: '2', label: 'By Item' },
  { value: '3', label: 'By Price' },
];

const deductTypeOptions = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Deduct Amount' },
  { value: '2', label: 'Sell As' },
  { value: '3', label: 'Deduct Percent' },
];

const getPromotionTypeLabel = (typeId: number) =>
  promotionTypeOptions.find((option) => option.value === String(typeId))?.label ?? `Type ${typeId}`;

const toNullableNumber = (value: string | number | undefined | null): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeDateInput = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.includes('T') ? trimmed.slice(0, 10) : trimmed;
};

const normalizeTimeInput = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('T')) {
    const timePart = trimmed.split('T')[1] ?? '';
    return timePart.slice(0, 8) || null;
  }

  return trimmed;
};

const createEmptyRuleDetail = (isOptional = false, groupIndex: number | null = null): PromotionRuleDetail => ({
  promoDetailId: null,
  bundlePromoDetailTypeId: 1,
  selectedCategoryId: null,
  selectedItemId: null,
  specificPrice: null,
  bundleDeductRuleTypeId: 0,
  enabled: true,
  isOptionalItem: isOptional,
  isReplaceItem: false,
  isItemCanReplace: false,
  priceReplace: null,
  groupIndex,
  isDepartmentRevenue: false,
  departmentRevenue: null,
});

const defaultPayload: UpsertPromotionPayload = {
  promoCode: '',
  promoName: '',
  bundlePromoDesc: '',
  bundlePromoHeaderTypeId: 5,
  promoSaveAmount: 0,
  priority: null,
  enabled: true,
  isAvailable: true,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
};

export function PromotionsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [promotions, setPromotions] = useState<PromotionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<PromotionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PromotionSummary | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [payload, setPayload] = useState<UpsertPromotionPayload>(defaultPayload);
  const [ruleEditorOpened, setRuleEditorOpened] = useState(false);
  const [ruleEditorLoading, setRuleEditorLoading] = useState(false);
  const [ruleEditorSaving, setRuleEditorSaving] = useState(false);
  const [ruleEditorTarget, setRuleEditorTarget] = useState<PromotionSummary | null>(null);
  const [ruleEditor, setRuleEditor] = useState<PromotionRuleEditor | null>(null);

  const loadPromotions = useCallback(async () => {
    if (!brandId) {
      setPromotions([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await promotionService.list(brandId);
      setPromotions(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load promotions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadPromotions();
  }, [loadPromotions]);

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setModalOpened(true);
  };

  const openEdit = (promotion: PromotionSummary) => {
    setEditTarget(promotion);
    setPayload({
      promoCode: promotion.promoCode,
      promoName: promotion.promoName,
      bundlePromoDesc: promotion.bundlePromoDesc ?? '',
      bundlePromoHeaderTypeId: promotion.bundlePromoHeaderTypeId,
      promoSaveAmount: promotion.promoSaveAmount ?? 0,
      priority: promotion.priority ?? null,
      enabled: true,
      isAvailable: promotion.isAvailable,
      startDate: promotion.startDate ?? null,
      endDate: promotion.endDate ?? null,
      startTime: promotion.startTime ?? null,
      endTime: promotion.endTime ?? null,
    });
    setModalOpened(true);
  };

  const openRuleEditor = async (promotion: PromotionSummary) => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }

    setRuleEditorTarget(promotion);
    setRuleEditorOpened(true);
    setRuleEditorLoading(true);
    setRuleEditor(null);

    try {
      const response = await promotionService.getRuleEditor(brandId, promotion.promoHeaderId);
      setRuleEditor({
        ...response,
        startDate: normalizeDateInput(response.startDate),
        endDate: normalizeDateInput(response.endDate),
        startTime: normalizeTimeInput(response.startTime),
        endTime: normalizeTimeInput(response.endTime),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load promotion rule editor';
      notifications.show({ color: 'red', message });
      setRuleEditorOpened(false);
      setRuleEditorTarget(null);
    } finally {
      setRuleEditorLoading(false);
    }
  };

  const updateMandatoryDetail = (index: number, updater: (detail: PromotionRuleDetail) => PromotionRuleDetail) => {
    setRuleEditor((prev) => {
      if (!prev) return prev;
      const next = [...prev.mandatoryDetails];
      next[index] = updater(next[index]);
      return { ...prev, mandatoryDetails: next };
    });
  };

  const updateOptionalGroup = (groupIndex: number, updater: (group: PromotionRuleDetailGroup) => PromotionRuleDetailGroup) => {
    setRuleEditor((prev) => {
      if (!prev) return prev;
      const groups = [...prev.optionalDetailGroups];
      groups[groupIndex] = updater(groups[groupIndex]);
      return { ...prev, optionalDetailGroups: groups };
    });
  };

  const handleSaveRuleEditor = async () => {
    if (!brandId || !ruleEditorTarget || !ruleEditor) {
      return;
    }

    if (!ruleEditor.promoCode.trim() || !ruleEditor.promoName.trim()) {
      notifications.show({ color: 'red', message: 'Promotion code and name are required' });
      return;
    }

    const payloadForApi: UpdatePromotionRuleEditorPayload = {
      bundlePromoHeaderTypeId: ruleEditor.bundlePromoHeaderTypeId,
      promoCode: ruleEditor.promoCode.trim(),
      promoName: ruleEditor.promoName.trim(),
      bundlePromoDesc: ruleEditor.bundlePromoDesc?.trim() || null,
      promoSaveAmount: ruleEditor.promoSaveAmount,
      priority: ruleEditor.priority ?? null,
      enabled: ruleEditor.enabled,
      isAvailable: ruleEditor.isAvailable,
      startDate: normalizeDateInput(ruleEditor.startDate),
      endDate: normalizeDateInput(ruleEditor.endDate),
      startTime: normalizeTimeInput(ruleEditor.startTime),
      endTime: normalizeTimeInput(ruleEditor.endTime),
      isCoexistPromo: ruleEditor.isCoexistPromo,
      isAmountDeductEvenly: ruleEditor.isAmountDeductEvenly,
      isPromoDetailMatchMustExist: ruleEditor.isPromoDetailMatchMustExist,
      flatPrice: ruleEditor.flatPrice ?? null,
      dayOfWeeks: ruleEditor.dayOfWeeks ?? '',
      months: ruleEditor.months ?? '',
      dates: ruleEditor.dates ?? '',
      mandatoryDetails: ruleEditor.mandatoryDetails,
      optionalDetailGroups: ruleEditor.optionalDetailGroups,
      shopRules: ruleEditor.shopRules,
    };

    try {
      setRuleEditorSaving(true);
      const response = await promotionService.updateRuleEditor(brandId, ruleEditorTarget.promoHeaderId, payloadForApi);
      setRuleEditor({
        ...response,
        startDate: normalizeDateInput(response.startDate),
        endDate: normalizeDateInput(response.endDate),
        startTime: normalizeTimeInput(response.startTime),
        endTime: normalizeTimeInput(response.endTime),
      });
      notifications.show({ color: 'green', message: 'Promotion rule editor updated' });
      await loadPromotions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save promotion rule editor';
      notifications.show({ color: 'red', message });
    } finally {
      setRuleEditorSaving(false);
    }
  };

  const handleSave = async () => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }

    if (!payload.promoCode.trim() || !payload.promoName.trim()) {
      notifications.show({ color: 'red', message: 'Promotion code and name are required' });
      return;
    }

    try {
      setSubmitting(true);
      const request: UpsertPromotionPayload = {
        ...payload,
        promoCode: payload.promoCode.trim(),
        promoName: payload.promoName.trim(),
        bundlePromoDesc: payload.bundlePromoDesc?.trim() || null,
        enabled: true,
      };

      if (editTarget) {
        await promotionService.update(brandId, editTarget.promoHeaderId, request);
        notifications.show({ color: 'green', message: 'Promotion updated' });
      } else {
        await promotionService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Promotion created' });
      }

      setModalOpened(false);
      setEditTarget(null);
      await loadPromotions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save promotion';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!brandId || !deleteTarget) {
      return;
    }

    try {
      setSubmitting(true);
      await promotionService.deactivate(brandId, deleteTarget.promoHeaderId);
      notifications.show({ color: 'green', message: 'Promotion deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadPromotions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate promotion';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Promotions</Title>
            <Text size="sm" c="dimmed">
              Create and manage promotion headers for the selected brand.
            </Text>
          </div>
          <Group>
            <Button variant="light" onClick={() => void loadPromotions()} loading={loading}>
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              Create Promotion
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage promotions.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          {!loading && promotions.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              No promotions found.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Save Amount</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {promotions.map((promotion) => (
                  <Table.Tr key={promotion.promoHeaderId}>
                    <Table.Td>{promotion.promoCode}</Table.Td>
                    <Table.Td>{promotion.promoName}</Table.Td>
                    <Table.Td>{getPromotionTypeLabel(promotion.bundlePromoHeaderTypeId)}</Table.Td>
                    <Table.Td>{promotion.promoSaveAmount}</Table.Td>
                    <Table.Td>{promotion.priority ?? '-'}</Table.Td>
                    <Table.Td>
                      <Badge color={promotion.isAvailable ? 'green' : 'gray'}>
                        {promotion.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="light" color="blue" onClick={() => openEdit(promotion)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="teal" onClick={() => void openRuleEditor(promotion)}>
                          <IconSettings size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setDeleteTarget(promotion);
                            setDeleteOpened(true);
                          }}
                          disabled={!promotion.isAvailable}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Promotion' : 'Create Promotion'}>
        <Stack gap="md">
          <TextInput
            label="Promotion Code"
            value={payload.promoCode}
            onChange={(event) => setPayload((prev) => ({ ...prev, promoCode: event.currentTarget.value }))}
            required
          />
          <TextInput
            label="Promotion Name"
            value={payload.promoName}
            onChange={(event) => setPayload((prev) => ({ ...prev, promoName: event.currentTarget.value }))}
            required
          />
          <Select
            label="Rule Type"
            data={promotionTypeOptions}
            value={String(payload.bundlePromoHeaderTypeId)}
            onChange={(value) =>
              setPayload((prev) => ({
                ...prev,
                bundlePromoHeaderTypeId: value ? parseInt(value, 10) : prev.bundlePromoHeaderTypeId,
              }))
            }
            required
          />
          <Textarea
            label="Description"
            minRows={2}
            value={payload.bundlePromoDesc ?? ''}
            onChange={(event) => setPayload((prev) => ({ ...prev, bundlePromoDesc: event.currentTarget.value }))}
          />
          <Group grow>
            <NumberInput
              label="Save Amount"
              min={0}
              value={payload.promoSaveAmount}
              onChange={(value) =>
                setPayload((prev) => ({ ...prev, promoSaveAmount: toNullableNumber(value) ?? 0 }))
              }
            />
            <NumberInput
              label="Priority"
              min={0}
              value={payload.priority ?? undefined}
              onChange={(value) => {
                const numberValue = Number(value);
                setPayload((prev) => ({
                  ...prev,
                  priority: Number.isFinite(numberValue) ? numberValue : null,
                }));
              }}
            />
          </Group>
          <Switch
            label="Available"
            checked={payload.isAvailable}
            onChange={(event) => setPayload((prev) => ({ ...prev, isAvailable: event.currentTarget.checked }))}
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleSave}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={ruleEditorOpened}
        onClose={() => {
          setRuleEditorOpened(false);
          setRuleEditorTarget(null);
          setRuleEditor(null);
        }}
        title={`Promotion Rule Editor${ruleEditorTarget ? ` · ${ruleEditorTarget.promoName}` : ''}`}
        size="xl"
      >
        {ruleEditorLoading || !ruleEditor ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Loading promotion rule editor...
            </Text>
          </Stack>
        ) : (
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Promotion Code"
                value={ruleEditor.promoCode}
                onChange={(event) => setRuleEditor((prev) => (prev ? { ...prev, promoCode: event.currentTarget.value } : prev))}
              />
              <TextInput
                label="Promotion Name"
                value={ruleEditor.promoName}
                onChange={(event) => setRuleEditor((prev) => (prev ? { ...prev, promoName: event.currentTarget.value } : prev))}
              />
            </Group>
            <Group grow>
              <Select
                label="Rule Type"
                data={promotionTypeOptions}
                value={String(ruleEditor.bundlePromoHeaderTypeId)}
                onChange={(value) =>
                  setRuleEditor((prev) =>
                    prev
                      ? {
                          ...prev,
                          bundlePromoHeaderTypeId: value ? parseInt(value, 10) : prev.bundlePromoHeaderTypeId,
                        }
                      : prev,
                  )
                }
              />
              <NumberInput
                label="Save Amount"
                min={0}
                value={ruleEditor.promoSaveAmount}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, promoSaveAmount: toNullableNumber(value) ?? 0 } : prev))
                }
              />
              <NumberInput
                label="Priority"
                min={0}
                value={ruleEditor.priority ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, priority: toNullableNumber(value) } : prev))
                }
              />
            </Group>
            <Textarea
              label="Description"
              minRows={2}
              value={ruleEditor.bundlePromoDesc ?? ''}
              onChange={(event) => setRuleEditor((prev) => (prev ? { ...prev, bundlePromoDesc: event.currentTarget.value } : prev))}
            />
            <Group grow>
              <TextInput
                label="Start Date (YYYY-MM-DD)"
                value={ruleEditor.startDate ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, startDate: event.currentTarget.value || null } : prev))
                }
              />
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={ruleEditor.endDate ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, endDate: event.currentTarget.value || null } : prev))
                }
              />
              <TextInput
                label="Start Time (HH:mm:ss)"
                value={ruleEditor.startTime ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, startTime: event.currentTarget.value || null } : prev))
                }
              />
              <TextInput
                label="End Time (HH:mm:ss)"
                value={ruleEditor.endTime ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, endTime: event.currentTarget.value || null } : prev))
                }
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Flat Price"
                min={0}
                value={ruleEditor.flatPrice ?? undefined}
                onChange={(value) => setRuleEditor((prev) => (prev ? { ...prev, flatPrice: toNullableNumber(value) } : prev))}
              />
              <TextInput
                label="Day Of Weeks"
                placeholder="e.g. 1,2,3,4,5"
                value={ruleEditor.dayOfWeeks ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, dayOfWeeks: event.currentTarget.value } : prev))
                }
              />
              <TextInput
                label="Months"
                placeholder="e.g. 1,2,12"
                value={ruleEditor.months ?? ''}
                onChange={(event) => setRuleEditor((prev) => (prev ? { ...prev, months: event.currentTarget.value } : prev))}
              />
              <TextInput
                label="Dates"
                placeholder="e.g. 1,15,31"
                value={ruleEditor.dates ?? ''}
                onChange={(event) => setRuleEditor((prev) => (prev ? { ...prev, dates: event.currentTarget.value } : prev))}
              />
            </Group>

            <Divider label="Flags" labelPosition="center" />
            <Group>
              <Switch
                label="Enabled"
                checked={ruleEditor.enabled}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, enabled: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Available"
                checked={ruleEditor.isAvailable}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isAvailable: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Coexist Promo"
                checked={ruleEditor.isCoexistPromo}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isCoexistPromo: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Amount Deduct Evenly"
                checked={ruleEditor.isAmountDeductEvenly}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isAmountDeductEvenly: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Require Detail Match"
                checked={ruleEditor.isPromoDetailMatchMustExist}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, isPromoDetailMatchMustExist: event.currentTarget.checked } : prev,
                  )
                }
              />
            </Group>

            <Divider label="Mandatory Rules" labelPosition="center" />
            <Stack gap="xs">
              {ruleEditor.mandatoryDetails.map((detail, index) => (
                <Group key={`mandatory-${index}`} align="end">
                  <Select
                    label="Type"
                    data={detailTypeOptions}
                    value={String(detail.bundlePromoDetailTypeId)}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({
                        ...prev,
                        bundlePromoDetailTypeId: value ? parseInt(value, 10) : prev.bundlePromoDetailTypeId,
                      }))
                    }
                  />
                  <NumberInput
                    label="Category ID"
                    min={0}
                    value={detail.selectedCategoryId ?? undefined}
                    disabled={detail.bundlePromoDetailTypeId === 2}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({ ...prev, selectedCategoryId: toNullableNumber(value) }))
                    }
                  />
                  <NumberInput
                    label="Item ID"
                    min={0}
                    value={detail.selectedItemId ?? undefined}
                    disabled={detail.bundlePromoDetailTypeId !== 2}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({ ...prev, selectedItemId: toNullableNumber(value) }))
                    }
                  />
                  <NumberInput
                    label="Specific Price"
                    min={0}
                    value={detail.specificPrice ?? undefined}
                    disabled={detail.bundlePromoDetailTypeId !== 3}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({ ...prev, specificPrice: toNullableNumber(value) }))
                    }
                  />
                  <Select
                    label="Deduct Rule"
                    data={deductTypeOptions}
                    value={String(detail.bundleDeductRuleTypeId)}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({
                        ...prev,
                        bundleDeductRuleTypeId: value ? parseInt(value, 10) : 0,
                      }))
                    }
                  />
                  <NumberInput
                    label="Benefit Value"
                    min={0}
                    value={detail.priceReplace ?? undefined}
                    disabled={detail.bundleDeductRuleTypeId === 0}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({ ...prev, priceReplace: toNullableNumber(value) }))
                    }
                  />
                  <Switch
                    label="Enabled"
                    checked={detail.enabled}
                    onChange={(event) =>
                      updateMandatoryDetail(index, (prev) => ({ ...prev, enabled: event.currentTarget.checked }))
                    }
                  />
                  <Switch
                    label="Dept Revenue"
                    checked={detail.isDepartmentRevenue}
                    onChange={(event) =>
                      updateMandatoryDetail(index, (prev) => ({
                        ...prev,
                        isDepartmentRevenue: event.currentTarget.checked,
                        departmentRevenue: event.currentTarget.checked ? prev.departmentRevenue : null,
                      }))
                    }
                  />
                  <NumberInput
                    label="Dept Revenue Amt"
                    min={0}
                    value={detail.departmentRevenue ?? undefined}
                    disabled={!detail.isDepartmentRevenue}
                    onChange={(value) =>
                      updateMandatoryDetail(index, (prev) => ({ ...prev, departmentRevenue: toNullableNumber(value) }))
                    }
                  />
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() =>
                      setRuleEditor((prev) =>
                        prev ? { ...prev, mandatoryDetails: prev.mandatoryDetails.filter((_, rowIndex) => rowIndex !== index) } : prev,
                      )
                    }
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              ))}
              <Button
                variant="light"
                size="xs"
                onClick={() =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, mandatoryDetails: [...prev.mandatoryDetails, createEmptyRuleDetail(false, null)] } : prev,
                  )
                }
              >
                Add Mandatory Rule
              </Button>
            </Stack>

            <Divider label="Optional Rule Groups" labelPosition="center" />
            <Stack gap="sm">
              {ruleEditor.optionalDetailGroups.map((group, groupIndex) => (
                <Paper withBorder p="sm" key={`group-${groupIndex}`}>
                  <Stack gap="xs">
                    <Group>
                      <NumberInput
                        label="Group Index"
                        min={0}
                        value={group.groupIndex}
                        onChange={(value) =>
                          updateOptionalGroup(groupIndex, (prev) => ({ ...prev, groupIndex: Math.max(toNullableNumber(value) ?? 0, 0) }))
                        }
                      />
                      <ActionIcon
                        variant="light"
                        color="red"
                        onClick={() =>
                          setRuleEditor((prev) =>
                            prev
                              ? { ...prev, optionalDetailGroups: prev.optionalDetailGroups.filter((_, idx) => idx !== groupIndex) }
                              : prev,
                          )
                        }
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                    {group.details.map((detail, detailIndex) => (
                      <Group key={`group-${groupIndex}-detail-${detailIndex}`} align="end">
                        <Select
                          label="Type"
                          data={detailTypeOptions}
                          value={String(detail.bundlePromoDetailTypeId)}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex
                                  ? {
                                      ...row,
                                      bundlePromoDetailTypeId: value ? parseInt(value, 10) : row.bundlePromoDetailTypeId,
                                    }
                                  : row,
                              ),
                            }))
                          }
                        />
                        <NumberInput
                          label="Category ID"
                          min={0}
                          value={detail.selectedCategoryId ?? undefined}
                          disabled={detail.bundlePromoDetailTypeId === 2}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex ? { ...row, selectedCategoryId: toNullableNumber(value) } : row,
                              ),
                            }))
                          }
                        />
                        <NumberInput
                          label="Item ID"
                          min={0}
                          value={detail.selectedItemId ?? undefined}
                          disabled={detail.bundlePromoDetailTypeId !== 2}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex ? { ...row, selectedItemId: toNullableNumber(value) } : row,
                              ),
                            }))
                          }
                        />
                        <NumberInput
                          label="Specific Price"
                          min={0}
                          value={detail.specificPrice ?? undefined}
                          disabled={detail.bundlePromoDetailTypeId !== 3}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex ? { ...row, specificPrice: toNullableNumber(value) } : row,
                              ),
                            }))
                          }
                        />
                        <Select
                          label="Deduct Rule"
                          data={deductTypeOptions}
                          value={String(detail.bundleDeductRuleTypeId)}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex
                                  ? { ...row, bundleDeductRuleTypeId: value ? parseInt(value, 10) : 0 }
                                  : row,
                              ),
                            }))
                          }
                        />
                        <NumberInput
                          label="Benefit Value"
                          min={0}
                          value={detail.priceReplace ?? undefined}
                          disabled={detail.bundleDeductRuleTypeId === 0}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex ? { ...row, priceReplace: toNullableNumber(value) } : row,
                              ),
                            }))
                          }
                        />
                        <Switch
                          label="Enabled"
                          checked={detail.enabled}
                          onChange={(event) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex ? { ...row, enabled: event.currentTarget.checked } : row,
                              ),
                            }))
                          }
                        />
                        <Switch
                          label="Can Replace"
                          checked={detail.isItemCanReplace}
                          onChange={(event) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex
                                  ? { ...row, isItemCanReplace: event.currentTarget.checked, isReplaceItem: !event.currentTarget.checked && row.isReplaceItem }
                                  : row,
                              ),
                            }))
                          }
                        />
                        <Switch
                          label="Is Replacement"
                          checked={detail.isReplaceItem}
                          onChange={(event) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex
                                  ? { ...row, isReplaceItem: event.currentTarget.checked, isItemCanReplace: !event.currentTarget.checked && row.isItemCanReplace }
                                  : row,
                              ),
                            }))
                          }
                        />
                        <Switch
                          label="Dept Revenue"
                          checked={detail.isDepartmentRevenue}
                          onChange={(event) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex
                                  ? {
                                      ...row,
                                      isDepartmentRevenue: event.currentTarget.checked,
                                      departmentRevenue: event.currentTarget.checked ? row.departmentRevenue : null,
                                    }
                                  : row,
                              ),
                            }))
                          }
                        />
                        <NumberInput
                          label="Dept Revenue Amt"
                          min={0}
                          value={detail.departmentRevenue ?? undefined}
                          disabled={!detail.isDepartmentRevenue}
                          onChange={(value) =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.map((row, idx) =>
                                idx === detailIndex ? { ...row, departmentRevenue: toNullableNumber(value) } : row,
                              ),
                            }))
                          }
                        />
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() =>
                            updateOptionalGroup(groupIndex, (prev) => ({
                              ...prev,
                              details: prev.details.filter((_, idx) => idx !== detailIndex),
                            }))
                          }
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() =>
                        updateOptionalGroup(groupIndex, (prev) => ({
                          ...prev,
                          details: [...prev.details, createEmptyRuleDetail(true, prev.groupIndex)],
                        }))
                      }
                    >
                      Add Optional Rule
                    </Button>
                  </Stack>
                </Paper>
              ))}
              <Button
                variant="light"
                size="xs"
                onClick={() =>
                  setRuleEditor((prev) =>
                    prev
                      ? (() => {
                          const nextGroupIndex =
                            (prev.optionalDetailGroups.length > 0
                              ? Math.max(...prev.optionalDetailGroups.map((group) => group.groupIndex))
                              : -1) + 1;

                          return {
                            ...prev,
                            optionalDetailGroups: [
                              ...prev.optionalDetailGroups,
                              {
                                groupIndex: nextGroupIndex,
                                details: [createEmptyRuleDetail(true, nextGroupIndex)],
                              },
                            ],
                          };
                        })()
                      : prev,
                  )
                }
              >
                Add Optional Group
              </Button>
            </Stack>

            <Divider label="Shop Availability" labelPosition="center" />
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Shop</Table.Th>
                  <Table.Th style={{ width: 120 }}>Enabled</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ruleEditor.shopRules.map((shop) => (
                  <Table.Tr key={shop.shopId}>
                    <Table.Td>{shop.shopName}</Table.Td>
                    <Table.Td>
                      <Switch
                        size="xs"
                        checked={shop.enabled}
                        onChange={(event) =>
                          setRuleEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  shopRules: prev.shopRules.map((row) =>
                                    row.shopId === shop.shopId ? { ...row, enabled: event.currentTarget.checked } : row,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => {
                  setRuleEditorOpened(false);
                  setRuleEditorTarget(null);
                  setRuleEditor(null);
                }}
              >
                Close
              </Button>
              <Button loading={ruleEditorSaving} onClick={() => void handleSaveRuleEditor()}>
                Save Rule Editor
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Promotion" size="sm">
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.promoName}</strong>? It will no longer be available for new orders.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setDeleteOpened(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button color="red" loading={submitting} onClick={handleDeactivate}>
              Deactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
