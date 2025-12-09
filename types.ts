
export interface ProductVariant {
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  price: string; // Giá bán (Giá gốc)
  salePrice?: string; // Giá khuyến mãi
  isFlashSale?: boolean; // Có đang chạy Flash Sale không
  flashSaleStartTime?: number; // Thời gian bắt đầu
  flashSaleEndTime?: number; // Thời gian kết thúc
  importPrice: string; // Giá nhập
  description: string;
  imageUrl: string;
  stock: number; // Tổng tồn kho
  // New "Amazon-like" fields
  sku: string; // Stock Keeping Unit
  category: string;
  brand: string;
  status: 'active' | 'draft' | 'archived';
  sizes?: string[]; // Danh sách size
  colors?: string[]; // Danh sách màu
  variants?: ProductVariant[]; // NEW: Quản lý tồn kho chi tiết
}

export interface CartItem extends Product {
  quantity: number;
  selectedPrice: number;
  selectedSize?: string; // NEW: Size khách chọn
  selectedColor?: string; // NEW: Màu khách chọn
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
  type: 'IMPORT' | 'EXPORT';
  quantity: number;
  timestamp: number;
  note?: string;
  selectedSize?: string; // NEW: Size cụ thể
  selectedColor?: string; // NEW: Màu cụ thể
}

export interface Customer {
  id: string;
  fullName: string;
  email?: string;       
  phoneNumber?: string; 
  cccdNumber?: string;  
  gender?: string;      
  dob?: string;         
  issueDate?: string;   
  passwordHash: string;
  address?: string;
  createdAt: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerContact: string; 
  customerAddress: string;
  productId: number;
  productName: string;
  productSize?: string; // NEW: Size khách chọn
  productColor?: string; // NEW: Màu khách chọn
  quantity: number;
  totalPrice: number; 
  shippingFee?: number; 
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED';
  timestamp: number;
  paymentMethod?: 'COD' | 'BANK_TRANSFER'; 
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
  promoImageUrl: string;
  promoImageUrls: string[]; 
  promoBackgroundColor: string;
  promoAccentColor: string; 
  promoTag: string; 
  promoSubTag: string; 
  promoTitle1: string; 
  promoTitleHighlight: string; 
  promoTitle2: string; 
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
  regBgColorStart: string; 
  regBgColorEnd: string;   
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
  flashSaleTitleText: string; 
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
  brandFontSize: string; 
  brandFont: string; 
  brandBackgroundColor: string; 
  logoUrl?: string; 
  
  borderColor: string;
  borderWidth: string; 
  borderStyle: string; 

  navStoreText: string; 
  navAboutText: string; 
  navColor: string;
  navHoverColor: string;
  navFont: string;
  navFontSize: string;

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
  bankId: string; 
  accountNumber: string;
  accountName: string;
  template: string; 
}

export interface StoreSettings {
  name: string;
  phoneNumber: string;
  address: string;
  email?: string;
}

export interface ShippingSettings {
  baseFee: number; 
  freeShipThreshold: number; 
  enabled: boolean;
}
