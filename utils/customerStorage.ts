
import type { Customer } from '../types';
import { 
    fetchCustomersFromDB, syncCustomerToDB, updateCustomerInDB, 
    deleteCustomerFromDB, verifyCustomerLoginOnServer
} from './apiClient';
import { forceReloadOrders } from './orderStorage';

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

export const getCustomers = (): Customer[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const localData: Customer[] = stored ? JSON.parse(stored) : [];

  if (!isSyncing) {
      syncWithServer();
  }

  return localData;
};

export const syncWithServer = async (): Promise<void> => {
    if (isSyncing) return;
    isSyncing = true;
    try {
        const dbCustomers = await fetchCustomersFromDB();
        if (dbCustomers && Array.isArray(dbCustomers)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
            
            const currentSessionStr = sessionStorage.getItem(SESSION_KEY);
            if (currentSessionStr) {
                const currentUser = JSON.parse(currentSessionStr);
                const freshUserData = dbCustomers.find(c => c.id === currentUser.id);
                
                if (freshUserData && JSON.stringify(freshUserData) !== currentSessionStr) {
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
  
  // Ép tải lại đơn hàng (dù tài khoản mới thường rỗng, nhưng đảm bảo nhất quán)
  await forceReloadOrders();

  return { success: true, message: 'Đăng ký thành công!', customer: newCustomer };
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<boolean> => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedCustomer));
    
    const customers = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = customers.findIndex((c: any) => c.id === updatedCustomer.id);
    if (index !== -1) {
        customers[index] = updatedCustomer;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    }

    dispatchCustomerUpdate();

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
      const serverRes = await verifyCustomerLoginOnServer(identifier, hash);
      if (serverRes && serverRes.success && serverRes.customer) {
          const remoteCustomer = serverRes.customer;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(remoteCustomer));
          
          // QUAN TRỌNG: Ngay khi đăng nhập, ép tải lại đơn hàng cho user này
          await forceReloadOrders();
          
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
    await forceReloadOrders(); // Ép tải lại cho local user
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
  // Xóa đơn hàng local khi đăng xuất để bảo mật và tránh nhiễu dữ liệu user sau
  localStorage.removeItem('sigma_vie_orders');
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
