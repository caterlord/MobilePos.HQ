import api from './api';
import type {
  CreateModifierGroupPayload,
  ModifierGroupHeader,
  ModifierGroupProperties,
  UpdateModifierGroupPropertiesPayload,
} from '../types/modifierGroup';

class ModifierGroupService {
  async list(brandId: number, options: { isFollowSet?: boolean } = {}): Promise<ModifierGroupHeader[]> {
    const query = new URLSearchParams();
    if (options.isFollowSet !== undefined) {
      query.set('isFollowSet', options.isFollowSet ? 'true' : 'false');
    }

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await api.get(`/modifier-groups/brand/${brandId}${suffix}`);
    return response.data;
  }

  async create(brandId: number, payload: CreateModifierGroupPayload): Promise<ModifierGroupProperties> {
    const response = await api.post(`/modifier-groups/brand/${brandId}`, {
      ...payload,
      items: payload.items ?? [],
    });
    return response.data;
  }

  async getProperties(brandId: number, groupHeaderId: number): Promise<ModifierGroupProperties> {
    const response = await api.get(`/modifier-groups/brand/${brandId}/${groupHeaderId}`);
    return response.data;
  }

  async updateProperties(
    brandId: number,
    groupHeaderId: number,
    payload: UpdateModifierGroupPropertiesPayload,
  ): Promise<ModifierGroupProperties> {
    const response = await api.put(`/modifier-groups/brand/${brandId}/${groupHeaderId}`, payload);
    return response as ModifierGroupProperties;
  }

  async deactivate(brandId: number, groupHeaderId: number): Promise<void> {
    await api.delete(`/modifier-groups/brand/${brandId}/${groupHeaderId}`);
  }
}

export default new ModifierGroupService();
