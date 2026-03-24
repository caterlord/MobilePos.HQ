import api from './api';
import type { ReasonSummary, UpsertReasonPayload } from '../types/reason';

class ReasonService {
  async list(brandId: number): Promise<ReasonSummary[]> {
    const response = await api.get(`/reasons/brand/${brandId}`);
    return response.data;
  }

  async create(brandId: number, payload: UpsertReasonPayload): Promise<ReasonSummary> {
    const response = await api.post(`/reasons/brand/${brandId}`, payload);
    return response.data;
  }

  async update(brandId: number, reasonId: number, payload: UpsertReasonPayload): Promise<ReasonSummary> {
    const response = await api.put(`/reasons/brand/${brandId}/${reasonId}`, payload);
    return response.data as ReasonSummary;
  }

  async deactivate(brandId: number, reasonId: number): Promise<void> {
    await api.delete(`/reasons/brand/${brandId}/${reasonId}`);
  }
}

export default new ReasonService();
