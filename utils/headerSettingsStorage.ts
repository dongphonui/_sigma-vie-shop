
import type { HeaderSettings } from '../types';

const STORAGE_KEY = 'sigma_vie_header_settings';

const DEFAULT_SETTINGS: HeaderSettings = {
  brandName: 'Sigma Vie',
  brandColor: '#00695C',
  brandFontSize: '30px',
  brandFont: 'Playfair Display',
  brandBackgroundColor: 'rgba(255, 255, 255, 0.8)',
  logoUrl: '',
  
  // Border Defaults
  borderColor: '#E5E7EB', // gray-200
  borderWidth: '0px',     // No border by default
  borderStyle: 'solid',

  // Navigation Defaults
  navStoreText: 'Cửa Hàng',
  navAboutText: 'Về Chúng Tôi',
  navColor: '#4B5563', // text-gray-600
  navHoverColor: '#D4AF37',
  navFont: 'Poppins',
  navFontSize: '16px',

  // Login Button Defaults
  loginBtnText: 'Đăng nhập',
  loginBtnFont: 'Poppins',
  loginBtnFontSize: '14px',
  loginBtnTextColor: '#FFFFFF',
  loginBtnBgColor: '#D4AF37',
};

export const getHeaderSettings = (): HeaderSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure new fields exist
      return { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("Failed to parse header settings from localStorage", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateHeaderSettings = (settings: HeaderSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
