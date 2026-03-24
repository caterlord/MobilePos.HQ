import api from './api';
import type {
  TaxationDetail,
  TaxationSummary,
  UpsertTaxationPayload,
  SurchargeDetail,
  SurchargeSummary,
  UpsertSurchargePayload,
} from '../types/taxSurcharge';

class TaxSurchargeService {
  // ── Taxation ──

  async listTaxation(brandId: number): Promise<TaxationSummary[]> {
    const response = await api.get(`/tax-surcharge/brand/${brandId}/taxation`);
    return response.data;
  }

  async getTaxation(brandId: number, taxationId: number): Promise<TaxationDetail> {
    const response = await api.get(`/tax-surcharge/brand/${brandId}/taxation/${taxationId}`);
    return response.data as TaxationDetail;
  }

  async createTaxation(brandId: number, payload: UpsertTaxationPayload): Promise<TaxationSummary> {
    const response = await api.post(`/tax-surcharge/brand/${brandId}/taxation`, payload);
    return response.data;
  }

  async updateTaxation(brandId: number, taxationId: number, payload: UpsertTaxationPayload): Promise<TaxationSummary> {
    const response = await api.put(`/tax-surcharge/brand/${brandId}/taxation/${taxationId}`, payload);
    return response.data as TaxationSummary;
  }

  async deactivateTaxation(brandId: number, taxationId: number): Promise<void> {
    await api.delete(`/tax-surcharge/brand/${brandId}/taxation/${taxationId}`);
  }

  // ── Surcharge ──

  async listSurcharge(brandId: number): Promise<SurchargeSummary[]> {
    const response = await api.get(`/tax-surcharge/brand/${brandId}/surcharge`);
    return response.data;
  }

  async getSurcharge(brandId: number, serviceChargeId: number): Promise<SurchargeDetail> {
    const response = await api.get(`/tax-surcharge/brand/${brandId}/surcharge/${serviceChargeId}`);
    return response.data as SurchargeDetail;
  }

  async createSurcharge(brandId: number, payload: UpsertSurchargePayload): Promise<SurchargeSummary> {
    const response = await api.post(`/tax-surcharge/brand/${brandId}/surcharge`, payload);
    return response.data;
  }

  async updateSurcharge(brandId: number, serviceChargeId: number, payload: UpsertSurchargePayload): Promise<SurchargeSummary> {
    const response = await api.put(`/tax-surcharge/brand/${brandId}/surcharge/${serviceChargeId}`, payload);
    return response.data as SurchargeSummary;
  }

  async deactivateSurcharge(brandId: number, serviceChargeId: number): Promise<void> {
    await api.delete(`/tax-surcharge/brand/${brandId}/surcharge/${serviceChargeId}`);
  }
}

export default new TaxSurchargeService();
