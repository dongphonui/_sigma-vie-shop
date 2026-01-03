
import { getHomePageSettings } from './homePageSettingsStorage';
import { getAboutPageSettings } from './aboutPageSettingsStorage';
import { getAboutPageContent } from './aboutPageStorage';
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

export const performFactoryReset = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS'): Promise<{ success: boolean, message: string }> => {
    console.log(`🧨 FACTORY RESET START: Scope = ${scope}`);
    
    try {
        // 1. Gửi lệnh xóa lên Server TRƯỚC
        const serverResult = await resetDatabase(scope);
        
        if (serverResult && serverResult.success === true) {
            
            // 2. XÓA LOCAL STORAGE NGAY LẬP TỨC để tránh Auto-Sync đẩy dữ liệu cũ lên lại
            if (scope === 'ORDERS') {
                localStorage.removeItem(KEYS.orders);
                localStorage.removeItem(KEYS.transactions);
            } else if (scope === 'PRODUCTS') {
                localStorage.removeItem(KEYS.products);
                localStorage.removeItem(KEYS.transactions);
                localStorage.removeItem(KEYS.orders); 
                localStorage.removeItem(KEYS.categories);
            } else if (scope === 'FULL') {
                // Giữ lại cài đặt Admin để không bị Logout khỏi Admin Panel
                const adminBackup = localStorage.getItem(KEYS.adminSettings);
                const authState = sessionStorage.getItem('isAuthenticated');
                const adminUser = sessionStorage.getItem('adminUser');
                
                // Xóa mọi thứ khác trong LocalStorage
                Object.values(KEYS).forEach(key => {
                    if (key !== KEYS.adminSettings) {
                        localStorage.removeItem(key);
                    }
                });
                
                // Xóa các giỏ hàng khách hàng
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sigma_vie_cart_')) {
                        localStorage.removeItem(key);
                    }
                });
                
                // Khôi phục lại session admin
                if (adminBackup) localStorage.setItem(KEYS.adminSettings, adminBackup);
                if (authState) sessionStorage.setItem('isAuthenticated', authState);
                if (adminUser) sessionStorage.setItem('adminUser', adminUser);
                
                // Xóa session khách hàng
                sessionStorage.removeItem('sigma_vie_current_customer');
            }

            console.log("Cleanup complete. Force reloading app to clear React State...");

            // 3. ÉP BUỘC TRÌNH DUYỆT TẢI LẠI HOÀN TOÀN
            // Timeout để user kịp thấy thông báo thành công
            setTimeout(() => {
                window.location.href = window.location.origin + window.location.pathname + "#/";
            }, 1500);

            return { success: true, message: 'Dữ liệu đã được xóa trắng hoàn toàn. Hệ thống đang khởi động lại...' };
        } else {
            return { success: false, message: serverResult?.message || 'Lỗi server khi reset dữ liệu.' };
        }
    } catch (err: any) {
        console.error("Factory Reset Critical Error:", err);
        return { success: false, message: 'Không thể kết nối Server để thực hiện xóa sạch.' };
    }
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
                if (!parsed.data) { resolve({ success: false, message: 'File không hợp lệ.' }); return; }
                const d = parsed.data;
                if (d.products) localStorage.setItem(KEYS.products, JSON.stringify(d.products));
                if (d.categories) localStorage.setItem(KEYS.categories, JSON.stringify(d.categories));
                if (d.customers) localStorage.setItem(KEYS.customers, JSON.stringify(d.customers));
                if (d.orders) localStorage.setItem(KEYS.orders, JSON.stringify(d.orders));
                if (d.transactions) localStorage.setItem(KEYS.transactions, JSON.stringify(d.transactions));
                resolve({ success: true, message: 'Khôi phục thành công! Trang sẽ tải lại.' });
                setTimeout(() => window.location.reload(), 1000);
            } catch (err) { resolve({ success: false, message: 'Lỗi đọc file.' }); }
        };
        reader.readAsText(file);
    });
};
