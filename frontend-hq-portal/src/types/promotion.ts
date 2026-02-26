export interface PromotionSummary {
  promoHeaderId: number;
  accountId: number;
  bundlePromoOverviewId?: number | null;
  bundlePromoHeaderTypeId: number;
  promoCode: string;
  promoName: string;
  bundlePromoDesc?: string | null;
  promoSaveAmount: number;
  priority?: number | null;
  enabled: boolean;
  isAvailable: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  modifiedDate: string;
  modifiedBy: string;
}

export interface UpsertPromotionPayload {
  promoCode: string;
  promoName: string;
  bundlePromoDesc?: string | null;
  bundlePromoHeaderTypeId: number;
  promoSaveAmount: number;
  priority?: number | null;
  enabled: boolean;
  isAvailable: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}
