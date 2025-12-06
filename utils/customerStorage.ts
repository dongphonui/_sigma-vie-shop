
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

export const getCustomers = (): Customer[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        fetchCustomersFromDB().then(dbCustomers => {
            if (dbCustomers && dbCustomers.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCustomers));
                hasLoadedFromDB = true;
            }
        });
        hasLoadedFromDB = true;
    }

    return localData;
  } catch (error) {
    return [];
  }
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
    issueDate: data.issueDate, // Save Issue Date
    passwordHash: simpleHash(data.password),
    address: data.address,
    createdAt: Date.now()
  };

  const updatedCustomers = [...customers, newCustomer];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
  
  // Sync to DB
  syncCustomerToDB(newCustomer);
  
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(newCustomer));
  
  return { success: true, message: 'Đăng ký thành công!', customer: newCustomer };
};

export const updateCustomer = (updatedCustomer: Customer): void => {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === updatedCustomer.id);
    if (index !== -1) {
        customers[index] = updatedCustomer;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
        updateCustomerInDB(updatedCustomer);
        
        // If updating current logged in user, update session as well
        const currentUser = getCurrentCustomer();
        if (currentUser && currentUser.id === updatedCustomer.id) {
             sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedCustomer));
        }
    }
};

export const deleteCustomer = (id: string): void => {
    const customers = getCustomers();
    const updatedCustomers = customers.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustomers));
    deleteCustomerFromDB(id);
};

export const loginCustomer = (identifier: string, password: string): { success: boolean; message: string; customer?: Customer } => {
  const customers = getCustomers();
  const hash = simpleHash(password);

  // Allow login via Email OR Phone OR CCCD
  const customer = customers.find(c => 
    ((c.email === identifier) || (c.phoneNumber === identifier) || (c.cccdNumber === identifier)) && 
    c.passwordHash === hash
  );

  if (customer) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(customer));
    return { success: true, message: 'Đăng nhập thành công!', customer };
  }

  return { success: false, message: 'Tài khoản hoặc mật khẩu không đúng.' };
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
