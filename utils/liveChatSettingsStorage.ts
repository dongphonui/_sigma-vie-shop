
import type { LiveChatSettings } from '../types';
import { fetchSettingFromDB, syncSettingToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_livechat_settings';
export const LIVECHAT_SETTINGS_EVENT = 'sigma_vie_livechat_ui_update';

const DEFAULT_SETTINGS: LiveChatSettings = {
  chatTitle: 'Hỗ trợ Sigma Vie',
  headerBgColor: '#111827',
  headerTextColor: '#FFFFFF',
  bubbleBgCustomer: '#111827',
  bubbleTextCustomer: '#FFFFFF',
  bubbleBgAdmin: '#FFFFFF',
  bubbleTextAdmin: '#111827',
  floatingBtnColor: '#111827',
  placeholderText: 'Nhập lời nhắn...',
  welcomeMsg: 'Quý khách cần tư vấn?',
  fontFamily: 'Roboto',
  fontSize: '13px',
};

export const getLiveChatSettings = (): LiveChatSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      localData = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }

    // Sync ngầm từ DB
    fetchSettingFromDB('livechat-ui').then(dbSettings => {
        if (dbSettings && Object.keys(dbSettings).length > 0) {
            const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
            const currentStr = localStorage.getItem(STORAGE_KEY);
            const newStr = JSON.stringify(merged);
            
            if (currentStr !== newStr) {
                localStorage.setItem(STORAGE_KEY, newStr);
                window.dispatchEvent(new Event(LIVECHAT_SETTINGS_EVENT));
            }
        }
    }).catch(() => {});

    return localData;
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

export const updateLiveChatSettings = async (settings: LiveChatSettings): Promise<{ success: boolean; message?: string }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(LIVECHAT_SETTINGS_EVENT));
  
  try {
      const res = await syncSettingToDB('livechat-ui', settings);
      if (res && res.success) {
          return { success: true };
      } else {
          return { success: false, message: res?.message || 'Lỗi đồng bộ server' };
      }
  } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi kết nối' };
  }
};
