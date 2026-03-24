import api from './api';
import type {
  PosUserGroupSummary,
  UpsertPosUserGroupPayload,
  PosUserSummary,
  UpsertPosUserPayload,
} from '../types/posUser';

class PosUserService {
  // ── Groups ──

  async listGroups(brandId: number): Promise<PosUserGroupSummary[]> {
    const response = await api.get(`/pos-users/brand/${brandId}/groups`);
    return response.data;
  }

  async createGroup(brandId: number, payload: UpsertPosUserGroupPayload): Promise<PosUserGroupSummary> {
    const response = await api.post(`/pos-users/brand/${brandId}/groups`, payload);
    return response.data;
  }

  async updateGroup(brandId: number, groupId: number, payload: UpsertPosUserGroupPayload): Promise<PosUserGroupSummary> {
    const response = await api.put(`/pos-users/brand/${brandId}/groups/${groupId}`, payload);
    return response.data as PosUserGroupSummary;
  }

  async deactivateGroup(brandId: number, groupId: number): Promise<void> {
    await api.delete(`/pos-users/brand/${brandId}/groups/${groupId}`);
  }

  // ── Users ──

  async listUsers(brandId: number, shopId?: number): Promise<PosUserSummary[]> {
    const url = shopId
      ? `/pos-users/brand/${brandId}/users?shopId=${shopId}`
      : `/pos-users/brand/${brandId}/users`;
    const response = await api.get(url);
    return response.data;
  }

  async createUser(brandId: number, payload: UpsertPosUserPayload): Promise<PosUserSummary> {
    const response = await api.post(`/pos-users/brand/${brandId}/users`, payload);
    return response.data;
  }

  async updateUser(brandId: number, userId: number, shopId: number, payload: UpsertPosUserPayload): Promise<PosUserSummary> {
    const response = await api.put(`/pos-users/brand/${brandId}/users/${userId}/shop/${shopId}`, payload);
    return response.data as PosUserSummary;
  }

  async deactivateUser(brandId: number, userId: number, shopId: number): Promise<void> {
    await api.delete(`/pos-users/brand/${brandId}/users/${userId}/shop/${shopId}`);
  }
}

export default new PosUserService();
