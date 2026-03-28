import api from './api';
import type {
  MenuItemListQuery,
  MenuItemListResponse,
  MenuItemDetail,
  MenuItemUpsertPayload,
  MenuItemLookups,
  MenuItemPrice,
  MenuItemShopAvailability,
  UpdateMenuItemPricePayload,
  UpdateMenuItemAvailabilityPayload,
  MenuItemReorderPayload,
  ItemModifierMappings,
  UpdateItemModifierMappingsPayload,
  ItemRelationshipTree,
  UpdateItemRelationshipTreePayload,
} from '../types/menuItem';
import type { ModifierGroupPreview } from '../types/modifierGroup';

const buildQueryString = (query: MenuItemListQuery): string => {
  const params = new URLSearchParams();

  if (query.categoryId) params.set('categoryId', String(query.categoryId));
  if (query.search) params.set('search', query.search);
  if (query.includeDisabled) params.set('includeDisabled', 'true');
  if (query.hasModifier !== undefined) params.set('hasModifier', query.hasModifier ? 'true' : 'false');
  if (query.isPromoItem !== undefined) params.set('isPromoItem', query.isPromoItem ? 'true' : 'false');
  if (query.itemType) params.set('itemType', query.itemType);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortDirection) params.set('sortDirection', query.sortDirection);
  if (query.page) params.set('page', String(query.page));
  if (query.pageSize) params.set('pageSize', String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
};

class MenuItemService {
  async getMenuItems(brandId: number, query: MenuItemListQuery): Promise<MenuItemListResponse> {
    const response = await api.get(`/menu-items/brand/${brandId}${buildQueryString(query)}`);
    return response.data;
  }

  async getMenuItem(brandId: number, itemId: number): Promise<MenuItemDetail> {
    const response = await api.get(`/menu-items/brand/${brandId}/${itemId}`);
    return response.data;
  }

  private lookupsCache = new Map<number, Promise<MenuItemLookups>>();

  async getLookups(brandId: number, options: { force?: boolean } = {}): Promise<MenuItemLookups> {
    if (!options.force && this.lookupsCache.has(brandId)) {
      return this.lookupsCache.get(brandId)!;
    }

    const promise = api
      .get(`/menu-items/brand/${brandId}/lookups`)
      .then((response) => response.data)
      .finally(() => {
        if (options.force) {
          this.lookupsCache.delete(brandId);
        }
      });

    if (!options.force) {
      this.lookupsCache.set(brandId, promise);
    }

    return promise;
  }

  async createMenuItem(brandId: number, payload: MenuItemUpsertPayload): Promise<MenuItemDetail> {
    const response = await api.post(`/menu-items/brand/${brandId}`, payload);
    return response.data;
  }

  async updateMenuItem(brandId: number, itemId: number, payload: MenuItemUpsertPayload): Promise<void> {
    await api.put(`/menu-items/brand/${brandId}/${itemId}`, payload);
  }

  async updateMenuItemPrice(
    brandId: number,
    itemId: number,
    shopId: number,
    payload: UpdateMenuItemPricePayload,
  ): Promise<MenuItemPrice> {
    const response = await api.put(`/menu-items/brand/${brandId}/${itemId}/prices/${shopId}`, payload);
    return response.data;
  }

  async updateMenuItemAvailability(
    brandId: number,
    itemId: number,
    shopId: number,
    payload: UpdateMenuItemAvailabilityPayload,
  ): Promise<MenuItemShopAvailability> {
    const response = await api.put(`/menu-items/brand/${brandId}/${itemId}/availability/${shopId}`, payload);
    return response.data;
  }

  async getItemModifierMappings(brandId: number, itemId: number): Promise<ItemModifierMappings> {
    const response = await api.get(`/menu-items/brand/${brandId}/${itemId}/modifiers`);
    return response.data;
  }

  async getModifierGroupPreview(brandId: number, groupHeaderId: number): Promise<ModifierGroupPreview> {
    const response = await api.get(`/menu-items/brand/${brandId}/modifier-groups/${groupHeaderId}/preview`);
    return response.data;
  }

  async updateItemModifierMappings(
    brandId: number,
    itemId: number,
    payload: UpdateItemModifierMappingsPayload,
  ): Promise<ItemModifierMappings> {
    const response = await api.put(`/menu-items/brand/${brandId}/${itemId}/modifiers`, payload);
    return response.data;
  }

  async getItemRelationships(brandId: number, itemId: number): Promise<ItemRelationshipTree> {
    const response = await api.get(`/menu-items/brand/${brandId}/${itemId}/relationships`);
    return response.data;
  }

  async updateItemRelationships(
    brandId: number,
    itemId: number,
    payload: UpdateItemRelationshipTreePayload,
  ): Promise<ItemRelationshipTree> {
    const response = await api.put(`/menu-items/brand/${brandId}/${itemId}/relationships`, payload);
    return response.data;
  }

  async reorderMenuItems(brandId: number, payload: MenuItemReorderPayload): Promise<void> {
    await api.put(`/menu-items/brand/${brandId}/reorder`, payload);
  }
}

export default new MenuItemService();
