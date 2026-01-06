
export const API_BASE_URL = (() => {
    // 1. Ưu tiên biến môi trường VITE_API_URL (Cấu hình trên Vercel/Render)
    try {
        // @ts-ignore
        if (import.meta.env && import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
    } catch (e) {}
    
    // 2. Kiểm tra môi trường Local
    let isLocalhost = false;
    try {
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            const h = window.location.hostname;
            if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.')) {
                isLocalhost = true;
            }
        }
    } catch (e) {}

    if (isLocalhost) {
        return 'http://localhost:3000/api';
    } else {
        /**
         * QUAN TRỌNG: Nếu bạn đã deploy Backend lên Render, hãy thay URL dưới đây 
         * bằng URL thực tế của ứng dụng Backend của bạn (ví dụ: https://my-backend.onrender.com/api)
         */
        return 'https://sigmavie-backend.onrender.com/api';
    }
})();

let isOffline = false;

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        
        const res = await fetch(`${API_BASE_URL}/health?t=${Date.now()}`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        if (res.ok) {
            isOffline = false;
            return true;
        }
        return false;
    } catch (e) {
        isOffline = true;
        return false;
    }
};

const fetchData = async (endpoint: string) => {
    try {
        const url = `${API_BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
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
            const errorMsg = `Server trả về lỗi ${res.status}`;
            return { success: false, message: errorMsg };
        }
        
        return await res.json();
    } catch (e: any) {
        console.error("[API Sync Error]", e);
        return { 
            success: false, 
            message: "Không thể kết nối máy chủ Backend. Vui lòng kiểm tra địa chỉ API_BASE_URL.",
            isNetworkError: true 
        };
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

export const requestCustomerForgotPassword = (identifier: string) => syncData('customers/forgot-password', { identifier });
export const confirmCustomerResetPassword = (identifier: string, passwordHash: string) => syncData('customers/reset-password', { identifier, passwordHash });

// Orders
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (order: any) => syncData('orders', order);

// Inventory
export const fetchTransactionsFromDB = () => fetchData('inventory');
export const syncTransactionToDB = (transaction: any) => syncData('inventory', transaction);

// Admin Logs & Email
export const loginAdminUser = (credentials: any) => syncData('admin/login', credentials);
export const recordAdminLogin = (method: string, status: string, username?: string) => syncData('admin/login', { method, status, username });
export const fetchAdminLoginLogs = () => fetchData('admin/logs');
export const sendEmail = (to: string, subject: string, html: string) => syncData('admin/email', { to, subject, html });

// Specialized UI Settings
export const fetchHomePageSettingsFromDB = () => fetchSettingFromDB('home');
export const syncHomePageSettingsToDB = (settings: any) => syncSettingToDB('home', settings);

export const fetchHeaderSettingsFromDB = () => fetchSettingFromDB('header');
export const syncHeaderSettingsToDB = (settings: any) => syncSettingToDB('header', settings);

export const fetchProductPageSettingsFromDB = () => fetchSettingFromDB('product-ui');
export const syncProductPageSettingsToDB = (settings: any) => syncSettingToDB('product-ui', settings);

export const fetchBankSettingsFromDB = () => fetchSettingFromDB('bank');
export const syncBankSettingsToDB = (settings: any) => syncSettingToDB('bank', settings);

export const fetchStoreSettingsFromDB = () => fetchSettingFromDB('store');
export const syncStoreSettingsToDB = (settings: any) => syncSettingToDB('store', settings);

export const fetchShippingSettingsFromDB = () => fetchSettingFromDB('shipping');
export const syncShippingSettingsToDB = (settings: any) => syncSettingToDB('shipping', settings);

// About Page
export const fetchAboutContentFromDB = () => fetchSettingFromDB('about-content');
export const syncAboutContentToDB = (content: any) => syncSettingToDB('about-content', content);

export const fetchAboutSettingsFromDB = () => fetchSettingFromDB('about-settings');
export const syncAboutSettingsToDB = (settings: any) => syncSettingToDB('about-settings', settings);

export const changeAdminPassword = (data: any) => syncData('admin/change-password', data, 'PUT');
export const fetchAdminUsers = () => fetchData('admin/users');
export const createAdminUser = (user: any) => syncData('admin/users', user, 'POST');
export const deleteAdminUser = (id: string) => syncData(`admin/users/${id}`, {}, 'DELETE');
export const updateAdminUser = (id: string, data: any) => syncData(`admin/users/${id}`, data, 'PUT');

// DB Management
export const resetDatabase = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
    return syncData('admin/reset', { scope });
};
