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
  modifiedDate?: string | null;
  modifiedBy?: string | null;
  items: ModifierGroupMember[];
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
  items: UpdateModifierGroupMemberPayload[];
}

export interface CreateModifierGroupPayload {
  groupBatchName: string;
  groupBatchNameAlt?: string | null;
  enabled: boolean;
  isFollowSet?: boolean;
  items?: UpdateModifierGroupMemberPayload[];
}
