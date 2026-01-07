
export const API_BASE_URL = (() => {
    try {
        // @ts-ignore
        if (import.meta.env && import.meta.env.VITE_API_URL) {
            return import.meta.env.VITE_API_URL;
        }
    } catch (e) {}
    
    let isLocalhost = false;
    try {
        if (typeof window !== 'undefined' && window.location && window.location.hostname) {
            const h = window.location.hostname;
            if (h === 'localhost' || h === '127.0.0.1' || h.startsWith('192.168.')) {
                isLocalhost = true;
            }
        }
    } catch (e) {}

    return isLocalhost ? 'http://localhost:3000/api' : 'https://sigmavie-backend.onrender.com/api';
})();

const fetchData = async (endpoint: string) => {
    try {
        const url = `${API_BASE_URL}/${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
};

const syncData = async (endpoint: string, data: any, method: 'POST' | 'PUT' | 'DELETE' = 'POST') => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: method === 'DELETE' ? undefined : JSON.stringify(data)
        });
        if (!res.ok) return { success: false, message: `Server error ${res.status}` };
        return await res.json();
    } catch (e: any) {
        return { success: false, message: e.message, isNetworkError: true };
    }
};

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/health?t=${Date.now()}`, { method: 'GET' });
        return res.ok;
    } catch (e) { return false; }
};

// --- LIVE CHAT API ---
export const fetchChatMessages = (sessionId: string) => fetchData(`chat/messages/${sessionId}`);
export const sendChatMessage = (message: any) => syncData('chat/messages', message);
export const updateMessageReaction = (id: string, reactions: any) => syncData(`chat/messages/${id}/react`, { reactions });
export const fetchChatSessions = () => fetchData('chat/sessions');
export const markChatAsRead = (sessionId: string) => syncData(`chat/read/${sessionId}`, {});
export const deleteChatMessages = (sessionId: string) => syncData(`chat/messages/${sessionId}`, {}, 'DELETE');

// --- OTHER APIS ---
export const fetchSettingFromDB = (key: string) => fetchData(`settings/${key}`);
export const syncSettingToDB = (key: string, value: any) => syncData(`settings/${key}`, value);
export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (product: any) => syncData('products', product);
export const updateProductStockInDB = (id: number, quantityChange: number, size?: string, color?: string) => syncData(`products/${id}/stock`, { quantityChange, size, color }, 'PUT');
export const deleteProductFromDB = (id: number) => syncData(`products/${id}`, {}, 'DELETE');
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (category: any) => syncData('categories', category);
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (customer: any) => syncData('customers', customer);
export const updateCustomerInDB = (customer: any) => syncData(`customers/${customer.id}`, customer, 'PUT');
export const deleteCustomerFromDB = (id: string) => syncData(`customers/${id}`, {}, 'DELETE');
export const verifyCustomerLoginOnServer = (identifier: string, passwordHash: string) => syncData('customers/login', { identifier, passwordHash }, 'POST');
export const requestCustomerForgotPassword = (identifier: string) => syncData('customers/forgot-password', { identifier });
export const confirmCustomerResetPassword = (identifier: string, passwordHash: string) => syncData('customers/reset-password', { identifier, passwordHash });
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (order: any) => syncData('orders', order);
export const fetchTransactionsFromDB = () => fetchData('inventory');
export const syncTransactionToDB = (transaction: any) => syncData('inventory', transaction);
export const loginAdminUser = (credentials: any) => syncData('admin/login', credentials);
export const recordAdminLogin = (method: string, status: string, username?: string) => syncData('admin/login', { method, status, username });
export const fetchAdminLoginLogs = () => fetchData('admin/logs');
export const sendEmail = (to: string, subject: string, html: string) => syncData('admin/email', { to, subject, html });
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
export const fetchAboutContentFromDB = () => fetchSettingFromDB('about-content');
export const syncAboutContentToDB = (content: any) => syncSettingToDB('about-content', content);
export const fetchAboutSettingsFromDB = () => fetchSettingFromDB('about-settings');
export const syncAboutSettingsToDB = (settings: any) => syncSettingToDB('about-settings', settings);
export const changeAdminPassword = (data: any) => syncData('admin/change-password', data, 'PUT');
export const fetchAdminUsers = () => fetchData('admin/users');
export const createAdminUser = (user: any) => syncData('admin/users', user, 'POST');
export const deleteAdminUser = (id: string) => syncData(`admin/users/${id}`, {}, 'DELETE');
export const updateAdminUser = (id: string, data: any) => syncData(`admin/users/${id}`, data, 'PUT');
export const resetDatabase = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => syncData('admin/reset', { scope });
