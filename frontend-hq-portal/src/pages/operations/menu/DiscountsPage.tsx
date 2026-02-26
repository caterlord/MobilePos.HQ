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
import discountService from '../../../services/discountService';
import type {
  DiscountRuleEditor,
  DiscountSummary,
  UpdateDiscountRuleEditorPayload,
  UpsertDiscountPayload,
} from '../../../types/discount';

const discountTypeOptions = [
  { value: '6', label: 'Discount: Fixed' },
  { value: '7', label: 'Discount: Percent' },
  { value: '10', label: 'Discount: Open' },
  { value: '12', label: 'Discount: Fixed Item' },
  { value: '13', label: 'Discount: Percent Item' },
  { value: '14', label: 'Discount: Upgrade Item' },
];

const getDiscountTypeLabel = (typeId: number) =>
  discountTypeOptions.find((option) => option.value === String(typeId))?.label ?? `Type ${typeId}`;

const fixedAmountTypes = new Set<number>([6, 12]);
const percentTypes = new Set<number>([7, 13]);
const openAmountTypes = new Set<number>([10]);

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

const parseIdListInput = (value: string): number[] =>
  value
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry) && entry > 0)
    .map((entry) => Math.trunc(entry))
    .filter((entry, index, list) => list.indexOf(entry) === index);

const formatIdListInput = (values?: number[] | null): string => (values && values.length > 0 ? values.join(',') : '');

const defaultPayload: UpsertDiscountPayload = {
  discountCode: '',
  discountName: '',
  bundlePromoDesc: '',
  bundlePromoHeaderTypeId: 7,
  isFixedAmount: false,
  discountPercent: 0,
  discountAmount: null,
  priority: 0,
  enabled: true,
  isAvailable: true,
  startDate: null,
  endDate: null,
  startTime: null,
  endTime: null,
};

export function DiscountsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [discounts, setDiscounts] = useState<DiscountSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<DiscountSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountSummary | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [payload, setPayload] = useState<UpsertDiscountPayload>(defaultPayload);
  const [ruleEditorOpened, setRuleEditorOpened] = useState(false);
  const [ruleEditorLoading, setRuleEditorLoading] = useState(false);
  const [ruleEditorSaving, setRuleEditorSaving] = useState(false);
  const [ruleEditorTarget, setRuleEditorTarget] = useState<DiscountSummary | null>(null);
  const [ruleEditor, setRuleEditor] = useState<DiscountRuleEditor | null>(null);

  const loadDiscounts = useCallback(async () => {
    if (!brandId) {
      setDiscounts([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await discountService.list(brandId);
      setDiscounts(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load discounts';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void loadDiscounts();
  }, [loadDiscounts]);

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setModalOpened(true);
  };

  const openEdit = (discount: DiscountSummary) => {
    setEditTarget(discount);
    setPayload({
      discountCode: discount.discountCode,
      discountName: discount.discountName,
      bundlePromoDesc: discount.bundlePromoDesc ?? '',
      bundlePromoHeaderTypeId: discount.bundlePromoHeaderTypeId,
      isFixedAmount: discount.isFixedAmount,
      discountPercent: discount.discountPercent ?? null,
      discountAmount: discount.discountAmount ?? null,
      priority: discount.priority,
      enabled: true,
      isAvailable: discount.isAvailable,
      startDate: discount.startDate ?? null,
      endDate: discount.endDate ?? null,
      startTime: discount.startTime ?? null,
      endTime: discount.endTime ?? null,
    });
    setModalOpened(true);
  };

  const openRuleEditor = async (discount: DiscountSummary) => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }

    setRuleEditorTarget(discount);
    setRuleEditorOpened(true);
    setRuleEditorLoading(true);
    setRuleEditor(null);

    try {
      const response = await discountService.getRuleEditor(brandId, discount.discountId);
      setRuleEditor({
        ...response,
        startDate: normalizeDateInput(response.startDate),
        endDate: normalizeDateInput(response.endDate),
        startTime: normalizeTimeInput(response.startTime),
        endTime: normalizeTimeInput(response.endTime),
        conditionalStartDate: normalizeDateInput(response.conditionalStartDate),
        conditionalEndDate: normalizeDateInput(response.conditionalEndDate),
        conditionalStartTime: normalizeTimeInput(response.conditionalStartTime),
        conditionalEndTime: normalizeTimeInput(response.conditionalEndTime),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load discount rule editor';
      notifications.show({ color: 'red', message });
      setRuleEditorOpened(false);
      setRuleEditorTarget(null);
    } finally {
      setRuleEditorLoading(false);
    }
  };

  const handleSaveRuleEditor = async () => {
    if (!brandId || !ruleEditorTarget || !ruleEditor) {
      return;
    }

    if (!ruleEditor.discountCode.trim() || !ruleEditor.discountName.trim()) {
      notifications.show({ color: 'red', message: 'Discount code and name are required' });
      return;
    }

    const payloadForApi: UpdateDiscountRuleEditorPayload = {
      bundlePromoHeaderTypeId: ruleEditor.bundlePromoHeaderTypeId,
      discountCode: ruleEditor.discountCode.trim(),
      discountName: ruleEditor.discountName.trim(),
      bundlePromoDesc: ruleEditor.bundlePromoDesc?.trim() || null,
      priority: ruleEditor.priority,
      enabled: ruleEditor.enabled,
      isAvailable: ruleEditor.isAvailable,
      isAutoCalculate: ruleEditor.isAutoCalculate,
      isFixedAmount: ruleEditor.isFixedAmount,
      isOpenAmount: ruleEditor.isOpenAmount,
      discountPercent: ruleEditor.discountPercent ?? null,
      discountAmount: ruleEditor.discountAmount ?? null,
      startDate: normalizeDateInput(ruleEditor.startDate),
      endDate: normalizeDateInput(ruleEditor.endDate),
      startTime: normalizeTimeInput(ruleEditor.startTime),
      endTime: normalizeTimeInput(ruleEditor.endTime),
      isNoOtherLoyalty: ruleEditor.isNoOtherLoyalty,
      mandatoryIncludedCategoryIds: ruleEditor.mandatoryIncludedCategoryIds ?? [],
      mandatoryIncludedItemIds: ruleEditor.mandatoryIncludedItemIds ?? [],
      mandatoryIncludedModifierItemIds: ruleEditor.mandatoryIncludedModifierItemIds ?? [],
      mandatoryExcludedCategoryIds: ruleEditor.mandatoryExcludedCategoryIds ?? [],
      mandatoryExcludedItemIds: ruleEditor.mandatoryExcludedItemIds ?? [],
      mandatoryExcludedModifierItemIds: ruleEditor.mandatoryExcludedModifierItemIds ?? [],
      priceSpecific: ruleEditor.priceSpecific ?? null,
      priceHigherThanEqualToSpecific: ruleEditor.priceHigherThanEqualToSpecific ?? null,
      priceLowerThanEqualToSpecific: ruleEditor.priceLowerThanEqualToSpecific ?? null,
      isLinkedWithThirdPartyLoyalty: ruleEditor.isLinkedWithThirdPartyLoyalty,
      linkedThirdPartyLoyaltyCode: ruleEditor.linkedThirdPartyLoyaltyCode?.trim() || null,
      isAppliedOnItemLevel: ruleEditor.isAppliedOnItemLevel,
      upgradeModifierItemId: ruleEditor.upgradeModifierItemId ?? null,
      discountTag: ruleEditor.discountTag?.trim() || null,
      discountBenefitModifierAmountAdjustment: ruleEditor.discountBenefitModifierAmountAdjustment?.trim() || null,
      minOrderAmount: ruleEditor.minOrderAmount ?? null,
      maxOrderAmount: ruleEditor.maxOrderAmount ?? null,
      minMatchedItemAmount: ruleEditor.minMatchedItemAmount ?? null,
      maxMatchedItemAmount: ruleEditor.maxMatchedItemAmount ?? null,
      minMatchedItemQty: ruleEditor.minMatchedItemQty ?? null,
      maxDiscountAmount: ruleEditor.maxDiscountAmount ?? null,
      maxDiscountQty: ruleEditor.maxDiscountQty ?? null,
      discountFirstQty: ruleEditor.discountFirstQty ?? null,
      conditionalDayOfWeeks: ruleEditor.conditionalDayOfWeeks ?? '',
      conditionalMonths: ruleEditor.conditionalMonths ?? '',
      conditionalDates: ruleEditor.conditionalDates ?? '',
      conditionalStartDate: normalizeDateInput(ruleEditor.conditionalStartDate),
      conditionalEndDate: normalizeDateInput(ruleEditor.conditionalEndDate),
      conditionalStartTime: normalizeTimeInput(ruleEditor.conditionalStartTime),
      conditionalEndTime: normalizeTimeInput(ruleEditor.conditionalEndTime),
      calculateIncludedSubItems: ruleEditor.calculateIncludedSubItems,
      matchMultiple: ruleEditor.matchMultiple,
      discountedCategoryIds: ruleEditor.discountedCategoryIds ?? [],
      discountedItemIds: ruleEditor.discountedItemIds ?? [],
      discountedModifierItemIds: ruleEditor.discountedModifierItemIds ?? [],
      discountedItemPriceOrderDescending: ruleEditor.discountedItemPriceOrderDescending,
      promoHeaderIds: ruleEditor.promoHeaderIds ?? [],
      shopRules: ruleEditor.shopRules,
    };

    try {
      setRuleEditorSaving(true);
      const response = await discountService.updateRuleEditor(brandId, ruleEditorTarget.discountId, payloadForApi);
      setRuleEditor({
        ...response,
        startDate: normalizeDateInput(response.startDate),
        endDate: normalizeDateInput(response.endDate),
        startTime: normalizeTimeInput(response.startTime),
        endTime: normalizeTimeInput(response.endTime),
        conditionalStartDate: normalizeDateInput(response.conditionalStartDate),
        conditionalEndDate: normalizeDateInput(response.conditionalEndDate),
        conditionalStartTime: normalizeTimeInput(response.conditionalStartTime),
        conditionalEndTime: normalizeTimeInput(response.conditionalEndTime),
      });
      notifications.show({ color: 'green', message: 'Discount rule editor updated' });
      await loadDiscounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save discount rule editor';
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

    if (!payload.discountCode.trim() || !payload.discountName.trim()) {
      notifications.show({ color: 'red', message: 'Discount code and name are required' });
      return;
    }

    if (!payload.isFixedAmount && (payload.discountPercent ?? 0) < 0) {
      notifications.show({ color: 'red', message: 'Discount percent must be 0 or greater' });
      return;
    }

    if (payload.isFixedAmount && (payload.discountAmount ?? 0) < 0) {
      notifications.show({ color: 'red', message: 'Discount amount must be 0 or greater' });
      return;
    }

    try {
      setSubmitting(true);
      const request: UpsertDiscountPayload = {
        ...payload,
        discountCode: payload.discountCode.trim(),
        discountName: payload.discountName.trim(),
        bundlePromoDesc: payload.bundlePromoDesc?.trim() || null,
        discountPercent: payload.isFixedAmount ? null : payload.discountPercent ?? 0,
        discountAmount: payload.isFixedAmount ? payload.discountAmount ?? 0 : null,
        enabled: true,
      };

      if (editTarget) {
        await discountService.update(brandId, editTarget.discountId, request);
        notifications.show({ color: 'green', message: 'Discount updated' });
      } else {
        await discountService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Discount created' });
      }

      setModalOpened(false);
      setEditTarget(null);
      await loadDiscounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save discount';
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
      await discountService.deactivate(brandId, deleteTarget.discountId);
      notifications.show({ color: 'green', message: 'Discount deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadDiscounts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate discount';
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
            <Title order={2}>Discounts</Title>
            <Text size="sm" c="dimmed">
              Configure discount headers and status for the selected brand.
            </Text>
          </div>
          <Group>
            <Button variant="light" onClick={() => void loadDiscounts()} loading={loading}>
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              Create Discount
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage discounts.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder radius="md" p="md">
          {!loading && discounts.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} color="blue">
              No discounts found.
            </Alert>
          ) : (
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Rule Type</Table.Th>
                  <Table.Th>Value Type</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {discounts.map((discount) => (
                  <Table.Tr key={discount.discountId}>
                    <Table.Td>{discount.discountCode}</Table.Td>
                    <Table.Td>{discount.discountName}</Table.Td>
                    <Table.Td>{getDiscountTypeLabel(discount.bundlePromoHeaderTypeId)}</Table.Td>
                    <Table.Td>{discount.isFixedAmount ? 'Fixed Amount' : 'Percentage'}</Table.Td>
                    <Table.Td>{discount.isFixedAmount ? discount.discountAmount ?? 0 : discount.discountPercent ?? 0}</Table.Td>
                    <Table.Td>{discount.priority}</Table.Td>
                    <Table.Td>
                      <Badge color={discount.isAvailable ? 'green' : 'gray'}>
                        {discount.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="light" color="blue" onClick={() => openEdit(discount)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="light" color="teal" onClick={() => void openRuleEditor(discount)}>
                          <IconSettings size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => {
                            setDeleteTarget(discount);
                            setDeleteOpened(true);
                          }}
                          disabled={!discount.isAvailable}
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

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title={editTarget ? 'Edit Discount' : 'Create Discount'}>
        <Stack gap="md">
          <TextInput
            label="Discount Code"
            value={payload.discountCode}
            onChange={(event) => setPayload((prev) => ({ ...prev, discountCode: event.currentTarget.value }))}
            required
          />
          <TextInput
            label="Discount Name"
            value={payload.discountName}
            onChange={(event) => setPayload((prev) => ({ ...prev, discountName: event.currentTarget.value }))}
            required
          />
          <Select
            label="Rule Type"
            data={discountTypeOptions}
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
          <Switch
            label="Fixed Amount Discount"
            checked={payload.isFixedAmount}
            onChange={(event) =>
              setPayload((prev) => ({
                ...prev,
                isFixedAmount: event.currentTarget.checked,
                discountPercent: event.currentTarget.checked ? null : prev.discountPercent ?? 0,
                discountAmount: event.currentTarget.checked ? prev.discountAmount ?? 0 : null,
              }))
            }
          />
          <Group grow>
            {payload.isFixedAmount ? (
              <NumberInput
                label="Discount Amount"
                min={0}
                value={payload.discountAmount ?? undefined}
                onChange={(value) => setPayload((prev) => ({ ...prev, discountAmount: toNullableNumber(value) ?? 0 }))}
              />
            ) : (
              <NumberInput
                label="Discount Percent"
                min={0}
                value={payload.discountPercent ?? undefined}
                onChange={(value) => setPayload((prev) => ({ ...prev, discountPercent: toNullableNumber(value) ?? 0 }))}
              />
            )}
            <NumberInput
              label="Priority"
              min={0}
              value={payload.priority}
              onChange={(value) => setPayload((prev) => ({ ...prev, priority: toNullableNumber(value) ?? 0 }))}
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
        title={`Discount Rule Editor${ruleEditorTarget ? ` · ${ruleEditorTarget.discountName}` : ''}`}
        size="xl"
      >
        {ruleEditorLoading || !ruleEditor ? (
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              Loading discount rule editor...
            </Text>
          </Stack>
        ) : (
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Discount Code"
                value={ruleEditor.discountCode}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, discountCode: event.currentTarget.value } : prev))
                }
              />
              <TextInput
                label="Discount Name"
                value={ruleEditor.discountName}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, discountName: event.currentTarget.value } : prev))
                }
              />
            </Group>
            <Group grow>
              <Select
                label="Rule Type"
                data={discountTypeOptions}
                value={String(ruleEditor.bundlePromoHeaderTypeId)}
                onChange={(value) =>
                  setRuleEditor((prev) => {
                    if (!prev || !value) {
                      return prev;
                    }

                    const nextType = Number(value);
                    return {
                      ...prev,
                      bundlePromoHeaderTypeId: nextType,
                      isFixedAmount: fixedAmountTypes.has(nextType),
                      isOpenAmount: openAmountTypes.has(nextType),
                      discountPercent: percentTypes.has(nextType) ? prev.discountPercent : null,
                      discountAmount: fixedAmountTypes.has(nextType) || openAmountTypes.has(nextType) ? prev.discountAmount : null,
                    };
                  })
                }
              />
              <NumberInput
                label="Priority"
                min={0}
                value={ruleEditor.priority}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, priority: toNullableNumber(value) ?? 0 } : prev))
                }
              />
              <NumberInput
                label="Upgrade Modifier Item ID"
                min={0}
                value={ruleEditor.upgradeModifierItemId ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, upgradeModifierItemId: toNullableNumber(value) } : prev))
                }
              />
            </Group>
            <Textarea
              label="Description"
              minRows={2}
              value={ruleEditor.bundlePromoDesc ?? ''}
              onChange={(event) =>
                setRuleEditor((prev) => (prev ? { ...prev, bundlePromoDesc: event.currentTarget.value } : prev))
              }
            />

            <Divider label="Discount Value" labelPosition="center" />
            <Group grow>
              <NumberInput
                label="Discount Amount"
                min={0}
                value={ruleEditor.discountAmount ?? undefined}
                disabled={!fixedAmountTypes.has(ruleEditor.bundlePromoHeaderTypeId) && !openAmountTypes.has(ruleEditor.bundlePromoHeaderTypeId)}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, discountAmount: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Discount Percent"
                min={0}
                value={ruleEditor.discountPercent ?? undefined}
                disabled={!percentTypes.has(ruleEditor.bundlePromoHeaderTypeId)}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, discountPercent: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Price Specific"
                min={0}
                value={ruleEditor.priceSpecific ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, priceSpecific: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Price >= Specific"
                min={0}
                value={ruleEditor.priceHigherThanEqualToSpecific ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, priceHigherThanEqualToSpecific: toNullableNumber(value) } : prev,
                  )
                }
              />
              <NumberInput
                label="Price <= Specific"
                min={0}
                value={ruleEditor.priceLowerThanEqualToSpecific ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, priceLowerThanEqualToSpecific: toNullableNumber(value) } : prev,
                  )
                }
              />
            </Group>

            <Divider label="Date & Time" labelPosition="center" />
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
              <TextInput
                label="Conditional Day Of Weeks"
                placeholder="e.g. 1,2,3,4,5"
                value={ruleEditor.conditionalDayOfWeeks}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, conditionalDayOfWeeks: event.currentTarget.value } : prev,
                  )
                }
              />
              <TextInput
                label="Conditional Months"
                placeholder="e.g. 1,2,12"
                value={ruleEditor.conditionalMonths}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, conditionalMonths: event.currentTarget.value } : prev))
                }
              />
              <TextInput
                label="Conditional Dates"
                placeholder="e.g. 1,15,31"
                value={ruleEditor.conditionalDates}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, conditionalDates: event.currentTarget.value } : prev))
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label="Conditional Start Date"
                value={ruleEditor.conditionalStartDate ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, conditionalStartDate: event.currentTarget.value || null } : prev,
                  )
                }
              />
              <TextInput
                label="Conditional End Date"
                value={ruleEditor.conditionalEndDate ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, conditionalEndDate: event.currentTarget.value || null } : prev))
                }
              />
              <TextInput
                label="Conditional Start Time"
                value={ruleEditor.conditionalStartTime ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, conditionalStartTime: event.currentTarget.value || null } : prev,
                  )
                }
              />
              <TextInput
                label="Conditional End Time"
                value={ruleEditor.conditionalEndTime ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, conditionalEndTime: event.currentTarget.value || null } : prev))
                }
              />
            </Group>

            <Divider label="Thresholds" labelPosition="center" />
            <Group grow>
              <NumberInput
                label="Min Order Amount"
                min={0}
                value={ruleEditor.minOrderAmount ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, minOrderAmount: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Max Order Amount"
                min={0}
                value={ruleEditor.maxOrderAmount ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, maxOrderAmount: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Min Matched Item Amount"
                min={0}
                value={ruleEditor.minMatchedItemAmount ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, minMatchedItemAmount: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Max Matched Item Amount"
                min={0}
                value={ruleEditor.maxMatchedItemAmount ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, maxMatchedItemAmount: toNullableNumber(value) } : prev))
                }
              />
            </Group>
            <Group grow>
              <NumberInput
                label="Min Matched Item Qty"
                min={0}
                value={ruleEditor.minMatchedItemQty ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, minMatchedItemQty: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Max Discount Amount"
                min={0}
                value={ruleEditor.maxDiscountAmount ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, maxDiscountAmount: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Max Discount Qty"
                min={0}
                value={ruleEditor.maxDiscountQty ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, maxDiscountQty: toNullableNumber(value) } : prev))
                }
              />
              <NumberInput
                label="Discount First Qty"
                min={0}
                value={ruleEditor.discountFirstQty ?? undefined}
                onChange={(value) =>
                  setRuleEditor((prev) => (prev ? { ...prev, discountFirstQty: toNullableNumber(value) } : prev))
                }
              />
            </Group>

            <Divider label="Rule Lists (Comma-separated IDs)" labelPosition="center" />
            <Group grow align="start">
              <Textarea
                label="Mandatory Included Category IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.mandatoryIncludedCategoryIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev
                      ? { ...prev, mandatoryIncludedCategoryIds: parseIdListInput(event.currentTarget.value) }
                      : prev,
                  )
                }
              />
              <Textarea
                label="Mandatory Included Item IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.mandatoryIncludedItemIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, mandatoryIncludedItemIds: parseIdListInput(event.currentTarget.value) } : prev,
                  )
                }
              />
              <Textarea
                label="Mandatory Included Modifier IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.mandatoryIncludedModifierItemIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev
                      ? { ...prev, mandatoryIncludedModifierItemIds: parseIdListInput(event.currentTarget.value) }
                      : prev,
                  )
                }
              />
            </Group>
            <Group grow align="start">
              <Textarea
                label="Mandatory Excluded Category IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.mandatoryExcludedCategoryIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev
                      ? { ...prev, mandatoryExcludedCategoryIds: parseIdListInput(event.currentTarget.value) }
                      : prev,
                  )
                }
              />
              <Textarea
                label="Mandatory Excluded Item IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.mandatoryExcludedItemIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, mandatoryExcludedItemIds: parseIdListInput(event.currentTarget.value) } : prev,
                  )
                }
              />
              <Textarea
                label="Mandatory Excluded Modifier IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.mandatoryExcludedModifierItemIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev
                      ? { ...prev, mandatoryExcludedModifierItemIds: parseIdListInput(event.currentTarget.value) }
                      : prev,
                  )
                }
              />
            </Group>
            <Group grow align="start">
              <Textarea
                label="Discounted Category IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.discountedCategoryIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, discountedCategoryIds: parseIdListInput(event.currentTarget.value) } : prev,
                  )
                }
              />
              <Textarea
                label="Discounted Item IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.discountedItemIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, discountedItemIds: parseIdListInput(event.currentTarget.value) } : prev,
                  )
                }
              />
              <Textarea
                label="Discounted Modifier IDs"
                minRows={2}
                value={formatIdListInput(ruleEditor.discountedModifierItemIds)}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, discountedModifierItemIds: parseIdListInput(event.currentTarget.value) } : prev,
                  )
                }
              />
            </Group>
            <Textarea
              label="Promo Header IDs"
              minRows={2}
              value={formatIdListInput(ruleEditor.promoHeaderIds)}
              onChange={(event) =>
                setRuleEditor((prev) => (prev ? { ...prev, promoHeaderIds: parseIdListInput(event.currentTarget.value) } : prev))
              }
            />

            <Divider label="Flags & Metadata" labelPosition="center" />
            <Group>
              <Switch
                label="Enabled"
                checked={ruleEditor.enabled}
                onChange={(event) => setRuleEditor((prev) => (prev ? { ...prev, enabled: event.currentTarget.checked } : prev))}
              />
              <Switch
                label="Available"
                checked={ruleEditor.isAvailable}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isAvailable: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Auto Calculate"
                checked={ruleEditor.isAutoCalculate}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isAutoCalculate: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="No Other Loyalty"
                checked={ruleEditor.isNoOtherLoyalty}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isNoOtherLoyalty: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Applied On Item Level"
                checked={ruleEditor.isAppliedOnItemLevel}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, isAppliedOnItemLevel: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Linked Third-Party Loyalty"
                checked={ruleEditor.isLinkedWithThirdPartyLoyalty}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, isLinkedWithThirdPartyLoyalty: event.currentTarget.checked } : prev,
                  )
                }
              />
              <Switch
                label="Calculate Included Sub-items"
                checked={ruleEditor.calculateIncludedSubItems}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, calculateIncludedSubItems: event.currentTarget.checked } : prev,
                  )
                }
              />
              <Switch
                label="Match Multiple"
                checked={ruleEditor.matchMultiple}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, matchMultiple: event.currentTarget.checked } : prev))
                }
              />
              <Switch
                label="Discounted Price Descending"
                checked={ruleEditor.discountedItemPriceOrderDescending}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, discountedItemPriceOrderDescending: event.currentTarget.checked } : prev,
                  )
                }
              />
            </Group>
            <Group grow>
              <TextInput
                label="Linked Third-Party Loyalty Code"
                value={ruleEditor.linkedThirdPartyLoyaltyCode ?? ''}
                disabled={!ruleEditor.isLinkedWithThirdPartyLoyalty}
                onChange={(event) =>
                  setRuleEditor((prev) =>
                    prev ? { ...prev, linkedThirdPartyLoyaltyCode: event.currentTarget.value } : prev,
                  )
                }
              />
              <TextInput
                label="Discount Tag"
                value={ruleEditor.discountTag ?? ''}
                onChange={(event) =>
                  setRuleEditor((prev) => (prev ? { ...prev, discountTag: event.currentTarget.value } : prev))
                }
              />
            </Group>
            <Textarea
              label="Discount Benefit Modifier Amount Adjustment (JSON)"
              minRows={2}
              value={ruleEditor.discountBenefitModifierAmountAdjustment ?? ''}
              onChange={(event) =>
                setRuleEditor((prev) =>
                  prev ? { ...prev, discountBenefitModifierAmountAdjustment: event.currentTarget.value } : prev,
                )
              }
            />

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

      <Modal opened={deleteOpened} onClose={() => setDeleteOpened(false)} title="Deactivate Discount" size="sm">
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.discountName}</strong>? It will no longer be applied to new orders.
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
