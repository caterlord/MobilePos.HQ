import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './Auth0Context';

interface Brand {
  id: number;
  name: string;
  description?: string;
  logoUrl?: string;
  legacyAccountId?: number;
  useLegacyPOS: boolean;
}

interface CompanyWithBrands {
  company: {
    id: number;
    name: string;
    description?: string;
  };
  role: string;
  brands: Brand[];
}

interface BrandContextType {
  companiesWithBrands: CompanyWithBrands[];
  selectedBrand: string | null;
  loading: boolean;
  error: string | null;
  refreshBrands: () => Promise<void>;
  selectBrand: (brandId: string) => Promise<void>;
  setSelectedBrand: (brandId: string) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useBrands = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrands must be used within a BrandProvider');
  }
  return context;
};

interface BrandProviderProps {
  children: React.ReactNode;
}

export const BrandProvider: React.FC<BrandProviderProps> = ({ children }) => {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [companiesWithBrands, setCompaniesWithBrands] = useState<CompanyWithBrands[]>([]);
  const [selectedBrand, setSelectedBrandState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBrands = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5125/api';

      const response = await fetch(`${apiUrl}/user-access/companies-brands`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch companies and brands');
      }

      const data = await response.json();
      const companyData = data.data || data;
      setCompaniesWithBrands(companyData);

      const availableBrandIds = new Set<string>();
      companyData.forEach((entry: CompanyWithBrands) => {
        entry.brands.forEach((brand) => {
          availableBrandIds.add(brand.id.toString());
        });
      });

      const firstBrand = companyData[0]?.brands?.[0];
      if (selectedBrand && !availableBrandIds.has(selectedBrand)) {
        // Recover from stale localStorage when access changed or a brand was deleted.
        if (firstBrand) {
          setSelectedBrandState(firstBrand.id.toString());
          localStorage.setItem('selectedBrandId', firstBrand.id.toString());
        } else {
          setSelectedBrandState(null);
          localStorage.removeItem('selectedBrandId');
        }
      } else if (!selectedBrand && firstBrand) {
        setSelectedBrandState(firstBrand.id.toString());
        localStorage.setItem('selectedBrandId', firstBrand.id.toString());
      }
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getAccessToken, selectedBrand]);

  const selectBrand = useCallback(async (brandId: string) => {
    try {
      const token = await getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5125/api';

      const response = await fetch(`${apiUrl}/user-access/select-brand`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ brandId: parseInt(brandId) }),
      });

      if (!response.ok) {
        throw new Error('Failed to select brand');
      }

      setSelectedBrandState(brandId);
      localStorage.setItem('selectedBrandId', brandId);
    } catch (err) {
      console.error('Error selecting brand:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [getAccessToken]);

  const setSelectedBrand = useCallback((brandId: string) => {
    setSelectedBrandState(brandId);
    localStorage.setItem('selectedBrandId', brandId);
  }, []);

  // Load selected brand from localStorage on mount
  useEffect(() => {
    const savedBrandId = localStorage.getItem('selectedBrandId');
    if (savedBrandId) {
      setSelectedBrandState(savedBrandId);
    }
  }, []);

  // Fetch brands when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshBrands();
    }
  }, [isAuthenticated, refreshBrands]);

  const value: BrandContextType = {
    companiesWithBrands,
    selectedBrand,
    loading,
    error,
    refreshBrands,
    selectBrand,
    setSelectedBrand,
  };

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
};
