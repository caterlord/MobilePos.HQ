import api from './api';
import type {
  OnlineOrderingCallToActionSettings,
  OnlineOrderingDisplayOrderEntry,
  OnlineOrderingDisplayOrderNode,
  OnlineOrderingGeneralSettings,
  OnlineOrderingLookups,
  OnlineOrderingMenuCombination,
  OnlineOrderingUiI18nDocument,
  OnlineOrderingUiI18nEntry,
  OnlineOrderingUiI18nResponse,
  UpsertOnlineOrderingMenuCombinationPayload,
  UpsertOnlineOrderingMenuCombinationRequest,
} from '../types/onlineOrdering';

class OnlineOrderingService {
  async getLookups(brandId: number): Promise<OnlineOrderingLookups> {
    const [response, tree] = await Promise.all([
      api.get(`/online-ordering/brand/${brandId}/lookups`),
      this.getDisplayOrder(brandId),
    ]);
    const base = response.data as Partial<OnlineOrderingLookups>;
    const flattened = this.flattenTree(tree);
    return {
      shops: base.shops ?? [],
      orderChannels: base.orderChannels ?? [],
      categories: base.smartCategories ?? [],
      smartCategories: base.smartCategories ?? [],
      languages: base.languages ?? ['en', 'zh-HK'],
      summary: {
        odoCategoryCount: base.summary?.odoCategoryCount ?? (base.smartCategories ?? []).length,
        odoItemCount: base.summary?.odoItemCount ?? flattened.reduce((sum, node) => sum + node.itemCount, 0),
        odoModifierGroupCount: base.summary?.odoModifierGroupCount ?? 0,
        odoMealSetCount: base.summary?.odoMealSetCount ?? 0,
      },
    };
  }

  async getDisplayOrder(brandId: number): Promise<OnlineOrderingDisplayOrderNode[]> {
    const response = await api.get(`/online-ordering/brand/${brandId}/display-order`);
    return response.data;
  }

  async updateDisplayOrder(brandId: number, categories: OnlineOrderingDisplayOrderEntry[]): Promise<void> {
    await api.put(`/online-ordering/brand/${brandId}/display-order`, { categories });
  }

  async getSettings(brandId: number): Promise<OnlineOrderingGeneralSettings> {
    const response = await api.get(`/online-ordering/brand/${brandId}/settings`);
    return response.data;
  }

  async updateSettings(brandId: number, payload: OnlineOrderingGeneralSettings): Promise<OnlineOrderingGeneralSettings> {
    const response = await api.put(`/online-ordering/brand/${brandId}/settings`, payload);
    return response.data;
  }

  async getCallToActionSettings(brandId: number): Promise<OnlineOrderingCallToActionSettings> {
    const response = await api.get(`/online-ordering/brand/${brandId}/call-to-action`);
    return response.data;
  }

  async updateCallToActionSettings(
    brandId: number,
    payload: OnlineOrderingCallToActionSettings,
  ): Promise<OnlineOrderingCallToActionSettings> {
    const response = await api.put(`/online-ordering/brand/${brandId}/call-to-action`, payload);
    return response.data;
  }

  async getUiI18n(brandId: number): Promise<OnlineOrderingUiI18nResponse> {
    const response = await api.get(`/online-ordering/brand/${brandId}/ui-i18n`);
    return response.data;
  }

  async updateUiI18n(
    brandId: number,
    payload: OnlineOrderingUiI18nEntry[] | OnlineOrderingUiI18nDocument,
  ): Promise<OnlineOrderingUiI18nResponse> {
    const document = Array.isArray(payload) ? { entries: payload } : payload;
    const response = await api.put(`/online-ordering/brand/${brandId}/ui-i18n`, document);
    return response.data;
  }

  async getMenuCombinations(brandId: number): Promise<OnlineOrderingMenuCombination[]> {
    const [response, lookups] = await Promise.all([
      api.get(`/online-ordering/brand/${brandId}/menu-combinations`),
      this.getLookups(brandId),
    ]);
    const combinations = response.data as Array<OnlineOrderingMenuCombination & { categoryIds?: number[]; shopIds?: number[] }>;

    return combinations.map((combination) => ({
      ...combination,
      categories: (combination.categoryIds ?? []).map((categoryId) => ({
        categoryId,
        isSmartCategory: true,
        name: lookups.smartCategories.find((entry) => entry.id === categoryId)?.name ?? `Category #${categoryId}`,
      })),
      shops: (combination.shopIds ?? []).map((shopId) => ({
        shopId,
        shopName: lookups.shops.find((entry) => entry.id === shopId)?.name ?? `Shop #${shopId}`,
        enabled: true,
        isPublicDisplay: true,
        daysOfWeek: '',
        dates: '',
        months: '',
        displayFromTime: '',
        displayToTime: '',
      })),
    }));
  }

  async listMenuCombinations(brandId: number): Promise<OnlineOrderingMenuCombination[]> {
    return this.getMenuCombinations(brandId);
  }

  async createMenuCombination(
    brandId: number,
    payload: UpsertOnlineOrderingMenuCombinationRequest | UpsertOnlineOrderingMenuCombinationPayload,
  ): Promise<OnlineOrderingMenuCombination> {
    const response = await api.post(`/online-ordering/brand/${brandId}/menu-combinations`, this.normalizeMenuCombinationPayload(payload));
    return response.data;
  }

  async updateMenuCombination(
    brandId: number,
    menuId: number,
    payload: UpsertOnlineOrderingMenuCombinationRequest | UpsertOnlineOrderingMenuCombinationPayload,
  ): Promise<OnlineOrderingMenuCombination> {
    const response = await api.put(
      `/online-ordering/brand/${brandId}/menu-combinations/${menuId}`,
      this.normalizeMenuCombinationPayload(payload),
    );
    return response.data;
  }

  async deleteMenuCombination(brandId: number, menuId: number): Promise<void> {
    await api.delete(`/online-ordering/brand/${brandId}/menu-combinations/${menuId}`);
  }

  // ── Per-Shop Settings ──

  async getShopSettingsList(brandId: number): Promise<{ shopId: number; shopName: string; hasSettings: boolean; odoEnabled: boolean }[]> {
    const response = await api.get(`/online-ordering/brand/${brandId}/shop-settings`);
    return response.data;
  }

  async getShopSettings(brandId: number, shopId: number): Promise<Record<string, unknown>> {
    const response = await api.get(`/online-ordering/brand/${brandId}/shop-settings/${shopId}`);
    return response.data;
  }

  async updateShopSettings(brandId: number, shopId: number, settings: Record<string, unknown>): Promise<void> {
    await api.put(`/online-ordering/brand/${brandId}/shop-settings/${shopId}`, settings);
  }

  private normalizeMenuCombinationPayload(
    payload: UpsertOnlineOrderingMenuCombinationRequest | UpsertOnlineOrderingMenuCombinationPayload,
  ): UpsertOnlineOrderingMenuCombinationPayload {
    if ('categoryIds' in payload) {
      return payload;
    }

    return {
      menuName: payload.menuName,
      menuNameAlt: payload.menuNameAlt ?? '',
      menuCode: payload.menuCode ?? '',
      displayOrder: payload.displayOrder,
      enabled: payload.enabled,
      isPublished: payload.isPublished,
      isOdoDisplay: payload.isOdoDisplay,
      isFoodpandaMealForOne: payload.isFoodpandaMealForOne,
      categoryIds: payload.categories.map((category) => category.categoryId),
      shopIds: payload.shops.map((shop) => shop.shopId),
    };
  }

  private flattenTree(nodes: OnlineOrderingDisplayOrderNode[]): OnlineOrderingDisplayOrderNode[] {
    return nodes.flatMap((node) => [node, ...this.flattenTree(node.children)]);
  }
}

export default new OnlineOrderingService();
