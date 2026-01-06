
import type { ProductPageSettings } from '../types';
import { fetchProductPageSettingsFromDB, syncProductPageSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_product_ui_settings';
const EVENT_KEY = 'sigma_vie_product_ui_update';

const DEFAULT_SETTINGS: ProductPageSettings = {
  titleFont: 'Roboto',
  titleColor: '#000000',
  titleSize: '24px',
  priceFont: 'Roboto',
  priceColor: '#064E3B',
  priceSize: '20px',
  descFont: 'Roboto',
  descColor: '#6B7280',
  descSize: '14px',
  badgeLabel: 'Mã sản phẩm',
  badgeBgColor: '#B4975A',
  badgeTextColor: '#FFFFFF',
  buyBtnText: 'XÁC NHẬN SỞ HỮU',
  buyBtnBgColor: '#B4975A',
  buyBtnTextColor: '#FFFFFF',
  qrIconVisible: true
};

export const getProductPageSettings = (): ProductPageSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }

    // Background Sync
    fetchProductPageSettingsFromDB().then(dbSettings => {
        if (dbSettings && Object.keys(dbSettings).length > 0) {
            const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
            const currentStr = localStorage.getItem(STORAGE_KEY);
            const newStr = JSON.stringify(merged);
            
            if (currentStr !== newStr) {
                localStorage.setItem(STORAGE_KEY, newStr);
                window.dispatchEvent(new Event(EVENT_KEY));
            }
        }
    }).catch(() => {});

    return localData;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

// Fixed: Added message property to return type and implementation to resolve TS error in ProductPageSettingsTab
export const updateProductPageSettings = async (settings: ProductPageSettings): Promise<{ success: boolean; message?: string }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(EVENT_KEY));
  
  try {
      const res = await syncProductPageSettingsToDB(settings);
      if (res && res.success) {
          return { success: true };
      } else {
          return { success: false, message: res?.message || 'Lỗi không xác định từ Server' };
      }
  } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi kết nối mạng' };
  }
};
