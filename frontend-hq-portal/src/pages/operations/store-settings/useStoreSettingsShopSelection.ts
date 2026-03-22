import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBrands } from '../../../contexts/BrandContext';
import storeSettingsService from '../../../services/storeSettingsService';

const selectedShopStorageKey = (brandId: number) => `storeSettingsSelectedShopId:${brandId}`;

export interface StoreSettingsShopSelectionState {
  brandId: number | null;
  shopsLoading: boolean;
  shopsError: string | null;
  shops: Array<{ shopId: number; shopName: string; enabled: boolean }>;
  selectedShopId: number | null;
  setSelectedShopId: (shopId: number | null) => void;
  selectedShop: { shopId: number; shopName: string; enabled: boolean } | null;
  reloadShops: () => Promise<void>;
}

export function useStoreSettingsShopSelection(): StoreSettingsShopSelectionState {
  const { selectedBrand } = useBrands();
  const brandId = useMemo(() => (selectedBrand ? Number.parseInt(selectedBrand, 10) : null), [selectedBrand]);

  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [shops, setShops] = useState<Array<{ shopId: number; shopName: string; enabled: boolean }>>([]);
  const [selectedShopId, setSelectedShopIdState] = useState<number | null>(null);

  const setSelectedShopId = useCallback(
    (shopId: number | null) => {
      setSelectedShopIdState(shopId);
      if (brandId) {
        if (shopId) {
          localStorage.setItem(selectedShopStorageKey(brandId), String(shopId));
        } else {
          localStorage.removeItem(selectedShopStorageKey(brandId));
        }
      }
    },
    [brandId],
  );

  const reloadShops = useCallback(async () => {
    if (!brandId) {
      setShops([]);
      setSelectedShopIdState(null);
      return;
    }

    try {
      setShopsLoading(true);
      setShopsError(null);

      const response = await storeSettingsService.getShops(brandId);
      setShops(response);

      if (response.length === 0) {
        setSelectedShopIdState(null);
        localStorage.removeItem(selectedShopStorageKey(brandId));
        return;
      }

      const savedShopIdRaw = localStorage.getItem(selectedShopStorageKey(brandId));
      const savedShopId = savedShopIdRaw ? Number.parseInt(savedShopIdRaw, 10) : null;

      setSelectedShopIdState((previous) => {
        const preferred = previous ?? savedShopId;
        if (preferred && response.some((shop) => shop.shopId === preferred)) {
          localStorage.setItem(selectedShopStorageKey(brandId), String(preferred));
          return preferred;
        }

        const fallback = response[0].shopId;
        localStorage.setItem(selectedShopStorageKey(brandId), String(fallback));
        return fallback;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shops';
      setShopsError(message);
      setShops([]);
      setSelectedShopIdState(null);
    } finally {
      setShopsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    void reloadShops();
  }, [reloadShops]);

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.shopId === selectedShopId) ?? null,
    [shops, selectedShopId],
  );

  return {
    brandId,
    shopsLoading,
    shopsError,
    shops,
    selectedShopId,
    setSelectedShopId,
    selectedShop,
    reloadShops,
  };
}
