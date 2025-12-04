
import type { StoreSettings } from '../types';

const STORAGE_KEY = 'sigma_vie_store_settings';

const DEFAULT_SETTINGS: StoreSettings = {
  name: 'Sigma Vie Store',
  phoneNumber: '0912.345.678',
  address: 'Hà Nội, Việt Nam',
  email: 'contact@sigmavie.com'
};

export const getStoreSettings = (): StoreSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to parse store settings", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateStoreSettings = (settings: StoreSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
