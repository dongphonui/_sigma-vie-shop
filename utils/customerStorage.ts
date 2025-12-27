
import type { Customer } from '../types';
import { 
    fetchCustomersFromDB, syncCustomerToDB, updateCustomerInDB, 
    deleteCustomerFromDB, verifyCustomerLoginOnServer,
    requestCustomerForgotPassword, confirmCustomerResetPassword
} from './apiClient';

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

export const registerCustomer = async (data: { 
    fullName: string; 
    password: string; 
    email: string; 
    phoneNumber: string; 
    address: string;
    cccdNumber: string;
    gender: string;
    dob: string;
    issueDate: string;
}): Promise<{ success: boolean; message: string; customer?: Customer }> => {
  const customers = getCustomers();
  
  // 1. Validate Required Fields
  if (!data.fullName || !data.password || !data.email || !data.phoneNumber || !data.cccdNumber || !data.address || !data.dob || !data.issueDate || !data.gender) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin (bao gồm cả CCCD).' };
  }

  // 2. Check Duplicates (Local Check for speed)
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

  // 4. Sync to DB (BLOCKING to ensure server save)
  try {
      const res = await syncCustomerToDB(newCustomer);
      
      // If server explicitly fails (e.g., DB constraint unique violation not caught locally)
      if (res && !res.success && !res.isNetworkError) {
          console.error("Server registration failed:", res);
          return { success: false, message: res.message || 'Đăng ký thất bại trên Server.' };
      }
      // If network error (offline), we proceed to save locally (Offline First strategy)
      if (res && res.isNetworkError) {
          console.warn("Network error, saving locally only.");
      }
  } catch (e) {
      console.error("Sync Error:", e);
      // Proceed if likely network error
  }

  // 5. Save Local
  const updatedCustomers = [newCustomer, ...customers]; // Add to top
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  dispatchCustomerUpdate();
  
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

// UPDATED: Server-Aware Login Logic
export const loginCustomer = async (identifier: string, password: string): Promise<{ success: boolean; message: string; customer?: Customer }> => {
  const hash = simpleHash(password);
  
  // 1. LOCAL CHECK FIRST (Fast)
  const customers = getCustomers();
  const localCustomer = customers.find(c => 
    (c.phoneNumber === identifier || c.email === identifier) && 
    c.passwordHash === hash
  );

  if (localCustomer) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(localCustomer));
    return { success: true, message: 'Đăng nhập thành công!', customer: localCustomer };
  }

  // 2. SERVER CHECK (Slow, but necessary for multi-device)
  try {
      console.log("Không thấy ở Local, đang kiểm tra Server...");
      const serverRes = await verifyCustomerLoginOnServer(identifier, hash);
      
      if (serverRes && serverRes.success && serverRes.customer) {
          const remoteCustomer = serverRes.customer;
          
          // 3. SYNC DOWN TO LOCAL
          const currentList = getCustomers();
          if (!currentList.some(c => c.id === remoteCustomer.id)) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify([remoteCustomer, ...currentList]));
              dispatchCustomerUpdate();
          }
          
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(remoteCustomer));
          return { success: true, message: 'Đăng nhập thành công (từ Server)!', customer: remoteCustomer };
      } else if (serverRes && !serverRes.success) {
          return { success: false, message: serverRes.message || 'Tài khoản hoặc mật khẩu không đúng.' };
      }
  } catch (e) {
      console.error("Lỗi kết nối Server khi login:", e);
      return { success: false, message: 'Lỗi kết nối Server. Vui lòng kiểm tra mạng.' };
  }

  return { success: false, message: 'Số điện thoại hoặc mật khẩu không đúng.' };
};

// NEW: Password Recovery Logic
export const forgotPassword = async (identifier: string) => {
    return await requestCustomerForgotPassword(identifier);
};

export const resetPassword = async (identifier: string, newPassword: string) => {
    const hash = simpleHash(newPassword);
    return await confirmCustomerResetPassword(identifier, hash);
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
