
import type { ShippingSettings } from '../types';

const STORAGE_KEY = 'sigma_vie_shipping_settings';

const DEFAULT_SETTINGS: ShippingSettings = {
  baseFee: 30000, // Default 30k
  freeShipThreshold: 500000, // Default free ship > 500k
  enabled: true
};

export const getShippingSettings = (): ShippingSettings => {
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

export const updateShippingSettings = (settings: ShippingSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const calculateShippingFee = (subtotal: number): number => {
    const settings = getShippingSettings();
    if (!settings.enabled) return 0;
    if (subtotal >= settings.freeShipThreshold) return 0;
    return settings.baseFee;
};
