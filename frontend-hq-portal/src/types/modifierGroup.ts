import type { MenuItemSummary } from './menuItem';

export interface ModifierGroupHeader {
  groupHeaderId: number;
  accountId: number;
  groupBatchName: string;
  groupBatchNameAlt?: string;
  enabled: boolean;
  isFollowSet: boolean;
}

export interface ModifierGroupPreviewItem {
  itemId: number;
  itemCode: string;
  itemName?: string | null;
  enabled: boolean;
  displayIndex: number;
}

export interface ModifierGroupPreview {
  groupHeaderId: number;
  groupBatchName: string;
  items: ModifierGroupPreviewItem[];
}

export interface ModifierGroupMember {
  itemId: number;
  displayIndex: number;
  enabled: boolean;
  item: MenuItemSummary;
}

export interface ModifierGroupProperties {
  groupHeaderId: number;
  accountId: number;
  groupBatchName: string;
  groupBatchNameAlt?: string;
  enabled: boolean;
  isFollowSet: boolean;
  maxModifierSelectCount: number;
  minModifierSelectCount: number;
  isOdoDisplay: boolean;
  isKioskDisplay: boolean;
  isTableOrderingDisplay: boolean;
  isPosDisplay: boolean;
  isSelfOrderingDisplay: boolean;
  modifiedDate?: string | null;
  modifiedBy?: string | null;
  items: ModifierGroupMember[];
}

export interface ModifierGroupShopPricing {
  shopId: number;
  shopName: string;
  itemId: number;
  originalPrice: number;
  price: number | null;
  enabled: boolean;
}

export interface UpdateModifierGroupShopPricingEntryPayload {
  shopId: number;
  price: number | null;
}

export interface UpdateModifierGroupShopPricingPayload {
  entries: UpdateModifierGroupShopPricingEntryPayload[];
}

export interface UpdateModifierGroupMemberPayload {
  itemId: number;
  displayIndex: number;
  enabled: boolean;
}

export interface UpdateModifierGroupPropertiesPayload {
  groupBatchName: string;
  groupBatchNameAlt?: string | null;
  enabled: boolean;
  maxModifierSelectCount?: number;
  minModifierSelectCount?: number;
  isOdoDisplay?: boolean;
  isKioskDisplay?: boolean;
  isTableOrderingDisplay?: boolean;
  isPosDisplay?: boolean;
  isSelfOrderingDisplay?: boolean;
  items: UpdateModifierGroupMemberPayload[];
}

export interface CreateModifierGroupPayload {
  groupBatchName: string;
  groupBatchNameAlt?: string | null;
  enabled: boolean;
  isFollowSet?: boolean;
  maxModifierSelectCount?: number;
  minModifierSelectCount?: number;
  isOdoDisplay?: boolean;
  isKioskDisplay?: boolean;
  isTableOrderingDisplay?: boolean;
  isPosDisplay?: boolean;
  isSelfOrderingDisplay?: boolean;
  copyByGroupHeaderId?: number | null;
  items?: UpdateModifierGroupMemberPayload[];
}
