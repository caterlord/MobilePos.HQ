import api from './api';

export interface TableSection {
  sectionId: number;
  sectionName: string;
  description: string;
  enabled: boolean;
  tableCount: number;
}

export interface TableSectionLibraryItem {
  sectionId: number;
  sectionName: string;
  description: string;
  enabled: boolean;
  shopCount: number;
}

export interface TableSectionShopLink {
  sectionId: number;
  shopId: number;
  sectionName: string;
  description: string;
  enabled: boolean;
  tableCount: number;
  tableMapBackgroundImagePath: string;
  tableMapBackgroundImageWidth: number | null;
  tableMapBackgroundImageHeight: number | null;
}

export interface UpsertTableSectionRequest {
  sectionName: string;
  description: string;
}

export interface LinkTableSectionToShopRequest {
  sectionId: number;
  tableMapBackgroundImagePath: string;
  tableMapBackgroundImageWidth: number | null;
  tableMapBackgroundImageHeight: number | null;
}

export interface UpdateTableSectionShopLinkRequest {
  tableMapBackgroundImagePath: string;
  tableMapBackgroundImageWidth: number | null;
  tableMapBackgroundImageHeight: number | null;
}

export interface TableTypeOption {
  tableTypeId: number;
  typeName: string;
}

export interface TableStatusOption {
  tableStatusId: number;
  statusName: string;
}

export interface TablePrinterOption {
  shopPrinterMasterId: number;
  printerName: string;
}

export interface TableSettingsMetadata {
  tableTypes: TableTypeOption[];
  tableStatuses: TableStatusOption[];
  printers: TablePrinterOption[];
}

export interface TableMaster {
  tableId: number;
  shopId: number;
  tableCode: string;
  sectionId: number;
  sectionName: string;
  tableTypeId: number;
  tableTypeName: string;
  displayIndex: number | null;
  isTakeAway: boolean;
  seatNum: number | null;
  shopPrinterMasterId: number | null;
  shopPrinterName: string;
  positionX: number | null;
  positionY: number | null;
  isAppearOnFloorPlan: boolean;
  shapeType: string;
  iconWidth: number | null;
  iconHeight: number | null;
  rotation: number | null;
  enabled: boolean;
}

export interface UpsertTableMasterRequest {
  tableCode: string;
  sectionId: number;
  tableTypeId: number;
  displayIndex: number | null;
  isTakeAway: boolean;
  seatNum: number | null;
  shopPrinterMasterId: number | null;
  positionX: number | null;
  positionY: number | null;
  isAppearOnFloorPlan: boolean;
  shapeType: string;
  iconWidth: number | null;
  iconHeight: number | null;
  rotation: number | null;
}

const unwrap = <T>(response: { data: T }): T => response.data;

const tableSettingsService = {
  async getMetadata(brandId: number, shopId: number): Promise<TableSettingsMetadata> {
    return unwrap(await api.get(`/table-settings/brand/${brandId}/shops/${shopId}/metadata`));
  },

  async getSections(brandId: number, shopId: number): Promise<TableSection[]> {
    return unwrap(await api.get(`/table-settings/brand/${brandId}/shops/${shopId}/sections`));
  },

  async getSectionLibrary(brandId: number): Promise<TableSectionLibraryItem[]> {
    return unwrap(await api.get(`/table-settings/brand/${brandId}/sections/library`));
  },

  async createSectionLibrary(brandId: number, payload: UpsertTableSectionRequest): Promise<TableSectionLibraryItem> {
    return unwrap(await api.post(`/table-settings/brand/${brandId}/sections`, payload));
  },

  async updateSectionLibrary(
    brandId: number,
    sectionId: number,
    payload: UpsertTableSectionRequest,
  ): Promise<TableSectionLibraryItem> {
    return await api.put(`/table-settings/brand/${brandId}/sections/${sectionId}`, payload);
  },

  async deleteSectionLibrary(brandId: number, sectionId: number): Promise<void> {
    await api.delete(`/table-settings/brand/${brandId}/sections/${sectionId}`);
  },

  async getShopSectionLinks(brandId: number, shopId: number): Promise<TableSectionShopLink[]> {
    return unwrap(await api.get(`/table-settings/brand/${brandId}/shops/${shopId}/section-links`));
  },

  async createShopSectionLink(
    brandId: number,
    shopId: number,
    payload: LinkTableSectionToShopRequest,
  ): Promise<TableSectionShopLink> {
    return unwrap(await api.post(`/table-settings/brand/${brandId}/shops/${shopId}/section-links`, payload));
  },

  async updateShopSectionLink(
    brandId: number,
    shopId: number,
    sectionId: number,
    payload: UpdateTableSectionShopLinkRequest,
  ): Promise<TableSectionShopLink> {
    return await api.put(`/table-settings/brand/${brandId}/shops/${shopId}/section-links/${sectionId}`, payload);
  },

  async deleteShopSectionLink(brandId: number, shopId: number, sectionId: number): Promise<void> {
    await api.delete(`/table-settings/brand/${brandId}/shops/${shopId}/section-links/${sectionId}`);
  },

  async createSection(brandId: number, shopId: number, payload: UpsertTableSectionRequest): Promise<TableSection> {
    return unwrap(await api.post(`/table-settings/brand/${brandId}/shops/${shopId}/sections`, payload));
  },

  async updateSection(
    brandId: number,
    shopId: number,
    sectionId: number,
    payload: UpsertTableSectionRequest,
  ): Promise<TableSection> {
    return await api.put(`/table-settings/brand/${brandId}/shops/${shopId}/sections/${sectionId}`, payload);
  },

  async deleteSection(brandId: number, shopId: number, sectionId: number): Promise<void> {
    await api.delete(`/table-settings/brand/${brandId}/shops/${shopId}/sections/${sectionId}`);
  },

  async getTables(brandId: number, shopId: number, sectionId?: number): Promise<TableMaster[]> {
    const query = sectionId && sectionId > 0 ? `?sectionId=${sectionId}` : '';
    return unwrap(await api.get(`/table-settings/brand/${brandId}/shops/${shopId}/tables${query}`));
  },

  async createTable(brandId: number, shopId: number, payload: UpsertTableMasterRequest): Promise<TableMaster> {
    return unwrap(await api.post(`/table-settings/brand/${brandId}/shops/${shopId}/tables`, payload));
  },

  async updateTable(
    brandId: number,
    shopId: number,
    tableId: number,
    payload: UpsertTableMasterRequest,
  ): Promise<TableMaster> {
    return await api.put(`/table-settings/brand/${brandId}/shops/${shopId}/tables/${tableId}`, payload);
  },

  async deleteTable(brandId: number, shopId: number, tableId: number): Promise<void> {
    await api.delete(`/table-settings/brand/${brandId}/shops/${shopId}/tables/${tableId}`);
  },
};

export default tableSettingsService;
