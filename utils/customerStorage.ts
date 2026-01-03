
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

const dispatchCustomerUpdate = () => {
    window.dispatchEvent(new Event('sigma_vie_customers_update'));
};

export const getCustomers = (): Customer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        fetchCustomersFromDB().then(dbCustomers => {
            if (dbCustomers && Array.isArray(dbCustomers)) {
                // Nếu server rỗng (vừa reset), ta phải xóa local luôn
                if (dbCustomers.length === 0 && localData.length > 0) {
                    localStorage.removeItem(STORAGE_KEY);
                    dispatchCustomerUpdate();
                } else {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
                    dispatchCustomerUpdate();
                }
            }
        }).catch(err => console.error("Lỗi tải khách hàng:", err));
    }

    return localData;
  } catch (error) {
    return [];
  }
};

export const forceReloadCustomers = async (): Promise<Customer[]> => {
    try {
        const dbCustomers = await fetchCustomersFromDB();
        if (dbCustomers && Array.isArray(dbCustomers)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
            dispatchCustomerUpdate();
            hasLoadedFromDB = true;
            return dbCustomers;
        }
    } catch (e) {
        console.error("Lỗi force reload customers:", e);
    }
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
  
  // 1. Validate đầu vào
  if (!data.fullName || !data.password || !data.email || !data.phoneNumber || !data.cccdNumber || !data.address || !data.dob || !data.issueDate || !data.gender) {
      return { success: false, message: 'Vui lòng điền đầy đủ thông tin.' };
  }

  // 2. Lấy danh sách khách hàng MỚI NHẤT từ Local (đã được sync với server rỗng nếu có)
  const customers = getCustomers();
  
  if (customers.some(c => c.email === data.email)) {
    return { success: false, message: 'Email này đã được đăng ký.' };
  }
  if (customers.some(c => c.phoneNumber === data.phoneNumber)) {
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
    createdAt: Date.now()
  };

  // 3. Gửi lên Server (Đợi kết quả để chắc chắn không trùng trên DB thật)
  try {
      const res = await syncCustomerToDB(newCustomer);
      if (res && !res.success && !res.isNetworkError) {
          // Nếu server báo lỗi (VD: trùng email thực tế trên DB)
          return { success: false, message: res.message || 'Email hoặc SĐT đã tồn tại trên hệ thống.' };
      }
  } catch (e) {
      console.warn("Sync error, continuing with local saving.");
  }

  // 4. Lưu Local thành công
  const updatedCustomers = [newCustomer, ...getCustomers()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  dispatchCustomerUpdate();
  
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newCustomer));
  
  return { success: true, message: 'Đăng ký thành công!', customer: newCustomer };
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<boolean> => {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === updatedCustomer.id);
    
    if (index !== -1) {
        customers[index] = updatedCustomer;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
        dispatchCustomerUpdate();
        
        const currentUser = getCurrentCustomer();
        if (currentUser && currentUser.id === updatedCustomer.id) {
             sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedCustomer));
        }
    }

    try {
        const res = await updateCustomerInDB(updatedCustomer);
        return !!(res && res.success);
    } catch (e) {
        return false;
    }
};

export const deleteCustomer = async (id: string): Promise<boolean> => {
    const customers = getCustomers();
    const updatedCustomers = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
    dispatchCustomerUpdate();

    try {
        const res = await deleteCustomerFromDB(id);
        return !!(res && res.success);
    } catch (e) {
        return false;
    }
};

export const loginCustomer = async (identifier: string, password: string): Promise<{ success: boolean; message: string; customer?: Customer }> => {
  const hash = simpleHash(password);
  
  const customers = getCustomers();
  const localCustomer = customers.find(c => 
    (c.phoneNumber === identifier || c.email === identifier) && 
    c.passwordHash === hash
  );

  if (localCustomer) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(localCustomer));
    return { success: true, message: 'Đăng nhập thành công!', customer: localCustomer };
  }

  try {
      const serverRes = await verifyCustomerLoginOnServer(identifier, hash);
      if (serverRes && serverRes.success && serverRes.customer) {
          const remoteCustomer = serverRes.customer;
          const currentList = getCustomers();
          if (!currentList.some(c => c.id === remoteCustomer.id)) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify([remoteCustomer, ...currentList]));
              dispatchCustomerUpdate();
          }
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(remoteCustomer));
          return { success: true, message: 'Đăng nhập thành công!', customer: remoteCustomer };
      }
  } catch (e) {
      return { success: false, message: 'Lỗi kết nối Server.' };
  }

  return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng.' };
};

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
