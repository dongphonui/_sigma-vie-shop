
import type { HomePageSettings } from '../types';
import { fetchHomePageSettingsFromDB, syncHomePageSettingsToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_home_page_settings';
const EVENT_KEY = 'sigma_vie_home_settings_update'; // Key sự kiện update
let hasLoadedFromDB = false;

const DEFAULT_SETTINGS: HomePageSettings = {
  headlineText: 'Hàng Mới Về',
  headlineColor: '#111827', // text-gray-900
  headlineFont: 'Playfair Display',
  headlineSize: '3rem',
  subtitleText: 'Khám phá bộ sưu tập mới nhất với những thiết kế vượt thời gian.',
  subtitleColor: '#374151', // text-gray-700
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
  promoTitleSize: '2.25rem', // 36px (text-4xl approx)
  promoDescription: 'Đắm mình trong sự tinh tế của bộ sưu tập "Giao Mùa". Mỗi thiết kế là một câu chuyện, mỗi đường may là một lời khẳng định đẳng cấp.',
  promoDescriptionFont: 'Poppins',
  promoDescriptionColor: '#E5E7EB', // text-gray-200 equivalent
  promoDescriptionSize: '1.125rem', // 18px (text-lg)
  promoButtonText: 'Khám Phá Ngay',
  promoButtonBgColor: '#D4AF37',
  promoButtonTextColor: '#FFFFFF',

  // Registration Section Defaults
  regHeadlineText: 'Trở thành thành viên Sigma Vie',
  regHeadlineColor: '#FFFFFF',
  regHeadlineFont: 'Playfair Display',
  regHeadlineSize: '1.875rem', // text-3xl
  regDescriptionText: 'Đăng ký tài khoản ngay hôm nay để nhận thông báo về bộ sưu tập mới nhất, ưu đãi độc quyền dành riêng cho thành viên và theo dõi đơn hàng dễ dàng hơn.',
  regDescriptionColor: '#D1D5DB', // gray-300
  regDescriptionFont: 'Poppins',
  regDescriptionSize: '1.125rem', // text-lg
  regBgColorStart: '#111827', // gray-900
  regBgColorEnd: '#1F2937',   // gray-800
  regButtonText: 'Đăng ký ngay',
  regButtonBgColor: '#D4AF37',
  regButtonTextColor: '#FFFFFF',
  regButtonFont: 'Poppins',
  regButtonFontSize: '1rem',
  regPadding: '3rem', // p-12 equivalent
  regBorderRadius: '1rem', // rounded-2xl

  // Flash Sale Defaults
  flashSaleBgColorStart: '#DC2626', // red-600
  flashSaleBgColorEnd: '#F97316',   // orange-500
  flashSaleTitleText: 'FLASH SALE',
  flashSaleTitleColor: '#FFFFFF',
  flashSaleTitleFont: 'Playfair Display',
  flashSaleTitleSize: '2.25rem', // 36px
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
    // Luôn luôn gọi server để check update mỗi khi load trang (không chỉ lần đầu)
    // Để đảm bảo máy khác luôn nhận được dữ liệu mới nhất
    fetchHomePageSettingsFromDB().then(dbSettings => {
        if (dbSettings && Object.keys(dbSettings).length > 0) {
            // Ensure array migration for DB data too
            if (!dbSettings.promoImageUrls && dbSettings.promoImageUrl) {
                dbSettings.promoImageUrls = [dbSettings.promoImageUrl];
            }
            const merged = { ...DEFAULT_SETTINGS, ...dbSettings };
            
            // Check changes before dispatching to avoid loops if needed, 
            // but simple overwrite is safer for consistency here
            const currentStr = localStorage.getItem(STORAGE_KEY);
            const newStr = JSON.stringify(merged);
            
            if (currentStr !== newStr) {
                localStorage.setItem(STORAGE_KEY, newStr);
                // QUAN TRỌNG: Bắn sự kiện để giao diện tự vẽ lại
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

export const updateHomePageSettings = (settings: HomePageSettings): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event(EVENT_KEY)); // Update local UI immediately
  
  // Sync to Server
  syncHomePageSettingsToDB(settings).then(res => {
      if (res && res.success) {
          console.log("Home settings synced to server.");
      } else {
          console.error("Failed to sync home settings:", res);
      }
  });
};
