import api from './api';
import type { DepartmentSummary, UpsertDepartmentPayload } from '../types/department';

class DepartmentService {
  async list(brandId: number): Promise<DepartmentSummary[]> {
    const response = await api.get(`/departments/brand/${brandId}`);
    return response.data;
  }

  async create(brandId: number, payload: UpsertDepartmentPayload): Promise<DepartmentSummary> {
    const response = await api.post(`/departments/brand/${brandId}`, payload);
    return response.data;
  }

  async update(brandId: number, departmentId: number, payload: UpsertDepartmentPayload): Promise<DepartmentSummary> {
    const response = await api.put(`/departments/brand/${brandId}/${departmentId}`, payload);
    return response.data as DepartmentSummary;
  }

  async deactivate(brandId: number, departmentId: number): Promise<void> {
    await api.delete(`/departments/brand/${brandId}/${departmentId}`);
  }
}

export default new DepartmentService();
