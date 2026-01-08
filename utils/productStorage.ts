import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, deleteProductFromDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_products';

export const getProducts = (): Product[] => {
    const local = localStorage.getItem(STORAGE_KEY);
    const data = local ? JSON.parse(local) : [];
    
    // Sync ngầm
    fetchProductsFromDB().then(dbData => {
        if (dbData && JSON.stringify(dbData) !== local) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
            window.dispatchEvent(new Event('sigma_vie_products_update'));
        }
    }).catch(() => {});
    
    return data;
};

// Added forceReloadProducts to fix error in Home.tsx
export const forceReloadProducts = async (): Promise<Product[]> => {
    try {
        const dbData = await fetchProductsFromDB();
        if (dbData && Array.isArray(dbData)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
            window.dispatchEvent(new Event('sigma_vie_products_update'));
            return dbData;
        }
    } catch (e) {}
    return getProducts();
};

export const addProduct = async (p: Omit<Product, 'id'>) => {
    const products = getProducts();
    const newProduct = { ...p, id: Date.now() };
    const updated = [newProduct, ...products];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('sigma_vie_products_update'));
    await syncProductToDB(newProduct);
    return newProduct;
};

export const updateProduct = async (p: Product) => {
    const products = getProducts();
    const idx = products.findIndex(item => item.id === p.id);
    if (idx !== -1) {
        products[idx] = p;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        window.dispatchEvent(new Event('sigma_vie_products_update'));
        await syncProductToDB(p);
    }
};

export const deleteProduct = async (id: number) => {
    const products = getProducts().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('sigma_vie_products_update'));
    await deleteProductFromDB(id);
    return { success: true };
};

export const updateProductStock = (id: number, change: number, size?: string, color?: string) => {
    const products = getProducts();
    const p = products.find(item => item.id === id);
    if (p) {
        if (size || color) {
            if (!p.variants) p.variants = [];
            const v = p.variants.find(varItem => varItem.size === size && varItem.color === color);
            if (v) v.stock += change;
            else p.variants.push({ size: size || '', color: color || '', stock: change });
        }
        p.stock += change;
        updateProduct(p);
        return true;
    }
    return false;
};