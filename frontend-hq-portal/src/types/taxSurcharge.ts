export interface TaxShopRule {
  shopId: number;
  shopName: string;
  enabled: boolean;
}

// ── Taxation ──

export interface TaxationSummary {
  taxationId: number;
  accountId: number;
  taxationCode: string;
  taxationName: string;
  priority: number;
  taxationPercent?: number | null;
  isFixedAmount: boolean;
  taxationAmount?: number | null;
  enabled: boolean;
  isAutoCalculate: boolean;
  isOpenAmount: boolean;
  modifiedDate: string;
  modifiedBy: string;
}

export interface TaxationDetail extends TaxationSummary {
  isDateSpecific: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  shopRules: TaxShopRule[];
}

export interface UpsertTaxationPayload {
  taxationCode: string;
  taxationName: string;
  priority: number;
  taxationPercent?: number | null;
  isFixedAmount: boolean;
  taxationAmount?: number | null;
  isDateSpecific: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isAutoCalculate: boolean;
  isOpenAmount: boolean;
  shopRules?: TaxShopRule[] | null;
}

// ── Surcharge ──

export interface SurchargeSummary {
  serviceChargeId: number;
  accountId: number;
  serviceChargeCode: string;
  serviceChargeName: string;
  priority: number;
  serviceChargePercent?: number | null;
  isFixedAmount: boolean;
  serviceChargeAmount?: number | null;
  enabled: boolean;
  isAutoCalculate: boolean;
  isOpenAmount: boolean;
  modifiedDate: string;
  modifiedBy: string;
}

export interface SurchargeDetail extends SurchargeSummary {
  isDateSpecific: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  shopRules: TaxShopRule[];
}

export interface UpsertSurchargePayload {
  serviceChargeCode: string;
  serviceChargeName: string;
  priority: number;
  serviceChargePercent?: number | null;
  isFixedAmount: boolean;
  serviceChargeAmount?: number | null;
  isDateSpecific: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  isAutoCalculate: boolean;
  isOpenAmount: boolean;
  shopRules?: TaxShopRule[] | null;
}
