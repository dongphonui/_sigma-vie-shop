
import { getProducts } from './productStorage';
import { getCategories } from './categoryStorage';
import { getCustomers } from './customerStorage';
import { getOrders } from './orderStorage';
import { getTransactions } from './inventoryStorage';
import { getHomePageSettings } from './homePageSettingsStorage';
import { getAboutPageSettings } from './aboutPageSettingsStorage';
import { getAboutPageContent } from './aboutPageStorage';
import { getHeaderSettings } from './headerSettingsStorage';
import { getSocialSettings } from './socialSettingsStorage';
import { getBankSettings } from './bankSettingsStorage';
import { getStoreSettings } from './storeSettingsStorage';
import { getShippingSettings } from './shippingSettingsStorage';
import { resetDatabase } from './apiClient';

// List of all storage keys used in the app
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
            aboutContent: getAboutPageContent(),
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
                    resolve({ success: false, message: 'File backup không hợp lệ (Thiếu dữ liệu).' });
                    return;
                }

                const d = parsed.data;

                // Restore logic
                if (d.products) localStorage.setItem(KEYS.products, JSON.stringify(d.products));
                if (d.categories) localStorage.setItem(KEYS.categories, JSON.stringify(d.categories));
                if (d.customers) localStorage.setItem(KEYS.customers, JSON.stringify(d.customers));
                if (d.orders) localStorage.setItem(KEYS.orders, JSON.stringify(d.orders));
                if (d.transactions) localStorage.setItem(KEYS.transactions, JSON.stringify(d.transactions));
                
                if (d.homeSettings) localStorage.setItem(KEYS.homeSettings, JSON.stringify(d.homeSettings));
                if (d.aboutSettings) localStorage.setItem(KEYS.aboutSettings, JSON.stringify(d.aboutSettings));
                if (d.aboutContent) localStorage.setItem(KEYS.aboutContent, JSON.stringify(d.aboutContent));
                if (d.headerSettings) localStorage.setItem(KEYS.headerSettings, JSON.stringify(d.headerSettings));
                if (d.socialSettings) localStorage.setItem(KEYS.socialSettings, JSON.stringify(d.socialSettings));
                if (d.bankSettings) localStorage.setItem(KEYS.bankSettings, JSON.stringify(d.bankSettings));
                if (d.storeSettings) localStorage.setItem(KEYS.storeSettings, JSON.stringify(d.storeSettings));
                if (d.shippingSettings) localStorage.setItem(KEYS.shippingSettings, JSON.stringify(d.shippingSettings));

                resolve({ success: true, message: 'Khôi phục dữ liệu thành công! Trang sẽ tự tải lại.' });
            } catch (err) {
                console.error(err);
                resolve({ success: false, message: 'Lỗi khi đọc file backup.' });
            }
        };
        reader.readAsText(file);
    });
};

export const performFactoryReset = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS'): Promise<{ success: boolean, message: string }> => {
    
    console.log(`🧨 Factory Reset Initiative: Scope = ${scope}`);
    
    try {
        // Bước 1: Gửi lệnh reset lên Server TRƯỚC và ĐỢI PHẢN HỒI
        const serverResult = await resetDatabase(scope);
        
        console.log("Server response received:", serverResult);
        
        // CHỈ khi Server báo thành công (success: true) chúng ta mới xóa ở Client
        if (serverResult && serverResult.success === true) {
            
            console.log("Server Reset Confirmed. Now wiping local storage...");

            if (scope === 'ORDERS') {
                localStorage.setItem(KEYS.orders, '[]');
                localStorage.setItem(KEYS.transactions, '[]');
            } else if (scope === 'PRODUCTS') {
                localStorage.setItem(KEYS.products, '[]');
                localStorage.setItem(KEYS.transactions, '[]');
            } else if (scope === 'FULL') {
                // Bảo vệ các cài đặt quan trọng
                const adminSettings = localStorage.getItem(KEYS.adminSettings);
                const bankSettings = localStorage.getItem(KEYS.bankSettings);
                const storeSettings = localStorage.getItem(KEYS.storeSettings);
                const shippingSettings = localStorage.getItem(KEYS.shippingSettings);
                
                // Xóa tất cả
                localStorage.clear();
                
                // Khôi phục lại cài đặt gốc
                if (adminSettings) localStorage.setItem(KEYS.adminSettings, adminSettings);
                if (bankSettings) localStorage.setItem(KEYS.bankSettings, bankSettings);
                if (storeSettings) localStorage.setItem(KEYS.storeSettings, storeSettings);
                if (shippingSettings) localStorage.setItem(KEYS.shippingSettings, shippingSettings);

                localStorage.setItem(KEYS.products, '[]');
                localStorage.setItem(KEYS.orders, '[]');
                localStorage.setItem(KEYS.customers, '[]');
                localStorage.setItem(KEYS.transactions, '[]');
                localStorage.setItem(KEYS.categories, '[]');
            }
            
            return { success: true, message: serverResult.message || 'Đã xóa dữ liệu sạch sẽ trên cả Server và Trình duyệt.' };
        } else {
            // Trường hợp Server phản hồi lỗi hoặc success: false
            const errorMsg = serverResult?.error || serverResult?.message || 'Server từ chối lệnh reset.';
            console.error("❌ SERVER RESET FAILED:", errorMsg);
            
            return { 
                success: false, 
                message: `LỖI TỪ SERVER: ${errorMsg}. Trình duyệt đã hủy lệnh xóa để bảo vệ dữ liệu.` 
            };
        }
    } catch (networkError: any) {
        console.error("❌ NETWORK ERROR DURING RESET:", networkError);
        return {
            success: false,
            message: `LỖI KẾT NỐI: Không thể liên lạc với Server để xóa dữ liệu. Vui lòng kiểm tra mạng hoặc Server.`
        };
    }
};
