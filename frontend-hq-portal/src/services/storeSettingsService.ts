import api from './api';

export interface StoreSettingsShop {
  shopId: number;
  shopName: string;
  enabled: boolean;
}

export interface StoreWorkdayEntry {
  workdayHeaderId: number;
  day: string;
  openTime: string;
  closeTime: string;
  dayDelta: number;
  enabled: boolean;
}

export interface StoreInfoSettings {
  shopId: number;
  name: string;
  altName: string;
  description: string;
  altDesc: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  altAddressLine1: string;
  altAddressLine2: string;
  altAddressLine3: string;
  altAddressLine4: string;
  district: string;
  city: string;
  country: string;
  telephone: string;
  fax: string;
  intCallingCode: string;
  contact1: string;
  contactTitle1: string;
  contact2: string;
  contactTitle2: string;
  shopCode: string;
  currencyCode: string;
  currencySymbol: string;
  addressForDelivery: string;
  addressLat?: number | null;
  addressLong?: number | null;
  ianaTimeZone: string;
  timeZoneId?: number | null;
  timeZoneValue?: number | null;
  timeZoneUseDaylightTime?: boolean | null;
  enabled: boolean;
}

export interface UpdateStoreInfoSettingsRequest {
  name: string;
  altName: string;
  description: string;
  altDesc: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  altAddressLine1: string;
  altAddressLine2: string;
  altAddressLine3: string;
  altAddressLine4: string;
  district: string;
  city: string;
  country: string;
  telephone: string;
  fax: string;
  intCallingCode: string;
  contact1: string;
  contactTitle1: string;
  contact2: string;
  contactTitle2: string;
  shopCode: string;
  currencyCode: string;
  currencySymbol: string;
  addressForDelivery: string;
  addressLat?: number | null;
  addressLong?: number | null;
  ianaTimeZone: string;
  timeZoneId?: number | null;
  timeZoneValue?: number | null;
  timeZoneUseDaylightTime?: boolean | null;
  enabled: boolean;
}

export interface StoreWorkdayPeriod {
  workdayPeriodId: number;
  workdayHeaderId: number;
  periodName: string;
  fromTime: string;
  toTime: string;
  dayDelta: number;
  enabled: boolean;
  workdayPeriodMasterId: number | null;
}

export interface ReplaceStoreWorkdayPeriodsRequest {
  periods: StoreWorkdayPeriod[];
}

export interface StoreServiceArea {
  zoneId: number;
  zoneName: string;
  zoneTypeId: number;
  deliveryShopId: number;
  minAmount: number;
  deliveryFee: number;
  shape: string;
  color: string;
  shapeType: string;
  enabled: boolean;
}

export interface StoreSystemParameter {
  paramId: number;
  paramCode: string;
  description: string;
  paramValue: string;
  enabled: boolean;
}

export interface StoreSettingsSnapshot {
  shopId: number;
  workdayEntries: StoreWorkdayEntry[];
  serviceAreas: StoreServiceArea[];
  systemParameters: StoreSystemParameter[];
}

export interface StoreSettingsAuditLog {
  logId: number;
  shopId: number;
  category: string;
  actionName: string;
  actionRefId: string;
  actionRefDescription: string;
  details: string;
  actionUserName: string;
  loggedAt: string;
}

export interface UpdateStoreWorkdayRequest {
  entries: StoreWorkdayEntry[];
}

export interface ReplaceStoreServiceAreasRequest {
  areas: StoreServiceArea[];
}

export interface UpsertStoreSystemParameterRequest {
  description: string;
  paramValue: string;
  enabled: boolean;
}

const unwrap = <T>(response: { data: T }): T => response.data;

const storeSettingsService = {
  async getShops(brandId: number): Promise<StoreSettingsShop[]> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/shops`));
  },

  async getShopInfo(brandId: number, shopId: number): Promise<StoreInfoSettings> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/shops/${shopId}/info`));
  },

  async updateShopInfo(
    brandId: number,
    shopId: number,
    payload: UpdateStoreInfoSettingsRequest,
  ): Promise<StoreInfoSettings> {
    return unwrap(await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/info`, payload));
  },

  async getSnapshot(brandId: number, shopId: number): Promise<StoreSettingsSnapshot> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/shops/${shopId}/snapshot`));
  },

  async updateWorkday(brandId: number, shopId: number, payload: UpdateStoreWorkdayRequest): Promise<StoreWorkdayEntry[]> {
    return unwrap(await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/workday`, payload));
  },

  async getWorkdayPeriods(brandId: number, shopId: number): Promise<StoreWorkdayPeriod[]> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/shops/${shopId}/workday-periods`));
  },

  async replaceWorkdayPeriods(
    brandId: number,
    shopId: number,
    payload: ReplaceStoreWorkdayPeriodsRequest,
  ): Promise<StoreWorkdayPeriod[]> {
    return unwrap(await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/workday-periods`, payload));
  },

  async replaceServiceAreas(brandId: number, shopId: number, payload: ReplaceStoreServiceAreasRequest): Promise<StoreServiceArea[]> {
    return unwrap(await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/service-areas`, payload));
  },

  async upsertSystemParameter(
    brandId: number,
    shopId: number,
    paramCode: string,
    payload: UpsertStoreSystemParameterRequest,
  ): Promise<StoreSystemParameter> {
    return unwrap(await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/system-parameters/${encodeURIComponent(paramCode)}`, payload));
  },

  async getAuditLogs(
    brandId: number,
    options?: { shopId?: number; limit?: number },
  ): Promise<StoreSettingsAuditLog[]> {
    const query = new URLSearchParams();
    if (options?.shopId && options.shopId > 0) {
      query.set('shopId', String(options.shopId));
    }
    if (options?.limit && options.limit > 0) {
      query.set('limit', String(options.limit));
    }

    const suffix = query.toString();
    return unwrap(await api.get(`/store-settings/brand/${brandId}/audit-logs${suffix ? `?${suffix}` : ''}`));
  },
  // ── Period Masters ──

  async getPeriodMasters(brandId: number): Promise<WorkdayPeriodMaster[]> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/period-masters`));
  },

  async createPeriodMaster(brandId: number, payload: UpsertWorkdayPeriodMaster): Promise<WorkdayPeriodMaster> {
    return unwrap(await api.post(`/store-settings/brand/${brandId}/period-masters`, payload));
  },

  async updatePeriodMaster(brandId: number, masterId: number, payload: UpsertWorkdayPeriodMaster, cascadeRename = false): Promise<WorkdayPeriodMaster> {
    const qs = cascadeRename ? '?cascadeRename=true' : '';
    return unwrap(await api.put(`/store-settings/brand/${brandId}/period-masters/${masterId}${qs}`, payload));
  },

  async deactivatePeriodMaster(brandId: number, masterId: number): Promise<void> {
    await api.delete(`/store-settings/brand/${brandId}/period-masters/${masterId}`);
  },
};

export interface WorkdayPeriodMaster {
  workdayPeriodMasterId: number;
  accountId: number;
  periodName: string;
  periodCode: string;
  defaultFromTime?: string | null;
  defaultToTime?: string | null;
  dayDelta?: number | null;
  enabled: boolean;
  usageCount: number;
}

export interface UpsertWorkdayPeriodMaster {
  periodName: string;
  periodCode: string;
  defaultFromTime?: string | null;
  defaultToTime?: string | null;
  dayDelta?: number | null;
}

export default storeSettingsService;
