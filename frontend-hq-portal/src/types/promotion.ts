export interface PromotionSummary {
  promoHeaderId: number;
  accountId: number;
  promoCode: string;
  promoName: string;
  promoSaveAmount: number;
  priority?: number | null;
  enabled: boolean;
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
  promoSaveAmount: number;
  priority?: number | null;
  enabled: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}
