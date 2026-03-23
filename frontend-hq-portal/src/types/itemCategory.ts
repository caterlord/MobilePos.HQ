export interface ItemCategory {
  categoryId: number;
  accountId: number;
  categoryName: string;
  categoryNameAlt?: string;
  displayIndex: number;
  parentCategoryId?: number;
  isTerminal: boolean;
  isPublicDisplay: boolean;
  buttonStyleId?: number;
  printerName?: string;
  isModifier: boolean;
  enabled: boolean;
  createdDate?: Date;
  createdBy?: string;
  modifiedDate?: Date;
  modifiedBy?: string;
  categoryTypeId?: number;
  imageFileName?: string;
  isSelfOrderingDisplay?: boolean;
  isOnlineStoreDisplay?: boolean;
  categoryCode?: string;
}

export interface CreateItemCategory {
  categoryName: string;
  categoryNameAlt?: string;
  displayIndex?: number;
  parentCategoryId?: number;
  isTerminal?: boolean;
  isPublicDisplay?: boolean;
  buttonStyleId?: number;
  printerName?: string;
  isModifier?: boolean;
  enabled?: boolean;
  categoryTypeId?: number;
  imageFileName?: string;
  isSelfOrderingDisplay?: boolean;
  isOnlineStoreDisplay?: boolean;
  categoryCode?: string;
}

export type UpdateItemCategory = CreateItemCategory;

export interface CategoryItem extends ItemCategory {
  uniqueId: string;
  isSmartCategory: boolean;
  itemCount?: number;
  parentUniqueId?: string | null;
}
