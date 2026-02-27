import api from './api';

export interface DeviceTerminalModelOption {
  deviceTerminalModelId: number;
  deviceTerminalModelCode: string;
  deviceTerminalModelName: string;
  defaultResolutionWidth: number;
  defaultResolutionHeight: number;
}

export interface DeviceTerminal {
  terminalId: number;
  shopId: number;
  posCode: string;
  posIpAddress: string;
  isServer: boolean;
  isCashRegister: boolean;
  cashRegisterCode: string;
  deviceTerminalModelId: number;
  deviceModelName: string;
  resolutionWidth: number;
  resolutionHeight: number;
  resolutionForDisplay: string;
  isConfigFileUploaded: boolean;
  isActivated: boolean;
  enabled: boolean;
}

export interface DeviceTerminalConfigFile {
  terminalId: number;
  shopId: number;
  posCode: string;
  isConfigFileUploaded: boolean;
  configFile: string;
}

export interface UpsertDeviceTerminalRequest {
  posCode: string;
  posIpAddress: string;
  isServer: boolean;
  isCashRegister: boolean;
  cashRegisterCode: string;
  deviceTerminalModelId: number;
  resolutionWidth: number;
  resolutionHeight: number;
}

export interface DevicePrinter {
  shopPrinterMasterId: number;
  shopId: number;
  printerName: string;
  isKds: boolean;
  isLabelPrinter: boolean;
  isDinein: boolean;
  isTakeaway: boolean;
  autoRedirectPrinterIdList: number[];
}

export interface UpsertDevicePrinterRequest {
  printerName: string;
  isKds: boolean;
  isLabelPrinter: boolean;
  isDinein: boolean;
  isTakeaway: boolean;
  autoRedirectPrinterIdList: number[];
}

export interface CashDrawer {
  cashDrawerCode: string;
  cashDrawerName: string;
  shopId: number;
  enabled: boolean;
}

export interface UpsertCashDrawerRequest {
  cashDrawerName: string;
}

const unwrap = <T>(response: { data: T }): T => response.data;

const deviceSettingsService = {
  async getTerminalModels(brandId: number, shopId: number): Promise<DeviceTerminalModelOption[]> {
    return unwrap(await api.get(`/device-settings/brand/${brandId}/shops/${shopId}/terminal-models`));
  },

  async getTerminals(brandId: number, shopId: number): Promise<DeviceTerminal[]> {
    return unwrap(await api.get(`/device-settings/brand/${brandId}/shops/${shopId}/terminals`));
  },

  async createTerminal(brandId: number, shopId: number, payload: UpsertDeviceTerminalRequest): Promise<DeviceTerminal> {
    return unwrap(await api.post(`/device-settings/brand/${brandId}/shops/${shopId}/terminals`, payload));
  },

  async updateTerminal(
    brandId: number,
    shopId: number,
    terminalId: number,
    payload: UpsertDeviceTerminalRequest,
  ): Promise<DeviceTerminal> {
    return unwrap(await api.put(`/device-settings/brand/${brandId}/shops/${shopId}/terminals/${terminalId}`, payload));
  },

  async deleteTerminal(brandId: number, shopId: number, terminalId: number): Promise<void> {
    await api.delete(`/device-settings/brand/${brandId}/shops/${shopId}/terminals/${terminalId}`);
  },

  async getTerminalConfigFile(brandId: number, shopId: number, terminalId: number): Promise<DeviceTerminalConfigFile> {
    return unwrap(await api.get(`/device-settings/brand/${brandId}/shops/${shopId}/terminals/${terminalId}/config-file`));
  },

  async getPrinters(brandId: number, shopId: number): Promise<DevicePrinter[]> {
    return unwrap(await api.get(`/device-settings/brand/${brandId}/shops/${shopId}/printers`));
  },

  async createPrinter(brandId: number, shopId: number, payload: UpsertDevicePrinterRequest): Promise<DevicePrinter> {
    return unwrap(await api.post(`/device-settings/brand/${brandId}/shops/${shopId}/printers`, payload));
  },

  async updatePrinter(
    brandId: number,
    shopId: number,
    printerId: number,
    payload: UpsertDevicePrinterRequest,
  ): Promise<DevicePrinter> {
    return unwrap(await api.put(`/device-settings/brand/${brandId}/shops/${shopId}/printers/${printerId}`, payload));
  },

  async deletePrinter(brandId: number, shopId: number, printerId: number): Promise<void> {
    await api.delete(`/device-settings/brand/${brandId}/shops/${shopId}/printers/${printerId}`);
  },

  async getCashDrawers(brandId: number, shopId: number): Promise<CashDrawer[]> {
    return unwrap(await api.get(`/device-settings/brand/${brandId}/shops/${shopId}/cash-drawers`));
  },

  async createCashDrawer(brandId: number, shopId: number, payload: UpsertCashDrawerRequest): Promise<CashDrawer> {
    return unwrap(await api.post(`/device-settings/brand/${brandId}/shops/${shopId}/cash-drawers`, payload));
  },

  async updateCashDrawer(
    brandId: number,
    shopId: number,
    cashDrawerCode: string,
    payload: UpsertCashDrawerRequest,
  ): Promise<CashDrawer> {
    return unwrap(await api.put(`/device-settings/brand/${brandId}/shops/${shopId}/cash-drawers/${encodeURIComponent(cashDrawerCode)}`, payload));
  },

  async deleteCashDrawer(brandId: number, shopId: number, cashDrawerCode: string): Promise<void> {
    await api.delete(`/device-settings/brand/${brandId}/shops/${shopId}/cash-drawers/${encodeURIComponent(cashDrawerCode)}`);
  },
};

export default deviceSettingsService;
