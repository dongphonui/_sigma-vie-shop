
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

// Products
export const fetchProductsFromDB = () => fetchData('products');
export const syncProductToDB = (product: any) => syncData('products', product);

// Categories
export const fetchCategoriesFromDB = () => fetchData('categories');
export const syncCategoryToDB = (category: any) => syncData('categories', category);

// Customers
export const fetchCustomersFromDB = () => fetchData('customers');
export const syncCustomerToDB = (customer: any) => syncData('customers', customer);

// Orders
export const fetchOrdersFromDB = () => fetchData('orders');
export const syncOrderToDB = (order: any) => syncData('orders', order);

// Inventory
export const fetchTransactionsFromDB = () => fetchData('inventory');
export const syncTransactionToDB = (transaction: any) => syncData('inventory', transaction);
