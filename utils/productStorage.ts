
import { PRODUCTS } from '../constants';
import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, updateProductStockInDB, checkServerConnection, deleteProductFromDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_products';
const DELETED_KEY = 'sigma_vie_deleted_products';

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

const processAndMergeData = (localData: Product[], dbProducts: any[]) => {
    if (dbProducts && Array.isArray(dbProducts)) {
        const deletedIds = getDeletedIds();
        if (dbProducts.length === 0 && localData.length > 0) {
            localStorage.removeItem(DELETED_KEY);
            return [];
        }
        const serverIdSet = new Set(dbProducts.map((p: any) => String(p.id)));
        const unsavedLocalProducts = localData.filter(p => {
            const idStr = String(p.id);
            return !serverIdSet.has(idStr) && !deletedIds.has(idStr);
        });
        if (unsavedLocalProducts.length > 0) {
            unsavedLocalProducts.forEach(p => syncProductToDB(p));
        }
        const mergedProducts = [...dbProducts, ...unsavedLocalProducts];
        mergedProducts.sort((a, b) => Number(b.id) - Number(a.id));
        return mergedProducts;
    }
    return null;
};

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
    } catch (e) { return getProducts(); }
};

export const hardResetProducts = async (): Promise<Product[]> => {
    const isOnline = await checkServerConnection();
    if (!isOnline) throw new Error("Không thể kết nối Server.");
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
    stock: p.stock !== undefined ? Number(p.stock) : 0,
    importPrice: p.importPrice || '0₫',
    sku: p.sku || `SKU-${p.id}`,
    category: p.category || 'Chung',
    brand: p.brand || 'Sigma Vie',
    status: p.status || 'active',
    isFlashSale: p.isFlashSale || false,
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
  } catch (error) { return []; }
};

export const addProduct = (product: Omit<Product, 'id'>): Product => {
  const products = getProducts();
  const id = Date.now();
  const newProduct: Product = {
    ...product,
    id,
    stock: Number(product.stock) || 0,
    importPrice: product.importPrice || '0₫',
    sku: product.sku || `SKU-${id}`,
    category: product.category || 'Chung',
    brand: product.brand || 'Sigma Vie',
    status: product.status || 'active',
    isFlashSale: product.isFlashSale || false,
    sizes: product.sizes || [],
    colors: product.colors || [],
    variants: product.variants || []
  };
  const updatedProducts = [newProduct, ...products];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
  syncProductToDB(newProduct);
  window.dispatchEvent(new Event('sigma_vie_products_update'));
  return newProduct;
};

export const updateProduct = (updatedProduct: Product): void => {
  const products = getProducts();
  const index = products.findIndex(p => String(p.id) === String(updatedProduct.id));
  if (index !== -1) {
    const productToSave = { ...updatedProduct, stock: Number(updatedProduct.stock) };
    products[index] = productToSave;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    syncProductToDB(productToSave);
    window.dispatchEvent(new Event('sigma_vie_products_update'));
  }
};

export const updateProductStock = (id: number, quantityChange: number, size?: string, color?: string): boolean => {
    const products = getProducts();
    const productIndex = products.findIndex(p => String(p.id) === String(id));
    if (productIndex === -1) return false;
    
    const product = products[productIndex];
    
    if (size || color) {
        if (!product.variants) product.variants = [];
        const vIndex = product.variants.findIndex(v => (v.size === size || (!v.size && !size)) && (v.color === color || (!v.color && !color)));
        
        if (vIndex !== -1) {
            product.variants[vIndex].stock = (Number(product.variants[vIndex].stock) || 0) + quantityChange;
        } else if (quantityChange > 0) {
            product.variants.push({ size: size || '', color: color || '', stock: quantityChange });
        } else return false;
        
        // CỰC KỲ QUAN TRỌNG: Tính lại tổng stock từ các biến thể để tránh lỗi stock = 0
        product.stock = product.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    } else {
        product.stock = (Number(product.stock) || 0) + quantityChange;
    }

    if (product.stock < 0) product.stock = 0;

    products[productIndex] = product;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('sigma_vie_products_update'));
    
    // Gửi lên server đồng bộ
    updateProductStockInDB(id, quantityChange, size, color).then(res => {
        if (!res || !res.success) console.error("Lỗi đồng bộ tồn kho lên Server");
    });

    return true;
};

export const deleteProduct = async (id: number): Promise<{ success: boolean; message: string }> => {
  try {
      trackDeletedId(String(id));
      const res = await deleteProductFromDB(id);
      if (res && res.success) {
          const products = getProducts();
          const updatedProducts = products.filter(product => String(product.id) !== String(id));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts));
          window.dispatchEvent(new Event('sigma_vie_products_update'));
          return { success: true, message: 'Đã xóa sản phẩm.' };
      }
      return { success: false, message: 'Server từ chối xóa.' };
  } catch (err: any) { return { success: false, message: 'Lỗi kết nối.' }; }
};
