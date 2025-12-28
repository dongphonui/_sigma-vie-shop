
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
        
        // --- QUAN TRỌNG: RESET LOGIC ---
        // Nếu Server trả về danh sách RỖNG, có nghĩa là Server vừa bị Reset.
        // Trong trường hợp này, chúng ta không được merge mà phải xóa sạch Local để đồng bộ.
        if (dbProducts.length === 0 && localData.length > 0) {
            // Kiểm tra xem Local có sản phẩm "mới tạo" (ID lớn hơn thời điểm reset) không.
            // Nhưng đơn giản nhất cho chức năng Reset là: Server trống -> Local trống.
            console.log("Server trống. Đang làm sạch Local để đồng bộ Reset.");
            return [];
        }

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
    let localData: Product[] = storedProducts ? JSON.parse(storedProducts) : [];

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
        return localData.map(formatProduct);
    } catch (e) {
        console.error("Lỗi khi ép buộc tải lại:", e);
        return getProducts();
    }
};

// NUCLEAR OPTION: Hard Reset (SAFE VERSION)
export const hardResetProducts = async (): Promise<Product[]> => {
    console.warn("SAFE HARD RESET TRIGGERED");
    
    // 1. CHECK SERVER HEALTH FIRST
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
        }
    } catch (syncError) {
        throw syncError; // Abort
    }

    // 3. WIPE CACHE
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
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            return [];
        }
    } catch (e) {
        console.error("Hard Reset Failed:", e);
        localStorage.setItem(STORAGE_KEY, JSON.stringify([])); 
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
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    let localData: Product[] = [];
    
    if (storedProducts) {
      try {
        localData = JSON.parse(storedProducts);
        if (!Array.isArray(localData)) throw new Error("Data is not array");
      } catch (e) {
        console.error("LocalStorage corrupted, resetting.", e);
        localStorage.removeItem(STORAGE_KEY);
        localData = []; 
      }
    } else {
      localData = [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }

    if (!hasLoadedFromDB) {
      hasLoadedFromDB = true; 
      fetchProductsFromDB().then(dbProducts => {
          const merged = processAndMergeData(localData, dbProducts);
          if (merged) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            window.dispatchEvent(new Event('sigma_vie_products_update'));
          }
      }).catch(err => { });
    }

    return localData.map(formatProduct);

  } catch (error) {
    console.error("Lỗi storage nghiêm trọng", error);
    return []; 
  }
};

export const syncAllLocalDataToServer = async (): Promise<boolean> => {
    try {
        const storedProducts = localStorage.getItem(STORAGE_KEY);
        const products: Product[] = storedProducts ? JSON.parse(storedProducts) : [];
        const results = await Promise.allSettled(products.map(p => syncProductToDB(p)));
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value?.success));
        return failed.length === 0;
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
  
  syncProductToDB(newProduct).then(res => {
      if (res && !res.success && !res.isNetworkError) {
          alert(`CẢNH BÁO LỖI SERVER:\n\nSản phẩm "${newProduct.name}" chỉ được lưu trên máy này và chưa lên Server.`);
      }
  });
  
  return newProduct;
};

export const updateProduct = (updatedProduct: Product): void => {
  const products = getProducts();
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
};

export const updateProductStock = (id: number, quantityChange: number, size?: string, color?: string): boolean => {
    const products = getProducts();
    const productIndex = products.findIndex(p => String(p.id) === String(id));
    if (productIndex === -1) return false;
    const product = products[productIndex];
    let newTotalStock = product.stock + quantityChange;
    if (size || color) {
        if (!product.variants) product.variants = [];
        const vIndex = product.variants.findIndex(v => (v.size === size || (!v.size && !size)) && (v.color === color || (!v.color && !color)));
        if (vIndex !== -1) {
            const variant = product.variants[vIndex];
            const newVariantStock = variant.stock + quantityChange;
            if (newVariantStock < 0) return false; 
            product.variants[vIndex].stock = newVariantStock;
        } else if (quantityChange > 0) {
            product.variants.push({ size: size || '', color: color || '', stock: quantityChange });
        } else return false;
        newTotalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    } else if (newTotalStock < 0) return false;
    product.stock = newTotalStock;
    products[productIndex] = product;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    updateProductStockInDB(id, quantityChange, size, color);
    return true;
};
