
import type { BankSettings } from '../types';

const STORAGE_KEY = 'sigma_vie_bank_settings';

const DEFAULT_SETTINGS: BankSettings = {
  bankId: '',
  accountNumber: '',
  accountName: '',
  template: 'compact'
};

export const getBankSettings = (): BankSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error("Failed to parse bank settings", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateBankSettings = (settings: BankSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
