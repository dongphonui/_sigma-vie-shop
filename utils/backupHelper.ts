
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
    console.log(`🧨 THỰC HIỆN RESET HỆ THỐNG: Scope = ${scope}`);
    
    try {
        // 1. Gửi lệnh xóa lên Server trước
        const serverResult = await resetDatabase(scope);
        
        if (serverResult && serverResult.success === true) {
            
            // 2. PHÁ HỦY DỮ LIỆU LOCAL NGAY LẬP TỨC TRƯỚC KHI TRANG TẢI LẠI
            // Điều này đảm bảo khi trang tải lại, không còn mẩu dữ liệu cũ nào để đồng bộ ngược lên server
            
            if (scope === 'FULL') {
                const adminBackup = localStorage.getItem(KEYS.adminSettings);
                const authState = sessionStorage.getItem('isAuthenticated');
                const adminUser = sessionStorage.getItem('adminUser');
                
                // Xóa SẠCH TRẮNG hoàn toàn
                localStorage.clear();
                sessionStorage.clear();
                
                // Chỉ khôi phục quyền Admin để không bị đăng xuất ngay lập tức
                if (adminBackup) localStorage.setItem(KEYS.adminSettings, adminBackup);
                if (authState) sessionStorage.setItem('isAuthenticated', authState);
                if (adminUser) sessionStorage.setItem('adminUser', adminUser);
                
                console.log("Đã dọn sạch 100% dữ liệu trình duyệt.");
            } else {
                if (scope === 'ORDERS') {
                    localStorage.removeItem(KEYS.orders);
                    localStorage.removeItem(KEYS.transactions);
                } else if (scope === 'PRODUCTS') {
                    localStorage.removeItem(KEYS.products);
                    localStorage.removeItem(KEYS.categories);
                    localStorage.removeItem(KEYS.transactions);
                }
            }

            // 3. ÉP TRÌNH DUYỆT TẢI LẠI TỪ ĐẦU
            // Dùng window.location.href thay vì reload() để phá vỡ React State đang lưu trong RAM
            setTimeout(() => {
                const cleanUrl = window.location.origin + window.location.pathname + "#/admin";
                window.location.href = cleanUrl;
                window.location.reload(); 
            }, 1000);

            return { success: true, message: 'Dữ liệu đã được dọn sạch hoàn toàn. Đang khởi động lại...' };
        } else {
            return { success: false, message: serverResult?.message || 'Lỗi server khi thực hiện reset.' };
        }
    } catch (err: any) {
        console.error("Lỗi chí mạng khi reset:", err);
        return { success: false, message: 'Không thể kết nối Server để xóa dữ liệu.' };
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
