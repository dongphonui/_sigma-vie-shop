
import type { Product } from '../types';
import { fetchProductsFromDB, syncProductToDB, deleteProductFromDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_products';

export const getProducts = (): Product[] => {
    try {
        const local = localStorage.getItem(STORAGE_KEY);
        const data = local ? JSON.parse(local) : [];
        
        // Background sync
        fetchProductsFromDB().then(dbData => {
            if (dbData && Array.isArray(dbData)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
                window.dispatchEvent(new Event('sigma_vie_products_update'));
            }
        }).catch(() => {});
        
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
};

export const forceReloadProducts = async (): Promise<Product[]> => {
    try {
        const dbData = await fetchProductsFromDB();
        if (dbData && Array.isArray(dbData)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbData));
            window.dispatchEvent(new Event('sigma_vie_products_update'));
            return dbData;
        }
    } catch (e) {
        console.error("Force reload products failed:", e);
    }
    return getProducts();
};

export const addProduct = async (p: Omit<Product, 'id'>) => {
    const newProduct = { ...p, id: Date.now() };
    const products = getProducts();
    const updated = [newProduct, ...products];
    
    // Save locally first for responsiveness
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('sigma_vie_products_update'));
    
    try {
        const res = await syncProductToDB(newProduct);
        if (!res || !res.success) {
            throw new Error(res?.message || 'Server did not acknowledge save.');
        }
        return newProduct;
    } catch (err) {
        console.error("Failed to sync new product to server:", err);
        throw err; // Let UI handle the error
    }
};

export const updateProduct = async (p: Product) => {
    const products = getProducts();
    const idx = products.findIndex(item => item.id === p.id);
    if (idx !== -1) {
        products[idx] = p;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
        window.dispatchEvent(new Event('sigma_vie_products_update'));
        try {
            await syncProductToDB(p);
        } catch (e) {
            console.error("Failed to sync update to server.");
        }
    }
};

export const deleteProduct = async (id: number) => {
    const products = getProducts().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    window.dispatchEvent(new Event('sigma_vie_products_update'));
    try {
        await deleteProductFromDB(id);
    } catch (e) {}
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
            else p.variants.push({ size: size || '', color: color || '', stock: Math.max(0, change) });
        }
        p.stock = Math.max(0, p.stock + change);
        updateProduct(p);
        return true;
    }
    return false;
};