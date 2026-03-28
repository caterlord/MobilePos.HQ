import type { ItemCategory } from './itemCategory';
import type { ButtonStyle } from './buttonStyle';
import type { Department } from './department';
import type { ModifierGroupHeader } from './modifierGroup';

export interface MenuItemSummary {
  itemId: number;
  accountId: number;
  categoryId: number;
  departmentId: number;
  itemCode: string;
  itemName?: string;
  itemNameAlt?: string;
  itemPosName?: string;
  itemPosNameAlt?: string;
  enabled: boolean;
  isItemShow: boolean;
  isPriceShow: boolean;
  hasModifier: boolean;
  isModifier: boolean;
  isFollowSet: boolean;
  isFollowSetDynamic: boolean;
  isFollowSetStandard: boolean;
  isPromoItem: boolean;
  isManualPrice: boolean;
  isManualName: boolean;
  isNonDiscountItem: boolean;
  isNonServiceChargeItem: boolean;
  isPointPaidItem?: boolean | null;
  isNoPointEarnItem?: boolean | null;
  isNonTaxableItem?: boolean | null;
  isComboRequired?: boolean | null;
  buttonStyleId?: number | null;
  displayIndex: number;
  itemPublicDisplayName?: string;
  itemPublicDisplayNameAlt?: string;
  itemPublicPrintedName?: string;
  imageFileName?: string;
  modifiedDate?: string;
  modifiedBy?: string | null;
}

export interface MenuItemDetail extends MenuItemSummary {
  modifierGroupHeaderId?: number | null;
  autoRedirectToModifier: boolean;
  itemNameAlt2?: string;
  itemNameAlt3?: string;
  itemNameAlt4?: string;
  remark?: string;
  remarkAlt?: string;
  itemPublicPrintedNameAlt?: string;
  imageFileName2?: string;
  tableOrderingImageFileName?: string;
  isStandaloneAndSetItem?: boolean | null;
  isFollowSet: boolean;
  isFollowSetDynamic: boolean;
  isFollowSetStandard: boolean;
  isModifierConcatToParent: boolean;
  isGroupRightItem: boolean;
  isPrintLabel: boolean;
  isPrintLabelTakeaway: boolean;
  isPriceInPercentage: boolean;
  isItemShowInKitchenChecklist?: boolean | null;
  isSoldoutAutoLock?: boolean | null;
  isPrepaidRechargeItem?: boolean | null;
  isAutoLinkWithRawMaterial?: boolean | null;
  isDinein: boolean;
  isTakeaway: boolean;
  isDelivery: boolean;
  isKitchenPrintInRedColor?: boolean | null;
  isManualPriceGroup?: boolean | null;
  subDepartmentId?: number | null;
  isExcludeLabelCount?: boolean | null;
  servingSize?: number | null;
  systemRemark?: string;
  isNonSalesItem?: boolean | null;
  productionSeconds?: number | null;
  parentItemId?: number | null;
  createdDate?: string;
  createdBy?: string;
  modifiedBy?: string;
  prices: MenuItemPrice[];
  shopAvailability: MenuItemShopAvailability[];
}

export interface MenuItemUpsertPayload {
  itemCode: string;
  itemName?: string | null;
  itemNameAlt?: string | null;
  itemNameAlt2?: string | null;
  itemNameAlt3?: string | null;
  itemNameAlt4?: string | null;
  itemPosName?: string | null;
  itemPosNameAlt?: string | null;
  itemPublicDisplayName?: string | null;
  itemPublicDisplayNameAlt?: string | null;
  itemPublicPrintedName?: string | null;
  itemPublicPrintedNameAlt?: string | null;
  remark?: string | null;
  remarkAlt?: string | null;
  imageFileName?: string | null;
  imageFileName2?: string | null;
  tableOrderingImageFileName?: string | null;
  categoryId: number;
  departmentId: number;
  subDepartmentId?: number | null;
  displayIndex: number;
  enabled: boolean;
  isItemShow: boolean;
  isPriceShow: boolean;
  hasModifier: boolean;
  autoRedirectToModifier: boolean;
  isModifier: boolean;
  modifierGroupHeaderId?: number | null;
  buttonStyleId?: number | null;
  isManualPrice: boolean;
  isManualName: boolean;
  isPromoItem: boolean;
  isModifierConcatToParent: boolean;
  isFollowSet: boolean;
  isFollowSetDynamic: boolean;
  isFollowSetStandard: boolean;
  isNonDiscountItem: boolean;
  isNonServiceChargeItem: boolean;
  isStandaloneAndSetItem?: boolean | null;
  isGroupRightItem: boolean;
  isPrintLabel: boolean;
  isPrintLabelTakeaway: boolean;
  isPriceInPercentage: boolean;
  isPointPaidItem?: boolean | null;
  isNoPointEarnItem?: boolean | null;
  isNonTaxableItem?: boolean | null;
  isItemShowInKitchenChecklist?: boolean | null;
  isSoldoutAutoLock?: boolean | null;
  isPrepaidRechargeItem?: boolean | null;
  isAutoLinkWithRawMaterial?: boolean | null;
  isDinein: boolean;
  isTakeaway: boolean;
  isDelivery: boolean;
  isKitchenPrintInRedColor?: boolean | null;
  isManualPriceGroup?: boolean | null;
  isExcludeLabelCount?: boolean | null;
  servingSize?: number | null;
  systemRemark?: string | null;
  isNonSalesItem?: boolean | null;
  productionSeconds?: number | null;
  parentItemId?: number | null;
  isComboRequired?: boolean | null;
}

export interface MenuItemListQuery {
  categoryId?: number;
  search?: string;
  includeDisabled?: boolean;
  hasModifier?: boolean;
  isPromoItem?: boolean;
  itemType?: 'sellable' | 'modifier' | 'setItem';
  sortBy?: 'displayIndex' | 'itemId' | 'itemCode' | 'name';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface CategoryItemCount {
  categoryId: number;
  itemCount: number;
}

export interface MenuItemListResponse {
  items: MenuItemSummary[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categoryCounts: CategoryItemCount[];
}

export interface MenuItemLookups {
  categories: ItemCategory[];
  buttonStyles: ButtonStyle[];
  departments: Department[];
  modifierGroups: ModifierGroupHeader[];
}

export interface MenuItemPrice {
  shopId: number;
  shopName: string;
  price: number | null;
  enabled: boolean;
  modifiedDate: string | null;
  modifiedBy: string | null;
  hasPrice: boolean;
}

export interface ShopPrinterOption {
  shopPrinterMasterId: number;
  printerName: string;
}

export interface MenuItemShopAvailability {
  shopId: number;
  shopName: string;
  enabled: boolean | null;
  isOutOfStock: boolean | null;
  isLimitedItem: boolean | null;
  lastUpdated: string | null;
  updatedBy: string | null;
  shopPrinter1: number | null;
  shopPrinter2: number | null;
  shopPrinter3: number | null;
  shopPrinter4: number | null;
  shopPrinter5: number | null;
  isGroupPrintByPrinter: boolean | null;
  printerOptions: ShopPrinterOption[];
}

export interface MenuItemReorderEntry {
  itemId: number;
  displayIndex: number;
}

export interface MenuItemReorderPayload {
  items: MenuItemReorderEntry[];
}

export interface UpdateMenuItemPricePayload {
  price: number;
  enabled: boolean;
}

export interface UpdateMenuItemAvailabilityPayload {
  enabled?: boolean | null;
  isOutOfStock?: boolean | null;
  isLimitedItem?: boolean | null;
  shopPrinter1?: number | null;
  shopPrinter2?: number | null;
  shopPrinter3?: number | null;
  shopPrinter4?: number | null;
  shopPrinter5?: number | null;
  isGroupPrintByPrinter?: boolean | null;
}

export interface ItemModifierMapping {
  groupHeaderId: number;
  sequence: number;
  modifierLinkType: string | null;
}

export interface ItemModifierMappings {
  inStore: ItemModifierMapping[];
  online: ItemModifierMapping[];
}

export interface ItemModifierMappingUpsert {
  groupHeaderId: number;
  sequence: number;
}

export interface UpdateItemModifierMappingsPayload {
  inStore: ItemModifierMappingUpsert[];
  online: ItemModifierMappingUpsert[];
}

export interface ItemRelationshipTree {
  root: ItemRelationshipNode;
}

export interface ItemRelationshipNode {
  item: MenuItemSummary;
  inStore: ItemRelationshipContext;
  online: ItemRelationshipContext;
}

export interface ItemRelationshipContext {
  modifiers: ItemRelationshipModifier[];
  itemSets: ItemRelationshipItemSet[];
}

export interface ItemRelationshipModifier {
  groupHeaderId: number;
  sequence: number;
  linkType: string | null;
  group: ModifierGroupHeader;
}

export interface ItemRelationshipItemSet {
  itemSetId: number | null;
  groupHeaderId: number;
  sequence: number;
  linkType: string | null;
  group: ModifierGroupHeader;
  children: ItemRelationshipNode[];
}

export interface UpdateItemRelationshipTreePayload {
  root: UpdateItemRelationshipNodePayload;
}

export interface UpdateItemRelationshipNodePayload {
  itemId: number;
  inStore: UpdateItemRelationshipContextPayload;
  online: UpdateItemRelationshipContextPayload;
}

export interface UpdateItemRelationshipContextPayload {
  modifiers: ItemModifierMappingUpsert[];
  itemSets: UpdateItemRelationshipSetPayload[];
}

export interface UpdateItemRelationshipSetPayload {
  itemSetId?: number | null;
  groupHeaderId: number;
  sequence: number;
  children: UpdateItemRelationshipNodePayload[];
}
