
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
      try {
        localData = JSON.parse(storedProducts);
        // Kiểm tra tính hợp lệ của dữ liệu
        if (!Array.isArray(localData)) {
            throw new Error("Data in localStorage is not an array");
        }
      } catch (e) {
        console.error("LocalStorage data corrupted, resetting to defaults.", e);
        localStorage.removeItem(STORAGE_KEY);
        localData = PRODUCTS;
      }
    } else {
      localData = PRODUCTS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTS));
    }

    // 2. Nếu chưa load từ DB lần nào trong phiên này, hãy gọi API NGAY LẬP TỨC
    if (!hasLoadedFromDB) {
      hasLoadedFromDB = true; 
      
      // Gọi bất đồng bộ, không chặn UI
      fetchProductsFromDB().then(dbProducts => {
          if (dbProducts && Array.isArray(dbProducts) && dbProducts.length > 0) {
            console.log('Đã đồng bộ dữ liệu sản phẩm từ Server.');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbProducts));
            // Phát sự kiện quan trọng để Home.tsx biết mà render lại
            window.dispatchEvent(new Event('sigma_vie_products_update'));
          } else {
             // Kể cả không có dữ liệu mới, cũng phát sự kiện để tắt loading (nếu có)
             window.dispatchEvent(new Event('sigma_vie_products_update'));
          }
      }).catch(err => {
          console.error("Lỗi đồng bộ sản phẩm:", err);
          // Vẫn phát sự kiện để UI tắt loading
          window.dispatchEvent(new Event('sigma_vie_products_update'));
      });
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
        sizes: Array.isArray(p.sizes) ? p.sizes : [], 
        colors: Array.isArray(p.colors) ? p.colors : [],
        variants: Array.isArray(p.variants) ? p.variants : [] 
    }));

  } catch (error) {
    console.error("Lỗi storage nghiêm trọng", error);
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
    flashSaleEndTime: product.flashSaleEndTime,
    sizes: product.sizes || [],
    colors: product.colors || [],
    variants: product.variants || []
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

export const updateProductStock = (id: number, quantityChange: number, size?: string, color?: string): boolean => {
    const products = getProducts();
    const productIndex = products.findIndex(p => p.id === id);
    
    if (productIndex === -1) return false;
    
    const product = products[productIndex];
    let newTotalStock = product.stock + quantityChange;

    // Logic: Optimistic Update for UI
    if (size || color) {
        if (!product.variants) product.variants = [];
        
        const vIndex = product.variants.findIndex(v => 
            (v.size === size || (!v.size && !size)) && 
            (v.color === color || (!v.color && !color))
        );

        if (vIndex !== -1) {
            // Update existing variant
            const variant = product.variants[vIndex];
            const newVariantStock = variant.stock + quantityChange;
            if (newVariantStock < 0) return false; // Prevent negative variant stock
            product.variants[vIndex].stock = newVariantStock;
        } else if (quantityChange > 0) {
            // New Variant
            product.variants.push({ size: size || '', color: color || '', stock: quantityChange });
        } else {
            return false; // Can't reduce non-existent variant
        }
        
        // Recalculate total stock sum
        newTotalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    } else {
        if (newTotalStock < 0) return false;
    }

    product.stock = newTotalStock;
    products[productIndex] = product;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    
    // 2. Cập nhật Atomic lên Server (Send variant info)
    updateProductStockInDB(id, quantityChange, size, color).then(response => {
        if (response && response.success) {
            console.log(`Đã cập nhật kho an toàn trên server.`);
        }
    });

    return true;
};
