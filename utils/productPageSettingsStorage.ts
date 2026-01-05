
import type { ProductPageSettings } from '../types';
import { fetchHomePageSettingsFromDB, syncHomePageSettingsToDB } from './apiClient';

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
  buyBtnBgColor: '#B4975A', // Đã đổi từ đen sang vàng gold
  buyBtnTextColor: '#FFFFFF',
  qrIconVisible: true
};

export const getProductPageSettings = (): ProductPageSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const updateProductPageSettings = (settings: ProductPageSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(EVENT_KEY));
};
