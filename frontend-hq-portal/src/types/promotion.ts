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

export interface PromotionRuleDetail {
  promoDetailId?: number | null;
  bundlePromoDetailTypeId: number;
  selectedCategoryId?: number | null;
  selectedItemId?: number | null;
  specificPrice?: number | null;
  bundleDeductRuleTypeId: number;
  enabled: boolean;
  isOptionalItem: boolean;
  isReplaceItem: boolean;
  isItemCanReplace: boolean;
  priceReplace?: number | null;
  groupIndex?: number | null;
  isDepartmentRevenue: boolean;
  departmentRevenue?: number | null;
}

export interface PromotionRuleDetailGroup {
  groupIndex: number;
  details: PromotionRuleDetail[];
}

export interface PromotionShopRule {
  shopId: number;
  shopName: string;
  enabled: boolean;
}

export interface PromotionRuleEditor {
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
  isCoexistPromo: boolean;
  isAmountDeductEvenly: boolean;
  isPromoDetailMatchMustExist: boolean;
  flatPrice?: number | null;
  dayOfWeeks: string;
  months: string;
  dates: string;
  mandatoryDetails: PromotionRuleDetail[];
  optionalDetailGroups: PromotionRuleDetailGroup[];
  shopRules: PromotionShopRule[];
}

export interface UpdatePromotionRuleEditorPayload {
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
  isCoexistPromo: boolean;
  isAmountDeductEvenly: boolean;
  isPromoDetailMatchMustExist: boolean;
  flatPrice?: number | null;
  dayOfWeeks?: string | null;
  months?: string | null;
  dates?: string | null;
  mandatoryDetails: PromotionRuleDetail[];
  optionalDetailGroups: PromotionRuleDetailGroup[];
  shopRules: PromotionShopRule[];
}
