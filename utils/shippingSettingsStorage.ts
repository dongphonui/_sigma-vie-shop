
import type { ShippingSettings } from '../types';
import { fetchShippingSettingsFromDB, syncShippingSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_shipping_settings';
let hasLoadedFromDB = false;

const DEFAULT_SETTINGS: ShippingSettings = {
  baseFee: 30000, // Default 30k
  freeShipThreshold: 500000, // Default free ship > 500k
  enabled: true
};

export const getShippingSettings = (): ShippingSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Background fetch from DB
    if (!hasLoadedFromDB) {
        fetchShippingSettingsFromDB().then(dbSettings => {
            if (dbSettings && Object.keys(dbSettings).length > 0) {
                const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
                const currentStr = localStorage.getItem(STORAGE_KEY);
                const newStr = JSON.stringify(merged);
                
                if (currentStr !== newStr) {
                    localStorage.setItem(STORAGE_KEY, newStr);
                    console.log("Shipping settings updated from Server.");
                }
            }
        }).catch(e => console.error("Err fetch shipping settings:", e));
        hasLoadedFromDB = true;
    }

    return localData;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const updateShippingSettings = async (settings: ShippingSettings): Promise<{ success: boolean; message?: string }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  // Sync to DB
  try {
      const res = await syncShippingSettingsToDB(settings);
      if (res && res.success) {
          console.log("Shipping settings synced to server.");
          return { success: true };
      } else {
          console.warn("Failed to sync shipping settings:", res);
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
