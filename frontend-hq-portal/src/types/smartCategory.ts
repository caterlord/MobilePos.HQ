import type { ButtonStyle } from './buttonStyle';

export interface SmartCategoryTreeNode {
  smartCategoryId: number;
  parentSmartCategoryId: number | null;
  name: string;
  nameAlt?: string | null;
  displayIndex: number;
  enabled: boolean;
  buttonStyleId: number;
  itemCount: number;
  children: SmartCategoryTreeNode[];
}

export interface SmartCategory {
  smartCategoryId: number;
  accountId: number;
  parentSmartCategoryId: number | null;
  name: string;
  nameAlt?: string | null;
  displayIndex: number;
  enabled: boolean;
  isTerminal: boolean;
  isPublicDisplay: boolean;
  buttonStyleId: number;
  description?: string | null;
  descriptionAlt?: string | null;
  imageFileName?: string | null;
  imageFileName2?: string | null;
  imageFileName3?: string | null;
  isSelfOrderingDisplay?: boolean | null;
  isOnlineStoreDisplay?: boolean | null;
  isOdoDisplay?: boolean | null;
  isKioskDisplay?: boolean | null;
  isTableOrderingDisplay?: boolean | null;
  onlineStoreRefCategoryId?: number | null;
  remark?: string | null;
  remarkAlt?: string | null;
  createdDate: string;
  createdBy: string;
  modifiedDate: string;
  modifiedBy: string;
}

export interface SmartCategoryItemAssignment {
  itemId: number;
  itemCode: string;
  itemName: string;
  itemNameAlt?: string | null;
  displayIndex: number;
  enabled: boolean;
  modifiedDate: string;
  modifiedBy: string;
}

export interface SmartCategoryShopSchedule {
  shopId: number;
  shopName: string;
  displayIndex: number;
  displayFromDate?: string | null;
  displayToDate?: string | null;
  displayFromTime?: string | null;
  displayToTime?: string | null;
  displayFromDateTime?: string | null;
  displayToDateTime?: string | null;
  isPublicDisplay: boolean;
  enabled: boolean;
  dayOfWeek?: number | null;
  isWeekdayHide?: boolean | null;
  isWeekendHide?: boolean | null;
  isHolidayHide?: boolean | null;
  daysOfWeek?: string | null;
  months?: string | null;
  dates?: string | null;
  modifiedDate: string;
  modifiedBy: string;
}

export interface SmartCategoryOrderChannel {
  shopId: number;
  shopName: string;
  orderChannelId: number;
  name: string;
  nameAlt?: string | null;
  enabled: boolean;
  modifiedDate: string;
  modifiedBy: string;
}

export interface SmartCategoryDetail {
  category: SmartCategory;
  items: SmartCategoryItemAssignment[];
  shopSchedules: SmartCategoryShopSchedule[];
  orderChannels: SmartCategoryOrderChannel[];
}

export interface SmartCategoryUpsertPayload {
  name: string;
  nameAlt?: string | null;
  parentSmartCategoryId?: number | null;
  displayIndex: number;
  enabled: boolean;
  isTerminal: boolean;
  isPublicDisplay: boolean;
  buttonStyleId: number;
  description?: string | null;
  descriptionAlt?: string | null;
  imageFileName?: string | null;
  imageFileName2?: string | null;
  imageFileName3?: string | null;
  isSelfOrderingDisplay?: boolean | null;
  isOnlineStoreDisplay?: boolean | null;
  isOdoDisplay?: boolean | null;
  isKioskDisplay?: boolean | null;
  isTableOrderingDisplay?: boolean | null;
  onlineStoreRefCategoryId?: number | null;
  remark?: string | null;
  remarkAlt?: string | null;
}

export interface SmartCategoryItemAssignmentEntry {
  itemId: number;
  displayIndex: number;
  enabled: boolean;
}

export interface SmartCategoryItemAssignmentRequest {
  items: SmartCategoryItemAssignmentEntry[];
}

export interface SmartCategoryShopScheduleUpsert {
  shopId: number;
  displayIndex: number;
  displayFromDate?: string | null;
  displayToDate?: string | null;
  displayFromTime?: string | null;
  displayToTime?: string | null;
  displayFromDateTime?: string | null;
  displayToDateTime?: string | null;
  isPublicDisplay: boolean;
  enabled: boolean;
  dayOfWeek?: number | null;
  isWeekdayHide?: boolean | null;
  isWeekendHide?: boolean | null;
  isHolidayHide?: boolean | null;
  daysOfWeek?: string | null;
  months?: string | null;
  dates?: string | null;
}

export interface SmartCategoryOrderChannelUpsert {
  shopId: number;
  orderChannelId: number;
  enabled: boolean;
}

export interface SmartCategoryDisplaySettingsPayload {
  shopSchedules: SmartCategoryShopScheduleUpsert[];
  orderChannels: SmartCategoryOrderChannelUpsert[];
}

export interface SmartCategoryReorderEntry {
  smartCategoryId: number;
  parentSmartCategoryId: number | null;
  displayIndex: number;
}

export interface SmartCategoryReorderRequest {
  categories: SmartCategoryReorderEntry[];
}

export interface LookupOption {
  id: number;
  name: string;
  altName?: string | null;
  code?: string | null;
}

export interface LookupOptions {
  buttonStyles: ButtonStyle[];
  shops: LookupOption[];
  orderChannels: LookupOption[];
}
