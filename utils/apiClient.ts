
export const API_BASE_URL = (() => {
    // Kiểm tra an toàn để tránh lỗi "Cannot read properties of undefined"
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
    }

    // Truy cập an toàn vào import.meta.env
    try {
        const env = (import.meta as any).env;
        if (env && env.VITE_API_URL) {
            return env.VITE_API_URL.replace(/\/$/, "");
        }
    } catch (e) {
        console.warn("Vite env not initialized yet, using fallback URL.");
    }

    return 'https://sigmavie-backend.onrender.com/api';
})();

const fetchData = async (endpoint: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint.replace(/^\//, "")}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { 
        console.error(`Fetch error [${endpoint}]:`, e);
        return null; 
    }
};

const syncData = async (endpoint: string, data: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint.replace(/^\//, "")}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`HTTP Error ${res.status}: ${errorText}`);
        }
        return await res.json();
    } catch (e) { 
        console.error(`Sync error [${endpoint}]:`, e);
        return { success: false, error: String(e) }; 
    }
};

export const checkServerConnection = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        return res.ok;
    } catch (e) { return false; }
};

export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (p: any) => syncData('products', p);
export const deleteProductFromDB = (id: number) => fetch(`${API_BASE_URL}/products/${id}`, { method: 'DELETE' }).then(res => res.json());
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (o: any) => syncData('orders', o);
export const fetchSettingFromDB = (key: string) => fetchData(`settings/${key}`);
export const syncSettingToDB = (key: string, val: any) => syncData(`settings/${key}`, val);
export const sendChatMessage = (msg: any) => syncData('chat/messages', msg);
export const fetchChatMessages = (sid: string) => fetchData(`chat/messages/${sid}`);
export const fetchChatSessions = () => fetchData('chat/sessions');
export const markChatAsRead = (sid: string) => syncData(`chat/mark-read/${sid}`, {});
export const deleteChatMessages = (sid: string) => fetch(`${API_BASE_URL}/chat/messages/${sid}`, { method: 'DELETE' }).then(res => res.json());
export const updateMessageReaction = (msgId: string, reactions: any) => syncData(`chat/reactions/${msgId}`, { reactions });
export const fetchAboutContentFromDB = () => fetchSettingFromDB('about-page');
export const syncAboutContentToDB = (val: any) => syncSettingToDB('about-page', val);
export const loginAdminUser = (creds: any) => syncData('admin/login', creds);
export const recordAdminLogin = (method: string, status: string, username: string) => syncData('admin/logs', { method, status, username });
export const fetchHomePageSettingsFromDB = () => fetchSettingFromDB('home-page-settings');
export const syncHomePageSettingsToDB = (val: any) => syncSettingToDB('home-page-settings', val);
export const fetchAboutSettingsFromDB = () => fetchSettingFromDB('about-page-settings');
export const syncAboutSettingsToDB = (val: any) => syncSettingToDB('about-page-settings', val);
export const fetchHeaderSettingsFromDB = () => fetchSettingFromDB('header-settings');
export const syncHeaderSettingsToDB = (val: any) => syncSettingToDB('header-settings', val);
export const fetchBankSettingsFromDB = () => fetchSettingFromDB('bank-settings');
export const syncBankSettingsToDB = (val: any) => syncSettingToDB('bank-settings', val);
export const fetchStoreSettingsFromDB = () => fetchSettingFromDB('store-settings');
export const syncStoreSettingsToDB = (val: any) => syncSettingToDB('store-settings', val);
export const fetchShippingSettingsFromDB = () => fetchSettingFromDB('shipping-settings');
export const syncShippingSettingsToDB = (val: any) => syncSettingToDB('shipping-settings', val);
export const fetchProductPageSettingsFromDB = () => fetchSettingFromDB('product-page-settings');
export const syncProductPageSettingsToDB = (val: any) => syncSettingToDB('product-page-settings', val);
export const fetchTransactionsFromDB = () => fetchData('transactions');
export const syncTransactionToDB = (t: any) => syncData('transactions', t);
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (c: any) => syncData('categories', c);
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (c: any) => syncData('customers', c);
export const updateCustomerInDB = (c: any) => syncData(`customers/${c.id}`, c);
export const deleteCustomerFromDB = (id: string) => fetch(`${API_BASE_URL}/customers/${id}`, { method: 'DELETE' }).then(res => res.json());
export const verifyCustomerLoginOnServer = (identifier: string, passwordHash: string) => syncData('customers/login', { identifier, passwordHash });
export const resetDatabase = (scope: string) => syncData('system/reset', { scope });
export const fetchAdminLoginLogs = () => fetchData('admin/logs');
export const changeAdminPassword = (data: any) => syncData('admin/change-password', data);
export const fetchAdminUsers = () => fetchData('admin/users');
export const createAdminUser = (user: any) => syncData('admin/users', user);
export const deleteAdminUser = (id: string) => fetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE' }).then(res => res.json());
export const updateAdminUser = (user: any) => syncData(`admin/users/${user.id}`, user);
export const sendEmail = (to: string, subject: string, body: string) => syncData('system/send-email', { to, subject, body });
