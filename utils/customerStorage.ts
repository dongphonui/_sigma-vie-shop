
import type { Customer } from '../types';
import { fetchCustomersFromDB, syncCustomerToDB, updateCustomerInDB, deleteCustomerFromDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_customers';
const SESSION_KEY = 'sigma_vie_current_customer';
let hasLoadedFromDB = false;

const simpleHash = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
};

// Helper to trigger UI update
const dispatchCustomerUpdate = () => {
    window.dispatchEvent(new Event('sigma_vie_customers_update'));
};

export const getCustomers = (): Customer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        // Background sync
        fetchCustomersFromDB().then(dbCustomers => {
            if (dbCustomers && Array.isArray(dbCustomers)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
                dispatchCustomerUpdate();
            }
        }).catch(err => console.error("Lỗi tải khách hàng bg:", err));
    }

    return localData;
  } catch (error) {
    return [];
  }
};

// Force Reload from Server (Updated to return data)
export const forceReloadCustomers = async (): Promise<Customer[]> => {
    try {
        console.log("Đang tải lại danh sách khách hàng từ Server...");
        const dbCustomers = await fetchCustomersFromDB();
        
        if (dbCustomers && Array.isArray(dbCustomers)) {
            // Success: Update Local Storage with Server Data (Source of Truth)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
            dispatchCustomerUpdate();
            hasLoadedFromDB = true;
            console.log(`Đã tải ${dbCustomers.length} khách hàng từ Server.`);
            return dbCustomers;
        } else {
            console.warn("Server trả về rỗng hoặc lỗi, dùng dữ liệu Local.");
        }
    } catch (e) {
        console.error("Lỗi force reload customers:", e);
    }
    // Fallback: Return current local data
    return getCustomers();
};

export const registerCustomer = (data: { 
    fullName: string; 
    password: string; 
    email: string; 
    phoneNumber: string; 
    address: string;
    cccdNumber: string;
    gender: string;
    dob: string;
    issueDate: string;
}): { success: boolean; message: string; customer?: Customer } => {
  const customers = getCustomers();
  
  // 1. Validate Required Fields
  if (!data.fullName || !data.password || !data.email || !data.phoneNumber || !data.cccdNumber || !data.address || !data.dob || !data.issueDate || !data.gender) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin (bao gồm cả CCCD).' };
  }

  // 2. Check Duplicates
  if (customers.some(c => c.email === data.email)) {
    return { success: false, message: 'Email này đã được đăng ký.' };
  }
  if (customers.some(c => c.phoneNumber === data.phoneNumber)) {
    return { success: false, message: 'Số điện thoại này đã được đăng ký.' };
  }
  if (customers.some(c => c.cccdNumber === data.cccdNumber)) {
    return { success: false, message: 'Số CCCD này đã được đăng ký.' };
  }

  // 3. Create Customer Object
  const newCustomer: Customer = {
    id: `CUST-${Date.now()}`,
    fullName: data.fullName,
    email: data.email,
    phoneNumber: data.phoneNumber,
    cccdNumber: data.cccdNumber,
    gender: data.gender,
    dob: data.dob,
    issueDate: data.issueDate, 
    passwordHash: simpleHash(data.password),
    address: data.address,
    createdAt: Date.now()
  };

  const updatedCustomers = [newCustomer, ...customers]; // Add to top
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  dispatchCustomerUpdate();
  
  // Sync to DB
  syncCustomerToDB(newCustomer).then(res => {
      if(!res?.success) console.error("Lỗi lưu khách hàng lên server:", res);
  });
  
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newCustomer));
  
  return { success: true, message: 'Đăng ký thành công!', customer: newCustomer };
};

// UPDATED: Async Update
export const updateCustomer = async (updatedCustomer: Customer): Promise<boolean> => {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === updatedCustomer.id);
    
    // 1. Optimistic Update (Local)
    if (index !== -1) {
        customers[index] = updatedCustomer;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
        dispatchCustomerUpdate();
        
        const currentUser = getCurrentCustomer();
        if (currentUser && currentUser.id === updatedCustomer.id) {
             sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedCustomer));
        }
    }

    // 2. Server Sync (Wait for response)
    try {
        const res = await updateCustomerInDB(updatedCustomer);
        if (res && res.success) {
            console.log("Cập nhật khách hàng lên Server thành công.");
            return true;
        } else {
            console.error("Lỗi cập nhật Server:", res);
            return false;
        }
    } catch (e) {
        console.error("Lỗi mạng khi cập nhật:", e);
        return false;
    }
};

// UPDATED: Async Delete
export const deleteCustomer = async (id: string): Promise<boolean> => {
    const customers = getCustomers();
    
    // 1. Optimistic Delete (Local)
    const updatedCustomers = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
    dispatchCustomerUpdate();

    // 2. Server Sync (Wait for response)
    try {
        const res = await deleteCustomerFromDB(id);
        if (res && res.success) {
            console.log("Xóa khách hàng trên Server thành công.");
            return true;
        } else {
            console.error("Lỗi xóa trên Server:", res);
            return false;
        }
    } catch (e) {
        console.error("Lỗi mạng khi xóa:", e);
        return false;
    }
};

export const loginCustomer = (identifier: string, password: string): { success: boolean; message: string; customer?: Customer } => {
  const customers = getCustomers();
  const hash = simpleHash(password);

  // STRICT LOGIN: Only check phoneNumber
  const customer = customers.find(c => 
    c.phoneNumber === identifier && 
    c.passwordHash === hash
  );

  if (customer) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(customer));
    return { success: true, message: 'Đăng nhập thành công!', customer };
  }

  return { success: false, message: 'Số điện thoại hoặc mật khẩu không đúng.' };
};

export const logoutCustomer = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const getCurrentCustomer = (): Customer | null => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};
