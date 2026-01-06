
import type { HeaderSettings } from '../types';
import { fetchHeaderSettingsFromDB, syncHeaderSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_header_settings';
const EVENT_KEY = 'sigma_vie_header_update';

const DEFAULT_SETTINGS: HeaderSettings = {
  brandName: 'Sigma Vie',
  brandColor: '#00695C',
  brandFontSize: '30px',
  brandFont: 'Playfair Display',
  brandBackgroundColor: 'rgba(255, 255, 255, 0.8)',
  logoUrl: '',
  borderColor: '#E5E7EB',
  borderWidth: '0px',
  borderStyle: 'solid',
  navStoreText: 'Cửa Hàng',
  navAboutText: 'Về Chúng Tôi',
  navColor: '#4B5563',
  navHoverColor: '#D4AF37',
  navFont: 'Poppins',
  navFontSize: '16px',
  loginBtnText: 'Đăng nhập',
  loginBtnFont: 'Poppins',
  loginBtnFontSize: '14px',
  loginBtnTextColor: '#FFFFFF',
  loginBtnBgColor: '#D4AF37',
};

export const getHeaderSettings = (): HeaderSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }

    // Background Sync
    fetchHeaderSettingsFromDB().then(dbSettings => {
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

export const updateHeaderSettings = async (settings: HeaderSettings): Promise<{ success: boolean }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(EVENT_KEY));
  
  try {
      const res = await syncHeaderSettingsToDB(settings);
      return { success: !!(res && res.success) };
  } catch (e) {
      return { success: false };
  }
};
