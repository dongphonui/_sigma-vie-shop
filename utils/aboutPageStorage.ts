
import type { AboutPageContent } from '../types';
import { fetchAboutContentFromDB, syncAboutContentToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_about_page';
export const ABOUT_CONTENT_EVENT = 'sigma_vie_about_content_update';

const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  heroTitle: 'Câu chuyện của chúng tôi',
  heroSubtitle: 'Tinh hoa của Phong cách Vượt thời gian',
  heroImageUrl: 'https://picsum.photos/id/367/1600/600',
  welcomeHeadline: 'Chào mừng đến với Sigma Vie',
  welcomeText: 'Được thành lập dựa trên niềm tin rằng thời trang là một hình thức thể hiện bản thân, Sigma Vie ra đời từ niềm đam mê với vẻ đẹp thanh lịch vượt thời gian và chất lượng vượt trội. Chúng tôi tuyển chọn và tạo ra những bộ sưu tập không chỉ đẹp mà còn trao quyền cho cá nhân hiện đại cảm thấy tự tin và đĩnh đạc.',
  philosophyTitle: 'Triết lý của chúng tôi',
  philosophyText1: 'Chúng tôi tin vào việc "mua ít hơn, lựa chọn kỹ hơn". Triết lý của chúng tôi tập trung vào việc tạo ra những sản phẩm đa năng, chất lượng cao, vượt qua các mùa mốt. Mỗi sản phẩm đều được thiết kế với sự chú ý tỉ mỉ đến từng chi tiết, từ những loại vải tốt nhất đến phom dáng hoàn hảo. Chúng tôi cam kết thực hành bền vững và sản xuất có đạo đức, đảm bảo rằng những sáng tạo của chúng tôi không chỉ tốt cho bạn mà còn cho cả hành tinh.',
  philosophyText2: 'Mục tiêu của chúng tôi là xây dựng một tủ quần áo gồm những món đồ được trân trọng mà bạn sẽ yêu thích trong nhiều năm tới.',
  philosophyImageUrl: 'https://picsum.photos/id/1066/800/1000',
  journeyTitle: 'Tham gia Hành trình của chúng tôi',
  journeyText: 'Chúng tôi mời bạn khám phá bộ sưu tập và tìm ra những thiết kế phù hợp với bạn. Hãy trở thành một phần của gia đình Sigma Vie và đón nhận một phong cách độc đáo của riêng bạn.',
};

export const getAboutPageContent = (): AboutPageContent => {
  try {
    const storedContent = localStorage.getItem(STORAGE_KEY);
    let localData = DEFAULT_ABOUT_CONTENT;

    if (storedContent) {
      localData = JSON.parse(storedContent);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ABOUT_CONTENT));
    }

    // Background sync from DB
    fetchAboutContentFromDB().then(dbContent => {
        if (dbContent && Object.keys(dbContent).length > 0) {
            const merged = { ...DEFAULT_ABOUT_CONTENT, ...dbContent };
            const currentStr = localStorage.getItem(STORAGE_KEY);
            const newStr = JSON.stringify(merged);
            
            if (currentStr !== newStr) {
                localStorage.setItem(STORAGE_KEY, newStr);
                // Dispatch event so About Page can re-render
                window.dispatchEvent(new Event(ABOUT_CONTENT_EVENT));
            }
        }
    }).catch(err => console.error("Error checking about content from DB:", err));

    return localData;
  } catch (error) {
    console.error("Failed to parse about page content from localStorage", error);
    return DEFAULT_ABOUT_CONTENT;
  }
};

export const updateAboutPageContent = async (content: AboutPageContent): Promise<{ success: boolean; message?: string }> => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  window.dispatchEvent(new Event(ABOUT_CONTENT_EVENT));
  
  try {
      const res = await syncAboutContentToDB(content);
      if (res && res.success) {
          return { success: true };
      } else {
          return { success: false, message: res?.message || 'Lỗi server' };
      }
  } catch (e: any) {
      return { success: false, message: e.message };
  }
};
