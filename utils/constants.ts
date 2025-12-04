
import type { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 1,
    name: 'Áo Khoác Trench Coat Cổ Điển',
    price: '4,500,000₫',
    importPrice: '2,500,000₫',
    description: 'Một chiếc áo khoác trench coat màu be vượt thời gian, làm từ vải cotton gabardine chống nước. Hoàn hảo cho mọi mùa.',
    imageUrl: 'https://picsum.photos/id/1015/800/1200',
    stock: 10,
    sku: 'TC-001-BE',
    category: 'Áo khoác',
    brand: 'Sigma Original',
    status: 'active',
    // Enable Flash Sale for Demo
    isFlashSale: true,
    salePrice: '3,500,000₫',
    flashSaleStartTime: Date.now() - 3600000, // Started 1 hour ago
    flashSaleEndTime: Date.now() + 86400000 * 2 // Ends in 2 days
  },
  {
    id: 2,
    name: 'Áo Blouse Lụa Pha',
    price: '1,800,000₫',
    importPrice: '900,000₫',
    description: 'Chiếc áo blouse màu ngà voi thanh lịch được chế tác từ lụa pha cao cấp, có phom dáng thoải mái và cổ tay cài cúc.',
    imageUrl: 'https://picsum.photos/id/1016/800/1200',
    stock: 25,
    sku: 'BL-002-IV',
    category: 'Áo sơ mi',
    brand: 'Sigma Silk',
    status: 'active'
  },
  {
    id: 3,
    name: 'Quần Tây Lưng Cao',
    price: '2,200,000₫',
    importPrice: '1,100,000₫',
    description: 'Quần tây lưng cao màu đen sang trọng tạo nên vóc dáng thon gọn. Chất liệu co giãn nhẹ mang lại sự thoải mái.',
    imageUrl: 'https://picsum.photos/id/1025/800/1200',
    stock: 15,
    sku: 'PA-003-BK',
    category: 'Quần',
    brand: 'Sigma Office',
    status: 'active'
  },
  {
    id: 4,
    name: 'Áo Len Cashmere',
    price: '3,500,000₫',
    importPrice: '1,800,000₫',
    description: 'Một chiếc áo len cashmere màu xám ấm áp và mềm mại. Món đồ không thể thiếu cho một vẻ ngoài tinh tế và thoải mái.',
    imageUrl: 'https://picsum.photos/id/103/800/1200',
    stock: 8,
    sku: 'SW-004-GR',
    category: 'Áo len',
    brand: 'Sigma Winter',
    status: 'active'
  },
  {
    id: 5,
    name: 'Bốt Da Cổ Ngắn',
    price: '3,800,000₫',
    importPrice: '2,000,000₫',
    description: 'Được làm thủ công từ da thật, đôi bốt cổ ngắn màu đen này có gót khối thời trang và thiết kế tinh gọn.',
    imageUrl: 'https://picsum.photos/id/21/800/1200',
    stock: 5,
    sku: 'SH-005-BK',
    category: 'Giày dép',
    brand: 'Sigma Leather',
    status: 'active'
  },
  {
    id: 6,
    name: 'Túi Tote Tối Giản',
    price: '2,900,000₫',
    importPrice: '1,500,000₫',
    description: 'Một chiếc túi tote rộng rãi và tối giản với màu nâu rám nắng đậm, hoàn hảo để mang theo những vật dụng cần thiết hàng ngày một cách phong cách.',
    imageUrl: 'https://picsum.photos/id/22/800/1200',
    stock: 12,
    sku: 'BA-006-BR',
    category: 'Phụ kiện',
    brand: 'Sigma Leather',
    status: 'active'
  },
   {
    id: 7,
    name: 'Áo Khoác Denim',
    price: '2,500,000₫',
    importPrice: '1,200,000₫',
    description: 'Một phiên bản hiện đại của áo khoác denim cổ điển, có phom dáng hơi rộng và các chi tiết kim loại cao cấp.',
    imageUrl: 'https://picsum.photos/id/145/800/1200',
    stock: 20,
    sku: 'JK-007-BL',
    category: 'Áo khoác',
    brand: 'Sigma Denim',
    status: 'active', // Changed status to active to be visible
    // Also enable flash sale here for variety
    isFlashSale: true,
    salePrice: '1,900,000₫',
    flashSaleStartTime: Date.now() - 3600000,
    flashSaleEndTime: Date.now() + 86400000 
  },
  {
    id: 8,
    name: 'Váy Hè Vải Lanh',
    price: '2,800,000₫',
    importPrice: '1,400,000₫',
    description: 'Một chiếc váy vải lanh thoáng mát và phong cách, hoàn hảo cho thời tiết ấm áp. Có phom dáng thoải mái và túi hai bên.',
    imageUrl: 'https://picsum.photos/id/349/800/1200',
    stock: 18,
    sku: 'DR-008-WH',
    category: 'Váy',
    brand: 'Sigma Summer',
    status: 'active'
  },
];

export const VIET_QR_BANKS = [
    { id: 'VCB', name: 'Vietcombank', code: '970436' },
    { id: 'MB', name: 'MB Bank', code: '970422' },
    { id: 'TCB', name: 'Techcombank', code: '970407' },
    { id: 'ACB', name: 'ACB', code: '970416' },
    { id: 'ICB', name: 'VietinBank', code: '970415' },
    { id: 'BIDV', name: 'BIDV', code: '970418' },
    { id: 'VPB', name: 'VPBank', code: '970432' },
    { id: 'TPB', name: 'TPBank', code: '970423' },
    { id: 'STB', name: 'Sacombank', code: '970403' },
    { id: 'VIB', name: 'VIB', code: '970441' },
    { id: 'HDB', name: 'HDBank', code: '970437' },
    { id: 'MSB', name: 'MSB', code: '970426' },
    { id: 'OCB', name: 'OCB', code: '970448' },
];
