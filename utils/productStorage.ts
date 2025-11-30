
import { PRODUCTS } from '../constants';
import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, updateProductStockInDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_products';

// Biến cờ để kiểm tra xem đã load từ DB chưa
let hasLoadedFromDB = false;

export const getProducts = (): Product[] => {
  try {
    // 1. Lấy từ LocalStorage trước (để hiển thị ngay lập tức)
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    let localData = [];
    
    if (storedProducts) {
      localData = JSON.parse(storedProducts);
    } else {
      localData = PRODUCTS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTS));
    }

    // 2. Nếu chưa load từ DB lần nào trong phiên này, hãy gọi API ngầm
    // Cải tiến: Thêm timeout nhỏ để tránh conflict nếu vừa load trang
    if (!hasLoadedFromDB) {
      setTimeout(() => {
        fetchProductsFromDB().then(dbProducts => {
          if (dbProducts && dbProducts.length > 0) {
            console.log('Đã tải dữ liệu từ Postgres thành công!');
            // Ghi đè LocalStorage bằng dữ liệu thật từ DB
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbProducts));
            hasLoadedFromDB = true;
          }
        });
      }, 500);
      hasLoadedFromDB = true; 
    }

    return localData.map((p: any) => ({
        ...p,
        stock: p.stock !== undefined ? p.stock : 0,
        importPrice: p.importPrice || '0₫',
        sku: p.sku || `SKU-${p.id}`,
        category: p.category || 'Chung',
        brand: p.brand || 'Sigma Vie',
        status: p.status || 'active',
        isFlashSale: p.isFlashSale || false,
        salePrice: p.salePrice || undefined,
        flashSaleStartTime: p.flashSaleStartTime || undefined,
        flashSaleEndTime: p.flashSaleEndTime || undefined,
    }));

  } catch (error) {
    console.error("Lỗi storage", error);
    return PRODUCTS;
  }
};

export const addProduct = (product: Omit<Product, 'id'>): Product => {
  const products = getProducts();
  const newProduct: Product = {
    ...product,
    id: Date.now(),
    stock: product.stock || 0,
    importPrice: product.importPrice || '0₫',
    sku: product.sku || `SKU-${Date.now()}`,
    category: product.category || 'Chưa phân loại',
    brand: product.brand || 'Sigma Vie',
    status: product.status || 'draft',
    isFlashSale: product.isFlashSale || false,
    salePrice: product.salePrice,
    flashSaleStartTime: product.flashSaleStartTime,
    flashSaleEndTime: product.flashSaleEndTime
  };
  
  const updatedProducts = [newProduct, ...products];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  
  // Gửi lên Server Postgres
  syncProductToDB(newProduct);
  
  return newProduct;
};

export const updateProduct = (updatedProduct: Product): void => {
  const products = getProducts();
  const index = products.findIndex(p => p.id === updatedProduct.id);
  if (index !== -1) {
    products[index] = updatedProduct;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    
    // Gửi cập nhật lên Server
    syncProductToDB(updatedProduct); 
  }
};

export const deleteProduct = (id: number): void => {
  const products = getProducts();
  const updatedProducts = products.filter(product => product.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
};

export const updateProductStock = (id: number, quantityChange: number): boolean => {
    const products = getProducts();
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) return false;
    
    const currentStock = products[productIndex].stock;
    const newStock = currentStock + quantityChange;

    if (newStock < 0) return false;

    // 1. Cập nhật Optimistic cho UI (Local Storage) để người dùng thấy ngay
    products[productIndex].stock = newStock;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    
    // 2. Cập nhật Atomic lên Server (Quan trọng: Gửi +10, -5 chứ không gửi số tổng)
    // Điều này giúp tránh việc ghi đè sai dữ liệu khi thao tác nhanh
    updateProductStockInDB(id, quantityChange).then(response => {
        if (response && response.success) {
            console.log(`Đã cập nhật kho an toàn trên server. Tồn kho mới: ${response.newStock}`);
        }
    });

    return true;
};
