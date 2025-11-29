
import type { SocialSettings } from '../types';

const STORAGE_KEY = 'sigma_vie_social_settings';

const DEFAULT_SETTINGS: SocialSettings = {
  facebook: 'https://facebook.com',
  instagram: 'https://instagram.com',
  twitter: 'https://twitter.com',
  tiktok: 'https://tiktok.com', // Added default link
};

export const getSocialSettings = (): SocialSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration: Ensure new fields like tiktok exist if loading old data
      return { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("Failed to parse social settings from localStorage", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateSocialSettings = (settings: SocialSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
