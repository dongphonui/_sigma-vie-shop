
export interface Product {
  id: number;
  name: string;
  price: string; // Giá bán (Giá gốc)
  salePrice?: string; // Giá khuyến mãi (NEW)
  isFlashSale?: boolean; // Có đang chạy Flash Sale không (NEW)
  flashSaleStartTime?: number; // Thời gian bắt đầu (Timestamp)
  flashSaleEndTime?: number; // Thời gian kết thúc (Timestamp)
  importPrice: string; // Giá nhập
  description: string;
  imageUrl: string;
  stock: number; // Số lượng tồn kho
  // New "Amazon-like" fields
  sku: string; // Stock Keeping Unit
  category: string;
  brand: string;
  status: 'active' | 'draft' | 'archived';
}

export interface CartItem extends Product {
  quantity: number;
  selectedPrice: number; // The price at the time of adding (sale or regular)
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface InventoryTransaction {
  id: string;
  productId: number;
  productName: string;
  type: 'IMPORT' | 'EXPORT'; // Nhập hoặc Xuất
  quantity: number;
  timestamp: number;
  note?: string;
}

export interface Customer {
  id: string;
  fullName: string;
  email?: string;       // Optional: User might register with Phone
  phoneNumber?: string; // Optional: User might register with Email
  cccdNumber?: string;  // NEW: Citizen ID Number
  gender?: string;      // NEW: Gender from CCCD
  dob?: string;         // NEW: Date of Birth from CCCD
  passwordHash: string;
  address?: string;
  createdAt: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerContact: string; // Email or Phone
  customerAddress: string;
  productId: number;
  productName: string;
  quantity: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED';
  timestamp: number;
  paymentMethod?: 'COD' | 'BANK_TRANSFER'; // NEW
}

export interface AdminLoginLog {
  id: string;
  username: string;
  method: 'EMAIL_OTP' | 'GOOGLE_AUTH';
  ip_address?: string;
  user_agent?: string;
  timestamp: number;
  status: 'SUCCESS' | 'FAILED';
}

export interface AboutPageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  welcomeHeadline: string;
  welcomeText: string;
  philosophyTitle: string;
  philosophyText1: string;
  philosophyText2: string;
  philosophyImageUrl: string;
  journeyTitle: string;
  journeyText: string;
}

export interface HomePageSettings {
  headlineText: string;
  headlineColor: string;
  headlineFont: string;
  headlineSize: string;
  subtitleText: string;
  subtitleColor: string;
  subtitleFont: string;
  
  // Promotion Section
  promoImageUrl: string; // Keep for legacy/fallback
  promoImageUrls: string[]; // NEW: Array for slider
  promoBackgroundColor: string;
  promoAccentColor: string; // Used for button and highlight text
  promoTag: string; // "Độc Quyền"
  promoSubTag: string; // "Chỉ có tại Sigma Vie"
  promoTitle1: string; // "Khơi Nguồn"
  promoTitleHighlight: string; // "Cảm Hứng"
  promoTitle2: string; // "Mới"
  promoTitleFont: string; 
  promoTitleColor: string;
  promoTitleSize: string;
  promoDescription: string;
  promoDescriptionFont: string; 
  promoDescriptionColor: string;
  promoDescriptionSize: string;
  promoButtonText: string;
  promoButtonBgColor: string;
  promoButtonTextColor: string;

  // Registration Section Settings
  regHeadlineText: string;
  regHeadlineColor: string;
  regHeadlineFont: string;
  regHeadlineSize: string;
  regDescriptionText: string;
  regDescriptionColor: string;
  regDescriptionFont: string;
  regDescriptionSize: string;
  regBgColorStart: string; // Gradient Start
  regBgColorEnd: string;   // Gradient End
  regButtonText: string;
  regButtonBgColor: string;
  regButtonTextColor: string;
  regButtonFont: string;
  regButtonFontSize: string;
  regPadding: string; 
  regBorderRadius: string;

  // Flash Sale Section Settings
  flashSaleBgColorStart: string;
  flashSaleBgColorEnd: string;
  flashSaleTitleText: string; // NEW: Content text
  flashSaleTitleColor: string;
  flashSaleTitleFont: string;
  flashSaleTitleSize: string;
  flashSaleTextColor: string;
}

export interface AboutPageSettings {
  headingColor: string;
  headingFont: string;
  paragraphColor: string;
  paragraphFont: string;
  buttonBgColor: string;
  buttonTextColor: string;
}

export interface HeaderSettings {
  brandName: string;
  brandColor: string;
  brandFontSize: string; // e.g. "30px"
  brandFont: string; // "Playfair Display" or "Poppins"
  brandBackgroundColor: string; // Header background color
  logoUrl?: string; // Logo image URL
  
  // Border / Frame Settings
  borderColor: string;
  borderWidth: string; // e.g. "1px"
  borderStyle: string; // e.g. "solid", "dashed"

  // Navigation Settings
  navStoreText: string; // "Cửa Hàng"
  navAboutText: string; // "Về Chúng Tôi"
  navColor: string;
  navHoverColor: string;
  navFont: string;
  navFontSize: string;

  // Login Button Settings
  loginBtnText: string;
  loginBtnFont: string;
  loginBtnFontSize: string;
  loginBtnTextColor: string;
  loginBtnBgColor: string;
}

export interface SocialSettings {
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
}

export interface BankSettings {
  bankId: string; // e.g., 'VCB', 'MB'
  accountNumber: string;
  accountName: string;
  template: string; // 'qr_only', 'compact', 'compact2', 'print'
}

export interface StoreSettings {
  name: string;
  phoneNumber: string;
  address: string;
  email?: string;
}