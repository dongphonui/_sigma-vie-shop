
import type { BankSettings } from '../types';
import { fetchBankSettingsFromDB, syncBankSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_bank_settings';
let hasLoadedFromDB = false;

const DEFAULT_SETTINGS: BankSettings = {
  bankId: '',
  accountNumber: '',
  accountName: '',
  template: 'compact'
};

export const getBankSettings = (): BankSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = JSON.parse(stored);
    } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Background fetch from DB
    if (!hasLoadedFromDB) {
        fetchBankSettingsFromDB().then(dbSettings => {
            if (dbSettings && Object.keys(dbSettings).length > 0) {
                const currentStr = localStorage.getItem(STORAGE_KEY);
                const newStr = JSON.stringify(dbSettings);
                
                if (currentStr !== newStr) {
                    localStorage.setItem(STORAGE_KEY, newStr);
                    console.log("Bank settings updated from Server.");
                }
            }
        }).catch(e => console.error("Err fetch bank settings:", e));
        hasLoadedFromDB = true;
    }

    return localData;
  } catch (error) {
    console.error("Failed to parse bank settings", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateBankSettings = (settings: BankSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  
  // Sync to DB
  syncBankSettingsToDB(settings).then(res => {
      if (res && res.success) {
          console.log("Bank settings synced to server.");
      } else {
          console.warn("Failed to sync bank settings:", res);
      }
  });
};
