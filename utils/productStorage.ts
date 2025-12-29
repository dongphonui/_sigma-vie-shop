
import { PRODUCTS } from '../constants';
import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, updateProductStockInDB, checkServerConnection, deleteProductFromDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_products';
const DELETED_KEY = 'sigma_vie_deleted_products';

// Biến cờ để kiểm tra xem đã load từ DB chưa
let hasLoadedFromDB = false;

const getDeletedIds = (): Set<string> => {
    const stored = localStorage.getItem(DELETED_KEY);
    return new Set(stored ? JSON.parse(stored) : []);
};

const trackDeletedId = (id: string) => {
    const deleted = getDeletedIds();
    deleted.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deleted)));
};

// Helper function to handle the merging logic
const processAndMergeData = (localData: Product[], dbProducts: any[]) => {
    if (dbProducts && Array.isArray(dbProducts)) {
        console.log('Đã tải dữ liệu từ Server. Số lượng:', dbProducts.length);
        const deletedIds = getDeletedIds();
        
        // --- QUAN TRỌNG: RESET LOGIC ---
        if (dbProducts.length === 0 && localData.length > 0) {
            console.log("Server trống. Đang làm sạch Local để đồng bộ Reset.");
            localStorage.removeItem(DELETED_KEY); // Clear deletion track on full reset
            return [];
        }

        // CHUẨN HÓA ID VỀ STRING ĐỂ SO SÁNH
        const serverIdSet = new Set(dbProducts.map((p: any) => String(p.id)));
        
        // Tìm những sản phẩm có ở Local nhưng chưa có ở Server
        // CHỈ đồng bộ những sản phẩm KHÔNG nằm trong danh sách đã xóa
        const unsavedLocalProducts = localData.filter(p => {
            const idStr = String(p.id);
            return !serverIdSet.has(idStr) && !deletedIds.has(idStr);
        });
        
        if (unsavedLocalProducts.length > 0) {
            console.log(`Phát hiện ${unsavedLocalProducts.length} sản phẩm chưa được lưu. Đang đồng bộ...`);
            unsavedLocalProducts.forEach(p => syncProductToDB(p));
        }

        // Merge: Dữ liệu Server là chuẩn + Dữ liệu Local chưa lưu (và chưa xóa)
        const mergedProducts = [...dbProducts, ...unsavedLocalProducts];
        mergedProducts.sort((a, b) => Number(b.id) - Number(a.id));

        return mergedProducts;
    }
    return null;
};

// Force reload helper (Standard - attempts to merge)
export const forceReloadProducts = async (): Promise<Product[]> => {
    hasLoadedFromDB = false; 
    const storedProducts = localStorage.getItem(STORAGE_KEY);
    let localData: Product[] = storedProducts ? JSON.parse(storedProducts) : [];

    try {
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
        return getProducts();
    }
};

// NUCLEAR OPTION: Hard Reset
export const hardResetProducts = async (): Promise<Product[]> => {
    const isOnline = await checkServerConnection();
    if (!isOnline) {
        throw new Error("Không thể kết nối Server.");
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DELETED_KEY);
    hasLoadedFromDB = false;
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
      try { localData = JSON.parse(storedProducts); } catch (e) { localStorage.removeItem(STORAGE_KEY); localData = []; }
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
      }).catch(() => { });
    }
    return localData.map(formatProduct);
  } catch (error) {
    return []; 
  }
};

export const addProduct = (product: Omit<Product, 'id'>): Product => {
  const products = getProducts();
  const id = Date.now();
  const newProduct: Product = {
    ...product,
    id,
    stock: product.stock || 0,
    importPrice: product.importPrice || '0₫',
    sku: product.sku || `SKU-${id}`,
    category: product.category || 'Chưa phân loại',
    brand: product.brand || 'Sigma Vie',
    status: product.status || 'draft',
    isFlashSale: product.isFlashSale || false,
    sizes: product.sizes || [],
    colors: product.colors || [],
    variants: product.variants || []
  };
  const updatedProducts = [newProduct, ...products];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  syncProductToDB(newProduct);
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

export const deleteProduct = async (id: number): Promise<{ success: boolean; message: string }> => {
  console.log(`🚀 Initiating deletion for product ${id}`);
  try {
      // 1. Mark as deleted locally first to prevent resurrection during async calls
      trackDeletedId(String(id));

      const res = await deleteProductFromDB(id);
      if (res && res.success) {
          // 2. Clear from local storage
          const products = getProducts();
          const updatedProducts = products.filter(product => String(product.id) !== String(id));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
          window.dispatchEvent(new Event('sigma_vie_products_update'));
          return { success: true, message: 'Đã xóa sản phẩm thành công.' };
      } else {
          // If server failed but not a network error, we might want to untrack to allow retry? 
          // For now, assume if server fails, we keep it tracked to avoid ghost items.
          return { success: false, message: res?.error || res?.message || 'Server từ chối xóa sản phẩm.' };
      }
  } catch (err: any) {
      console.error("❌ Critical deletion error:", err);
      return { success: false, message: err.message || 'Lỗi kết nối khi xóa.' };
  }
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
            product.variants[vIndex].stock = variant.stock + quantityChange;
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
