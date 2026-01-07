
import type { ShippingSettings } from '../types';
import { fetchShippingSettingsFromDB, syncShippingSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_shipping_settings';
let isInitialLoaded = false;

const DEFAULT_SETTINGS: ShippingSettings = {
  baseFee: 30000, 
  freeShipThreshold: 500000, 
  enabled: true
};

export const getShippingSettings = (): ShippingSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;

    // Chỉ thực hiện tải ngầm lần đầu hoặc khi chưa có data
    if (!isInitialLoaded) {
        isInitialLoaded = true;
        fetchShippingSettingsFromDB().then(dbSettings => {
            if (dbSettings && Object.keys(dbSettings).length > 0) {
                const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            }
        }).catch(() => {});
    }

    return localData;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

/**
 * Buộc tải lại cấu hình vận chuyển từ Server để đảm bảo tính chính xác khi thanh toán
 */
export const refreshShippingSettings = async (): Promise<ShippingSettings> => {
    try {
        const dbSettings = await fetchShippingSettingsFromDB();
        if (dbSettings && Object.keys(dbSettings).length > 0) {
            const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
        }
    } catch (e) {}
    return getShippingSettings();
};

export const updateShippingSettings = async (settings: ShippingSettings): Promise<{ success: boolean; message?: string }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  try {
      const res = await syncShippingSettingsToDB(settings);
      if (res && res.success) {
          return { success: true };
      } else {
          return { success: false, message: res?.message || 'Lỗi Server' };
      }
  } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi mạng' };
  }
};

export const calculateShippingFee = (subtotal: number): number => {
    const settings = getShippingSettings();
    if (!settings.enabled) return 0;
    if (subtotal >= settings.freeShipThreshold) return 0;
    return settings.baseFee;
};
