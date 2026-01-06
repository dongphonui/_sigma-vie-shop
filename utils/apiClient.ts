
export const API_BASE_URL = (() => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env.VITE_API_URL) {
            return process.env.VITE_API_URL;
        }
    } catch(e) {}

    try {
        // @ts-ignore
        const meta = import.meta;
        if (meta && meta.env && meta.env.VITE_API_URL) {
            return meta.env.VITE_API_URL;
        }
    } catch (e) {}
    
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
        return 'http://localhost:3000/api';
    } else {
        return 'https://sigmavie-backend.onrender.com/api';
    }
})();

let isOffline = false;

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/health?t=${Date.now()}`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
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
        if (isOffline) isOffline = false;
        return await res.json();
    } catch (e) {
        if (!isOffline) isOffline = true;
        return null;
    }
};

const syncData = async (endpoint: string, data: any, method: 'POST' | 'PUT' | 'DELETE' = 'POST') => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method === 'DELETE' ? undefined : JSON.stringify(data)
        });
        
        if (!res.ok) {
            let errorText = res.statusText;
            try {
                const errJson = await res.json();
                if (errJson && errJson.error) errorText = errJson.error;
            } catch (e) { }
            return { success: false, message: `Server error (${res.status}): ${errorText}` };
        }
        
        if (isOffline) isOffline = false;
        return await res.json();
    } catch (e) {
        if (!isOffline) isOffline = true;
        return { success: false, message: `Offline Mode: Data saved locally only.`, isNetworkError: true };
    }
};

// Generic Settings
export const fetchSettingFromDB = (key: string) => fetchData(`settings/${key}`);
export const syncSettingToDB = (key: string, value: any) => syncData(`settings/${key}`, value);

// Products
export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (product: any) => syncData('products', product);
export const updateProductStockInDB = (id: number, quantityChange: number, size?: string, color?: string) => 
    syncData('products/stock', { id, quantityChange, size, color }, 'POST');
export const deleteProductFromDB = (id: number) => syncData(`products/${id}`, {}, 'DELETE');

// Categories
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (category: any) => syncData('categories', category);

// Customers
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (customer: any) => syncData('customers', customer);
export const updateCustomerInDB = (customer: any) => syncData(`customers/${customer.id}`, customer, 'PUT');
export const deleteCustomerFromDB = (id: string) => syncData(`customers/${id}`, {}, 'DELETE');
export const verifyCustomerLoginOnServer = (identifier: string, passwordHash: string) => syncData('customers/login', { identifier, passwordHash }, 'POST');

// Fix: Export requestCustomerForgotPassword
export const requestCustomerForgotPassword = (identifier: string) => syncData('customers/forgot-password', { identifier });
// Fix: Export confirmCustomerResetPassword
export const confirmCustomerResetPassword = (identifier: string, passwordHash: string) => syncData('customers/reset-password', { identifier, passwordHash });

// Orders
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (order: any) => syncData('orders', order);

// Inventory
export const fetchTransactionsFromDB = () => fetchData('inventory');
export const syncTransactionToDB = (transaction: any) => syncData('inventory', transaction);

// Admin Logs & Email
// Fix: Export loginAdminUser
export const loginAdminUser = (credentials: any) => syncData('admin/login', credentials);
export const recordAdminLogin = (method: string, status: string, username?: string) => syncData('admin/login', { method, status, username });
export const fetchAdminLoginLogs = () => fetchData('admin/logs');
export const sendEmail = (to: string, subject: string, html: string) => syncData('admin/email', { to, subject, html });

// Home Page Settings
export const fetchHomePageSettingsFromDB = () => fetchData('settings/home');
export const syncHomePageSettingsToDB = (settings: any) => syncData('settings/home', settings);

// Specialized UI Settings
export const fetchHeaderSettingsFromDB = () => fetchSettingFromDB('header');
export const syncHeaderSettingsToDB = (settings: any) => syncSettingToDB('header', settings);

export const fetchProductPageSettingsFromDB = () => fetchSettingFromDB('product-ui');
export const syncProductPageSettingsToDB = (settings: any) => syncSettingToDB('product-ui', settings);

// Fix: Export fetchBankSettingsFromDB
export const fetchBankSettingsFromDB = () => fetchSettingFromDB('bank');
// Fix: Export syncBankSettingsToDB
export const syncBankSettingsToDB = (settings: any) => syncSettingToDB('bank', settings);

// Fix: Export fetchStoreSettingsFromDB
export const fetchStoreSettingsFromDB = () => fetchSettingFromDB('store');
// Fix: Export syncStoreSettingsToDB
export const syncStoreSettingsToDB = (settings: any) => syncSettingToDB('store', settings);

// Fix: Export fetchShippingSettingsFromDB
export const fetchShippingSettingsFromDB = () => fetchSettingFromDB('shipping');
// Fix: Export syncShippingSettingsToDB
export const syncShippingSettingsToDB = (settings: any) => syncSettingToDB('shipping', settings);

// About Page
export const fetchAboutContentFromDB = () => fetchData('settings/about-content');
export const syncAboutContentToDB = (content: any) => syncData('settings/about-content', content);

export const fetchAboutSettingsFromDB = () => fetchData('settings/about-settings');
export const syncAboutSettingsToDB = (settings: any) => syncData('settings/about-settings', settings);

// Fix: Export changeAdminPassword
export const changeAdminPassword = (data: any) => syncData('admin/change-password', data, 'PUT');
// Fix: Export fetchAdminUsers
export const fetchAdminUsers = () => fetchData('admin/users');
// Fix: Export createAdminUser
export const createAdminUser = (user: any) => syncData('admin/users', user, 'POST');
// Fix: Export deleteAdminUser
export const deleteAdminUser = (id: string) => syncData(`admin/users/${id}`, {}, 'DELETE');
// Fix: Export updateAdminUser
export const updateAdminUser = (id: string, data: any) => syncData(`admin/users/${id}`, data, 'PUT');

// DB Management
export const resetDatabase = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
    return syncData('admin/reset', { scope });
};
