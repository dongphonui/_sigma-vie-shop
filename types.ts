
export interface ProductVariant {
  size: string;
  color: string;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  price: string;
  salePrice?: string;
  isFlashSale?: boolean;
  flashSaleStartTime?: number;
  flashSaleEndTime?: number;
  importPrice: string;
  description: string;
  imageUrl: string;
  stock: number;
  sku: string;
  category: string;
  brand: string;
  status: 'active' | 'draft' | 'archived';
  sizes?: string[];
  colors?: string[];
  variants?: ProductVariant[];
}

// Cấu hình giao diện sản phẩm chi tiết
export interface ProductPageSettings {
  titleFont: string;
  titleColor: string;
  titleSize: string;
  priceFont: string;
  priceColor: string;
  priceSize: string;
  descFont: string;
  descColor: string;
  descSize: string;
  badgeLabel: string; // Nhãn thay thế cho Collection/Mã hiệu
  badgeBgColor: string;
  badgeTextColor: string;
  buyBtnText: string;
  buyBtnBgColor: string;
  buyBtnTextColor: string;
  qrIconVisible: boolean;
}

export interface CartItem extends Product {
  quantity: number;
  selectedPrice: number;
  selectedSize?: string;
  selectedColor?: string;
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
  selectedSize?: string;
  selectedColor?: string;
  stockAfter?: number;
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
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  note?: string;
  customerAddress: string; 
  productId: number;
  productName: string;
  productSize?: string;
  productColor?: string;
  quantity: number;
  totalPrice: number; 
  shippingFee?: number; 
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'CANCELLED';
  timestamp: number;
  paymentMethod?: 'COD' | 'BANK_TRANSFER'; 
}

export interface AdminUser {
    id: string;
    username: string;
    fullname: string;
    role: 'MASTER' | 'STAFF';
    permissions: string[];
    created_at?: number;
    totp_secret?: string;
    is_totp_enabled?: boolean;
}

// Fixed: Added missing AdminLoginLog interface
export interface AdminLoginLog {
    id: number;
    username: string;
    method: string;
    status: string;
    ip_address?: string;
    timestamp: number;
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
