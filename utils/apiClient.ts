
// File này quản lý việc gọi API
// Nếu Server chưa chạy, nó sẽ trả về null để App dùng LocalStorage fallback

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

const fetchData = async (endpoint: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/${endpoint}`);
    if (!res.ok) throw new Error('Server error');
    return await res.json();
  } catch (error) {
    console.warn(`Không kết nối được DB (${endpoint}), dùng LocalStorage.`);
    return null;
  }
};

const syncData = async (endpoint: string, data: any) => {
  try {
    const res = await fetch(`${API_BASE_URL}/${endpoint}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (error) {
    console.warn(`Không đồng bộ được DB (${endpoint}).`);
    return null;
  }
};

// Hàm cập nhật kho Atomic (Cộng dồn trực tiếp trên DB)
export const updateProductStockInDB = async (id: number, quantityChange: number, size?: string, color?: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/products/stock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantityChange, size, color })
    });
    return await res.json();
  } catch (error) {
    console.warn('Không thể cập nhật tồn kho trên Server.');
    return null;
  }
};

// Hàm gửi email thật qua Backend
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html })
    });
    return await res.json();
  } catch (error) {
    console.error('Không thể gửi email:', error);
    return { success: false, message: 'Lỗi kết nối khi gửi email.' };
  }
};

// Admin Logs
export const recordAdminLogin = async (method: 'EMAIL_OTP' | 'GOOGLE_AUTH', status: 'SUCCESS' | 'FAILED') => {
    try {
        await fetch(`${API_BASE_URL}/admin/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                method,
                status,
                timestamp: Date.now()
            })
        });
    } catch (e) {
        console.warn('Could not record login log');
    }
};

export const fetchAdminLoginLogs = () => fetchData('admin/logs');

// Products
export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (product: any) => syncData('products', product);

// Categories
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (category: any) => syncData('categories', category);

// Customers
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (customer: any) => syncData('customers', customer);

export const updateCustomerInDB = async (customer: any) => {
    try {
        const res = await fetch(`${API_BASE_URL}/customers/${customer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customer)
        });
        return await res.json();
    } catch (error) {
        console.warn('Không thể cập nhật khách hàng trên Server.');
        return null;
    }
};

export const deleteCustomerFromDB = async (id: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/customers/${id}`, {
            method: 'DELETE'
        });
        return await res.json();
    } catch (error) {
        console.warn('Không thể xóa khách hàng trên Server.');
        return null;
    }
};


// Orders
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (order: any) => syncData('orders', order);

// Inventory
export const fetchTransactionsFromDB = () => fetchData('inventory');
export const syncTransactionToDB = (transaction: any) => syncData('inventory', transaction);
