import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { useBrands } from '../../../contexts/BrandContext';
import paymentMethodService from '../../../services/paymentMethodService';
import storeSettingsService from '../../../services/storeSettingsService';
import type {
  PaymentMethodDetail,
  PaymentMethodShopRule,
  PaymentMethodSummary,
  UpsertPaymentMethodPayload,
} from '../../../types/paymentMethod';

const LINKED_GATEWAY_OPTIONS: { value: string; label: string }[] = [
  { value: 'ocl', label: 'Octopus' },
  { value: 'eftpos', label: 'EFTPOS' },
  { value: 'tng', label: 'TNG' },
  { value: 'iclub', label: 'iClub' },
  { value: 'smartpay', label: 'SmartPay' },
  { value: 'infor', label: 'Infor' },
  { value: 'bbpos', label: 'BBPOS' },
  { value: 'alipay', label: 'Openrice (Alipay)' },
  { value: 'qfpay', label: 'QFPay (Alipay, WeChat Pay)' },
  { value: 'qfpayaliqr', label: 'QFPay (Alipay - Customer scan QR Code)' },
  { value: 'qfpaywechatqr', label: 'QFPay (Wechat Pay - Customer scan QR Code)' },
  { value: 'qfpayunionpayqr', label: 'QFPay (Union Pay - Customer scan QR Code)' },
  { value: 'qfpaypaymeqrmpm', label: 'QFPay (PayMe - Customer scan QR Code)' },
  { value: 'qfpaypaymeqrcpm', label: 'QFPay (PayMe)' },
  { value: 'hsbcfps', label: 'HSBC FPS' },
  { value: 'ctigprepaid', label: 'Chinetek Intel Card' },
  { value: 'boccilfpscusqr', label: 'BOC FPS (CIL) (Customer scan QR Code)' },
  { value: 'boccilemv', label: 'BOC EMV (CIL)' },
  { value: 'boccilemvcusqr', label: 'BOC E-Credit Card (CIL) (Customer scan QR Code)' },
  { value: 'boccilwxp', label: 'BOC Wechat Pay (CIL)' },
  { value: 'boccilwxpcusqr', label: 'BOC Wechat Pay (CIL) (Customer scan QR Code)' },
  { value: 'boccilalp', label: 'BOC Alipay (CIL)' },
  { value: 'boccilalpcusqr', label: 'BOC Alipay (CIL) (Customer scan QR Code)' },
  { value: 'boccilgrb', label: 'BOC GRB (CIL)' },
  { value: 'boccilgrbcusqr', label: 'BOC GrabPay (CIL) (Customer scan QR Code)' },
  { value: 'bocn5ecrcc', label: 'BOC Credit Card (N5)' },
  { value: 'bocn5ecrqrc', label: 'BOC QR Code (N5)' },
  { value: 'bocn5ecrcpn', label: 'BOC Coupon (N5)' },
  { value: 'bocn5ecrae', label: 'BOC AMEX (N5)' },
  { value: 'bocn5ecrops', label: 'BOC Octopus (N5)' },
  { value: 'bocn5ecrall', label: 'BOC ALL (N5)' },
  { value: 'bocswiftpass', label: 'BOC SwiftPass' },
  { value: 'bocswiftpassfpscusqr', label: 'BOC FPS (SwiftPass) (Customer scan QR Code)' },
  { value: 'bocswiftpassupicusqr', label: 'BOC UPI (SwiftPass) (Customer scan QR Code)' },
  { value: 'gpappaxecr', label: 'GlobalPayments ECR (PAX)' },
  { value: 'fiservpaxecr', label: 'Fiserv ECR (PAX)' },
  { value: 'tradelinka8ecrcc', label: 'Tradelink CreditCard (A8)' },
  { value: 'tradelinka8ecrup', label: 'Tradelink UnionPay (A8)' },
  { value: 'tradelinka8ecraliwp', label: 'Tradelink Alipay / Wechat Pay (A8)' },
  { value: 'odoonlinepay', label: 'ODO Online Pay' },
  { value: 'livenpay', label: 'Liven Pay' },
  { value: 'hsbcpayme', label: 'HSBC PayMe' },
  { value: 'easycard', label: 'Easy Card' },
  { value: 'spectracreonbeaedc', label: 'SpectraCreon BEA EDC' },
  { value: 'spectracreonbeaeps', label: 'SpectraCreon BEA EPS' },
  { value: 'spectracreonbeaepscup', label: 'SpectraCreon BEA EPS CUP' },
  { value: 'spectracreonbeacup', label: 'SpectraCreon BEA CUP' },
  { value: 'spectracreonhaseedc', label: 'SpectraCreon HASE EDC' },
  { value: 'spectracreonhaseeps', label: 'SpectraCreon HASE EPS' },
  { value: 'spectracreonhaseepscup', label: 'SpectraCreon HASE EPS CUP' },
  { value: 'spectracreonhasecup', label: 'SpectraCreon HASE CUP' },
  { value: 'spectracreonhasecd', label: 'SpectraCreon HASE Cash dollar' },
  { value: 'ctigamountstaff', label: 'CTIG Staff Amount' },
  { value: 'tscbv3cedc', label: 'TSCB EDC (V3C)' },
  { value: 'tscbv3ceasycard', label: 'TSCB Easycard (V3C)' },
  { value: 'tscbs300edc', label: 'TSCB Credit Card (S300)' },
  { value: 'tscbs300easycard', label: 'TSCB EasyCard (S300)' },
  { value: 'tscbs300ipass', label: 'TSCB iPass (S300)' },
  { value: 'tscbi', label: 'TSCB Taiwan' },
  { value: 'tscboalipay', label: 'TSCB Alipay' },
  { value: 'tscbowechat', label: 'TSCB Wechat Pay' },
  { value: 'openricepickuporder', label: 'OpenRice Pickup' },
  { value: 'openricedineinorder', label: 'OpenRice Dine-in' },
  { value: 'eftpayecredc', label: 'EFTPay Credit Card (A8)' },
  { value: 'eftpayecrewallet', label: 'EFTPay E-Wallet (A8)' },
  { value: 'eftpayecroctopus', label: 'EFTPay Octopus (A8)' },
  { value: 'eftpayecrshowqr', label: 'EFTPay QR Code (A8)' },
  { value: 'eftpayecreps', label: 'EFTPay EPS (A8)' },
  { value: 'eftpayecrgeneral', label: 'EFTPay All (A8)' },
  { value: 'eftpayingenicoboc', label: 'EFTPay Credit Card (Ingenico) - BOC' },
  { value: 'eftpayingenico', label: 'EFTPay Credit Card (Ingenico)' },
  { value: 'eftpayqralipay', label: 'EFTPay Alipay' },
  { value: 'eftpayqrwechat', label: 'EFTPay Wechat Pay' },
  { value: 'eftospalipay', label: 'EFT On-spot (New) Alipay' },
  { value: 'eftospwechat', label: 'EFT On-spot (New) WeChat' },
  { value: 'eftospunionpayqr', label: 'EFT On-spot (New) UnionPay QR code' },
  { value: 'eftosppayme', label: 'EFT On-spot (New) PayMe' },
  { value: 'bbposwisepaycredit', label: 'BBPOS Wise Pay (Credit Card)' },
  { value: 'bbposwisepaykeyed', label: 'BBPOS Wise Pay (Optional)' },
  { value: 'bbposwisepaywechat', label: 'BBPOS Wise Pay (Wechat)' },
  { value: 'bbposwisepaywechats', label: 'BBPOS Wise Pay (Wechat - Scan QR Code)' },
  { value: 'bbposwisepayalipay', label: 'BBPOS Wise Pay (Alipay)' },
  { value: 'bbposwisepayqrpay', label: 'BBPOS Wise Pay (QRPay)' },
  { value: 'bbposwisepayoctopus', label: 'BBPOS Wise Pay (Octopus)' },
  { value: 'infor-gst', label: 'Infor-GST' },
  { value: 'infor-gp', label: 'Infor-GP' },
  { value: 'infor-ar', label: 'Infor-AR' },
  { value: 'givex-lc', label: 'GiveX-LC' },
  { value: 'givex-lp', label: 'GiveX-LP' },
  { value: 'givex-gf', label: 'GiveX-GF' },
  { value: 'hkta920creditcard', label: 'HKTA920 Credit Card' },
  { value: 'hkta920creditcardvisa', label: 'HKTA920 Credit Card (Visa)' },
  { value: 'hkta920creditcardmastercard', label: 'HKTA920 Credit Card (Mastercard)' },
  { value: 'hkta920creditcardamex', label: 'HKTA920 Credit Card (AMEX)' },
  { value: 'hkta920creditcardjcb', label: 'HKTA920 Credit Card (JCB)' },
  { value: 'hkta920creditcardcup', label: 'HKTA920 Credit Card (CUP)' },
  { value: 'hkta920fps', label: 'HKTA920 FPS' },
  { value: 'hkta920tapgo', label: 'HKTA920 Tap & Go' },
  { value: 'hkta920scanto', label: 'HKTA920 Scan To' },
  { value: 'hkta920scantoalipay', label: 'HKTA920 Scan To (Alipay)' },
  { value: 'hkta920scantowechatpay', label: 'HKTA920 Scan To (WeChatPay)' },
  { value: 'hkta920scantoupi', label: 'HKTA920 Scan To (UPI)' },
  { value: 'hkta920octopus', label: 'HKTA920 Octopus' },
  { value: 'ctcbas350edc', label: 'CTCB AS350 EDC' },
  { value: 'ctcbas350eticket', label: 'CTCB AS350 E-Ticket' },
  { value: 'ctcbas350union', label: 'CTCB AS350 UnionPay' },
  { value: 'ctcbas350kioskedc', label: 'CTCB AS350 Kiosk EDC' },
  { value: 'ctcbas350kiosketicket', label: 'CTCB AS350 Kiosk E-Ticket' },
  { value: 'ctcbas350kioskunion', label: 'CTCB AS350 Kiosk UnionPay' },
  { value: 'tyro', label: 'Tyro' },
  { value: 'genericvoucher', label: 'Generic Voucher' },
  { value: 'ocardsv', label: 'Ocard stored value payment' },
  { value: 'ocardpd', label: 'Ocard Point Discount' },
  { value: 'ocardsv_prepaid', label: 'Ocard stored value' },
  { value: 'prizmpcclc', label: 'Prizm PCC Loyalty Card Cash' },
  { value: 'prizmpcclp', label: 'Prizm PCC Loyalty Card Points' },
  { value: 'prizmpccgf', label: 'Prizm PCC Gift Card' },
  { value: 'paymentasiabarcode', label: 'PaymentAsia Barcode' },
  { value: 'paymentasiaqralipay', label: 'PaymentAsia Alipay (QR Code)' },
  { value: 'paymentasiaqrwechat', label: 'PaymentAsia WeChat (QR Code)' },
  { value: 'paymentasiaqrcup', label: 'PaymentAsia CUP (QR Code)' },
  { value: 'aigens', label: 'Aigens' },
  { value: 'aigensalipay', label: 'Aigens Alipay' },
  { value: 'aigenswechatpay', label: 'Aigens WeChat Pay' },
  { value: 'aigensadyenalipay', label: 'Aigens Alipay (Adyen)' },
  { value: 'aigensadyenalipayhk', label: 'Aigens Alipay HK (Adyen)' },
  { value: 'aigensadyenwechatpay', label: 'Aigens WeChat Pay (Adyen)' },
  { value: 'aigensadyenpaynow', label: 'Aigens Pay Now (Adyen)' },
  { value: 'linepay', label: 'LINE Pay' },
  { value: 'jkopay', label: 'JKOPay' },
  { value: 'pxpayplus', label: 'PX Pay' },
  { value: 'mobilecardsprepaid', label: 'Mobile.Cards Stored Value' },
  { value: 'hhgroupwallet', label: 'Generic CRM Connector Wallet' },
  { value: 'hhgrouptreatameal', label: 'Generic CRM Connector Treatameal' },
  { value: 'ebergiftcard', label: 'Eber Gift Card' },
  { value: 'razer', label: 'Razer' },
  { value: 'razeralipay', label: 'Razer Alipay' },
  { value: 'razertngd', label: 'Razer Touch \'n Go Digital' },
  { value: 'razeralipaypreauth', label: 'Razer Alipay Pre-Auth' },
  { value: 'razerboost', label: 'Razer Boost' },
  { value: 'razermae', label: 'Razer MAE by Maybank2u' },
  { value: 'razergrabpay', label: 'Razer GrabPay' },
  { value: 'razerunionpay', label: 'Razer UnionPay' },
  { value: 'razershopeepay', label: 'Razer ShopeePay' },
  { value: 'razerduitnowqr', label: 'Razer DuitNow QR' },
  { value: 'razeralipayplus', label: 'Razer Alipay+ (Cross-border)' },
  { value: 'razeratome', label: 'Razer Atome' },
  { value: 'razerwechatpaycb', label: 'Razer WeChat Pay (Cross-border)' },
  { value: 'razerwechatpaymalaysia', label: 'Razer WeChat Pay (Malaysia)' },
  { value: 'razeralipaycusqr', label: 'Razer Alipay (Customer scan QR Code)' },
  { value: 'razertngdcusqr', label: 'Razer Touch \'n Go Digital (Customer scan QR Code)' },
  { value: 'razeralipaypreauthcusqr', label: 'Razer Alipay Pre-Auth (Customer scan QR Code)' },
  { value: 'razerboostcusqr', label: 'Razer Boost (Customer scan QR Code)' },
  { value: 'razermaecusqr', label: 'Razer MAE by Maybank2u (Customer scan QR Code)' },
  { value: 'razergrabpaycusqr', label: 'Razer GrabPay (Customer scan QR Code)' },
  { value: 'razerunionpaycusqr', label: 'Razer UnionPay (Customer scan QR Code)' },
  { value: 'razershopeepaycusqr', label: 'Razer ShopeePay (Customer scan QR Code)' },
  { value: 'razerduitnowqrcusqr', label: 'Razer DuitNow QR (Customer scan QR Code)' },
  { value: 'razeralipaypluscusqr', label: 'Razer Alipay+ (Cross-border) (Customer scan QR Code)' },
  { value: 'razeratomecusqr', label: 'Razer Atome (Customer scan QR Code)' },
  { value: 'razerwechatpaycbcusqr', label: 'Razer WeChat Pay (Cross-border) (Customer scan QR Code)' },
  { value: 'razerwechatpaymalaysiacusqr', label: 'Razer WeChat Pay (Malaysia) (Customer scan QR Code)' },
  { value: 'razerecr', label: 'Razer ECR' },
  { value: 'razerecrcc', label: 'Razer ECR Credit Card' },
  { value: 'razerecrqr', label: 'Razer ECR QR' },
  { value: 'razerecrduitnowcusqr', label: 'Razer ECR DuitNow QR (Customer scan QR Code)' },
  { value: 'openricempos', label: 'Openrice mPOS' },
  { value: 'openricemposqrcode', label: 'Openrice mPOS (Alipay / WeChat Pay)' },
  { value: 'openricemposopenricepay', label: 'Openrice mPOS (Openrice Pay)' },
  { value: 'openricemposoctopus', label: 'Openrice mPOS (Octopus)' },
  { value: 'openricemposvisa', label: 'Openrice mPOS (Visa)' },
  { value: 'openricemposmastercard', label: 'Openrice mPOS (Mastercard)' },
  { value: 'openricemposunionpay', label: 'Openrice mPOS (UnionPay)' },
  { value: 'openricemposjcb', label: 'Openrice mPOS (JCB)' },
  { value: 'openricemposamex', label: 'Openrice mPOS (AMEX)' },
  { value: 'adyen', label: 'Adyen' },
  { value: 'hangsengecrcc', label: 'Hang Seng ECR Credit Card' },
  { value: 'hangsengecrcup', label: 'Hang Seng ECR UnionPay' },
  { value: 'hangsengecrcupqr', label: 'Hang Seng ECR UnionPay (Customer scan QR Code)' },
  { value: 'hangsengecrcupuplan', label: 'Hang Seng ECR UnionPay U·Plan' },
  { value: 'hangsengecrmicro', label: 'Hang Seng ECR WeChatPay / Alipay / PayMe' },
  { value: 'qfpayecrcard', label: 'QFPay ECR Credit Card' },
  { value: 'qfpayecrwechat', label: 'QFPay ECR WeChatPay' },
  { value: 'qfpayecralipay', label: 'QFPay ECR Alipay' },
  { value: 'qfpayecrpayme', label: 'QFPay ECR PayMe' },
  { value: 'qfpayecrunionpay', label: 'QFPay ECR UnionPay' },
  { value: 'qfpayecrfps', label: 'QFPay ECR FPS' },
  { value: 'qfpayecrocl', label: 'QFPay ECR Octopus' },
  { value: 'qfpayecrunionpaycard', label: 'QFPay ECR UnionPay Card' },
  { value: 'qfpayecramex', label: 'QFPay ECR AMEX' },
  { value: 'kpaycard', label: 'KPay Credit Card' },
  { value: 'kpayqrcode', label: 'KPay QR Code' },
  { value: 'kpayqrcodecusqr', label: 'KPay QR Code (Customer scan)' },
  { value: 'kpayoctopus', label: 'KPay Octopus' },
  { value: 'kpayoctopusqrcode', label: 'KPay Octopus QR Code' },
  { value: 'kpaypayme', label: 'KPay PayMe' },
  { value: 'kpaypaymecusqr', label: 'KPay PayMe (Customer scan)' },
  { value: 'cathays80', label: 'Cathay S80 Credit Card' },
  { value: 'cathays80ae', label: 'Cathay S80 American Express' },
  { value: 'cathayS350', label: 'Cathay S350 Credit Card' },
  { value: 'cathayS350ae', label: 'Cathay S350 American Express' },
];

const defaultPayload: UpsertPaymentMethodPayload = {
  paymentMethodCode: '',
  paymentMethodName: '',
  displayIndex: 0,
  isDrawerKick: false,
  isTipEnabled: false,
  isNonSalesPayment: false,
  isCashPayment: false,
  isFixedAmount: false,
  fixedAmount: null,
  isOverPaymentEnabled: false,
  isFxPayment: false,
  isAutoRemarkEnabled: false,
  paymentMethodSurchargeRate: null,
  txChargesRate: null,
  linkedGateway: '',
  remarkFormats: '',
  maxUseCount: null,
  shopRules: null,
};

export function PaymentMethodsPage() {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [methods, setMethods] = useState<PaymentMethodSummary[]>([]);
  const [shops, setShops] = useState<{ shopId: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<PaymentMethodSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentMethodSummary | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [payload, setPayload] = useState<UpsertPaymentMethodPayload>({ ...defaultPayload });
  const [shopRules, setShopRules] = useState<PaymentMethodShopRule[]>([]);

  const loadMethods = useCallback(async () => {
    if (!brandId) {
      setMethods([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await paymentMethodService.list(brandId);
      setMethods(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment methods';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  const loadShops = useCallback(async () => {
    if (!brandId) { setShops([]); return; }
    try {
      const data = await storeSettingsService.getShops(brandId);
      setShops(data.map((s: { shopId: number; shopName: string }) => ({ shopId: s.shopId, name: s.shopName })));
    } catch { /* non-blocking */ }
  }, [brandId]);

  useEffect(() => { void loadMethods(); }, [loadMethods]);
  useEffect(() => { void loadShops(); }, [loadShops]);

  const openCreate = () => {
    setEditTarget(null);
    setPayload({ ...defaultPayload });
    setShopRules(shops.map((s) => ({ shopId: s.shopId, shopName: s.name, enabled: true, paymentFxRate: null })));
    setModalOpened(true);
  };

  const openEdit = async (method: PaymentMethodSummary) => {
    if (!brandId) return;
    setEditTarget(method);
    setModalOpened(true);
    try {
      setSubmitting(true);
      const detail: PaymentMethodDetail = await paymentMethodService.get(brandId, method.paymentMethodId);
      setPayload({
        paymentMethodCode: detail.paymentMethodCode,
        paymentMethodName: detail.paymentMethodName,
        displayIndex: detail.displayIndex,
        isDrawerKick: detail.isDrawerKick,
        isTipEnabled: detail.isTipEnabled,
        isNonSalesPayment: detail.isNonSalesPayment,
        isCashPayment: detail.isCashPayment,
        isFixedAmount: detail.isFixedAmount,
        fixedAmount: detail.fixedAmount,
        isOverPaymentEnabled: detail.isOverPaymentEnabled,
        isFxPayment: detail.isFxPayment,
        isAutoRemarkEnabled: detail.isAutoRemarkEnabled,
        paymentMethodSurchargeRate: detail.paymentMethodSurchargeRate,
        txChargesRate: detail.txChargesRate,
        linkedGateway: detail.linkedGateway ?? '',
        remarkFormats: detail.remarkFormats ?? '',
        maxUseCount: detail.maxUseCount,
        shopRules: null,
      });
      setShopRules(detail.shopRules);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load payment method detail';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    if (!brandId) {
      notifications.show({ color: 'red', message: 'Select a brand first' });
      return;
    }
    if (!payload.paymentMethodCode.trim() || !payload.paymentMethodName.trim()) {
      notifications.show({ color: 'red', message: 'Code and name are required' });
      return;
    }
    try {
      setSubmitting(true);
      const request: UpsertPaymentMethodPayload = {
        ...payload,
        paymentMethodCode: payload.paymentMethodCode.trim(),
        paymentMethodName: payload.paymentMethodName.trim(),
        shopRules: shopRules.length > 0 ? shopRules : null,
      };
      if (editTarget) {
        await paymentMethodService.update(brandId, editTarget.paymentMethodId, request);
        notifications.show({ color: 'green', message: 'Payment method updated' });
      } else {
        await paymentMethodService.create(brandId, request);
        notifications.show({ color: 'green', message: 'Payment method created' });
      }
      setModalOpened(false);
      setEditTarget(null);
      await loadMethods();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save payment method';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!brandId || !deleteTarget) return;
    try {
      setSubmitting(true);
      await paymentMethodService.deactivate(brandId, deleteTarget.paymentMethodId);
      notifications.show({ color: 'green', message: 'Payment method deactivated' });
      setDeleteOpened(false);
      setDeleteTarget(null);
      await loadMethods();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to deactivate payment method';
      notifications.show({ color: 'red', message });
    } finally {
      setSubmitting(false);
    }
  };

  const boolBadge = (value?: boolean | null) =>
    value ? <Badge color="green" size="sm">Yes</Badge> : <Badge color="gray" size="sm">No</Badge>;

  const gatewayLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of LINKED_GATEWAY_OPTIONS) map.set(opt.value, opt.label);
    return map;
  }, []);

  const gatewayLabel = (code?: string | null) =>
    code ? (gatewayLookup.get(code) ?? code) : '—';

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <Title order={2}>Payment Methods</Title>
          <Group>
            <Button variant="subtle" onClick={loadMethods} loading={loading}>
              Refresh
            </Button>
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate} disabled={!brandId}>
              New Payment Method
            </Button>
          </Group>
        </Group>

        {!brandId && (
          <Alert icon={<IconAlertCircle size={16} />} color="yellow">
            Select a brand to manage payment methods.
          </Alert>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red">
            {error}
          </Alert>
        )}

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Code</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Cash Drawer</Table.Th>
                <Table.Th>Tips</Table.Th>
                <Table.Th>Surcharge Rate</Table.Th>
                <Table.Th>Non-Sales</Table.Th>
                <Table.Th>3rd Party</Table.Th>
                <Table.Th style={{ width: 100 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading && methods.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center" py="md">Loading...</Text>
                  </Table.Td>
                </Table.Tr>
              ) : methods.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={8}>
                    <Text c="dimmed" ta="center" py="md">No payment methods found.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                methods.map((m) => (
                  <Table.Tr key={m.paymentMethodId}>
                    <Table.Td>{m.paymentMethodCode}</Table.Td>
                    <Table.Td>{m.paymentMethodName}</Table.Td>
                    <Table.Td>{boolBadge(m.isDrawerKick)}</Table.Td>
                    <Table.Td>{boolBadge(m.isTipEnabled)}</Table.Td>
                    <Table.Td>{m.paymentMethodSurchargeRate != null ? `${m.paymentMethodSurchargeRate}%` : '—'}</Table.Td>
                    <Table.Td>{boolBadge(m.isNonSalesPayment)}</Table.Td>
                    <Table.Td>{gatewayLabel(m.linkedGateway)}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <ActionIcon variant="subtle" color="blue" onClick={() => void openEdit(m)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => { setDeleteTarget(m); setDeleteOpened(true); }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>

      {/* Create / Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editTarget ? 'Edit Payment Method' : 'New Payment Method'}
        size="lg"
      >
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="Code"
              maxLength={10}
              required
              value={payload.paymentMethodCode}
              onChange={(e) => setPayload({ ...payload, paymentMethodCode: e.currentTarget.value })}
            />
            <TextInput
              label="Name"
              maxLength={50}
              required
              value={payload.paymentMethodName}
              onChange={(e) => setPayload({ ...payload, paymentMethodName: e.currentTarget.value })}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Display Index"
              value={payload.displayIndex}
              onChange={(val) => setPayload({ ...payload, displayIndex: typeof val === 'number' ? val : 0 })}
            />
            <NumberInput
              label="Surcharge Rate (%)"
              decimalScale={2}
              value={payload.paymentMethodSurchargeRate ?? ''}
              onChange={(val) => setPayload({ ...payload, paymentMethodSurchargeRate: typeof val === 'number' ? val : null })}
            />
          </Group>

          <Group grow>
            <NumberInput
              label="Fixed Amount"
              decimalScale={2}
              value={payload.fixedAmount ?? ''}
              onChange={(val) => setPayload({ ...payload, fixedAmount: typeof val === 'number' ? val : null })}
            />
            <NumberInput
              label="Tx Charges Rate"
              decimalScale={2}
              value={payload.txChargesRate ?? ''}
              onChange={(val) => setPayload({ ...payload, txChargesRate: typeof val === 'number' ? val : null })}
            />
          </Group>

          <Select
            label="Linked Gateway"
            placeholder="Select a gateway"
            data={LINKED_GATEWAY_OPTIONS}
            value={payload.linkedGateway || null}
            onChange={(val) => setPayload({ ...payload, linkedGateway: val || null })}
            searchable
            clearable
          />

          <Group grow>
            <Switch
              label="Open Cash Drawer"
              checked={!!payload.isDrawerKick}
              onChange={(e) => setPayload({ ...payload, isDrawerKick: e.currentTarget.checked })}
            />
            <Switch
              label="Allow Tips"
              checked={!!payload.isTipEnabled}
              onChange={(e) => setPayload({ ...payload, isTipEnabled: e.currentTarget.checked })}
            />
          </Group>

          <Group grow>
            <Switch
              label="Non-Sales Payment"
              checked={!!payload.isNonSalesPayment}
              onChange={(e) => setPayload({ ...payload, isNonSalesPayment: e.currentTarget.checked })}
            />
            <Switch
              label="Cash Payment"
              checked={!!payload.isCashPayment}
              onChange={(e) => setPayload({ ...payload, isCashPayment: e.currentTarget.checked })}
            />
          </Group>

          <Group grow>
            <Switch
              label="Fixed Amount"
              checked={!!payload.isFixedAmount}
              onChange={(e) => setPayload({ ...payload, isFixedAmount: e.currentTarget.checked })}
            />
            <Switch
              label="Over Payment"
              checked={!!payload.isOverPaymentEnabled}
              onChange={(e) => setPayload({ ...payload, isOverPaymentEnabled: e.currentTarget.checked })}
            />
          </Group>

          <Group grow>
            <Switch
              label="FX Payment"
              checked={!!payload.isFxPayment}
              onChange={(e) => setPayload({ ...payload, isFxPayment: e.currentTarget.checked })}
            />
            <Switch
              label="Auto Remark"
              checked={!!payload.isAutoRemarkEnabled}
              onChange={(e) => setPayload({ ...payload, isAutoRemarkEnabled: e.currentTarget.checked })}
            />
          </Group>

          {/* Shop Rules (only shown when editing) */}
          {shopRules.length > 0 && (
            <>
              <Title order={5} mt="md">Shop Settings</Title>
              <Paper withBorder p="xs">
                <Table striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Shop</Table.Th>
                      <Table.Th>Enabled</Table.Th>
                      <Table.Th>FX Rate</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {shopRules.map((rule, idx) => (
                      <Table.Tr key={rule.shopId}>
                        <Table.Td>{rule.shopName}</Table.Td>
                        <Table.Td>
                          <Switch
                            checked={rule.enabled}
                            onChange={(e) => {
                              const updated = [...shopRules];
                              updated[idx] = { ...rule, enabled: e.currentTarget.checked };
                              setShopRules(updated);
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <NumberInput
                            size="xs"
                            decimalScale={4}
                            value={rule.paymentFxRate ?? ''}
                            onChange={(val) => {
                              const updated = [...shopRules];
                              updated[idx] = { ...rule, paymentFxRate: typeof val === 'number' ? val : null };
                              setShopRules(updated);
                            }}
                          />
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            </>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>Cancel</Button>
            <Button onClick={() => void handleSave()} loading={submitting}>
              {editTarget ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title="Deactivate Payment Method"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Deactivate <strong>{deleteTarget?.paymentMethodName}</strong> ({deleteTarget?.paymentMethodCode})?
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteOpened(false)}>Cancel</Button>
            <Button color="red" onClick={() => void handleDeactivate()} loading={submitting}>
              Deactivate
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
