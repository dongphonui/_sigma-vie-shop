
import type { StoreSettings } from '../types';
import { fetchStoreSettingsFromDB, syncStoreSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_store_settings';
let hasLoadedFromDB = false;

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Sigma Vie Store',
  phoneNumber: '0912.345.678',
  address: 'Hà Nội, Việt Nam',
  email: 'contact@sigmavie.com'
};

export const getStoreSettings = (): StoreSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = JSON.parse(stored);
    } else {
        // Init if empty
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Background fetch from DB
    if (!hasLoadedFromDB) {
        fetchStoreSettingsFromDB().then(dbSettings => {
            if (dbSettings && Object.keys(dbSettings).length > 0) {
                // Check if different from local
                const currentStr = localStorage.getItem(STORAGE_KEY);
                const newStr = JSON.stringify(dbSettings);
                
                if (currentStr !== newStr) {
                    localStorage.setItem(STORAGE_KEY, newStr);
                    // Dispatch update event if necessary, or just rely on react re-render on next refresh
                    // For settings, often a refresh is okay, but let's log it
                    console.log("Store settings updated from Server.");
                }
            }
        }).catch(e => console.error("Err fetch store settings:", e));
        hasLoadedFromDB = true;
    }

    return localData;
  } catch (error) {
    console.error("Failed to parse store settings", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateStoreSettings = (settings: StoreSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  // Sync to DB
  syncStoreSettingsToDB(settings).then(res => {
      if (res && res.success) {
          console.log("Store settings synced to server.");
      } else {
          console.warn("Failed to sync store settings:", res);
      }
  });
};
