
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
        return res.ok;
    } catch (e) {
        return false;
    }
};

const fetchData = async (endpoint: string) => {
    try {
        if (!(await checkServerConnection())) return null;
        const res = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(`Error fetching ${endpoint}:`, e);
        return null;
    }
};

const syncData = async (endpoint: string, data: any, method: 'POST' | 'PUT' | 'DELETE' = 'POST') => {
    try {
        if (!(await checkServerConnection())) return { success: false, message: 'Server offline' };
        const res = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (e) {
        console.error(`Error syncing ${endpoint}:`, e);
        return { success: false, message: 'Network error' };
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

// Reset
export const resetDatabase = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
    return syncData('admin/reset', { scope });
};