
import { PRODUCTS } from '../constants';
import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, updateProductStockInDB, checkServerConnection } from './apiClient';

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

// Force reload helper (Standard - attempts to merge)
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

// NUCLEAR OPTION: Hard Reset (SAFE VERSION)
export const hardResetProducts = async (): Promise<Product[]> => {
    console.warn("SAFE HARD RESET TRIGGERED");
    
    // 1. CHECK SERVER HEALTH FIRST
    // If server is down, ABORT immediately to save local data.
    const isOnline = await checkServerConnection();
    if (!isOnline) {
        const errorMsg = "KHÔNG THỂ KẾT NỐI SERVER. Hủy thao tác xóa cache để bảo vệ dữ liệu bạn vừa nhập.";
        alert(errorMsg);
        throw new Error(errorMsg);
    }

    // 2. ATTEMPT SYNC
    try {
        const success = await syncAllLocalDataToServer();
        if (!success) {
             const confirm = window.confirm("Cảnh báo: Có lỗi xảy ra khi đồng bộ một số sản phẩm lên Server. Nếu bạn tiếp tục, dữ liệu chưa lưu sẽ bị MẤT. Bạn có chắc chắn muốn tiếp tục không?");
             if (!confirm) throw new Error("User cancelled reset due to sync failure.");
        } else {
            console.log("Đã hoàn tất sao lưu dữ liệu lên Server trước khi reset.");
        }
    } catch (syncError) {
        throw syncError; // Abort
    }

    // 3. WIPE CACHE ONLY IF SERVER IS REACHABLE
    localStorage.removeItem(STORAGE_KEY);
    hasLoadedFromDB = false;

    // 4. FETCH FRESH
    try {
        const dbProducts = await fetchProductsFromDB();
        
        if (dbProducts && Array.isArray(dbProducts)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbProducts));
            window.dispatchEvent(new Event('sigma_vie_products_update'));
            hasLoadedFromDB = true;
            return dbProducts.map(formatProduct);
        } else {
            throw new Error("Server connected but returned no data.");
        }
    } catch (e) {
        console.error("Hard Reset Failed:", e);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTS));
        throw e;
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
        const storedProducts = localStorage.getItem(STORAGE_KEY);
        const products: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
        
        console.log("Bắt đầu đồng bộ thủ công...", products.length, "sản phẩm");
        
        // Dùng Promise.allSettled để đảm bảo 1 cái lỗi không làm dừng tất cả
        const results = await Promise.allSettled(products.map(p => syncProductToDB(p)));
        
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success));
        
        if (failed.length > 0) {
            console.warn(`Có ${failed.length} sản phẩm đồng bộ thất bại.`);
            return false;
        } else {
            console.log("Đồng bộ tất cả sản phẩm thành công!");
            return true;
        }
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
  console.log("Đang gửi sản phẩm mới lên Server:", newProduct.name);
  syncProductToDB(newProduct).then(res => {
      if (!res || !res.success) {
          console.error("❌ LƯU SERVER THẤT BẠI. Dữ liệu chỉ nằm ở Local.", res);
          alert("Cảnh báo: Không thể lưu sản phẩm lên Server (Lỗi mạng hoặc Server chưa chạy). Sản phẩm này sẽ mất nếu bạn xóa cache.");
      } else {
          console.log("✅ Đã lưu sản phẩm lên Server thành công.");
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
