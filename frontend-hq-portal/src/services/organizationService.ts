import api from './api';

export interface OrgShop {
  id: number;
  name: string;
  address?: string;
  isActive: boolean;
  role?: string;
}

export interface OrgBrand {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  role?: string;
  legacyAccountId?: number | null;
  useLegacyPOS?: boolean;
  shops: OrgShop[];
}

export interface OrgCompany {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  role?: string | null;
  brands: OrgBrand[];
}

interface ApiResult<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
}

class OrganizationService {
  async getHierarchy(): Promise<OrgCompany[]> {
    const response = await api.get('/user-access/hierarchical-data');
    const payload = response.data as ApiResult<OrgCompany[]>;

    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to load organization hierarchy');
    }

    return payload?.data || [];
  }

  async createCompany(request: { name: string; description?: string }): Promise<void> {
    const response = await api.post('/user-access/create-company', request);
    const payload = response.data as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to create company');
    }
  }

  async createBrand(request: {
    parentId: number;
    name: string;
    description?: string;
    legacyAccountId?: number | null;
    useLegacyPOS?: boolean;
  }): Promise<void> {
    const response = await api.post('/user-access/create-brand', request);
    const payload = response.data as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to create brand');
    }
  }

  async createShop(request: { parentId: number; name: string; address?: string }): Promise<void> {
    const response = await api.post('/user-access/create-shop', request);
    const payload = response.data as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to create shop');
    }
  }

  async updateCompany(request: { id: number; name?: string; description?: string }): Promise<void> {
    const response = await api.post('/user-access/update-company', request);
    const payload = response.data as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to update company');
    }
  }

  async updateBrand(request: {
    id: number;
    name?: string;
    description?: string;
    legacyAccountId?: number | null;
    useLegacyPOS?: boolean;
  }): Promise<void> {
    const response = await api.post('/user-access/update-brand', request);
    const payload = response.data as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to update brand');
    }
  }

  async updateShop(request: { id: number; name?: string; address?: string }): Promise<void> {
    const response = await api.post('/user-access/update-shop', request);
    const payload = response.data as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to update shop');
    }
  }

  async deleteCompany(id: number): Promise<void> {
    const payload = (await api.delete(`/user-access/delete-company/${id}`)) as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to delete company');
    }
  }

  async deleteBrand(id: number): Promise<void> {
    const payload = (await api.delete(`/user-access/delete-brand/${id}`)) as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to delete brand');
    }
  }

  async deleteShop(id: number): Promise<void> {
    const payload = (await api.delete(`/user-access/delete-shop/${id}`)) as ApiResult;
    if (payload?.success === false) {
      throw new Error(payload.message || 'Failed to delete shop');
    }
  }
}

export default new OrganizationService();
