
import { getHomePageSettings } from './homePageSettingsStorage';
import { getAboutPageSettings } from './aboutPageSettingsStorage';
import { getAboutPageContent } from './aboutPageContentStorage'; // Fixed incorrect import
import { getHeaderSettings } from './headerSettingsStorage';
import { getSocialSettings } from './socialSettingsStorage';
import { getBankSettings } from './bankSettingsStorage';
import { getStoreSettings } from './storeSettingsStorage';
import { getShippingSettings } from './shippingSettingsStorage';
import { resetDatabase } from './apiClient';

const KEYS = {
    products: 'sigma_vie_products',
    categories: 'sigma_vie_categories',
    customers: 'sigma_vie_customers',
    orders: 'sigma_vie_orders',
    transactions: 'sigma_vie_transactions',
    homeSettings: 'sigma_vie_home_page_settings',
    aboutSettings: 'sigma_vie_about_page_settings',
    aboutContent: 'sigma_vie_about_page',
    headerSettings: 'sigma_vie_header_settings',
    socialSettings: 'sigma_vie_social_settings',
    bankSettings: 'sigma_vie_bank_settings',
    storeSettings: 'sigma_vie_store_settings',
    shippingSettings: 'sigma_vie_shipping_settings',
    adminSettings: 'sigma_vie_admin_settings' 
};

export const generateBackupData = () => {
    const backup = {
        timestamp: Date.now(),
        version: '1.0',
        data: {
            products: localStorage.getItem(KEYS.products) ? JSON.parse(localStorage.getItem(KEYS.products)!) : [],
            categories: localStorage.getItem(KEYS.categories) ? JSON.parse(localStorage.getItem(KEYS.categories)!) : [],
            customers: localStorage.getItem(KEYS.customers) ? JSON.parse(localStorage.getItem(KEYS.customers)!) : [],
            orders: localStorage.getItem(KEYS.orders) ? JSON.parse(localStorage.getItem(KEYS.orders)!) : [],
            transactions: localStorage.getItem(KEYS.transactions) ? JSON.parse(localStorage.getItem(KEYS.transactions)!) : [],
            homeSettings: getHomePageSettings(),
            aboutSettings: getAboutPageSettings(),
            headerSettings: getHeaderSettings(),
            socialSettings: getSocialSettings(),
            bankSettings: getBankSettings(),
            storeSettings: getStoreSettings(),
            shippingSettings: getShippingSettings(),
        }
    };
    return JSON.stringify(backup, null, 2);
};

export const downloadBackup = () => {
    const json = generateBackupData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `sigma_vie_backup_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const restoreBackup = async (file: File): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                const parsed = JSON.parse(json);

                if (!parsed.data) {
                    resolve({ success: false, message: 'File backup không hợp lệ.' });
                    return;
                }

                const d = parsed.data;
                if (d.products) localStorage.setItem(KEYS.products, JSON.stringify(d.products));
                if (d.categories) localStorage.setItem(KEYS.categories, JSON.stringify(d.categories));
                if (d.customers) localStorage.setItem(KEYS.customers, JSON.stringify(d.customers));
                if (d.orders) localStorage.setItem(KEYS.orders, JSON.stringify(d.orders));
                if (d.transactions) localStorage.setItem(KEYS.transactions, JSON.stringify(d.transactions));
                if (d.homeSettings) localStorage.setItem(KEYS.homeSettings, JSON.stringify(d.homeSettings));
                if (d.headerSettings) localStorage.setItem(KEYS.headerSettings, JSON.stringify(d.headerSettings));
                
                resolve({ success: true, message: 'Khôi phục thành công! Trang sẽ tải lại.' });
            } catch (err) {
                resolve({ success: false, message: 'Lỗi đọc file.' });
            }
        };
        reader.readAsText(file);
    });
};

export const performFactoryReset = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS'): Promise<{ success: boolean, message: string }> => {
    console.log(`🧨 FACTORY RESET: Cleaning local storage for scope ${scope}...`);
    
    // 1. XÓA LOCAL STORAGE NGAY LẬP TỨC (Tránh auto-sync đẩy dữ liệu cũ lên lại)
    if (scope === 'ORDERS') {
        localStorage.setItem(KEYS.orders, '[]');
        localStorage.setItem(KEYS.transactions, '[]');
    } else if (scope === 'PRODUCTS') {
        localStorage.setItem(KEYS.products, '[]');
        localStorage.setItem(KEYS.transactions, '[]');
        localStorage.setItem(KEYS.orders, '[]'); 
        localStorage.setItem(KEYS.categories, '[]');
    } else if (scope === 'FULL') {
        // Chỉ giữ lại tài khoản admin để không bị logout
        const adminSettings = localStorage.getItem(KEYS.adminSettings);
        
        // Xóa sạch sẽ các key khác
        Object.values(KEYS).forEach(key => {
            if (key !== KEYS.adminSettings) {
                localStorage.removeItem(key);
            }
        });
        
        if (adminSettings) localStorage.setItem(KEYS.adminSettings, adminSettings);
    }

    // 2. GỬI LỆNH XÓA LÊN SERVER
    try {
        const serverResult = await resetDatabase(scope);
        if (serverResult && serverResult.success === true) {
            console.log("Server factory reset complete.");
            return { success: true, message: 'Dữ liệu đã được xóa sạch trên cả Máy khách và Máy chủ.' };
        } else {
            return { success: false, message: serverResult?.message || 'Server không thể thực hiện reset.' };
        }
    } catch (err: any) {
        console.error("Factory Reset Error:", err);
        return { success: false, message: 'Lỗi kết nối. Vui lòng kiểm tra Server.' };
    }
};
