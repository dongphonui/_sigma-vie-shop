
import { PRODUCTS } from '../constants';
import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, updateProductStockInDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_products';

// Biến cờ để kiểm tra xem đã load từ DB chưa
let hasLoadedFromDB = false;

// Helper function to handle the merging logic (extracted to reuse)
const processAndMergeData = (localData: Product[], dbProducts: any[]) => {
    if (dbProducts && Array.isArray(dbProducts)) {
        console.log('Đã tải dữ liệu từ Server. Số lượng:', dbProducts.length);
        
        // CHUẨN HÓA ID VỀ STRING ĐỂ SO SÁNH
        const serverIdSet = new Set(dbProducts.map((p: any) => String(p.id)));
        
        // Tìm những sản phẩm có ở Local nhưng chưa có ở Server (Sản phẩm mới tạo offline)
        const unsavedLocalProducts = localData.filter(p => !serverIdSet.has(String(p.id)));
        
        if (unsavedLocalProducts.length > 0) {
            console.log(`Phát hiện ${unsavedLocalProducts.length} sản phẩm chưa được lưu. Đang đồng bộ lại...`);
            unsavedLocalProducts.forEach(p => syncProductToDB(p));
        }

        // Merge: Dữ liệu Server là chuẩn + Dữ liệu Local chưa lưu
        const mergedProducts = [...dbProducts, ...unsavedLocalProducts];
        
        // Sắp xếp: Mới nhất lên đầu
        mergedProducts.sort((a, b) => Number(b.id) - Number(a.id));

        return mergedProducts;
    }
    return null;
};

// Force reload helper (Updated to be Async and blocking)
export const forceReloadProducts = async (): Promise<Product[]> => {
    hasLoadedFromDB = false; // Reset flag
    
    // 1. Get current local data to preserve unsaved items
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    let localData: Product[] = storedProducts ? JSON.parse(storedProducts) : PRODUCTS;

    try {
        console.log("Đang ép buộc tải lại từ Server...");
        const dbProducts = await fetchProductsFromDB();
        
        if (dbProducts) {
            const merged = processAndMergeData(localData, dbProducts);
            if (merged) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
                window.dispatchEvent(new Event('sigma_vie_products_update'));
                hasLoadedFromDB = true;
                return merged.map(formatProduct);
            }
        }
        throw new Error("Không lấy được dữ liệu mới từ Server");
    } catch (e) {
        console.error("Lỗi khi ép buộc tải lại:", e);
        // Fallback to local
        return getProducts();
    }
};

const formatProduct = (p: any): Product => ({
    ...p,
    id: Number(p.id), 
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
});

export const getProducts = (): Product[] => {
  try {
    // 1. Lấy từ LocalStorage trước
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    let localData: Product[] = [];
    
    if (storedProducts) {
      try {
        localData = JSON.parse(storedProducts);
        if (!Array.isArray(localData)) throw new Error("Data is not array");
      } catch (e) {
        console.error("LocalStorage corrupted, resetting.", e);
        localStorage.removeItem(STORAGE_KEY);
        localData = PRODUCTS;
      }
    } else {
      localData = PRODUCTS;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTS));
    }

    // 2. Load từ DB và Merge thông minh (Non-blocking background update)
    if (!hasLoadedFromDB) {
      hasLoadedFromDB = true; 
      fetchProductsFromDB().then(dbProducts => {
          const merged = processAndMergeData(localData, dbProducts);
          if (merged) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new Event('sigma_vie_products_update'));
          }
      }).catch(err => {
          console.error("Lỗi kết nối Server khi tải sản phẩm (Background):", err);
      });
    }

    return localData.map(formatProduct);

  } catch (error) {
    console.error("Lỗi storage nghiêm trọng", error);
    return PRODUCTS;
  }
};

// Hàm thủ công để đẩy toàn bộ dữ liệu Local lên Server (Fix lỗi không đồng bộ)
export const syncAllLocalDataToServer = async (): Promise<boolean> => {
    try {
        const products = getProducts();
        console.log("Bắt đầu đồng bộ thủ công...", products.length, "sản phẩm");
        
        const promises = products.map(p => syncProductToDB(p));
        await Promise.all(promises);
        
        return true;
    } catch (e) {
        console.error("Lỗi đồng bộ thủ công:", e);
        return false;
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
  
  // Gửi lên Server Postgres (Không chặn UI)
  syncProductToDB(newProduct).then(res => {
      if (!res || !res.success) {
          console.warn("Lưu lên server thất bại, sẽ thử lại ở lần tải sau.");
      }
  });
  
  return newProduct;
};

export const updateProduct = (updatedProduct: Product): void => {
  const products = getProducts();
  // So sánh ID dạng String để an toàn
  const index = products.findIndex(p => String(p.id) === String(updatedProduct.id));
  if (index !== -1) {
    products[index] = updatedProduct;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    
    syncProductToDB(updatedProduct); 
  }
};

export const deleteProduct = (id: number): void => {
  const products = getProducts();
  const updatedProducts = products.filter(product => String(product.id) !== String(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  // Note: Cần thêm API xóa trên server nếu muốn đồng bộ hoàn toàn việc xóa
};

export const updateProductStock = (id: number, quantityChange: number, size?: string, color?: string): boolean => {
    const products = getProducts();
    const productIndex = products.findIndex(p => String(p.id) === String(id));
    
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
            if (newVariantStock < 0) return false; 
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
    
    // Update server
    updateProductStockInDB(id, quantityChange, size, color).then(response => {
        if (response && response.success) {
            console.log(`Đã cập nhật kho an toàn trên server.`);
        }
    });

    return true;
};
