
export const API_BASE_URL = (() => {
    // Ưu tiên biến môi trường nếu có
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Tự động lấy hostname hiện tại của trình duyệt
    // Nếu bạn truy cập bằng 192.168.1.x, nó sẽ gọi API về 192.168.1.x:3000
    // Nếu bạn truy cập bằng localhost, nó sẽ gọi về localhost:3000
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:3000/api`;
})();

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${API_BASE_URL}/health`, { 
            method: 'GET',
            // Thêm timeout ngắn để check nhanh hơn
            signal: AbortSignal.timeout(3000) 
        });
        return res.ok;
    } catch (e) {
        console.warn(`Server connection failed at ${API_BASE_URL}`, e);
        return false;
    }
};

const fetchData = async (endpoint: string) => {
    try {
        // Bỏ checkServerConnection ở mỗi request để giảm độ trễ, 
        // fetch sẽ tự throw lỗi nếu không kết nối được
        const res = await fetch(`${API_BASE_URL}/${endpoint}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.error(`Error fetching ${endpoint} from ${API_BASE_URL}:`, e);
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
                // Try to parse JSON error message from server
                const errJson = await res.json();
                if (errJson && errJson.error) errorText = errJson.error;
            } catch (e) { 
                // Ignore parsing error, stick to statusText
            }
            
            // Special handling for Payload Too Large
            if (res.status === 413) {
                return { success: false, message: `Lỗi: Ảnh hoặc dữ liệu quá lớn (Giới hạn Server). Vui lòng nén ảnh.` };
            }

            return { success: false, message: `Server error (${res.status}): ${errorText}` };
        }
        
        return await res.json();
    } catch (e) {
        console.error(`Error syncing ${endpoint} to ${API_BASE_URL}:`, e);
        return { success: false, message: `Lỗi mạng (Network Error): Không thể kết nối tới ${API_BASE_URL}. Kiểm tra xem Server đã bật chưa?` };
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

// Home Page Settings (NEW)
export const fetchHomePageSettingsFromDB = () => fetchData('settings/home');
export const syncHomePageSettingsToDB = (settings: any) => syncData('settings/home', settings);

// Reset
export const resetDatabase = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
    return syncData('admin/reset', { scope });
};
