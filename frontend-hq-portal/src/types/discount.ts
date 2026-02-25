export interface DiscountSummary {
  discountId: number;
  accountId: number;
  discountCode: string;
  discountName: string;
  isFixedAmount: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
  priority: number;
  enabled: boolean;
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
  isFixedAmount: boolean;
  discountPercent?: number | null;
  discountAmount?: number | null;
  priority: number;
  enabled: boolean;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}
