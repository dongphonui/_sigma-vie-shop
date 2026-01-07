
import type { Customer } from '../types';
import { 
    fetchCustomersFromDB, syncCustomerToDB, updateCustomerInDB, 
    deleteCustomerFromDB, verifyCustomerLoginOnServer,
    requestCustomerForgotPassword, confirmCustomerResetPassword
} from './apiClient';

const STORAGE_KEY = 'sigma_vie_customers';
const SESSION_KEY = 'sigma_vie_current_customer';
let isSyncing = false;

const simpleHash = (s: string) => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString();
};

const dispatchCustomerUpdate = () => {
    window.dispatchEvent(new Event('sigma_vie_customers_update'));
};

/**
 * Lấy danh sách khách hàng và thực hiện đồng bộ ngầm với Server
 */
export const getCustomers = (): Customer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const localData: Customer[] = stored ? JSON.parse(stored) : [];

  // Thực hiện đồng bộ ngầm nếu chưa có tiến trình nào đang chạy
  if (!isSyncing) {
      syncWithServer();
  }

  return localData;
};

/**
 * Hàm đồng bộ dữ liệu từ Server về Local
 */
export const syncWithServer = async (): Promise<void> => {
    if (isSyncing) return;
    isSyncing = true;
    try {
        const dbCustomers = await fetchCustomersFromDB();
        if (dbCustomers && Array.isArray(dbCustomers)) {
            // Cập nhật LocalStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
            
            // ĐỒNG BỘ SESSION HIỆN TẠI:
            // Nếu có người dùng đang đăng nhập, hãy cập nhật thông tin mới nhất từ Server (như Avatar)
            const currentSessionStr = sessionStorage.getItem(SESSION_KEY);
            if (currentSessionStr) {
                const currentUser = JSON.parse(currentSessionStr);
                const freshUserData = dbCustomers.find(c => c.id === currentUser.id);
                
                if (freshUserData && JSON.stringify(freshUserData) !== currentSessionStr) {
                    console.log("[Sigma Sync] Phát hiện thay đổi thông tin người dùng từ máy khác. Đang cập nhật...");
                    sessionStorage.setItem(SESSION_KEY, JSON.stringify(freshUserData));
                    dispatchCustomerUpdate();
                }
            }
        }
    } catch (e) {
        console.error("[Sigma Sync] Lỗi đồng bộ khách hàng:", e);
    } finally {
        isSyncing = false;
    }
};

export const forceReloadCustomers = async (): Promise<Customer[]> => {
    await syncWithServer();
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
    avatarUrl?: string;
}): Promise<{ success: boolean; message: string; customer?: Customer }> => {
  
  if (!data.fullName || !data.password || !data.email || !data.phoneNumber) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin.' };
  }

  const freshCustomers = await forceReloadCustomers();
  
  if (freshCustomers.some(c => c.email === data.email)) {
    return { success: false, message: 'Email này đã được đăng ký.' };
  }
  if (freshCustomers.some(c => c.phoneNumber === data.phoneNumber)) {
    return { success: false, message: 'Số điện thoại này đã được đăng ký.' };
  }

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
    avatarUrl: data.avatarUrl,
    createdAt: Date.now()
  };

  try {
      await syncCustomerToDB(newCustomer);
  } catch (e) {}

  localStorage.setItem(STORAGE_KEY, JSON.stringify([newCustomer, ...freshCustomers]));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newCustomer));
  dispatchCustomerUpdate();
  
  return { success: true, message: 'Đăng ký thành công!', customer: newCustomer };
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<boolean> => {
    // 1. Cập nhật session và local trước để UI mượt mà (Optimistic Update)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedCustomer));
    
    const customers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = customers.findIndex((c: any) => c.id === updatedCustomer.id);
    if (index !== -1) {
        customers[index] = updatedCustomer;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    }

    dispatchCustomerUpdate();

    // 2. Đồng bộ lên Server (QUAN TRỌNG: Đây là nơi dữ liệu được lưu vĩnh viễn)
    try {
        const res = await updateCustomerInDB(updatedCustomer);
        return !!(res && res.success);
    } catch (e) {
        console.error("Lỗi đồng bộ lên server:", e);
        return false;
    }
};

export const loginCustomer = async (identifier: string, password: string): Promise<{ success: boolean; message: string; customer?: Customer }> => {
  const hash = simpleHash(password);
  
  try {
      // Ưu tiên xác thực Server
      const serverRes = await verifyCustomerLoginOnServer(identifier, hash);
      if (serverRes && serverRes.success && serverRes.customer) {
          const remoteCustomer = serverRes.customer;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(remoteCustomer));
          await syncWithServer(); 
          dispatchCustomerUpdate();
          return { success: true, message: 'Đăng nhập thành công!', customer: remoteCustomer };
      }
  } catch (e) {}

  const customers = getCustomers();
  const localCustomer = customers.find(c => 
    (c.phoneNumber === identifier || c.email === identifier) && 
    c.passwordHash === hash
  );

  if (localCustomer) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(localCustomer));
    dispatchCustomerUpdate();
    return { success: true, message: 'Đăng nhập thành công!', customer: localCustomer };
  }

  return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng.' };
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
    try {
        const res = await deleteCustomerFromDB(id);
        if (res && res.success) {
            await syncWithServer();
            return true;
        }
    } catch (e) {}
    return false;
};

export const logoutCustomer = (): void => {
  sessionStorage.removeItem(SESSION_KEY);
  dispatchCustomerUpdate();
};

export const getCurrentCustomer = (): Customer | null => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
};
