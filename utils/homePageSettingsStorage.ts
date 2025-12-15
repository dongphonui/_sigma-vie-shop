
import type { HomePageSettings } from '../types';
import { fetchHomePageSettingsFromDB, syncHomePageSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_home_page_settings';
const EVENT_KEY = 'sigma_vie_home_settings_update'; 

const DEFAULT_SETTINGS: HomePageSettings = {
  headlineText: 'Hàng Mới Về',
  headlineColor: '#111827', 
  headlineFont: 'Playfair Display',
  headlineSize: '3rem',
  subtitleText: 'Khám phá bộ sưu tập mới nhất với những thiết kế vượt thời gian.',
  subtitleColor: '#374151', 
  subtitleFont: 'Poppins',

  // Promotion Section Defaults
  promoImageUrl: 'https://picsum.photos/id/435/800/600',
  promoImageUrls: [
      'https://picsum.photos/id/435/800/600',
      'https://picsum.photos/id/338/800/600',
      'https://picsum.photos/id/447/800/600'
  ],
  promoBackgroundColor: '#00695C',
  promoAccentColor: '#D4AF37',
  promoTag: 'Độc Quyền',
  promoSubTag: 'Chỉ có tại Sigma Vie',
  promoTitle1: 'Khơi Nguồn',
  promoTitleHighlight: 'Cảm Hứng',
  promoTitle2: 'Mới',
  promoTitleFont: 'Playfair Display',
  promoTitleColor: '#FFFFFF',
  promoTitleSize: '2.25rem', 
  promoDescription: 'Đắm mình trong sự tinh tế của bộ sưu tập "Giao Mùa". Mỗi thiết kế là một câu chuyện, mỗi đường may là một lời khẳng định đẳng cấp.',
  promoDescriptionFont: 'Poppins',
  promoDescriptionColor: '#E5E7EB', 
  promoDescriptionSize: '1.125rem', 
  promoButtonText: 'Khám Phá Ngay',
  promoButtonBgColor: '#D4AF37',
  promoButtonTextColor: '#FFFFFF',

  // Registration Section Defaults
  regHeadlineText: 'Trở thành thành viên Sigma Vie',
  regHeadlineColor: '#FFFFFF',
  regHeadlineFont: 'Playfair Display',
  regHeadlineSize: '1.875rem',
  regDescriptionText: 'Đăng ký tài khoản ngay hôm nay để nhận thông báo về bộ sưu tập mới nhất, ưu đãi độc quyền dành riêng cho thành viên và theo dõi đơn hàng dễ dàng hơn.',
  regDescriptionColor: '#D1D5DB', 
  regDescriptionFont: 'Poppins',
  regDescriptionSize: '1.125rem',
  regBgColorStart: '#111827', 
  regBgColorEnd: '#1F2937',   
  regButtonText: 'Đăng ký ngay',
  regButtonBgColor: '#D4AF37',
  regButtonTextColor: '#FFFFFF',
  regButtonFont: 'Poppins',
  regButtonFontSize: '1rem',
  regPadding: '3rem', 
  regBorderRadius: '1rem',

  // Flash Sale Defaults
  flashSaleBgColorStart: '#DC2626', 
  flashSaleBgColorEnd: '#F97316',   
  flashSaleTitleText: 'FLASH SALE',
  flashSaleTitleColor: '#FFFFFF',
  flashSaleTitleFont: 'Playfair Display',
  flashSaleTitleSize: '2.25rem', 
  flashSaleTextColor: '#FFFFFF',
};

export const getHomePageSettings = (): HomePageSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_SETTINGS;

    if (stored) {
      const parsed = JSON.parse(stored);
      // Migration logic
      if (!parsed.promoImageUrls) {
          parsed.promoImageUrls = parsed.promoImageUrl ? [parsed.promoImageUrl] : [];
      }
      localData = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // --- BACKGROUND SYNC FROM SERVER ---
    // Luôn gọi server để check update mỗi khi load trang
    fetchHomePageSettingsFromDB().then(dbSettings => {
        if (dbSettings && Object.keys(dbSettings).length > 0) {
            if (!dbSettings.promoImageUrls && dbSettings.promoImageUrl) {
                dbSettings.promoImageUrls = [dbSettings.promoImageUrl];
            }
            const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
            
            const currentStr = localStorage.getItem(STORAGE_KEY);
            const newStr = JSON.stringify(merged);
            
            // Nếu có thay đổi so với local, cập nhật và báo cho UI
            if (currentStr !== newStr) {
                localStorage.setItem(STORAGE_KEY, newStr);
                window.dispatchEvent(new Event(EVENT_KEY));
                console.log("Home settings updated from server & UI refreshed.");
            }
        }
    }).catch(err => console.error("Error checking home settings:", err));

    return localData;
  } catch (error) {
    console.error("Failed to parse home page settings", error);
    return DEFAULT_SETTINGS;
  }
};

export const updateHomePageSettings = async (settings: HomePageSettings): Promise<{ success: boolean; message?: string }> => {
  // 1. Save Local & Update UI immediately
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(EVENT_KEY)); 
  
  // 2. Sync to Server and Return Result
  try {
      const res = await syncHomePageSettingsToDB(settings);
      if (res && res.success) {
          console.log("Home settings synced to server.");
          return { success: true };
      } else {
          console.error("Failed to sync home settings:", res);
          return { success: false, message: res?.message || 'Lỗi không xác định từ Server' };
      }
  } catch (e: any) {
      return { success: false, message: e.message || 'Lỗi kết nối mạng' };
  }
};
