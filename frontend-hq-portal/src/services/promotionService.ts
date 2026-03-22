import api from './api';
import type {
  PromotionRuleEditor,
  PromotionSummary,
  UpdatePromotionRuleEditorPayload,
  UpsertPromotionPayload,
} from '../types/promotion';

class PromotionService {
  async list(brandId: number): Promise<PromotionSummary[]> {
    const response = await api.get(`/promotions/brand/${brandId}`);
    return response.data;
  }

  async create(brandId: number, payload: UpsertPromotionPayload): Promise<PromotionSummary> {
    const response = await api.post(`/promotions/brand/${brandId}`, payload);
    return response.data;
  }

  async update(brandId: number, promoHeaderId: number, payload: UpsertPromotionPayload): Promise<PromotionSummary> {
    const response = await api.put(`/promotions/brand/${brandId}/${promoHeaderId}`, payload);
    return response.data as PromotionSummary;
  }

  async deactivate(brandId: number, promoHeaderId: number): Promise<void> {
    await api.delete(`/promotions/brand/${brandId}/${promoHeaderId}`);
  }

  async getRuleEditor(brandId: number, promoHeaderId: number): Promise<PromotionRuleEditor> {
    const response = await api.get(`/promotions/brand/${brandId}/${promoHeaderId}/rule-editor`);
    return response.data as PromotionRuleEditor;
  }

  async updateRuleEditor(
    brandId: number,
    promoHeaderId: number,
    payload: UpdatePromotionRuleEditorPayload,
  ): Promise<PromotionRuleEditor> {
    const response = await api.put(`/promotions/brand/${brandId}/${promoHeaderId}/rule-editor`, payload);
    return response.data as PromotionRuleEditor;
  }
}

export default new PromotionService();
