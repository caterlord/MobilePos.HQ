export interface PosUserGroupSummary {
  groupId: number;
  accountId: number;
  name: string;
  altName: string;
  enabled: boolean;
  groupType?: string | null;
  modifiedDate: string;
  modifiedBy: string;
}

export interface UpsertPosUserGroupPayload {
  name: string;
  altName: string;
  enabled: boolean;
}

export interface PosUserSummary {
  userId: number;
  accountId: number;
  shopId: number;
  shopName: string;
  userName: string;
  userAltName?: string | null;
  staffCode?: string | null;
  cardNo?: string | null;
  inactiveUserAccount: boolean;
  enabled: boolean;
  enableUserIdLogin: boolean;
  enableCardNoLogin: boolean;
  enableStaffCodeLogin: boolean;
  modifiedDate: string;
  modifiedBy: string;
}

export interface UpsertPosUserPayload {
  userName: string;
  userAltName?: string | null;
  password: string;
  staffCode?: string | null;
  cardNo?: string | null;
  shopId: number;
  enabled: boolean;
  inactiveUserAccount: boolean;
  enableUserIdLogin: boolean;
  enableCardNoLogin: boolean;
  enableStaffCodeLogin: boolean;
}
