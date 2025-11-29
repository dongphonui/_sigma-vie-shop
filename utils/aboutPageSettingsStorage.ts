import type { AboutPageSettings } from '../types';

const STORAGE_KEY = 'sigma_vie_about_page_settings';

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
    if (stored) {
      return JSON.parse(stored);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("Failed to parse about page settings from localStorage", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateAboutPageSettings = (settings: AboutPageSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
