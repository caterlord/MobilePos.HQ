import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Button,
  Divider,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconArrowLeft, IconDeviceFloppy, IconPlus, IconTrash } from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBrands } from '../../contexts/BrandContext';
import onlineOrderingService from '../../services/onlineOrderingService';

// Helper to read/write nested settings properties
const get = (obj: Record<string, unknown>, key: string, fallback: unknown = ''): unknown => {
  return obj[key] ?? fallback;
};

const s = (obj: Record<string, unknown>, key: string): string => String(get(obj, key, '') ?? '');
const n = (obj: Record<string, unknown>, key: string, fallback = 0): number => Number(get(obj, key, fallback) ?? fallback);
const b = (obj: Record<string, unknown>, key: string, fallback = false): boolean => Boolean(get(obj, key, fallback));

// ── Reusable section helpers ──

function SectionTitle({ children }: { children: string }) {
  return <Title order={4} mt="md" mb="xs">{children}</Title>;
}

function PaymentMethodCard({
  title,
  prefix,
  settings,
  onChange,
  channelOptions,
  providerFields,
}: {
  title: string;
  prefix: string;
  settings: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  channelOptions?: { value: string; label: string }[];
  providerFields: { key: string; label: string; type?: 'text' | 'number' | 'switch' | 'select'; options?: { value: string; label: string }[] }[];
}) {
  const enabled = b(settings, `${prefix}Enabled`);
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" mb="sm">
        <Text fw={600}>{title}</Text>
        <Switch
          label="Enabled"
          checked={enabled}
          onChange={(e) => onChange(`${prefix}Enabled`, e.currentTarget.checked)}
        />
      </Group>
      {enabled && (
        <Stack gap="xs">
          {channelOptions && (
            <Select
              label="Channel / Provider"
              data={channelOptions}
              value={s(settings, `${prefix}Channel`)}
              onChange={(v) => onChange(`${prefix}Channel`, v ?? '')}
              size="xs"
            />
          )}
          <Switch
            label="Production Environment"
            checked={b(settings, `${prefix}ProductionEnvironment`)}
            onChange={(e) => onChange(`${prefix}ProductionEnvironment`, e.currentTarget.checked)}
            size="xs"
          />
          <NumberInput
            label="Payment Method ID"
            value={n(settings, `${prefix}PaymentMethodId`, 0) || undefined}
            onChange={(v) => onChange(`${prefix}PaymentMethodId`, typeof v === 'number' ? v : null)}
            size="xs"
          />
          {providerFields.map((field) => {
            const fullKey = field.key.includes('.') ? field.key : `${prefix}${field.key}`;
            if (field.type === 'switch') {
              return (
                <Switch
                  key={fullKey}
                  label={field.label}
                  checked={b(settings, fullKey)}
                  onChange={(e) => onChange(fullKey, e.currentTarget.checked)}
                  size="xs"
                />
              );
            }
            if (field.type === 'number') {
              return (
                <NumberInput
                  key={fullKey}
                  label={field.label}
                  value={n(settings, fullKey, 0) || undefined}
                  onChange={(v) => onChange(fullKey, typeof v === 'number' ? v : null)}
                  size="xs"
                />
              );
            }
            if (field.type === 'select' && field.options) {
              return (
                <Select
                  key={fullKey}
                  label={field.label}
                  data={field.options}
                  value={s(settings, fullKey)}
                  onChange={(v) => onChange(fullKey, v ?? '')}
                  size="xs"
                />
              );
            }
            return (
              <TextInput
                key={fullKey}
                label={field.label}
                value={s(settings, fullKey)}
                onChange={(e) => onChange(fullKey, e.currentTarget.value)}
                size="xs"
              />
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}

// ── Business Day Section helpers ──

interface BusinessDaySection {
  label?: string;
  daysOfWeek?: string;
  fromTime?: string;
  toTime?: string;
}

// ── Main Component ──

export function OnlineOrderingShopSettingsEditor() {
  const { shopId: shopIdParam } = useParams<{ shopId: string }>();
  const shopId = shopIdParam ? parseInt(shopIdParam, 10) : null;
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!brandId || !shopId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await onlineOrderingService.getShopSettings(brandId, shopId);
      setSettings(data);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [brandId, shopId]);

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  const update = (key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!brandId || !shopId) return;
    try {
      setSaving(true);
      await onlineOrderingService.updateShopSettings(brandId, shopId, settings);
      notifications.show({ color: 'green', message: 'Settings saved successfully' });
      setDirty(false);
    } catch (err) {
      notifications.show({ color: 'red', message: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  };

  // ── Business Day Sections ──
  const businessDaySections: BusinessDaySection[] = (settings.BusinessDaySectionList as BusinessDaySection[]) ?? [];
  const updateBDS = (list: BusinessDaySection[]) => update('BusinessDaySectionList', list);

  // ── Webhook lists ──
  const webhookList: { url: string; enabled: boolean }[] = (settings.WebhookList as { url: string; enabled: boolean }[]) ?? [];

  return (
    <Stack gap="lg" p="lg">
      <Group justify="space-between">
        <Group>
          <ActionIcon variant="subtle" onClick={() => navigate('/online-ordering/general-settings')}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <div>
            <Title order={2}>Shop Settings (Shop #{shopId})</Title>
            <Text size="sm" c="dimmed">Edit online ordering settings for this shop.</Text>
          </div>
        </Group>
        <Button
          leftSection={<IconDeviceFloppy size={16} />}
          onClick={() => void handleSave()}
          loading={saving}
          disabled={!dirty}
        >
          Save Settings
        </Button>
      </Group>

      {error && <Alert icon={<IconAlertCircle size={16} />} color="red">{error}</Alert>}

      {loading ? (
        <Text c="dimmed">Loading settings...</Text>
      ) : (
        <Tabs defaultValue="basic">
          <Tabs.List>
            <Tabs.Tab value="basic">Basic Settings</Tabs.Tab>
            <Tabs.Tab value="ui">User UI</Tabs.Tab>
            <Tabs.Tab value="payment">Online Payment</Tabs.Tab>
            <Tabs.Tab value="member">Member</Tabs.Tab>
            <Tabs.Tab value="sms">SMS</Tabs.Tab>
            <Tabs.Tab value="table-setup">Table Service (Setup)</Tabs.Tab>
            <Tabs.Tab value="table-mgmt">Table Service (Mgmt)</Tabs.Tab>
            <Tabs.Tab value="counter">Counter Service</Tabs.Tab>
            <Tabs.Tab value="preorder">Pre-order</Tabs.Tab>
            <Tabs.Tab value="3rd-party">3rd Party Platforms</Tabs.Tab>
            <Tabs.Tab value="webhooks">Webhooks</Tabs.Tab>
          </Tabs.List>

          {/* ══════════ TAB 1: Basic Settings ══════════ */}
          <Tabs.Panel value="basic" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={2}>
                <TextInput label="Website URL" value={s(settings, 'WebsiteUrl')} onChange={(e) => update('WebsiteUrl', e.currentTarget.value)} />
                <Select label="Country Code" data={[
                  { value: '852', label: '(+852) Hong Kong' },
                  { value: '61', label: '(+61) Australia' },
                  { value: '65', label: '(+65) Singapore' },
                  { value: '886', label: '(+886) Taiwan' },
                  { value: '1', label: '(+1) US / Canada' },
                  { value: '44', label: '(+44) UK' },
                  { value: '60', label: '(+60) Malaysia' },
                ]} value={s(settings, 'CountryCode')} onChange={(v) => update('CountryCode', v ?? '')} searchable />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Time Zone" value={n(settings, 'TimeZone', 8)} onChange={(v) => update('TimeZone', v)} decimalScale={1} />
                <NumberInput label="Order Token Valid Time (min)" value={n(settings, 'OrderTokenValidTime', 30)} onChange={(v) => update('OrderTokenValidTime', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Quota (overall)" value={n(settings, 'Quota')} onChange={(v) => update('Quota', v)} />
                <NumberInput label="Quota Per Item Type" value={n(settings, 'QuotaOfItem')} onChange={(v) => update('QuotaOfItem', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Quota Per Each Item" value={n(settings, 'QuotaOfEachItem')} onChange={(v) => update('QuotaOfEachItem', v)} />
                <Select label="Rounding Method" data={[
                  { value: 'UP', label: 'Round Up' },
                  { value: 'DOWN', label: 'Round Down' },
                  { value: 'ROUND', label: 'Round (Standard)' },
                  { value: 'N5C', label: 'Nearest 5 Cents' },
                  { value: 'NONE', label: 'No Rounding' },
                  { value: 'POS', label: 'Setting by POS' },
                ]} value={s(settings, 'RoundingMethod') || 'POS'} onChange={(v) => update('RoundingMethod', v ?? '')} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Rounding Place" value={n(settings, 'RoundingPlace', 2)} onChange={(v) => update('RoundingPlace', v)} />
                <Switch label="Disable Navigate When Token Expired" checked={b(settings, 'DisableNavigateWhenTokenExpired')} onChange={(e) => update('DisableNavigateWhenTokenExpired', e.currentTarget.checked)} mt="xl" />
              </SimpleGrid>
              <TextInput label="Expired Token Message" value={s(settings, 'WhenTokenExpiredTips')} onChange={(e) => update('WhenTokenExpiredTips', e.currentTarget.value)} />
              <SimpleGrid cols={2}>
                <Switch label="Check Shop Online Status" checked={b(settings, 'OdoHealthCheckEnabled')} onChange={(e) => update('OdoHealthCheckEnabled', e.currentTarget.checked)} />
                <Switch label="Allow Modify Set Quantity" checked={b(settings, 'ModifySetQuantity')} onChange={(e) => update('ModifySetQuantity', e.currentTarget.checked)} />
              </SimpleGrid>

              <Divider />
              <SectionTitle>Custom Business Day Sections</SectionTitle>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Label</Table.Th>
                    <Table.Th>Days of Week</Table.Th>
                    <Table.Th>From</Table.Th>
                    <Table.Th>To</Table.Th>
                    <Table.Th style={{ width: 50 }} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {businessDaySections.map((sec, i) => (
                    <Table.Tr key={i}>
                      <Table.Td><TextInput size="xs" value={sec.label ?? ''} onChange={(e) => { const arr = [...businessDaySections]; arr[i] = { ...sec, label: e.currentTarget.value }; updateBDS(arr); }} /></Table.Td>
                      <Table.Td><TextInput size="xs" value={sec.daysOfWeek ?? ''} onChange={(e) => { const arr = [...businessDaySections]; arr[i] = { ...sec, daysOfWeek: e.currentTarget.value }; updateBDS(arr); }} placeholder="Mon,Tue,Wed..." /></Table.Td>
                      <Table.Td><TextInput size="xs" value={sec.fromTime ?? ''} onChange={(e) => { const arr = [...businessDaySections]; arr[i] = { ...sec, fromTime: e.currentTarget.value }; updateBDS(arr); }} placeholder="HH:mm" /></Table.Td>
                      <Table.Td><TextInput size="xs" value={sec.toTime ?? ''} onChange={(e) => { const arr = [...businessDaySections]; arr[i] = { ...sec, toTime: e.currentTarget.value }; updateBDS(arr); }} placeholder="HH:mm" /></Table.Td>
                      <Table.Td><ActionIcon variant="subtle" color="red" onClick={() => { const arr = businessDaySections.filter((_, idx) => idx !== i); updateBDS(arr); }}><IconTrash size={14} /></ActionIcon></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => updateBDS([...businessDaySections, { label: '', daysOfWeek: '', fromTime: '', toTime: '' }])}>
                Add Section
              </Button>
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 2: User UI Settings ══════════ */}
          <Tabs.Panel value="ui" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={2}>
                <TextInput label="Home Layout" value={s(settings, 'HomeLayout')} onChange={(e) => update('HomeLayout', e.currentTarget.value)} />
                <TextInput label="Categories Layout" value={s(settings, 'CategoriesLayout')} onChange={(e) => update('CategoriesLayout', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Continuously Show Next Category" checked={b(settings, 'ContinuouslyShowNextCategory')} onChange={(e) => update('ContinuouslyShowNextCategory', e.currentTarget.checked)} />
                <NumberInput label="Landing Page Language Bar Format" value={n(settings, 'LandingPageLanguageBarDisplayFormant')} onChange={(v) => update('LandingPageLanguageBarDisplayFormant', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="Main Language" value={s(settings, 'MainLang')} onChange={(e) => update('MainLang', e.currentTarget.value)} />
                <TextInput label="Alternative Language" value={s(settings, 'AltLang')} onChange={(e) => update('AltLang', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="Currency Symbol" value={s(settings, 'CurSymb')} onChange={(e) => update('CurSymb', e.currentTarget.value)} />
                <NumberInput label="Decimal Places" value={n(settings, 'DecimalPlace', 2)} onChange={(v) => update('DecimalPlace', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Item Limit Display Mode" value={n(settings, 'ItemLimitDisplayMode')} onChange={(v) => update('ItemLimitDisplayMode', v)} />
                <TextInput label="Modifier Group Header Font Size" value={s(settings, 'SetModifierGroupHeaderFontSize')} onChange={(e) => update('SetModifierGroupHeaderFontSize', e.currentTarget.value)} />
              </SimpleGrid>
              <TextInput label="Order History Top Message" value={s(settings, 'OrderHistoryTopMessage')} onChange={(e) => update('OrderHistoryTopMessage', e.currentTarget.value)} />
              <SimpleGrid cols={3}>
                <Switch label="Show Image" checked={b(settings, 'ShowImage', true)} onChange={(e) => update('ShowImage', e.currentTarget.checked)} />
                <Switch label="Show Production Info" checked={b(settings, 'ShowProductionInformation')} onChange={(e) => update('ShowProductionInformation', e.currentTarget.checked)} />
                <Switch label="Order Items Directly" checked={b(settings, 'OrderItemDirectly')} onChange={(e) => update('OrderItemDirectly', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={3}>
                <Switch label="Order Items by Step" checked={b(settings, 'OrderItemByStep')} onChange={(e) => update('OrderItemByStep', e.currentTarget.checked)} />
                <Switch label="Show Map on Shop List" checked={b(settings, 'ShowMapOnShopListPage')} onChange={(e) => update('ShowMapOnShopListPage', e.currentTarget.checked)} />
                <Switch label="Display on Shop List" checked={b(settings, 'DisplayOnShopList', true)} onChange={(e) => update('DisplayOnShopList', e.currentTarget.checked)} />
              </SimpleGrid>

              <Divider />
              <SectionTitle>Company Information Display</SectionTitle>
              <SimpleGrid cols={2}>
                <Switch label="Show Business Registration Type" checked={b(settings, 'BusinessRegistrationTypeNameVisibility')} onChange={(e) => update('BusinessRegistrationTypeNameVisibility', e.currentTarget.checked)} />
                <TextInput label="Business Registration Type Name" value={s(settings, 'BusinessRegistrationTypeName')} onChange={(e) => update('BusinessRegistrationTypeName', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Show Business Registration Number" checked={b(settings, 'BusinessRegistrationNumberVisibility')} onChange={(e) => update('BusinessRegistrationNumberVisibility', e.currentTarget.checked)} />
                <TextInput label="Business Registration Number" value={s(settings, 'BusinessRegistrationNumber')} onChange={(e) => update('BusinessRegistrationNumber', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Show Company Name" checked={b(settings, 'CompanyNameVisiblity')} onChange={(e) => update('CompanyNameVisiblity', e.currentTarget.checked)} />
                <TextInput label="Company Name" value={s(settings, 'CompanyName')} onChange={(e) => update('CompanyName', e.currentTarget.value)} />
              </SimpleGrid>
              <TextInput label="Company Name (Alt)" value={s(settings, 'CompanyNameAlt')} onChange={(e) => update('CompanyNameAlt', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Font Sizes</SectionTitle>
              <SimpleGrid cols={3}>
                <TextInput label="Item Name Font Size" value={s(settings, 'ItemNameFontSize')} onChange={(e) => update('ItemNameFontSize', e.currentTarget.value)} />
                <TextInput label="Item Description Font Size" value={s(settings, 'ItemDescriptionFontSize')} onChange={(e) => update('ItemDescriptionFontSize', e.currentTarget.value)} />
                <TextInput label="Category Font Size" value={s(settings, 'CategoryFontSize')} onChange={(e) => update('CategoryFontSize', e.currentTarget.value)} />
              </SimpleGrid>

              <Divider />
              <SectionTitle>Legal Policies</SectionTitle>
              <Switch label="Show Privacy Policy" checked={b(settings, 'PrivacyPolicyVisibility')} onChange={(e) => update('PrivacyPolicyVisibility', e.currentTarget.checked)} />
              <Textarea label="Privacy Policy" value={s(settings, 'PrivacyPolicy')} onChange={(e) => update('PrivacyPolicy', e.currentTarget.value)} rows={3} />
              <Switch label="Show Terms & Conditions" checked={b(settings, 'TermsConditionsVisibility')} onChange={(e) => update('TermsConditionsVisibility', e.currentTarget.checked)} />
              <Textarea label="Terms & Conditions" value={s(settings, 'TermsConditions')} onChange={(e) => update('TermsConditions', e.currentTarget.value)} rows={3} />
              <Switch label="Show Cancellation & Refund Policy" checked={b(settings, 'CancellationRefundPolicyVisiblity')} onChange={(e) => update('CancellationRefundPolicyVisiblity', e.currentTarget.checked)} />
              <Textarea label="Cancellation & Refund Policy" value={s(settings, 'CancellationRefundPolicy')} onChange={(e) => update('CancellationRefundPolicy', e.currentTarget.value)} rows={3} />
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 3: Online Payment Settings ══════════ */}
          <Tabs.Panel value="payment" pt="md">
            <Stack gap="md">
              <Text size="sm" c="dimmed">Configure payment methods for online ordering. Enable each payment method and fill in provider credentials.</Text>

              <SimpleGrid cols={2}>
                <PaymentMethodCard title="Credit Card" prefix="CreditCard" settings={settings} onChange={update}
                  channelOptions={[{ value: 'eway', label: 'eWAY' }, { value: 'cybersource', label: 'CyberSource' }, { value: 'tappay', label: 'TapPay' }, { value: 'qfpay', label: 'QFPay' }, { value: 'osspay', label: 'OssPay' }, { value: 'aigens', label: 'Aigens' }]}
                  providerFields={[
                    { key: 'EwayCreditCardApiKey', label: 'eWAY API Key' }, { key: 'EwayCreditCardSecretKey', label: 'eWAY Secret Key' },
                    { key: 'TappayCreditCardPartnerKey', label: 'TapPay Partner Key' }, { key: 'TappayCreditCardAppId', label: 'TapPay App ID' }, { key: 'TappayCreditCardAppKey', label: 'TapPay App Key' },
                    { key: 'CreditCardQfPayMerchantId', label: 'QFPay Merchant ID' }, { key: 'CreditCardQfPayAppCode', label: 'QFPay App Code' },
                  ]}
                />
                <PaymentMethodCard title="Google Pay" prefix="GooglePay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'cybersource', label: 'CyberSource' }, { value: 'tappay', label: 'TapPay' }, { value: 'osspay', label: 'OssPay' }]}
                  providerFields={[
                    { key: 'TappayGooglePayPartnerKey', label: 'TapPay Partner Key' }, { key: 'TappayGooglePayAppId', label: 'TapPay App ID' },
                    { key: 'TappayGooglePayMerchantIdentifier', label: 'Merchant Identifier' },
                  ]}
                />
                <PaymentMethodCard title="Apple Pay" prefix="ApplePay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'cybersource', label: 'CyberSource' }, { value: 'tappay', label: 'TapPay' }, { value: 'osspay', label: 'OssPay' }]}
                  providerFields={[
                    { key: 'TappayApplePayPartnerKey', label: 'TapPay Partner Key' }, { key: 'TappayApplePayAppId', label: 'TapPay App ID' },
                    { key: 'TappayApplePayMerchantIdentifier', label: 'Merchant Identifier' },
                  ]}
                />
                <PaymentMethodCard title="Samsung Pay" prefix="SamsungPay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'tappay', label: 'TapPay' }]}
                  providerFields={[{ key: 'TappaySamsungPayPartnerKey', label: 'TapPay Partner Key' }, { key: 'TappaySamsungPayAppId', label: 'TapPay App ID' }]}
                />
                <PaymentMethodCard title="LINE Pay" prefix="LinePay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'tappay', label: 'TapPay' }, { value: 'official', label: 'Official' }]}
                  providerFields={[
                    { key: 'TappayLinePayPartnerKey', label: 'TapPay Partner Key' }, { key: 'OfficialLinePayChannelId', label: 'Official Channel ID' }, { key: 'OfficialLinePayChannelSecret', label: 'Official Channel Secret' },
                  ]}
                />
                <PaymentMethodCard title="Easy Wallet" prefix="EasyWallet" settings={settings} onChange={update}
                  channelOptions={[{ value: 'tappay', label: 'TapPay' }, { value: 'official', label: 'Official' }]}
                  providerFields={[{ key: 'TappayEasyWalletPartnerKey', label: 'TapPay Partner Key' }, { key: 'OfficialEasyWalletContractNo', label: 'Contract No' }]}
                />
                <PaymentMethodCard title="JKO Pay" prefix="JkoPay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'tappay', label: 'TapPay' }, { value: 'official', label: 'Official' }]}
                  providerFields={[{ key: 'OfficialJkoPayApiUrl', label: 'API URL' }, { key: 'OfficialJkoPayStoreId', label: 'Store ID' }, { key: 'OfficialJkoPayApiKey', label: 'API Key' }]}
                />
                <PaymentMethodCard title="HSBC PayMe" prefix="HsbcPayMe" settings={settings} onChange={update} providerFields={[]} />
                <PaymentMethodCard title="Stripe" prefix="Stripe" settings={settings} onChange={update}
                  providerFields={[
                    { key: 'StripePublicKey', label: 'Public Key' }, { key: 'StripeSecretKey', label: 'Secret Key' },
                    { key: 'StripeWebhookUrl', label: 'Webhook URL' }, { key: 'StripeWebhookSecretKey', label: 'Webhook Secret' },
                    { key: 'StripeAccountId', label: 'Account ID' }, { key: 'StripeMerchantName', label: 'Merchant Name' },
                  ]}
                />
                <PaymentMethodCard title="MPay" prefix="MPay" settings={settings} onChange={update}
                  providerFields={[
                    { key: 'MPayApiUrl', label: 'API URL' }, { key: 'MPayMerchantId', label: 'Merchant ID' },
                    { key: 'MPayTerminalId', label: 'Terminal ID' }, { key: 'MPaySecretKey', label: 'Secret Key' },
                  ]}
                />
                <PaymentMethodCard title="Razer" prefix="Razer" settings={settings} onChange={update}
                  providerFields={[{ key: 'RazerVerifyKey', label: 'Verify Key' }, { key: 'RazerSecretKey', label: 'Secret Key' }, { key: 'RazerMerchantId', label: 'Merchant ID' }]}
                />
                <PaymentMethodCard title="Octopus App" prefix="OctopusApp" settings={settings} onChange={update} providerFields={[]} />
                <PaymentMethodCard title="Airwallex" prefix="Airwallex" settings={settings} onChange={update}
                  providerFields={[
                    { key: 'AirwallexApiUrl', label: 'API URL' }, { key: 'AirwallexClientId', label: 'Client ID' },
                    { key: 'AirwallexApiKey', label: 'API Key' }, { key: 'AirwallexRedirectUrl', label: 'Redirect URL' }, { key: 'AirwallexMode', label: 'Mode' },
                  ]}
                />
                <PaymentMethodCard title="CyberSource Hosted" prefix="CyberSourceSecureHosted" settings={settings} onChange={update}
                  providerFields={[
                    { key: 'CyberSourceSecureHostedApiUrl', label: 'API URL' }, { key: 'CyberSourceSecureHostedProjectId', label: 'Project ID' },
                    { key: 'CyberSourceSecureHostedAccessToken', label: 'Access Token' }, { key: 'CyberSourceSecureHostedSecretKey', label: 'Secret Key' },
                  ]}
                />
                <PaymentMethodCard title="Alipay" prefix="Alipay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'qfpay', label: 'QFPay' }, { value: 'osspay', label: 'OssPay' }, { value: 'aigens', label: 'Aigens' }]}
                  providerFields={[{ key: 'AlipayQfPayMerchantId', label: 'QFPay Merchant ID' }, { key: 'AlipayQfPayAppCode', label: 'QFPay App Code' }]}
                />
                <PaymentMethodCard title="Alipay CN" prefix="AlipayCn" settings={settings} onChange={update}
                  channelOptions={[{ value: 'qfpay', label: 'QFPay' }, { value: 'aigens', label: 'Aigens' }]}
                  providerFields={[{ key: 'AlipayCnQfPayMerchantId', label: 'QFPay Merchant ID' }]}
                />
                <PaymentMethodCard title="WeChat Pay" prefix="WeChatPay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'qfpay', label: 'QFPay' }, { value: 'osspay', label: 'OssPay' }, { value: 'aigens', label: 'Aigens' }]}
                  providerFields={[{ key: 'WeChatPayQfPayMerchantId', label: 'QFPay Merchant ID' }]}
                />
                <PaymentMethodCard title="PayMe" prefix="PayMe" settings={settings} onChange={update}
                  channelOptions={[{ value: 'qfpay', label: 'QFPay' }, { value: 'osspay', label: 'OssPay' }]}
                  providerFields={[{ key: 'PayMeQfPayMerchantId', label: 'QFPay Merchant ID' }]}
                />
                <PaymentMethodCard title="UnionPay" prefix="UnionPay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'qfpay', label: 'QFPay' }, { value: 'osspay', label: 'OssPay' }]}
                  providerFields={[{ key: 'UnionPayQfPayMerchantId', label: 'QFPay Merchant ID' }]}
                />
                <PaymentMethodCard title="BOC Pay" prefix="BocPay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'osspay', label: 'OssPay' }]}
                  providerFields={[{ key: 'BocPayOssPayApiUrl', label: 'OssPay API URL' }, { key: 'BocPayOssPayClientId', label: 'Client ID' }]}
                />
                <PaymentMethodCard title="OpenRice Pay" prefix="OpenRicePay" settings={settings} onChange={update}
                  channelOptions={[{ value: 'osspay', label: 'OssPay' }]}
                  providerFields={[{ key: 'OpenRicePayOssPayApiUrl', label: 'OssPay API URL' }]}
                />
                <PaymentMethodCard title="AMEX" prefix="Amex" settings={settings} onChange={update}
                  channelOptions={[{ value: 'osspay', label: 'OssPay' }]}
                  providerFields={[{ key: 'AmexOssPayApiUrl', label: 'OssPay API URL' }]}
                />
                <PaymentMethodCard title="Payment Asia Online" prefix="PaymentAsiaOnline" settings={settings} onChange={update}
                  providerFields={[
                    { key: 'PaymentAsiaOnlineMerchantToken', label: 'Merchant Token' }, { key: 'PaymentAsiaOnlineSecretCode', label: 'Secret Code' },
                    { key: 'PaymentAsiaOnlineCreditCardEnabled', label: 'Credit Card', type: 'switch' },
                    { key: 'PaymentAsiaOnlineEWalletEnabled', label: 'E-Wallet', type: 'switch' },
                  ]}
                />
                <PaymentMethodCard title="Adyen Online" prefix="AdyenOnline" settings={settings} onChange={update} providerFields={[]} />
                <PaymentMethodCard title="PxPay Plus" prefix="PxPayPlus" settings={settings} onChange={update}
                  providerFields={[
                    { key: 'PxPayPlusApiUrl', label: 'API URL' }, { key: 'PxPayPlusStoreId', label: 'Store ID' },
                    { key: 'PxPayPlusMerCode', label: 'Merchant Code' }, { key: 'PxPayPlusSecretKey', label: 'Secret Key' },
                  ]}
                />
              </SimpleGrid>
              <Switch label="Kin Delivery Enabled" checked={b(settings, 'KinDeliveryEnabled')} onChange={(e) => update('KinDeliveryEnabled', e.currentTarget.checked)} />
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 4: Member Settings ══════════ */}
          <Tabs.Panel value="member" pt="md">
            <Stack gap="md">
              <SimpleGrid cols={2}>
                <Switch label="Show Member Login" checked={b(settings, 'ShowMemberLogin')} onChange={(e) => update('ShowMemberLogin', e.currentTarget.checked)} />
                <Switch label="Enable ODO Member" checked={b(settings, 'OdoMemberEnabled')} onChange={(e) => update('OdoMemberEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Force Member Login" checked={b(settings, 'ForceLoginMember')} onChange={(e) => update('ForceLoginMember', e.currentTarget.checked)} />
                <Switch label="Navigate Member Page First" checked={b(settings, 'NavigateMemberPageFirst')} onChange={(e) => update('NavigateMemberPageFirst', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Allow Member Registration" checked={b(settings, 'MemberRegistrationEnabled')} onChange={(e) => update('MemberRegistrationEnabled', e.currentTarget.checked)} />
                <Switch label="Enable Ocard Member" checked={b(settings, 'IsOcardMemberEnabled')} onChange={(e) => update('IsOcardMemberEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
              <TextInput label="ODO Member Shop Token" value={s(settings, 'OdoMemberShopToken')} onChange={(e) => update('OdoMemberShopToken', e.currentTarget.value)} />
              <SimpleGrid cols={2}>
                <TextInput label="Member Public Key" value={s(settings, 'OdoMemberPublicKey')} onChange={(e) => update('OdoMemberPublicKey', e.currentTarget.value)} />
                <TextInput label="Member Private Key" value={s(settings, 'OdoMemberPrivateKey')} onChange={(e) => update('OdoMemberPrivateKey', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Enable Advanced Settings" checked={b(settings, 'EnableOdoAdvancedSettings')} onChange={(e) => update('EnableOdoAdvancedSettings', e.currentTarget.checked)} />
                <Switch label="Advanced Passcode Enabled" checked={b(settings, 'OdoAdvancedPasscodeEnabled')} onChange={(e) => update('OdoAdvancedPasscodeEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
              <TextInput label="Advanced Passcode" value={s(settings, 'OdoAdvancedPasscode')} onChange={(e) => update('OdoAdvancedPasscode', e.currentTarget.value)} />
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 5: SMS Settings ══════════ */}
          <Tabs.Panel value="sms" pt="md">
            <Stack gap="md">
              <SectionTitle>Twilio SMS</SectionTitle>
              <TextInput label="Account SID" value={s(settings, 'TwilioSmsAccountSid')} onChange={(e) => update('TwilioSmsAccountSid', e.currentTarget.value)} />
              <TextInput label="Auth Token" value={s(settings, 'TwilioSmsAuthToken')} onChange={(e) => update('TwilioSmsAuthToken', e.currentTarget.value)} />
              <TextInput label="Phone Number" value={s(settings, 'TwilioSmsPhoneNumber')} onChange={(e) => update('TwilioSmsPhoneNumber', e.currentTarget.value)} />
              <Divider />
              <SectionTitle>LINE</SectionTitle>
              <SimpleGrid cols={2}>
                <Switch label="Enable LINE Member" checked={b(settings, 'LineMemberActive')} onChange={(e) => update('LineMemberActive', e.currentTarget.checked)} />
                <Switch label="Only for Takeaway" checked={b(settings, 'LineMemberActiveOnlyTakeaway')} onChange={(e) => update('LineMemberActiveOnlyTakeaway', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="LINE Client ID" value={s(settings, 'LineClientID')} onChange={(e) => update('LineClientID', e.currentTarget.value)} />
                <TextInput label="LINE Client Secret" value={s(settings, 'LineClientSecret')} onChange={(e) => update('LineClientSecret', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="LINE Notify Client ID" value={s(settings, 'LineNotifyClientID')} onChange={(e) => update('LineNotifyClientID', e.currentTarget.value)} />
                <TextInput label="LINE Notify Client Secret" value={s(settings, 'LineNotifyClientSecret')} onChange={(e) => update('LineNotifyClientSecret', e.currentTarget.value)} />
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 6: Table Service (Setup) ══════════ */}
          <Tabs.Panel value="table-setup" pt="md">
            <Stack gap="md">
              <SectionTitle>Dynamic Table Service</SectionTitle>
              <SimpleGrid cols={2}>
                <Switch label="Show QR Code" checked={b(settings, 'TableServiceDynamicShowQRCode')} onChange={(e) => update('TableServiceDynamicShowQRCode', e.currentTarget.checked)} />
                <Switch label="Enable Remark" checked={b(settings, 'TableServiceDynamicRemarkEnabled')} onChange={(e) => update('TableServiceDynamicRemarkEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Service Charge ID" value={n(settings, 'TableServiceDynamicServiceChargeId') || undefined} onChange={(v) => update('TableServiceDynamicServiceChargeId', v)} />
                <NumberInput label="Discount ID" value={n(settings, 'TableServiceDiscountId') || undefined} onChange={(v) => update('TableServiceDiscountId', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Table Limit Reminder" checked={b(settings, 'TableServiceDynamicTableLimitedRemindEnabled')} onChange={(e) => update('TableServiceDynamicTableLimitedRemindEnabled', e.currentTarget.checked)} />
                <NumberInput label="Limit Reminder (min)" value={n(settings, 'TableServiceDynamicTableLimitedRemindMinutes')} onChange={(v) => update('TableServiceDynamicTableLimitedRemindMinutes', v)} />
              </SimpleGrid>

              <Divider />
              <SectionTitle>Static Table Service</SectionTitle>
              <SimpleGrid cols={2}>
                <Switch label="Show QR Code" checked={b(settings, 'TableServiceStaticShowQRCode')} onChange={(e) => update('TableServiceStaticShowQRCode', e.currentTarget.checked)} />
                <Switch label="Enable Remark" checked={b(settings, 'TableServiceStaticRemarkEnabled')} onChange={(e) => update('TableServiceStaticRemarkEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Service Charge ID" value={n(settings, 'TableServiceStaticServiceChargeId') || undefined} onChange={(v) => update('TableServiceStaticServiceChargeId', v)} />
                <NumberInput label="Discount ID" value={n(settings, 'TableServiceStaticDiscountId') || undefined} onChange={(v) => update('TableServiceStaticDiscountId', v)} />
              </SimpleGrid>
              <Switch label="Customer Input Enabled" checked={b(settings, 'TableServiceStaticCusInputEnabled')} onChange={(e) => update('TableServiceStaticCusInputEnabled', e.currentTarget.checked)} />

              <Divider />
              <SectionTitle>Table Service Payment Modes</SectionTitle>
              <Switch label="Prepaid Enabled" checked={b(settings, 'TableServicePrepaidEnabled')} onChange={(e) => update('TableServicePrepaidEnabled', e.currentTarget.checked)} />
              {b(settings, 'TableServicePrepaidEnabled') && (
                <SimpleGrid cols={2}>
                  <Switch label="SMS" checked={b(settings, 'TableServicePrepaidSmsEnabled')} onChange={(e) => update('TableServicePrepaidSmsEnabled', e.currentTarget.checked)} />
                  <Switch label="Show QR" checked={b(settings, 'TableServicePrepaidShowQRCode')} onChange={(e) => update('TableServicePrepaidShowQRCode', e.currentTarget.checked)} />
                  <Switch label="LINE" checked={b(settings, 'TableServicePrepaidLineEnabled')} onChange={(e) => update('TableServicePrepaidLineEnabled', e.currentTarget.checked)} />
                </SimpleGrid>
              )}
              <Switch label="Pay Later Enabled" checked={b(settings, 'TableServicePayLaterEnabled')} onChange={(e) => update('TableServicePayLaterEnabled', e.currentTarget.checked)} />
              {b(settings, 'TableServicePayLaterEnabled') && (
                <SimpleGrid cols={2}>
                  <Switch label="SMS" checked={b(settings, 'TableServicePayLaterSmsEnabled')} onChange={(e) => update('TableServicePayLaterSmsEnabled', e.currentTarget.checked)} />
                  <Switch label="Show QR" checked={b(settings, 'TableServicePayLaterShowQRCode')} onChange={(e) => update('TableServicePayLaterShowQRCode', e.currentTarget.checked)} />
                  <Switch label="LINE" checked={b(settings, 'TableServicePayLaterLineEnabled')} onChange={(e) => update('TableServicePayLaterLineEnabled', e.currentTarget.checked)} />
                </SimpleGrid>
              )}
              <Switch label="Dine-in Self Ordering Printing Confirm" checked={b(settings, 'ODODineinSelfOrderingPrintingConfirm')} onChange={(e) => update('ODODineinSelfOrderingPrintingConfirm', e.currentTarget.checked)} />
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 7: Table Service (Management) ══════════ */}
          <Tabs.Panel value="table-mgmt" pt="md">
            <Stack gap="md">
              <Text c="dimmed">Table token management operates through the POS system. This tab provides read-only visibility of table service configuration. Use the POS or legacy HQ for token regeneration.</Text>
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 8: Counter Service ══════════ */}
          <Tabs.Panel value="counter" pt="md">
            <Stack gap="md">
              <TextInput label="Channel Token" value={s(settings, 'CounterServiceChannelToken')} onChange={(e) => update('CounterServiceChannelToken', e.currentTarget.value)} />
              <SimpleGrid cols={2}>
                <Switch label="Allow Dine-in" checked={b(settings, 'CounterServiceAllowDinein')} onChange={(e) => update('CounterServiceAllowDinein', e.currentTarget.checked)} />
                <Switch label="Allow Takeaway" checked={b(settings, 'CounterServiceAllowTakeaway')} onChange={(e) => update('CounterServiceAllowTakeaway', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Service Charge ID" value={n(settings, 'CounterServiceServiceChargeId') || undefined} onChange={(v) => update('CounterServiceServiceChargeId', v)} />
                <NumberInput label="Discount ID" value={n(settings, 'CounterServiceDiscountId') || undefined} onChange={(v) => update('CounterServiceDiscountId', v)} />
              </SimpleGrid>
              <Switch label="Enable Remark" checked={b(settings, 'CounterServiceRemarkEnabled')} onChange={(e) => update('CounterServiceRemarkEnabled', e.currentTarget.checked)} />
              <Divider />
              <SectionTitle>Payment Modes</SectionTitle>
              <Switch label="Prepaid Enabled" checked={b(settings, 'CounterServicePrepaidEnabled')} onChange={(e) => update('CounterServicePrepaidEnabled', e.currentTarget.checked)} />
              <Switch label="Pay Later Enabled" checked={b(settings, 'CounterServicePayLaterEnabled')} onChange={(e) => update('CounterServicePayLaterEnabled', e.currentTarget.checked)} />
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 9: Pre-order ══════════ */}
          <Tabs.Panel value="preorder" pt="md">
            <Stack gap="md">
              <TextInput label="Channel Token" value={s(settings, 'PreorderChannelToken')} onChange={(e) => update('PreorderChannelToken', e.currentTarget.value)} />
              <SimpleGrid cols={2}>
                <Switch label="Allow Order Now" checked={b(settings, 'PreorderAllowOrderNow')} onChange={(e) => update('PreorderAllowOrderNow', e.currentTarget.checked)} />
                <Switch label="Allow Pre-order" checked={b(settings, 'PreorderAllowPreorder')} onChange={(e) => update('PreorderAllowPreorder', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <Switch label="Allow Pickup Order" checked={b(settings, 'PreorderAllowPickupOrder')} onChange={(e) => update('PreorderAllowPickupOrder', e.currentTarget.checked)} />
                <Switch label="Allow Delivery Order" checked={b(settings, 'PreorderAllowDeliveryOrder')} onChange={(e) => update('PreorderAllowDeliveryOrder', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Order For Later Min (min)" value={n(settings, 'PreorderOrderForLaterMinMinutes')} onChange={(v) => update('PreorderOrderForLaterMinMinutes', v)} />
                <NumberInput label="Order For Later Max (days)" value={n(settings, 'PreorderOrderForLaterMaxDays')} onChange={(v) => update('PreorderOrderForLaterMaxDays', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Pickup Service Charge ID" value={n(settings, 'PreorderPickupServiceChargeId') || undefined} onChange={(v) => update('PreorderPickupServiceChargeId', v)} />
                <NumberInput label="Pickup Discount ID" value={n(settings, 'PreorderPickupDiscountId') || undefined} onChange={(v) => update('PreorderPickupDiscountId', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Delivery Service Charge ID" value={n(settings, 'PreorderDeliveryServiceChargeId') || undefined} onChange={(v) => update('PreorderDeliveryServiceChargeId', v)} />
                <NumberInput label="Delivery Discount ID" value={n(settings, 'PreorderDeliveryDiscountId') || undefined} onChange={(v) => update('PreorderDeliveryDiscountId', v)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <NumberInput label="Pickup Min Charge" value={n(settings, 'PreorderPickupMinChargeAmount') || undefined} onChange={(v) => update('PreorderPickupMinChargeAmount', v)} />
                <NumberInput label="Delivery Min Charge" value={n(settings, 'PreorderDeliveryMinChargeAmount') || undefined} onChange={(v) => update('PreorderDeliveryMinChargeAmount', v)} />
              </SimpleGrid>
              <Switch label="Enable Remark" checked={b(settings, 'PreorderRemarkEnabled')} onChange={(e) => update('PreorderRemarkEnabled', e.currentTarget.checked)} />
              <Switch label="Force Select Pre-order Time" checked={b(settings, 'PreorderForceSelectPreorderTime')} onChange={(e) => update('PreorderForceSelectPreorderTime', e.currentTarget.checked)} />
              <Switch label="Bypass Default Discount" checked={b(settings, 'PreorderBypassDefaultDiscount')} onChange={(e) => update('PreorderBypassDefaultDiscount', e.currentTarget.checked)} />
              <Switch label="Hide Customer Info" checked={b(settings, 'PreorderHideCustomerInfo')} onChange={(e) => update('PreorderHideCustomerInfo', e.currentTarget.checked)} />
              <Switch label="Pickup Customer Info Optional" checked={b(settings, 'PreorderPickupOrderCustomerInfoOptional')} onChange={(e) => update('PreorderPickupOrderCustomerInfoOptional', e.currentTarget.checked)} />
              <Switch label="Address Finder Enabled" checked={b(settings, 'PreorderAddressFinderEnabled')} onChange={(e) => update('PreorderAddressFinderEnabled', e.currentTarget.checked)} />
              <TextInput label="Address Finder Key" value={s(settings, 'PreorderAddressFinderKey')} onChange={(e) => update('PreorderAddressFinderKey', e.currentTarget.value)} />
              <Textarea label="Delivery Addresses (JSON)" value={s(settings, 'PreorderDeliveryAddressesString')} onChange={(e) => update('PreorderDeliveryAddressesString', e.currentTarget.value)} rows={3} />
              <Textarea label="Pre-order Times (JSON)" value={s(settings, 'PreorderTimesString')} onChange={(e) => update('PreorderTimesString', e.currentTarget.value)} rows={3} />

              <Divider />
              <SectionTitle>Payment Modes</SectionTitle>
              <SimpleGrid cols={2}>
                <Switch label="Prepaid" checked={b(settings, 'PreorderPrepaidEnabled')} onChange={(e) => update('PreorderPrepaidEnabled', e.currentTarget.checked)} />
                <Switch label="Pay Later" checked={b(settings, 'PreorderPayLaterEnabled')} onChange={(e) => update('PreorderPayLaterEnabled', e.currentTarget.checked)} />
                <Switch label="No Pay" checked={b(settings, 'PreorderNoPayEnabled')} onChange={(e) => update('PreorderNoPayEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 10: 3rd Party Platforms ══════════ */}
          <Tabs.Panel value="3rd-party" pt="md">
            <Stack gap="md">
              <SectionTitle>OpenRice</SectionTitle>
              <SimpleGrid cols={2}>
                <Switch label="Dine-in Enabled" checked={b(settings, 'OpenriceDineinEnabled')} onChange={(e) => update('OpenriceDineinEnabled', e.currentTarget.checked)} />
                <Switch label="Pickup Enabled" checked={b(settings, 'OpenricePickupEnabled')} onChange={(e) => update('OpenricePickupEnabled', e.currentTarget.checked)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="Dine-in Channel Token" value={s(settings, 'OpenriceDineinChannelToken')} onChange={(e) => update('OpenriceDineinChannelToken', e.currentTarget.value)} />
                <TextInput label="Pickup Channel Token" value={s(settings, 'OpenricePickupChannelToken')} onChange={(e) => update('OpenricePickupChannelToken', e.currentTarget.value)} />
              </SimpleGrid>
              <TextInput label="Dine-in URL" value={s(settings, 'OpenriceDineinUrl')} onChange={(e) => update('OpenriceDineinUrl', e.currentTarget.value)} />
              <TextInput label="Payment URL" value={s(settings, 'OpenriceDineinPaymentUrl')} onChange={(e) => update('OpenriceDineinPaymentUrl', e.currentTarget.value)} />
              <TextInput label="AES256 Key" value={s(settings, 'OpenriceDineinAes256Key')} onChange={(e) => update('OpenriceDineinAes256Key', e.currentTarget.value)} />
              <TextInput label="Discount ID" value={s(settings, 'OpenriceDiscountId')} onChange={(e) => update('OpenriceDiscountId', e.currentTarget.value)} />
              <TextInput label="Payment Method ID" value={s(settings, 'OpenricePaymentMethodId')} onChange={(e) => update('OpenricePaymentMethodId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Deliveroo</SectionTitle>
              <TextInput label="Payment Method ID" value={s(settings, 'DeliverooPaymentMethodId')} onChange={(e) => update('DeliverooPaymentMethodId', e.currentTarget.value)} />
              <NumberInput label="Discount ID" value={n(settings, 'DeliverooDiscountId') || undefined} onChange={(v) => update('DeliverooDiscountId', v)} />
              <Switch label="Discount Included in Total" checked={b(settings, 'DeliverooDiscountIncludedToTotalAmount')} onChange={(e) => update('DeliverooDiscountIncludedToTotalAmount', e.currentTarget.checked)} />

              <Divider />
              <SectionTitle>Foodpanda</SectionTitle>
              <TextInput label="Payment Method ID" value={s(settings, 'FoodpandaPaymentMethodId')} onChange={(e) => update('FoodpandaPaymentMethodId', e.currentTarget.value)} />
              <NumberInput label="Discount ID" value={n(settings, 'FoodpandaDiscountId') || undefined} onChange={(v) => update('FoodpandaDiscountId', v)} />
              <Switch label="Discount Included in Total" checked={b(settings, 'FoodpandaDiscountIncludedToTotalAmount')} onChange={(e) => update('FoodpandaDiscountIncludedToTotalAmount', e.currentTarget.checked)} />
              <TextInput label="Container Charge Item ID" value={s(settings, 'FoodpandaContainerChargeItemId')} onChange={(e) => update('FoodpandaContainerChargeItemId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Uber Eats</SectionTitle>
              <TextInput label="Payment Method ID" value={s(settings, 'UberEatsPaymentMethodId')} onChange={(e) => update('UberEatsPaymentMethodId', e.currentTarget.value)} />
              <NumberInput label="Discount ID" value={n(settings, 'UberEatsDiscountId') || undefined} onChange={(v) => update('UberEatsDiscountId', v)} />
              <Switch label="Discount Included in Total" checked={b(settings, 'UberEatsDiscountIncludedToTotalAmount')} onChange={(e) => update('UberEatsDiscountIncludedToTotalAmount', e.currentTarget.checked)} />
              <TextInput label="Service Charge ID" value={s(settings, 'UberEatsServiceChargeId')} onChange={(e) => update('UberEatsServiceChargeId', e.currentTarget.value)} />
              <TextInput label="Container Charge Item ID" value={s(settings, 'UberEatsContainerChargeItemId')} onChange={(e) => update('UberEatsContainerChargeItemId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Nidin</SectionTitle>
              <TextInput label="Payment Method ID" value={s(settings, 'NidinPaymentMethodId')} onChange={(e) => update('NidinPaymentMethodId', e.currentTarget.value)} />
              <NumberInput label="Discount ID" value={n(settings, 'NidinDiscountId') || undefined} onChange={(v) => update('NidinDiscountId', v)} />
              <TextInput label="Delivery Fee Item ID" value={s(settings, 'NidinDeliveryFeeItemId')} onChange={(e) => update('NidinDeliveryFeeItemId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>MeiTuan</SectionTitle>
              <TextInput label="Payment Method ID" value={s(settings, 'MeiTuanPaymentMethodId')} onChange={(e) => update('MeiTuanPaymentMethodId', e.currentTarget.value)} />
              <NumberInput label="Discount ID" value={n(settings, 'MeiTuanDiscountId') || undefined} onChange={(v) => update('MeiTuanDiscountId', v)} />
              <TextInput label="Service Charge ID" value={s(settings, 'MeiTuanServiceChargeId')} onChange={(e) => update('MeiTuanServiceChargeId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Other</SectionTitle>
              <Switch label="EaToJoy Pickup" checked={b(settings, 'EaToJoyPickupEnabled')} onChange={(e) => update('EaToJoyPickupEnabled', e.currentTarget.checked)} />
              <Switch label="HKIA Dine-in" checked={b(settings, 'HkiaDineinEnabled')} onChange={(e) => update('HkiaDineinEnabled', e.currentTarget.checked)} />
              <Switch label="TW Tax ID Number" checked={b(settings, 'TwTaxIDNumberEnabled')} onChange={(e) => update('TwTaxIDNumberEnabled', e.currentTarget.checked)} />
              <Switch label="TW Carrier" checked={b(settings, 'TwCarrierEnabled')} onChange={(e) => update('TwCarrierEnabled', e.currentTarget.checked)} />
            </Stack>
          </Tabs.Panel>

          {/* ══════════ TAB 11: 3rd Party Webhooks ══════════ */}
          <Tabs.Panel value="webhooks" pt="md">
            <Stack gap="md">
              <SectionTitle>Order Status Webhooks</SectionTitle>
              {webhookList.map((wh, i) => (
                <Group key={i}>
                  <TextInput style={{ flex: 1 }} size="xs" value={wh.url} onChange={(e) => { const arr = [...webhookList]; arr[i] = { ...wh, url: e.currentTarget.value }; update('WebhookList', arr); }} />
                  <Switch size="xs" checked={wh.enabled} onChange={(e) => { const arr = [...webhookList]; arr[i] = { ...wh, enabled: e.currentTarget.checked }; update('WebhookList', arr); }} />
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => update('WebhookList', webhookList.filter((_, idx) => idx !== i))}><IconTrash size={14} /></ActionIcon>
                </Group>
              ))}
              <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={() => update('WebhookList', [...webhookList, { url: '', enabled: true }])}>Add Webhook</Button>

              <Divider />
              <SectionTitle>Deliveroo</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'DeliverooWebhookEnabled')} onChange={(e) => update('DeliverooWebhookEnabled', e.currentTarget.checked)} />
              <Switch label="Menu Sync Enabled" checked={b(settings, 'DeliverooMenuSyncEnabled')} onChange={(e) => update('DeliverooMenuSyncEnabled', e.currentTarget.checked)} />
              <SimpleGrid cols={2}>
                <TextInput label="API URL" value={s(settings, 'DeliverooApiUrl')} onChange={(e) => update('DeliverooApiUrl', e.currentTarget.value)} />
                <TextInput label="API Key" value={s(settings, 'DeliverooApiKey')} onChange={(e) => update('DeliverooApiKey', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="Brand ID" value={s(settings, 'DeliverooBrandId')} onChange={(e) => update('DeliverooBrandId', e.currentTarget.value)} />
                <TextInput label="Site ID" value={s(settings, 'DeliverooSiteId')} onChange={(e) => update('DeliverooSiteId', e.currentTarget.value)} />
              </SimpleGrid>

              <Divider />
              <SectionTitle>Foodpanda</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'FoodpandaWebhookEnabled')} onChange={(e) => update('FoodpandaWebhookEnabled', e.currentTarget.checked)} />
              <Switch label="Menu Sync Enabled" checked={b(settings, 'FoodpandaMenuSyncEnabled')} onChange={(e) => update('FoodpandaMenuSyncEnabled', e.currentTarget.checked)} />
              <SimpleGrid cols={2}>
                <TextInput label="API URL" value={s(settings, 'FoodpandaApiUrl')} onChange={(e) => update('FoodpandaApiUrl', e.currentTarget.value)} />
                <TextInput label="Chain Code" value={s(settings, 'FoodpandaChainCode')} onChange={(e) => update('FoodpandaChainCode', e.currentTarget.value)} />
              </SimpleGrid>
              <SimpleGrid cols={2}>
                <TextInput label="Remote ID" value={s(settings, 'FoodpandaRemoteId')} onChange={(e) => update('FoodpandaRemoteId', e.currentTarget.value)} />
                <TextInput label="Vendor ID" value={s(settings, 'FoodpandaVendorId')} onChange={(e) => update('FoodpandaVendorId', e.currentTarget.value)} />
              </SimpleGrid>

              <Divider />
              <SectionTitle>Uber Eats</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'UberEatsWebhookEnabled')} onChange={(e) => update('UberEatsWebhookEnabled', e.currentTarget.checked)} />
              <Switch label="Menu Sync Enabled" checked={b(settings, 'UberEatsMenuSyncEnabled')} onChange={(e) => update('UberEatsMenuSyncEnabled', e.currentTarget.checked)} />
              <TextInput label="Store ID" value={s(settings, 'UberEatsStoreId')} onChange={(e) => update('UberEatsStoreId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Deliverect</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'DeliverectWebhookEnabled')} onChange={(e) => update('DeliverectWebhookEnabled', e.currentTarget.checked)} />
              <Switch label="Menu Sync Enabled" checked={b(settings, 'DeliverectMenuSyncEnabled')} onChange={(e) => update('DeliverectMenuSyncEnabled', e.currentTarget.checked)} />
              <SimpleGrid cols={2}>
                <TextInput label="API URL" value={s(settings, 'DeliverectApiUrl')} onChange={(e) => update('DeliverectApiUrl', e.currentTarget.value)} />
                <TextInput label="Account ID" value={s(settings, 'DeliverectAccountId')} onChange={(e) => update('DeliverectAccountId', e.currentTarget.value)} />
              </SimpleGrid>
              <TextInput label="Location ID" value={s(settings, 'DeliverectLocationId')} onChange={(e) => update('DeliverectLocationId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Nidin</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'NidinWebhookEnabled')} onChange={(e) => update('NidinWebhookEnabled', e.currentTarget.checked)} />
              <Switch label="Menu Sync Enabled" checked={b(settings, 'NidinMenuSyncEnabled')} onChange={(e) => update('NidinMenuSyncEnabled', e.currentTarget.checked)} />
              <TextInput label="API URL" value={s(settings, 'NidinApiUrl')} onChange={(e) => update('NidinApiUrl', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>MeiTuan</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'MeiTuanWebhookEnabled')} onChange={(e) => update('MeiTuanWebhookEnabled', e.currentTarget.checked)} />
              <Switch label="Menu Sync Enabled" checked={b(settings, 'MeiTuanMenuSyncEnabled')} onChange={(e) => update('MeiTuanMenuSyncEnabled', e.currentTarget.checked)} />
              <TextInput label="Shop ID" value={s(settings, 'MeiTuanShopId')} onChange={(e) => update('MeiTuanShopId', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>OpenRice</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'OpenriceWebhookEnabled')} onChange={(e) => update('OpenriceWebhookEnabled', e.currentTarget.checked)} />
              <TextInput label="API URL" value={s(settings, 'OpenriceApiUrl')} onChange={(e) => update('OpenriceApiUrl', e.currentTarget.value)} />

              <Divider />
              <SectionTitle>Eilis</SectionTitle>
              <Switch label="Webhook Enabled" checked={b(settings, 'EilisWebhookEnabled')} onChange={(e) => update('EilisWebhookEnabled', e.currentTarget.checked)} />
              <TextInput label="API URL" value={s(settings, 'EilisApiUrl')} onChange={(e) => update('EilisApiUrl', e.currentTarget.value)} />
              <TextInput label="Account ID" value={s(settings, 'EilisAccountId')} onChange={(e) => update('EilisAccountId', e.currentTarget.value)} />
            </Stack>
          </Tabs.Panel>
        </Tabs>
      )}
    </Stack>
  );
}
