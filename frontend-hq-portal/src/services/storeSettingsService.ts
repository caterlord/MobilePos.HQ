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
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  telephone: string;
  currencyCode: string;
  currencySymbol: string;
  enabled: boolean;
}

export interface UpdateStoreInfoSettingsRequest {
  name: string;
  altName: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
  telephone: string;
  currencyCode: string;
  currencySymbol: string;
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
    return await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/info`, payload) as StoreInfoSettings;
  },

  async getSnapshot(brandId: number, shopId: number): Promise<StoreSettingsSnapshot> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/shops/${shopId}/snapshot`));
  },

  async updateWorkday(brandId: number, shopId: number, payload: UpdateStoreWorkdayRequest): Promise<StoreWorkdayEntry[]> {
    return await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/workday`, payload) as StoreWorkdayEntry[];
  },

  async getWorkdayPeriods(brandId: number, shopId: number): Promise<StoreWorkdayPeriod[]> {
    return unwrap(await api.get(`/store-settings/brand/${brandId}/shops/${shopId}/workday-periods`));
  },

  async replaceWorkdayPeriods(
    brandId: number,
    shopId: number,
    payload: ReplaceStoreWorkdayPeriodsRequest,
  ): Promise<StoreWorkdayPeriod[]> {
    return await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/workday-periods`, payload) as StoreWorkdayPeriod[];
  },

  async replaceServiceAreas(brandId: number, shopId: number, payload: ReplaceStoreServiceAreasRequest): Promise<StoreServiceArea[]> {
    return await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/service-areas`, payload) as StoreServiceArea[];
  },

  async upsertSystemParameter(
    brandId: number,
    shopId: number,
    paramCode: string,
    payload: UpsertStoreSystemParameterRequest,
  ): Promise<StoreSystemParameter> {
    return await api.put(`/store-settings/brand/${brandId}/shops/${shopId}/system-parameters/${encodeURIComponent(paramCode)}`, payload) as StoreSystemParameter;
  },
};

export default storeSettingsService;
