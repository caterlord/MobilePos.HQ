import api from './api';
import type {
  SmartCategoryTreeNode,
  SmartCategoryDetail,
  SmartCategoryUpsertPayload,
  SmartCategoryItemAssignmentRequest,
  SmartCategoryDisplaySettingsPayload,
  SmartCategoryReorderRequest,
  LookupOptions,
} from '../types/smartCategory';

class SmartCategoryService {
  async getTree(brandId: number): Promise<SmartCategoryTreeNode[]> {
    const response = await api.get(`/smart-categories/brand/${brandId}`);
    return response.data;
  }

  async getLookups(brandId: number): Promise<LookupOptions> {
    const response = await api.get(`/smart-categories/brand/${brandId}/lookups`);
    return response.data;
  }

  async getDetail(brandId: number, smartCategoryId: number): Promise<SmartCategoryDetail> {
    const response = await api.get(`/smart-categories/brand/${brandId}/${smartCategoryId}`);
    return response.data;
  }

  async create(brandId: number, payload: SmartCategoryUpsertPayload): Promise<SmartCategoryDetail> {
    const response = await api.post(`/smart-categories/brand/${brandId}`, payload);
    return response.data;
  }

  async update(
    brandId: number,
    smartCategoryId: number,
    payload: SmartCategoryUpsertPayload,
  ): Promise<void> {
    await api.put(`/smart-categories/brand/${brandId}/${smartCategoryId}`, payload);
  }

  async remove(brandId: number, smartCategoryId: number): Promise<void> {
    await api.delete(`/smart-categories/brand/${brandId}/${smartCategoryId}`);
  }

  async reorder(brandId: number, payload: SmartCategoryReorderRequest): Promise<void> {
    await api.put(`/smart-categories/brand/${brandId}/reorder`, payload);
  }

  async upsertItems(
    brandId: number,
    smartCategoryId: number,
    payload: SmartCategoryItemAssignmentRequest,
  ): Promise<void> {
    await api.put(`/smart-categories/brand/${brandId}/${smartCategoryId}/items`, payload);
  }

  async updateDisplaySettings(
    brandId: number,
    smartCategoryId: number,
    payload: SmartCategoryDisplaySettingsPayload,
  ): Promise<void> {
    await api.put(`/smart-categories/brand/${brandId}/${smartCategoryId}/display-settings`, payload);
  }
}

export default new SmartCategoryService();
