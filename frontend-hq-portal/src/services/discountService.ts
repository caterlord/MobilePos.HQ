import api from './api';
import type { DiscountSummary, UpsertDiscountPayload } from '../types/discount';

class DiscountService {
  async list(brandId: number): Promise<DiscountSummary[]> {
    const response = await api.get(`/discounts/brand/${brandId}`);
    return response.data;
  }

  async create(brandId: number, payload: UpsertDiscountPayload): Promise<DiscountSummary> {
    const response = await api.post(`/discounts/brand/${brandId}`, payload);
    return response.data;
  }

  async update(brandId: number, discountId: number, payload: UpsertDiscountPayload): Promise<DiscountSummary> {
    const response = await api.put(`/discounts/brand/${brandId}/${discountId}`, payload);
    return response;
  }

  async deactivate(brandId: number, discountId: number): Promise<void> {
    await api.delete(`/discounts/brand/${brandId}/${discountId}`);
  }
}

export default new DiscountService();
