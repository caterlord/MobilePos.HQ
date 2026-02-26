export interface DiscountSummary {
  discountId: number;
  accountId: number;
  bundlePromoOverviewId?: number | null;
  bundlePromoHeaderTypeId: number;
  discountCode: string;
  discountName: string;
  bundlePromoDesc?: string | null;
  isFixedAmount: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
  priority: number;
  enabled: boolean;
  isAvailable: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  modifiedDate: string;
  modifiedBy: string;
}

export interface UpsertDiscountPayload {
  discountCode: string;
  discountName: string;
  bundlePromoDesc?: string | null;
  bundlePromoHeaderTypeId: number;
  isFixedAmount: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
  priority: number;
  enabled: boolean;
  isAvailable: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}
