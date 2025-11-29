
import type { AboutPageContent } from '../types';

const STORAGE_KEY = 'sigma_vie_about_page';

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
    if (storedContent) {
      return JSON.parse(storedContent);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ABOUT_CONTENT));
      return DEFAULT_ABOUT_CONTENT;
    }
  } catch (error) {
    console.error("Failed to parse about page content from localStorage", error);
    return DEFAULT_ABOUT_CONTENT;
  }
};

export const updateAboutPageContent = (content: AboutPageContent): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
};