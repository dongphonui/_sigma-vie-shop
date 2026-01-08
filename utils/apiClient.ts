export const API_BASE_URL = (() => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:3000/api';
        }
    }
    // THAY THẾ DÒNG DƯỚI BẰNG URL BACKEND TRÊN RENDER CỦA BẠN
    return 'https://sigmavie-backend.onrender.com/api';
})();

const fetchData = async (endpoint: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`);
        return res.ok ? await res.json() : null;
    } catch (e) { return null; }
};

const syncData = async (endpoint: string, data: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) { return { success: false }; }
};

// Added deleteData helper function
const deleteData = async (endpoint: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        return await res.json();
    } catch (e) { return { success: false }; }
};

export const checkServerConnection = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/health`);
        return res.ok;
    } catch (e) { return false; }
};

export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (p: any) => syncData('products', p);
// Added deleteProductFromDB export
export const deleteProductFromDB = (id: number) => deleteData(`products/${id}`);

export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (o: any) => syncData('orders', o);
export const fetchSettingFromDB = (key: string) => fetchData(`settings/${key}`);
export const syncSettingToDB = (key: string, val: any) => syncData(`settings/${key}`, val);

// Categories
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (c: any) => syncData('categories', c);

// Customers
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (c: any) => syncData('customers', c);
export const updateCustomerInDB = (c: any) => syncData(`customers/${c.id}`, c);
export const deleteCustomerFromDB = (id: string) => deleteData(`customers/${id}`);
export const verifyCustomerLoginOnServer = (identifier: string, passwordHash: string) => 
    syncData('customers/login', { identifier, passwordHash });

// Inventory / Transactions
export const fetchTransactionsFromDB = () => fetchData('transactions');
export const syncTransactionToDB = (t: any) => syncData('transactions', t);

// Specific Settings Wrappers requested by storage utils
export const fetchHomePageSettingsFromDB = () => fetchSettingFromDB('home');
export const syncHomePageSettingsToDB = (val: any) => syncSettingToDB('home', val);
export const fetchAboutSettingsFromDB = () => fetchSettingFromDB('about');
export const syncAboutSettingsToDB = (val: any) => syncSettingToDB('about', val);
export const fetchHeaderSettingsFromDB = () => fetchSettingFromDB('header');
export const syncHeaderSettingsToDB = (val: any) => syncSettingToDB('header', val);
export const fetchBankSettingsFromDB = () => fetchSettingFromDB('bank');
export const syncBankSettingsToDB = (val: any) => syncSettingToDB('bank', val);
export const fetchStoreSettingsFromDB = () => fetchSettingFromDB('store');
export const syncStoreSettingsToDB = (val: any) => syncSettingToDB('store', val);
export const fetchShippingSettingsFromDB = () => fetchSettingFromDB('shipping');
export const syncShippingSettingsToDB = (val: any) => syncSettingToDB('shipping', val);
export const fetchProductPageSettingsFromDB = () => fetchSettingFromDB('product-ui');
export const syncProductPageSettingsToDB = (val: any) => syncSettingToDB('product-ui', val);

// About Content
export const fetchAboutContentFromDB = () => fetchData('about-content');
export const syncAboutContentToDB = (val: any) => syncData('about-content', val);

// Admin / Auth logs and user management
export const loginAdminUser = (creds: any) => syncData('admin/login', creds);
export const recordAdminLogin = (method: string, status: string, username: string) => 
    syncData('admin/logs', { method, status, username });
export const fetchAdminLoginLogs = () => fetchData('admin/logs');
export const changeAdminPassword = (data: any) => syncData('admin/change-password', data);
export const fetchAdminUsers = () => fetchData('admin/users');
export const createAdminUser = (user: any) => syncData('admin/users', user);
export const updateAdminUser = (user: any) => syncData(`admin/users/${user.id}`, user);
export const deleteAdminUser = (id: string) => deleteData(`admin/users/${id}`);

// Support Chat
export const fetchChatSessions = () => fetchData('chat/sessions');
export const fetchChatMessages = (sessionId: string) => fetchData(`chat/messages/${sessionId}`);
export const sendChatMessage = (msg: any) => syncData('chat/messages', msg);
export const markChatAsRead = (sessionId: string) => syncData(`chat/sessions/${sessionId}/read`, {});
export const deleteChatMessages = (sessionId: string) => deleteData(`chat/messages/${sessionId}`);
export const updateMessageReaction = (messageId: string, reactions: any) => 
    syncData(`chat/messages/${messageId}/react`, { reactions });

// System actions
export const resetDatabase = (scope: string) => syncData('system/reset', { scope });

export const sendEmail = (to: string, subject: string, html: string) => 
    syncData('admin/send-email', { to, subject, html });