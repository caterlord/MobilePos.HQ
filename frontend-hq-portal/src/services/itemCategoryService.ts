import api from './api';
import type { ItemCategory, CreateItemCategory, UpdateItemCategory } from '../types/itemCategory';

class ItemCategoryService {
  async getItemCategories(brandId: number, categoryTypeId?: number): Promise<ItemCategory[]> {
    const params = categoryTypeId != null ? `?categoryTypeId=${categoryTypeId}` : '';
    const response = await api.get(`/item-categories/brand/${brandId}${params}`);
    return response.data;
  }

  async getItemCategory(brandId: number, categoryId: number): Promise<ItemCategory> {
    const response = await api.get(`/item-categories/brand/${brandId}/${categoryId}`);
    return response.data;
  }

  async createItemCategory(brandId: number, category: CreateItemCategory): Promise<ItemCategory> {
    const response = await api.post(`/item-categories/brand/${brandId}`, category);
    return response.data;
  }

  async updateItemCategory(
    brandId: number,
    categoryId: number,
    category: UpdateItemCategory
  ): Promise<void> {
    await api.put(`/item-categories/brand/${brandId}/${categoryId}`, category);
  }

  async deleteItemCategory(brandId: number, categoryId: number): Promise<void> {
    await api.delete(`/item-categories/brand/${brandId}/${categoryId}`);
  }
}

export default new ItemCategoryService();
