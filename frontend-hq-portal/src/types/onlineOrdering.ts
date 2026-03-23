export interface OnlineOrderingLookupItem {
  id: number;
  name: string;
  altName?: string | null;
  code?: string | null;
}

export interface OnlineOrderingMenuSummary {
  odoCategoryCount: number;
  odoItemCount: number;
  odoModifierGroupCount: number;
  odoMealSetCount: number;
}

export interface OnlineOrderingLookups {
  shops: OnlineOrderingLookupItem[];
  orderChannels: OnlineOrderingLookupItem[];
  categories: OnlineOrderingLookupItem[];
  smartCategories: OnlineOrderingLookupItem[];
  languages: string[];
  summary: OnlineOrderingMenuSummary;
}

export interface OnlineOrderingDisplayOrderNode {
  smartCategoryId: number;
  parentSmartCategoryId: number | null;
  name: string;
  nameAlt?: string | null;
  displayIndex: number;
  itemCount: number;
  children: OnlineOrderingDisplayOrderNode[];
}

export interface OnlineOrderingDisplayOrderEntry {
  smartCategoryId: number;
  parentSmartCategoryId: number | null;
  displayIndex: number;
}

export interface OnlineOrderingBusinessDaySection {
  label: string;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: string | null;
  fromTime?: string | null;
  toTime?: string | null;
}

export interface OnlineOrderingGeneralSettings {
  websiteUrl: string;
  countryCode: string;
  timeZone: number;
  orderTokenValidTime: number;
  disableNavigateWhenTokenExpired: boolean;
  whenTokenExpiredTips?: string | null;
  quota: number;
  quotaOfItem: number;
  quotaOfEachItem: number;
  modifySetQuantity: boolean;
  roundingMethod: string;
  roundingPlace?: number | null;
  businessDaySections: OnlineOrderingBusinessDaySection[];
}

export interface OnlineOrderingCallToActionSlot {
  itemIds: number[];
  buttonLabel?: string;
  buttonLabelAlt?: string | null;
  targetPath?: string | null;
  placement?: string;
  enabled: boolean;
  title: string;
  titleAlt?: string | null;
  description?: string | null;
  descriptionAlt?: string | null;
  actionLabel?: string;
  actionLabelAlt?: string | null;
  actionUrl?: string | null;
  smartCategoryId?: number | null;
}

export interface OnlineOrderingCallToActionSettings {
  slots: OnlineOrderingCallToActionSlot[];
}

export interface OnlineOrderingCallToAction {
  cartPage: OnlineOrderingCallToActionSlot;
  orderHistoryPage: OnlineOrderingCallToActionSlot;
}

export interface OnlineOrderingUiI18nEntry {
  orderChannelId: number;
  languageCode: string;
  key?: string;
  value?: string;
  content?: string;
}

export interface OnlineOrderingUiI18nDocument {
  orderChannelId?: number;
  orderChannelName?: string;
  entries: OnlineOrderingUiI18nEntry[];
}

export interface OnlineOrderingUiI18nResponse {
  languages: string[];
  documents: OnlineOrderingUiI18nDocument[];
}

export interface OnlineOrderingMenuCombinationCategory {
  categoryId: number;
  isSmartCategory: boolean;
  name: string;
}

export interface OnlineOrderingMenuCombinationShop {
  shopId: number;
  shopName: string;
  enabled: boolean;
  isPublicDisplay: boolean;
  daysOfWeek?: string | null;
  dates?: string | null;
  months?: string | null;
  displayFromTime?: string | null;
  displayToTime?: string | null;
}

export interface OnlineOrderingMenuCombination {
  menuId: number;
  menuName: string;
  menuNameAlt?: string | null;
  menuCode?: string | null;
  displayOrder: number;
  enabled: boolean;
  isPublished: boolean;
  isOdoDisplay: boolean;
  isFoodpandaMealForOne: boolean;
  categories: OnlineOrderingMenuCombinationCategory[];
  shops: OnlineOrderingMenuCombinationShop[];
  categoryIds?: number[];
  shopIds?: number[];
}

export interface OnlineOrderingMenuCombinationFlat {
  menuId: number;
  menuName: string;
  menuNameAlt?: string | null;
  menuCode?: string | null;
  displayOrder: number;
  enabled: boolean;
  isPublished: boolean;
  isOdoDisplay: boolean;
  isFoodpandaMealForOne: boolean;
  categoryIds: number[];
  shopIds: number[];
}

export interface UpsertOnlineOrderingMenuCombinationCategory {
  categoryId: number;
  isSmartCategory: boolean;
}

export interface UpsertOnlineOrderingMenuCombinationShop {
  shopId: number;
  enabled: boolean;
  isPublicDisplay: boolean;
  daysOfWeek?: string | null;
  dates?: string | null;
  months?: string | null;
  displayFromTime?: string | null;
  displayToTime?: string | null;
}

export interface UpsertOnlineOrderingMenuCombinationRequest {
  menuName: string;
  menuNameAlt?: string | null;
  menuCode?: string | null;
  displayOrder: number;
  enabled: boolean;
  isPublished: boolean;
  isOdoDisplay: boolean;
  isFoodpandaMealForOne: boolean;
  categories: UpsertOnlineOrderingMenuCombinationCategory[];
  shops: UpsertOnlineOrderingMenuCombinationShop[];
}

export interface UpsertOnlineOrderingMenuCombinationPayload {
  menuName: string;
  menuNameAlt?: string | null;
  menuCode?: string | null;
  displayOrder?: number | null;
  enabled: boolean;
  isPublished: boolean;
  isOdoDisplay: boolean;
  isFoodpandaMealForOne: boolean;
  categoryIds: number[];
  shopIds: number[];
}
