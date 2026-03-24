import api from './api';
import type {
  PaymentMethodDetail,
  PaymentMethodSummary,
  UpsertPaymentMethodPayload,
} from '../types/paymentMethod';

class PaymentMethodService {
  async list(brandId: number): Promise<PaymentMethodSummary[]> {
    const response = await api.get(`/payment-methods/brand/${brandId}`);
    return response.data;
  }

  async get(brandId: number, paymentMethodId: number): Promise<PaymentMethodDetail> {
    const response = await api.get(`/payment-methods/brand/${brandId}/${paymentMethodId}`);
    return response.data as PaymentMethodDetail;
  }

  async create(brandId: number, payload: UpsertPaymentMethodPayload): Promise<PaymentMethodSummary> {
    const response = await api.post(`/payment-methods/brand/${brandId}`, payload);
    return response.data;
  }

  async update(
    brandId: number,
    paymentMethodId: number,
    payload: UpsertPaymentMethodPayload,
  ): Promise<PaymentMethodSummary> {
    const response = await api.put(`/payment-methods/brand/${brandId}/${paymentMethodId}`, payload);
    return response.data as PaymentMethodSummary;
  }

  async deactivate(brandId: number, paymentMethodId: number): Promise<void> {
    await api.delete(`/payment-methods/brand/${brandId}/${paymentMethodId}`);
  }
}

export default new PaymentMethodService();
