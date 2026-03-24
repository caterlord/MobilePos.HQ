export interface PaymentMethodSummary {
  paymentMethodId: number;
  accountId: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  displayIndex: number;
  enabled: boolean;
  isDrawerKick?: boolean | null;
  isTipEnabled?: boolean | null;
  isNonSalesPayment?: boolean | null;
  isCashPayment?: boolean | null;
  paymentMethodSurchargeRate?: number | null;
  linkedGateway?: string | null;
  modifiedDate: string;
  modifiedBy: string;
}

export interface PaymentMethodDetail {
  paymentMethodId: number;
  accountId: number;
  paymentMethodCode: string;
  paymentMethodName: string;
  displayIndex: number;
  enabled: boolean;
  isDrawerKick?: boolean | null;
  isTipEnabled?: boolean | null;
  isNonSalesPayment?: boolean | null;
  isCashPayment?: boolean | null;
  isFixedAmount?: boolean | null;
  fixedAmount?: number | null;
  isOverPaymentEnabled?: boolean | null;
  isFxPayment?: boolean | null;
  isAutoRemarkEnabled?: boolean | null;
  paymentMethodSurchargeRate?: number | null;
  txChargesRate?: number | null;
  linkedGateway?: string | null;
  remarkFormats?: string | null;
  maxUseCount?: number | null;
  modifiedDate: string;
  modifiedBy: string;
  shopRules: PaymentMethodShopRule[];
}

export interface PaymentMethodShopRule {
  shopId: number;
  shopName: string;
  enabled: boolean;
  paymentFxRate?: number | null;
}

export interface UpsertPaymentMethodPayload {
  paymentMethodCode: string;
  paymentMethodName: string;
  displayIndex: number;
  isDrawerKick?: boolean | null;
  isTipEnabled?: boolean | null;
  isNonSalesPayment?: boolean | null;
  isCashPayment?: boolean | null;
  isFixedAmount?: boolean | null;
  fixedAmount?: number | null;
  isOverPaymentEnabled?: boolean | null;
  isFxPayment?: boolean | null;
  isAutoRemarkEnabled?: boolean | null;
  paymentMethodSurchargeRate?: number | null;
  txChargesRate?: number | null;
  linkedGateway?: string | null;
  remarkFormats?: string | null;
  maxUseCount?: number | null;
  shopRules?: PaymentMethodShopRule[] | null;
}
