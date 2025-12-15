
import type { AboutPageSettings } from '../types';
import { fetchAboutSettingsFromDB, syncAboutSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_about_page_settings';
export const ABOUT_SETTINGS_EVENT = 'sigma_vie_about_settings_update';

const DEFAULT_SETTINGS: AboutPageSettings = {
  headingColor: '#111827', // text-gray-900
  headingFont: 'Playfair Display',
  paragraphColor: '#374151', // text-gray-700
  paragraphFont: 'Poppins',
  buttonBgColor: '#D4AF37',
  buttonTextColor: '#FFFFFF',
};

export const getAboutPageSettings = (): AboutPageSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = JSON.parse(stored);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Background sync
    fetchAboutSettingsFromDB().then(dbSettings => {
        if (dbSettings && Object.keys(dbSettings).length > 0) {
            const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
            const currentStr = localStorage.getItem(STORAGE_KEY);
            const newStr = JSON.stringify(merged);
            
            if (currentStr !== newStr) {
                localStorage.setItem(STORAGE_KEY, newStr);
                window.dispatchEvent(new Event(ABOUT_SETTINGS_EVENT));
            }
        }
    }).catch(err => console.error("Error checking about settings from DB:", err));

    return localData;
  } catch (error) {
    console.error("Failed to parse about page settings from localStorage", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateAboutPageSettings = async (settings: AboutPageSettings): Promise<{ success: boolean; message?: string }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(ABOUT_SETTINGS_EVENT));
  
  try {
      const res = await syncAboutSettingsToDB(settings);
      if (res && res.success) {
          return { success: true };
      } else {
          return { success: false, message: res?.message || 'Lỗi server' };
      }
  } catch (e: any) {
      return { success: false, message: e.message };
  }
};
