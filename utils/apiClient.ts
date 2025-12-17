
export const API_BASE_URL = (() => {
    // 1. Try process.env (Provided by Vite's define config)
    try {
        if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) {
            return process.env.VITE_API_URL;
        }
    } catch(e) {}

    // 2. Try import.meta.env (Standard Vite) with extreme safety
    try {
        // @ts-ignore
        const meta = import.meta;
        if (meta && meta.env && meta.env.VITE_API_URL) {
            return meta.env.VITE_API_URL;
        }
    } catch (e) {
        // Ignore errors if import.meta is not supported
    }
    
    // 3. Smart Fallback: Determine if Local or Production
    let isLocalhost = false;
    try {
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            const h = window.location.hostname;
            if (h === 'localhost' || h === '127.0.0.1') {
                isLocalhost = true;
            }
        }
    } catch (e) { }

    if (isLocalhost) {
        // Local Development
        return 'http://localhost:3000/api';
    } else {
        // Production Deployment (Render)
        // Using the URL found in your deployment logs
        return 'https://sigmavie-backend.onrender.com/api';
    }
})();

// Track offline status to reduce console noise
let isOffline = false;

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        // Add timestamp to bypass cache
        const res = await fetch(`${API_BASE_URL}/health?t=${Date.now()}`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000) // Increase timeout to 5s for slower cold starts
        });
        
        if (res.ok) {
            if (isOffline) {
                console.log('[API] Connection restored.');
                isOffline = false;
            }
            return true;
        }
        return false;
    } catch (e) {
        if (!isOffline) {
            console.warn(`[API] Health check failed at ${API_BASE_URL}.`, e);
            isOffline = true;
        }
        return false;
    }
};

const fetchData = async (endpoint: string) => {
    try {
        // Add timestamp to prevent browser caching
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${API_BASE_URL}/${endpoint}${separator}_t=${Date.now()}`;
        
        const res = await fetch(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        
        if (!res.ok) return null;
        
        // If we were offline and now succeed, log it
        if (isOffline) {
            console.log('[API] Connection restored.');
            isOffline = false;
        }
        
        return await res.json();
    } catch (e) {
        // Only log warning once when switching to offline state
        if (!isOffline) {
            console.warn(`[API] Server unreachable at ${API_BASE_URL}. App is running in Offline Mode.`);
            isOffline = true;
        }
        return null;
    }
};

const syncData = async (endpoint: string, data: any, method: 'POST' | 'PUT' | 'DELETE' = 'POST') => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!res.ok) {
            let errorText = res.statusText;
            try {
                const errJson = await res.json();
                if (errJson && errJson.error) errorText = errJson.error;
            } catch (e) { }
            
            if (res.status === 413) {
                return { success: false, message: `Lỗi: Ảnh hoặc dữ liệu quá lớn (Giới hạn Server). Vui lòng nén ảnh.` };
            }

            return { success: false, message: `Server error (${res.status}): ${errorText}` };
        }
        
        if (isOffline) {
            console.log('[API] Connection restored during sync.');
            isOffline = false;
        }

        return await res.json();
    } catch (e) {
        if (!isOffline) {
            console.warn(`[API] Sync failed. Server unreachable.`);
            isOffline = true;
        }
        return { success: false, message: `Offline Mode: Data saved locally only.`, isNetworkError: true };
    }
};

// Products
export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (product: any) => syncData('products', product);
export const updateProductStockInDB = (id: number, quantityChange: number, size?: string, color?: string) => 
    syncData('products/stock', { id, quantityChange, size, color }, 'POST');

// Categories
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (category: any) => syncData('categories', category);

// Customers
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (customer: any) => syncData('customers', customer);
export const updateCustomerInDB = (customer: any) => syncData(`customers/${customer.id}`, customer, 'PUT');
export const deleteCustomerFromDB = (id: string) => syncData(`customers/${id}`, {}, 'DELETE');

// Orders
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (order: any) => syncData('orders', order);

// Inventory
export const fetchTransactionsFromDB = () => fetchData('inventory');
export const syncTransactionToDB = (transaction: any) => syncData('inventory', transaction);

// Admin Logs & Email
export const recordAdminLogin = (method: string, status: string, username?: string) => syncData('admin/login', { method, status, username });
export const fetchAdminLoginLogs = () => fetchData('admin/logs');
export const sendEmail = (to: string, subject: string, html: string) => syncData('admin/email', { to, subject, html });

// Admin Users (Sub-Admin)
export const loginAdminUser = (credentials: any) => syncData('admin/login-auth', credentials);
export const fetchAdminUsers = () => fetchData('admin/users');
export const createAdminUser = (user: any) => syncData('admin/users', user);
export const updateAdminUser = (id: string, user: any) => syncData(`admin/users/${id}`, user, 'PUT');
export const deleteAdminUser = (id: string) => syncData(`admin/users/${id}`, {}, 'DELETE');
export const changeAdminPassword = (data: any) => syncData('admin/change-password', data, 'POST');

// Shipping Settings
export const fetchShippingSettingsFromDB = () => fetchData('settings/shipping');
export const syncShippingSettingsToDB = (settings: any) => syncData('settings/shipping', settings);

// Store Settings (NEW)
export const fetchStoreSettingsFromDB = () => fetchData('settings/store');
export const syncStoreSettingsToDB = (settings: any) => syncData('settings/store', settings);

// Bank Settings (NEW)
export const fetchBankSettingsFromDB = () => fetchData('settings/bank');
export const syncBankSettingsToDB = (settings: any) => syncData('settings/bank', settings);

// Home Page Settings
export const fetchHomePageSettingsFromDB = () => fetchData('settings/home');
export const syncHomePageSettingsToDB = (settings: any) => syncData('settings/home', settings);

// About Page Settings (NEW)
export const fetchAboutContentFromDB = () => fetchData('settings/about-content');
export const syncAboutContentToDB = (content: any) => syncData('settings/about-content', content);

export const fetchAboutSettingsFromDB = () => fetchData('settings/about-settings');
export const syncAboutSettingsToDB = (settings: any) => syncData('settings/about-settings', settings);

// Reset
export const resetDatabase = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
    return syncData('admin/reset', { scope });
};
