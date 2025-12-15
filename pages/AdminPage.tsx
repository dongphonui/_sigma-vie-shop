
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import type { Product, AboutPageContent, HomePageSettings, AboutPageSettings, HeaderSettings, InventoryTransaction, Category, Order, SocialSettings, Customer, AdminLoginLog, BankSettings, StoreSettings, ShippingSettings, AdminUser } from '../types';
import { getProducts, addProduct, deleteProduct, updateProduct, updateProductStock } from '../utils/productStorage';
import { getAboutPageContent, updateAboutPageContent } from '../utils/aboutPageStorage';
import { 
    getAdminEmails, addAdminEmail, removeAdminEmail, getPrimaryAdminEmail,
    isTotpEnabled, generateTotpSecret, getTotpUri, enableTotp, disableTotp, verifyTempTotpToken, verifyTotpToken
} from '../utils/adminSettingsStorage';
import { getHomePageSettings, updateHomePageSettings } from '../utils/homePageSettingsStorage';
import { getAboutPageSettings, updateAboutPageSettings } from '../utils/aboutPageSettingsStorage';
import { getHeaderSettings, updateHeaderSettings } from '../utils/headerSettingsStorage';
import { getStoreSettings, updateStoreSettings } from '../utils/storeSettingsStorage';
import { getShippingSettings, updateShippingSettings } from '../utils/shippingSettingsStorage';
import { getTransactions, addTransaction } from '../utils/inventoryStorage';
import { getDashboardMetrics, type DashboardData } from '../utils/analytics';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../utils/categoryStorage';
import { getOrders, updateOrderStatus } from '../utils/orderStorage';
import { getSocialSettings, updateSocialSettings } from '../utils/socialSettingsStorage';
import { getCustomers, updateCustomer, deleteCustomer } from '../utils/customerStorage';
import { getBankSettings, updateBankSettings } from '../utils/bankSettingsStorage';
import { sendEmail, fetchAdminLoginLogs, changeAdminPassword, fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, syncShippingSettingsToDB, fetchShippingSettingsFromDB } from '../utils/apiClient';
import { downloadBackup, restoreBackup, performFactoryReset } from '../utils/backupHelper';
import { VIET_QR_BANKS } from '../utils/constants';

// --- ICONS ---
const Icons = {
    ImagePlus: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12H3"/><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>,
    Trash2: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>,
    Edit: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    Package: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>,
    BarChart2: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
    Search: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    Layers: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    Lightning: ({className, style}: {className?: string, style?: React.CSSProperties}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} style={style}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    ClipboardList: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>,
    Users: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    ChevronLeft: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 18l-6-6 6-6"/></svg>,
    ChevronRight: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18l6-6-6-6"/></svg>,
    Check: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>,
    Truck: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>,
    XCircle: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    ShieldCheck: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
    Activity: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
    CreditCard: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>,
    DollarSign: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    Printer: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>,
    Database: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
    Save: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
    RotateCcw: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>,
    Lock: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
    User: ({className}: {className?: string}) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
};

// DEFINE PERMISSION GROUPS
const PERMISSION_GROUPS = [
    {
        label: 'Quản lý Cửa hàng',
        options: [
            { id: 'dashboard', label: 'Tổng quan' },
            { id: 'products', label: 'Sản phẩm' },
            { id: 'orders', label: 'Đơn hàng' },
            { id: 'inventory', label: 'Kho hàng' },
            { id: 'customers', label: 'Khách hàng' },
        ]
    },
    {
        label: 'Quản lý Giao diện',
        options: [
            { id: 'home', label: 'Trang chủ' },
            { id: 'header', label: 'Header & Menu' },
            { id: 'about', label: 'Trang Giới thiệu' },
        ]
    },
    {
        label: 'Hệ thống',
        options: [
            { id: 'settings', label: 'Cài đặt chung' },
        ]
    }
];

const AdminPage: React.FC = () => {
  // General State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'about' | 'home' | 'header' | 'settings'>('dashboard');
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Product Form State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImportPrice, setNewProductImportPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductStatus, setNewProductStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState('');
  
  // Flash Sale State
  const [newProductIsFlashSale, setNewProductIsFlashSale] = useState(false);
  const [newProductSalePrice, setNewProductSalePrice] = useState('');
  const [newProductFlashSaleStartTime, setNewProductFlashSaleStartTime] = useState('');
  const [newProductFlashSaleEndTime, setNewProductFlashSaleEndTime] = useState('');
  
  // New States for Sizes and Colors
  const [newProductSizes, setNewProductSizes] = useState(''); 
  const [newProductColors, setNewProductColors] = useState('');

  // Product Filter State
  const [productSearch, setProductSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Order State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Customer State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');


  // About Page State
  const [aboutContent, setAboutContent] = useState<AboutPageContent | null>(null);
  const [aboutSettings, setAboutSettings] = useState<AboutPageSettings | null>(null);
  const [aboutFeedback, setAboutFeedback] = useState('');
  
  // Settings State
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState('');
  const [adminLogs, setAdminLogs] = useState<AdminLoginLog[]>([]);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(getStoreSettings());
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>(getShippingSettings());
  
  // Password Change State (Self)
  const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // Sub-Admin State
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUserForm, setAdminUserForm] = useState({ 
      username: '', password: '', fullname: '', 
      permissions: [] as string[]
  });
  const [isEditingAdmin, setIsEditingAdmin] = useState<string | null>(null);

  // 2FA State (Global / Legacy)
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [tempTotpSecret, setTempTotpSecret] = useState('');
  const [tempTotpUri, setTempTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showTotpSetup, setShowTotpSetup] = useState(false);

  // Bank Security Modal State
  const [showBankSecurityModal, setShowBankSecurityModal] = useState(false);
  const [securityCode, setSecurityCode] = useState('');

  // Home Page State
  const [homeSettings, setHomeSettings] = useState<HomePageSettings | null>(null);
  const [homeFeedback, setHomeFeedback] = useState('');

  // Header Settings State
  const [headerSettings, setHeaderSettings] = useState<HeaderSettings | null>(null);
  const [headerFeedback, setHeaderFeedback] = useState('');

  // Inventory State
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [selectedProductForInventory, setSelectedProductForInventory] = useState<string>('');
  const [inventoryQuantity, setInventoryQuantity] = useState<string>('');
  const [inventoryNote, setInventoryNote] = useState('');
  const [inventoryType, setInventoryType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [inventoryFeedback, setInventoryFeedback] = useState('');
  const [inventoryView, setInventoryView] = useState<'stock' | 'history'>('stock');
  const [inventorySearch, setInventorySearch] = useState('');
  // New Inventory State
  const [inventorySize, setInventorySize] = useState(''); 
  const [inventoryColor, setInventoryColor] = useState(''); 

  // Dashboard State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);


  // Callbacks
  const refreshProducts = useCallback(() => { setProducts(getProducts()); }, []);
  const refreshCategories = useCallback(() => { setCategories(getCategories()); }, []);
  const refreshOrders = useCallback(() => { setOrders(getOrders()); }, []);
  const refreshCustomers = useCallback(() => { setCustomers(getCustomers()); }, []);
  const refreshAboutPage = useCallback(() => { setAboutContent(getAboutPageContent()); setAboutSettings(getAboutPageSettings()); }, []);
  const refreshHomeSettings = useCallback(() => { setHomeSettings(getHomePageSettings()); }, []);
  const refreshHeaderSettings = useCallback(() => { setHeaderSettings(getHeaderSettings()); }, []);
  const refreshInventory = useCallback(() => { setTransactions(getTransactions()); }, []);
  const refreshDashboard = useCallback(() => { setDashboardData(getDashboardMetrics()); }, []);

  const refreshSettings = useCallback(() => {
    setAdminEmails(getAdminEmails());
    setSocialSettings(getSocialSettings());
    // Only load local TOTP status if using Legacy Master (no currentAdminUser or Master with no DB)
    setTotpEnabled(isTotpEnabled());
    setBankSettings(getBankSettings());
    setStoreSettings(getStoreSettings());
    
    // FETCH SHIPPING FROM SERVER
    fetchShippingSettingsFromDB().then(dbShipping => {
        if(dbShipping) setShippingSettings(dbShipping);
    });
    
    fetchAdminLoginLogs().then(logs => {
        if (logs) setAdminLogs(logs);
    });

    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentAdminUser(user);
        if (user.role === 'MASTER') {
            fetchAdminUsers().then(users => {
                if(users) setAdminUsers(users);
            });
        }
    }
  }, []);

  useEffect(() => {
    refreshProducts();
    refreshCategories();
    refreshOrders();
    refreshCustomers();
    refreshAboutPage();
    refreshSettings();
    refreshHomeSettings();
    refreshHeaderSettings();
    refreshInventory();
    refreshDashboard();
  }, [refreshProducts, refreshCategories, refreshOrders, refreshCustomers, refreshAboutPage, refreshSettings, refreshHomeSettings, refreshHeaderSettings, refreshInventory, refreshDashboard]);

  // Re-calculate dashboard when transactions or products change
  useEffect(() => {
      if (activeTab === 'dashboard') {
          refreshDashboard();
      }
  }, [activeTab, transactions, products, refreshDashboard]);

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearch, orderFilterStatus]);


  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('adminUser');
    window.location.hash = '/';
  };

  const hasPermission = (perm: string) => {
      if (!currentAdminUser) return false;
      if (currentAdminUser.role === 'MASTER') return true;
      return currentAdminUser.permissions.includes(perm) || currentAdminUser.permissions.includes('ALL');
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductImage(reader.result as string);
      };
      reader.onerror = () => {
          setProductFeedback('Lỗi: Không thể đọc file. Vui lòng thử lại.');
      };
      reader.readAsDataURL(file);
    }
  };

  const toLocalISOString = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
  };

  const handleEditProduct = (product: Product) => {
      setEditingProduct(product);
      setNewProductName(product.name);
      setNewProductPrice(product.price);
      setNewProductImportPrice(product.importPrice);
      setNewProductSku(product.sku);
      setNewProductCategory(product.category);
      setNewProductBrand(product.brand);
      setNewProductStatus(product.status);
      setNewProductDescription(product.description);
      setNewProductImage(product.imageUrl);
      setNewProductIsFlashSale(product.isFlashSale || false);
      setNewProductSalePrice(product.salePrice || '');
      setNewProductSizes(product.sizes ? product.sizes.join(', ') : '');
      setNewProductColors(product.colors ? product.colors.join(', ') : '');
      setNewProductFlashSaleStartTime(product.flashSaleStartTime ? toLocalISOString(new Date(product.flashSaleStartTime)) : '');
      setNewProductFlashSaleEndTime(product.flashSaleEndTime ? toLocalISOString(new Date(product.flashSaleEndTime)) : '');
      setIsAddingProduct(true);
  };

  const resetProductForm = () => {
      setNewProductName(''); setNewProductPrice(''); setNewProductImportPrice(''); setNewProductSku('');
      setNewProductCategory(''); setNewProductBrand(''); setNewProductStatus('active'); setNewProductDescription('');
      setNewProductImage(null); setNewProductIsFlashSale(false); setNewProductSalePrice('');
      setNewProductFlashSaleStartTime(''); setNewProductFlashSaleEndTime(''); setNewProductSizes(''); setNewProductColors('');
  };

  const handleCancelProductEdit = () => { setIsAddingProduct(false); setEditingProduct(null); resetProductForm(); };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductDescription || !newProductImage) {
      setProductFeedback('Vui lòng điền đầy đủ tất cả các trường và tải lên hình ảnh.');
      return;
    }
    const commonData = {
      name: newProductName, price: newProductPrice, importPrice: newProductImportPrice || '0₫', description: newProductDescription,
      imageUrl: newProductImage || '', sku: newProductSku || `GEN-${Date.now()}`, brand: newProductBrand || 'Sigma Vie',
      category: newProductCategory || (categories[0]?.name || 'Chung'), status: newProductStatus,
      isFlashSale: newProductIsFlashSale, salePrice: newProductSalePrice,
      flashSaleStartTime: newProductFlashSaleStartTime ? new Date(newProductFlashSaleStartTime).getTime() : undefined,
      flashSaleEndTime: newProductFlashSaleEndTime ? new Date(newProductFlashSaleEndTime).getTime() : undefined,
      sizes: newProductSizes ? newProductSizes.split(',').map(s=>s.trim()).filter(s=>s) : [],
      colors: newProductColors ? newProductColors.split(',').map(s=>s.trim()).filter(s=>s) : []
    };
    if (editingProduct) updateProduct({ ...editingProduct, ...commonData, stock: editingProduct.stock });
    else addProduct({ ...commonData, stock: 0 });
    refreshProducts(); handleCancelProductEdit();
    setProductFeedback('Đã lưu sản phẩm.');
    setTimeout(() => setProductFeedback(''), 3000);
  };

  const handleDeleteProduct = (id: number, name: string) => { 
      if(confirm(`Xóa sản phẩm ${name}?`)) { 
          deleteProduct(id); 
          refreshProducts(); 
          setProductFeedback('Đã xóa sản phẩm.');
          setTimeout(() => setProductFeedback(''), 3000);
      }
  };

  // Category Handlers
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName) {
        if (editingCategory) {
            updateCategory({ id: editingCategory.id, name: newCategoryName, description: newCategoryDesc });
            setProductFeedback('Đã cập nhật danh mục.');
        } else {
            addCategory({ name: newCategoryName, description: newCategoryDesc });
            setProductFeedback('Thêm danh mục thành công.');
        }
        setNewCategoryName(''); setNewCategoryDesc(''); setEditingCategory(null);
        refreshCategories();
        setTimeout(() => setProductFeedback(''), 3000);
    }
  };
  const handleEditCategory = (category: Category) => {
      setEditingCategory(category); setNewCategoryName(category.name); setNewCategoryDesc(category.description || '');
  };
  const handleCancelEdit = () => {
      setEditingCategory(null); setNewCategoryName(''); setNewCategoryDesc('');
  }
  const handleDeleteCategory = (id: string, name: string) => {
      if (window.confirm(`Bạn có chắc muốn xóa danh mục "${name}"?`)) {
          deleteCategory(id); refreshCategories();
      }
  };

  // Order Handlers
  const handleOrderStatusChange = (orderId: string, newStatus: Order['status']) => {
      updateOrderStatus(orderId, newStatus);
      refreshOrders(); refreshProducts(); refreshInventory();
  };
  const handlePrintOrder = (order: Order) => {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (!printWindow) return;
      // ... simplified print logic
      printWindow.document.write(`<html><body><h1>Order #${order.id}</h1><p>Customer: ${order.customerName}</p></body></html>`);
      printWindow.document.close();
      printWindow.print();
  };

  // Customer Handlers
  const handleEditCustomer = (c: Customer) => {
      setEditingCustomer(c); setEditCustName(c.fullName); setEditCustEmail(c.email||''); setEditCustPhone(c.phoneNumber||''); setEditCustAddress(c.address||''); setIsEditingCustomer(true);
  };
  const handleDeleteCustomer = (id: string, name: string) => {
      if(confirm(`Xóa khách hàng ${name}?`)) { deleteCustomer(id); refreshCustomers(); }
  };
  const handleSaveCustomer = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingCustomer) {
          updateCustomer({ ...editingCustomer, fullName: editCustName, email: editCustEmail, phoneNumber: editCustPhone, address: editCustAddress });
          setIsEditingCustomer(false); setEditingCustomer(null); refreshCustomers();
      }
  };

  // Inventory Handler
  const handleInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForInventory || !inventoryQuantity) return;
    const pid = parseInt(selectedProductForInventory);
    const qty = parseInt(inventoryQuantity);
    const success = updateProductStock(pid, inventoryType === 'IMPORT' ? qty : -qty, inventorySize, inventoryColor);
    if(success) {
        addTransaction({ productId: pid, productName: 'Updated', type: inventoryType, quantity: qty, selectedSize: inventorySize, selectedColor: inventoryColor, note: inventoryNote });
        refreshProducts(); refreshInventory(); setInventoryFeedback('Thành công'); setInventoryQuantity('');
    } else {
        setInventoryFeedback('Lỗi: Tồn kho không đủ hoặc lỗi cập nhật.');
    }
    setTimeout(() => setInventoryFeedback(''), 3000);
  };

  // About/Home/Header Handlers
  const handleAboutContentChange = (f: keyof AboutPageContent, v: string) => aboutContent && setAboutContent({...aboutContent, [f]: v});
  const handleAboutSettingsChange = (f: keyof AboutPageSettings, v: string) => aboutSettings && setAboutSettings({...aboutSettings, [f]: v});
  const handleAboutImageUpload = (e: any, f: keyof AboutPageContent) => { /* logic */ };
  const handleAboutSubmit = (e: any) => { e.preventDefault(); if(aboutContent && aboutSettings) { updateAboutPageContent(aboutContent); updateAboutPageSettings(aboutSettings); setAboutFeedback('Đã lưu'); }};
  const handleHomePageSettingsChange = (f: keyof HomePageSettings, v: any) => homeSettings && setHomeSettings({...homeSettings, [f]: v});
  const handleHomePageSubmit = (e: any) => { e.preventDefault(); if(homeSettings) { updateHomePageSettings(homeSettings); setHomeFeedback('Đã lưu'); }};
  const handleHeaderSettingsChange = (f: keyof HeaderSettings, v: string) => headerSettings && setHeaderSettings({...headerSettings, [f]: v});
  const handleHeaderLogoUpload = (e: any) => { /* logic */ };
  const handleHeaderSubmit = (e: any) => { e.preventDefault(); if(headerSettings) { updateHeaderSettings(headerSettings); setHeaderFeedback('Đã lưu'); }};

  // Settings Handlers
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentAdminUser) return;
      if (passwordData.new !== passwordData.confirm) { setSettingsFeedback('Mật khẩu xác nhận không khớp.'); return; }
      const res = await changeAdminPassword({ id: currentAdminUser.id, oldPassword: passwordData.old, newPassword: passwordData.new });
      setSettingsFeedback(res?.success ? 'Đổi mật khẩu thành công!' : res?.message || 'Thất bại.');
      if(res?.success) { setPasswordData({ old: '', new: '', confirm: '' }); setShowPasswordForm(false); }
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleShippingSettingsChange = (field: keyof ShippingSettings, value: any) => setShippingSettings(prev => ({ ...prev, [field]: value }));
  const handleShippingSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      updateShippingSettings(shippingSettings);
      syncShippingSettingsToDB(shippingSettings);
      setSettingsFeedback('Đã lưu cấu hình vận chuyển!');
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleCreateAdminUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await createAdminUser({ ...adminUserForm, permissions: adminUserForm.permissions.length > 0 ? adminUserForm.permissions : ['dashboard'] });
      setSettingsFeedback(res?.success ? 'Tạo nhân viên thành công.' : res?.message || 'Lỗi.');
      if(res?.success) { setAdminUserForm({ username: '', password: '', fullname: '', permissions: [] }); fetchAdminUsers().then(u => setAdminUsers(u||[])); }
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleUpdateAdminUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isEditingAdmin) return;
      const res = await updateAdminUser(isEditingAdmin, { fullname: adminUserForm.fullname, permissions: adminUserForm.permissions, password: adminUserForm.password || undefined });
      setSettingsFeedback(res?.success ? 'Cập nhật thành công.' : res?.message || 'Lỗi.');
      if(res?.success) { setIsEditingAdmin(null); setAdminUserForm({ username: '', password: '', fullname: '', permissions: [] }); fetchAdminUsers().then(u => setAdminUsers(u||[])); }
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const prepareEditAdmin = (user: AdminUser) => { setIsEditingAdmin(user.id); setAdminUserForm({ username: user.username, password: '', fullname: user.fullname, permissions: user.permissions }); };
  const handleDeleteAdminUser = async (id: string) => { if(confirm('Xóa?')) { await deleteAdminUser(id); fetchAdminUsers().then(u => setAdminUsers(u||[])); }};
  const togglePermission = (perm: string) => {
      setAdminUserForm(prev => {
          const perms = prev.permissions.includes(perm) ? prev.permissions.filter(p => p !== perm) : [...prev.permissions, perm];
          return { ...prev, permissions: perms };
      });
  };

  const handleBackup = () => { downloadBackup(); setSettingsFeedback('Đã tải backup.'); setTimeout(() => setSettingsFeedback(''), 3000); };
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && confirm('Khôi phục sẽ ghi đè dữ liệu?')) {
          const res = await restoreBackup(file);
          setSettingsFeedback(res.message);
          if(res.success) setTimeout(() => window.location.reload(), 1500);
      }
  };
  const handleFactoryReset = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
      if (confirm(`RESET ${scope}?`)) {
          const res = await performFactoryReset(scope);
          setSettingsFeedback(res.message);
          if(res.success) setTimeout(() => window.location.reload(), 2000);
      }
  };

  const handleStartTotpSetup = () => { const s = generateTotpSecret(); setTempTotpSecret(s); setTempTotpUri(getTotpUri(s, currentAdminUser?.username)); setShowTotpSetup(true); setVerificationCode(''); };
  const handleVerifyAndEnableTotp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (verifyTempTotpToken(verificationCode.replace(/\s/g, ''), tempTotpSecret)) {
          if (currentAdminUser) {
              await updateAdminUser(currentAdminUser.id, { totp_secret: tempTotpSecret, is_totp_enabled: true });
              const updated = { ...currentAdminUser, is_totp_enabled: true };
              setCurrentAdminUser(updated); sessionStorage.setItem('adminUser', JSON.stringify(updated));
          } else { enableTotp(tempTotpSecret); }
          setShowTotpSetup(false); setSettingsFeedback('2FA Enabled');
      } else { setSettingsFeedback('Code invalid'); }
      setTimeout(() => setSettingsFeedback(''), 3000);
  };
  const handleDisableTotp = async () => {
      if (confirm('Disable 2FA?')) {
          if (currentAdminUser) {
              await updateAdminUser(currentAdminUser.id, { is_totp_enabled: false });
              const updated = { ...currentAdminUser, is_totp_enabled: false };
              setCurrentAdminUser(updated); sessionStorage.setItem('adminUser', JSON.stringify(updated));
          } else { disableTotp(); }
          setSettingsFeedback('2FA Disabled');
      }
  };
  const handleResetUser2FA = async (uid: string, uname: string) => { if(confirm(`Reset 2FA for ${uname}?`)) { await updateAdminUser(uid, { is_totp_enabled: false }); fetchAdminUsers().then(u => setAdminUsers(u||[])); }};

  const handleAddEmail = (e: React.FormEvent) => { e.preventDefault(); addAdminEmail(newAdminEmail); setNewAdminEmail(''); refreshSettings(); };
  const handleRemoveEmail = (e: string) => { removeAdminEmail(e); refreshSettings(); };
  const handleTestEmail = async () => { const res = await sendEmail(getPrimaryAdminEmail(), 'Test', 'Test Content'); setSettingsFeedback(res?.success ? 'Email sent' : 'Failed'); setTimeout(() => setSettingsFeedback(''), 3000); };
  
  const handleBankSettingsChange = (f: keyof BankSettings, v: string) => bankSettings && setBankSettings({...bankSettings, [f]: v});
  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(isTotpEnabled()) { setShowBankSecurityModal(true); setSecurityCode(''); } else { if(confirm('Save without 2FA?')) executeBankUpdate(); }
  };
  const executeBankUpdate = () => { if(bankSettings) { updateBankSettings(bankSettings); setSettingsFeedback('Bank info updated'); setTimeout(() => setSettingsFeedback(''), 3000); }};
  const handleVerifyBankUpdate = (e: React.FormEvent) => { e.preventDefault(); if(verifyTotpToken(securityCode)) { executeBankUpdate(); setShowBankSecurityModal(false); } else { alert('Invalid code'); }};
  
  const handleSocialSettingsChange = (f: keyof SocialSettings, v: string) => socialSettings && setSocialSettings({...socialSettings, [f]: v});
  const handleSocialSettingsSubmit = (e: React.FormEvent) => { e.preventDefault(); if(socialSettings) { updateSocialSettings(socialSettings); setSettingsFeedback('Social links updated'); setTimeout(() => setSettingsFeedback(''), 3000); }};

  // --- RENDERERS ---

  const renderDashboard = () => (
      <div className="space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <p className="text-sm font-bold text-gray-500 uppercase">Doanh thu hôm nay</p>
                  <p className="text-2xl font-bold text-gray-800">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardData?.totalRevenueToday || 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <p className="text-sm font-bold text-gray-500 uppercase">Đơn hàng mới</p>
                  <p className="text-2xl font-bold text-gray-800">{orders.filter(o => o.status === 'PENDING').length}</p>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <p className="text-sm font-bold text-gray-500 uppercase">Tổng sản phẩm</p>
                  <p className="text-2xl font-bold text-gray-800">{products.length}</p>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <p className="text-sm font-bold text-gray-500 uppercase">Sắp hết hàng</p>
                  <p className="text-2xl font-bold text-gray-800">{dashboardData?.lowStockProducts.length || 0}</p>
              </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md h-80">
                  <h3 className="font-bold mb-4">Doanh số 7 ngày qua</h3>
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData?.dailySales}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <RechartsTooltip formatter={(v) => new Intl.NumberFormat('vi-VN').format(v as number)} />
                          <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md h-80">
                  <h3 className="font-bold mb-4">Tồn kho</h3>
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData?.stockData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#00695C" />
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
  );

  const renderProductManager = () => (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-end">
             <button onClick={() => setIsManagingCategories(!isManagingCategories)} className="text-[#00695C] border border-[#00695C] px-4 py-2 rounded hover:bg-teal-50">
                {isManagingCategories ? 'Quay lại Sản phẩm' : 'Quản lý Danh mục'}
            </button>
        </div>
        {isManagingCategories ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-bold mb-4">Danh mục</h3>
                 <form onSubmit={handleSaveCategory} className="mb-6 flex gap-4">
                     <input type="text" placeholder="Tên" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="border rounded px-3 py-2 flex-1" required />
                     <input type="text" placeholder="Mô tả" value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} className="border rounded px-3 py-2 flex-1" />
                     <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">{editingCategory ? 'Cập nhật' : 'Thêm'}</button>
                     {editingCategory && <button type="button" onClick={handleCancelEdit} className="bg-gray-300 px-4 py-2 rounded">Hủy</button>}
                 </form>
                 <ul>
                    {categories.map(c => (
                        <li key={c.id} className="flex justify-between items-center border-b py-2">
                            <span>{c.name} ({c.id})</span>
                            <div>
                                <button onClick={() => handleEditCategory(c)} className="text-blue-600 mr-2">Sửa</button>
                                <button onClick={() => handleDeleteCategory(c.id, c.name)} className="text-red-600">Xóa</button>
                            </div>
                        </li>
                    ))}
                 </ul>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <input type="text" placeholder="Tìm kiếm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="border rounded px-3 py-2 w-64" />
                    <button onClick={() => { if(isAddingProduct) handleCancelProductEdit(); else { resetProductForm(); setEditingProduct(null); setIsAddingProduct(true); } }} className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">
                        {isAddingProduct ? 'Hủy' : 'Thêm sản phẩm'}
                    </button>
                </div>
                {isAddingProduct ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <form onSubmit={handleProductSubmit} className="space-y-4">
                            <input type="text" placeholder="Tên sản phẩm" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="w-full border rounded px-3 py-2" required />
                            <input type="text" placeholder="Giá bán" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-full border rounded px-3 py-2" required />
                            <textarea placeholder="Mô tả" value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} className="w-full border rounded px-3 py-2" />
                            <div className="flex items-center gap-4">
                                <input type="file" onChange={handleProductImageUpload} />
                                {newProductImage && <img src={newProductImage} alt="Preview" className="h-16 w-16 object-cover" />}
                            </div>
                            <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded font-bold">{editingProduct ? 'Lưu' : 'Tạo'}</button>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left">Tên</th><th className="px-4 py-3 text-left">Giá</th><th className="px-4 py-3 text-left">Kho</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                            <tbody>
                                {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                                    <tr key={p.id} className="border-b">
                                        <td className="px-4 py-3">{p.name}</td>
                                        <td className="px-4 py-3">{p.price}</td>
                                        <td className="px-4 py-3">{p.stock}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEditProduct(p)} className="text-blue-600 mr-2">Sửa</button>
                                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="text-red-600">Xóa</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
        {productFeedback && <div className="text-center text-green-600 font-bold">{productFeedback}</div>}
    </div>
  );

  const renderOrderManager = () => (
      <div className="space-y-6 animate-fade-in-up">
           <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
              <input type="text" placeholder="Tìm đơn hàng..." value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} className="border rounded px-3 py-2 w-64" />
              <select value={orderFilterStatus} onChange={(e) => setOrderFilterStatus(e.target.value)} className="border rounded px-3 py-2">
                  <option value="all">Tất cả</option>
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
              </select>
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full text-sm">
                  <thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left">Mã</th><th className="px-4 py-3 text-left">Khách</th><th className="px-4 py-3 text-left">Tổng</th><th className="px-4 py-3 text-left">Trạng thái</th><th className="px-4 py-3 text-center">Thao tác</th></tr></thead>
                  <tbody>
                      {orders.filter(o => o.status === orderFilterStatus || orderFilterStatus === 'all').map(o => (
                          <tr key={o.id} className="border-b">
                              <td className="px-4 py-3">{o.id}</td>
                              <td className="px-4 py-3">{o.customerName}</td>
                              <td className="px-4 py-3">{new Intl.NumberFormat('vi-VN').format(o.totalPrice)}đ</td>
                              <td className="px-4 py-3">{o.status}</td>
                              <td className="px-4 py-3 text-center">
                                  {o.status === 'PENDING' && <button onClick={() => handleOrderStatusChange(o.id, 'CONFIRMED')} className="text-green-600 mr-2">Xác nhận</button>}
                                  <button onClick={() => handlePrintOrder(o)} className="text-gray-600"><Icons.Printer className="w-4 h-4" /></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderInventoryManager = () => (
      <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg shadow-md">
               <h3 className="font-bold mb-4">Nhập/Xuất Kho</h3>
               <form onSubmit={handleInventorySubmit} className="space-y-4">
                   <select value={selectedProductForInventory} onChange={(e) => setSelectedProductForInventory(e.target.value)} className="w-full border rounded px-3 py-2">
                       <option value="">Chọn sản phẩm</option>
                       {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                   <input type="number" value={inventoryQuantity} onChange={(e) => setInventoryQuantity(e.target.value)} placeholder="Số lượng" className="w-full border rounded px-3 py-2" />
                   <select value={inventoryType} onChange={(e) => setInventoryType(e.target.value as any)} className="w-full border rounded px-3 py-2">
                       <option value="IMPORT">Nhập</option>
                       <option value="EXPORT">Xuất</option>
                   </select>
                   <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">Thực hiện</button>
               </form>
               {inventoryFeedback && <p className="text-center mt-2">{inventoryFeedback}</p>}
           </div>
      </div>
  );

  const renderCustomerManager = () => (
      <div className="space-y-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
              <input type="text" placeholder="Tìm khách..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="border rounded px-3 py-2 w-full" />
          </div>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
               <table className="min-w-full text-sm">
                  <thead className="bg-gray-100"><tr><th className="px-4 py-3 text-left">Tên</th><th className="px-4 py-3 text-left">SĐT</th><th className="px-4 py-3 text-right">Thao tác</th></tr></thead>
                  <tbody>
                      {customers.filter(c => c.fullName.includes(customerSearch)).map(c => (
                          <tr key={c.id} className="border-b">
                              <td className="px-4 py-3">{c.fullName}</td>
                              <td className="px-4 py-3">{c.phoneNumber}</td>
                              <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleEditCustomer(c)} className="text-blue-600 mr-2">Sửa</button>
                                  <button onClick={() => handleDeleteCustomer(c.id, c.fullName)} className="text-red-600">Xóa</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
               </table>
          </div>
          {isEditingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white p-6 rounded w-full max-w-md">
                      <h3 className="font-bold mb-4">Sửa Khách hàng</h3>
                      <input value={editCustName} onChange={e => setEditCustName(e.target.value)} className="w-full border rounded px-3 py-2 mb-2" />
                      <input value={editCustPhone} onChange={e => setEditCustPhone(e.target.value)} className="w-full border rounded px-3 py-2 mb-2" />
                      <div className="flex justify-end gap-2">
                          <button onClick={() => setIsEditingCustomer(false)} className="bg-gray-200 px-4 py-2 rounded">Hủy</button>
                          <button onClick={handleSaveCustomer} className="bg-[#D4AF37] text-white px-4 py-2 rounded">Lưu</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  const renderAboutPageEditor = () => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        {aboutContent && aboutSettings ? (
            <form onSubmit={handleAboutSubmit} className="space-y-4">
                <input type="text" value={aboutContent.heroTitle} onChange={(e) => handleAboutContentChange('heroTitle', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Title" />
                <textarea value={aboutContent.welcomeText} onChange={(e) => handleAboutContentChange('welcomeText', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Text" />
                <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded">Lưu</button>
                {aboutFeedback && <p className="text-center text-green-600">{aboutFeedback}</p>}
            </form>
        ) : <p>Loading...</p>}
    </div>
  );

  const renderHomePageSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md">
           {homeSettings ? (
               <form onSubmit={handleHomePageSubmit} className="space-y-4">
                   <input type="text" value={homeSettings.headlineText} onChange={(e) => handleHomePageSettingsChange('headlineText', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Headline" />
                   <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded">Lưu</button>
                   {homeFeedback && <p className="text-center text-green-600">{homeFeedback}</p>}
               </form>
           ) : <p>Loading...</p>}
      </div>
  );

  const renderHeaderSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md">
           {headerSettings ? (
                <form onSubmit={handleHeaderSubmit} className="space-y-4">
                    <input type="text" value={headerSettings.brandName} onChange={(e) => handleHeaderSettingsChange('brandName', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Brand Name" />
                    <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded">Lưu</button>
                    {headerFeedback && <p className="text-center text-green-600">{headerFeedback}</p>}
                </form>
           ) : <p>Loading...</p>}
      </div>
  );

  const renderSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Cài đặt Chung</h3>
          
          <div className="grid grid-cols-1 gap-8">
              {/* 1. PASSWORD CHANGE (SELF) */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <Icons.Lock className="w-5 h-5" /> Đổi mật khẩu
                  </h4>
                  {!showPasswordForm ? (
                      <button onClick={() => setShowPasswordForm(true)} className="text-blue-600 hover:underline text-sm">Thay đổi mật khẩu đăng nhập của bạn</button>
                  ) : (
                      <form onSubmit={handleChangePassword} className="max-w-md space-y-3 bg-gray-50 p-4 rounded border">
                          <input type="password" placeholder="Mật khẩu cũ" value={passwordData.old} onChange={e => setPasswordData({...passwordData, old: e.target.value})} className="w-full border rounded px-3 py-2" required />
                          <input type="password" placeholder="Mật khẩu mới" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="w-full border rounded px-3 py-2" required />
                          <input type="password" placeholder="Xác nhận mật khẩu mới" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full border rounded px-3 py-2" required />
                          <div className="flex gap-2">
                              <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded text-sm font-bold">Lưu thay đổi</button>
                              <button type="button" onClick={() => setShowPasswordForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm">Hủy</button>
                          </div>
                      </form>
                  )}
              </div>

              {/* 2. SHIPPING FEES */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <Icons.Truck className="w-5 h-5" /> Phí vận chuyển
                  </h4>
                  <form onSubmit={handleShippingSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Phí cơ bản</label>
                          <input type="number" value={shippingSettings.baseFee} onChange={e => handleShippingSettingsChange('baseFee', parseInt(e.target.value))} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">Mức Freeship (Đơn hàng &gt;)</label>
                          <input type="number" value={shippingSettings.freeShipThreshold} onChange={e => handleShippingSettingsChange('freeShipThreshold', parseInt(e.target.value))} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-4 py-2 rounded border w-full">
                              <input type="checkbox" checked={shippingSettings.enabled} onChange={e => handleShippingSettingsChange('enabled', e.target.checked)} />
                              <span className="text-sm font-medium">Bật tính phí ship</span>
                          </label>
                      </div>
                      <div className="md:col-span-3">
                          <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded text-sm font-bold">Lưu cấu hình Ship</button>
                      </div>
                  </form>
              </div>

              {/* 3. SUB-ADMIN MANAGEMENT */}
              {currentAdminUser?.role === 'MASTER' && (
                  <div className="border-t pt-6">
                      <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <Icons.Users className="w-5 h-5" /> Quản lý Phân quyền (Sub-Admin)
                      </h4>
                      <form onSubmit={isEditingAdmin ? handleUpdateAdminUser : handleCreateAdminUser} className="bg-gray-50 p-4 rounded-lg border mb-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <input type="text" placeholder="Username" value={adminUserForm.username} onChange={e => setAdminUserForm({...adminUserForm, username: e.target.value})} className="border rounded px-3 py-2" disabled={!!isEditingAdmin} required />
                              <input type="text" placeholder="Họ tên" value={adminUserForm.fullname} onChange={e => setAdminUserForm({...adminUserForm, fullname: e.target.value})} className="border rounded px-3 py-2" required />
                              <input type="password" placeholder={isEditingAdmin ? "Mật khẩu mới (để trống nếu không đổi)" : "Mật khẩu"} value={adminUserForm.password} onChange={e => setAdminUserForm({...adminUserForm, password: e.target.value})} className="border rounded px-3 py-2" required={!isEditingAdmin} />
                          </div>
                          <div className="mb-4">
                              <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Chọn quyền hạn:</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <label className="flex items-center gap-2 text-sm bg-white border px-2 py-1 rounded">
                                      <input type="checkbox" checked={adminUserForm.permissions.includes('ALL')} onChange={() => togglePermission('ALL')} className="text-[#D4AF37]" />
                                      <span className="font-bold">Toàn quyền (Admin)</span>
                                  </label>
                                  {PERMISSION_GROUPS.flatMap(g => g.options).map(opt => (
                                      <label key={opt.id} className={`flex items-center gap-2 text-sm bg-white border px-2 py-1 rounded ${adminUserForm.permissions.includes('ALL') ? 'opacity-50' : ''}`}>
                                          <input type="checkbox" checked={adminUserForm.permissions.includes(opt.id)} onChange={() => togglePermission(opt.id)} disabled={adminUserForm.permissions.includes('ALL')} />
                                          {opt.label}
                                      </label>
                                  ))}
                              </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                              {isEditingAdmin && <button type="button" onClick={() => { setIsEditingAdmin(null); setAdminUserForm({username: '', password: '', fullname: '', permissions: []}) }} className="bg-gray-300 text-gray-700 px-4 py-2 rounded font-bold">Hủy</button>}
                              <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded font-bold">{isEditingAdmin ? 'Cập nhật' : 'Thêm mới'}</button>
                          </div>
                      </form>
                      <div className="overflow-x-auto border rounded-lg">
                          <table className="min-w-full text-sm text-left">
                              <thead className="bg-gray-100 text-gray-700 uppercase font-bold text-xs">
                                  <tr>
                                      <th className="px-4 py-2">User</th>
                                      <th className="px-4 py-2">Tên</th>
                                      <th className="px-4 py-2">Quyền</th>
                                      <th className="px-4 py-2">2FA</th>
                                      <th className="px-4 py-2 text-right">Thao tác</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {adminUsers.filter(u => u.role !== 'MASTER').map(u => (
                                      <tr key={u.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-2 font-medium">{u.username}</td>
                                          <td className="px-4 py-2">{u.fullname}</td>
                                          <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{u.permissions.includes('ALL') ? 'Toàn quyền' : u.permissions.join(', ')}</td>
                                          <td className="px-4 py-2">
                                              {u.is_totp_enabled ? (
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-green-600 text-xs font-bold">Bật</span>
                                                      <button onClick={() => handleResetUser2FA(u.id, u.username)} className="text-[10px] text-red-500 border border-red-200 px-1 rounded hover:bg-red-50">Reset</button>
                                                  </div>
                                              ) : <span className="text-gray-400 text-xs">Tắt</span>}
                                          </td>
                                          <td className="px-4 py-2 text-right space-x-2">
                                              <button onClick={() => prepareEditAdmin(u)} className="text-blue-600 font-bold text-xs">Sửa</button>
                                              <button onClick={() => handleDeleteAdminUser(u.id)} className="text-red-600 font-bold text-xs">Xóa</button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* 4. DATA MANAGEMENT (BACKUP/RESTORE) */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <Icons.Database className="w-5 h-5" /> Quản lý Dữ liệu
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded bg-blue-50 text-center">
                          <h5 className="font-bold text-blue-800 mb-2">Sao lưu (Backup)</h5>
                          <p className="text-xs text-blue-600 mb-3">Tải xuống toàn bộ dữ liệu (Sản phẩm, Đơn hàng, Cấu hình...)</p>
                          <button onClick={handleBackup} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold w-full hover:bg-blue-700 flex items-center justify-center gap-2">
                              <Icons.Save className="w-4 h-4" /> Tải về máy
                          </button>
                      </div>
                      <div className="p-4 border rounded bg-green-50 text-center">
                          <h5 className="font-bold text-green-800 mb-2">Khôi phục (Restore)</h5>
                          <p className="text-xs text-green-600 mb-3">Tải lên file backup (.json) để khôi phục dữ liệu.</p>
                          <label className="bg-green-600 text-white px-4 py-2 rounded text-sm font-bold w-full hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer">
                              <Icons.RotateCcw className="w-4 h-4" /> Chọn File
                              <input type="file" className="hidden" accept=".json" onChange={handleRestore} />
                          </label>
                      </div>
                      <div className="p-4 border rounded bg-red-50 text-center">
                          <h5 className="font-bold text-red-800 mb-2">Reset Dữ liệu</h5>
                          <p className="text-xs text-red-600 mb-3">Xóa dữ liệu để bắt đầu lại (Cẩn thận).</p>
                          <div className="flex gap-1">
                              <button onClick={() => handleFactoryReset('ORDERS')} className="flex-1 bg-red-100 text-red-700 text-xs font-bold py-2 rounded border border-red-200 hover:bg-red-200">Xóa Đơn hàng</button>
                              <button onClick={() => handleFactoryReset('FULL')} className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded hover:bg-red-700">Xóa Toàn bộ</button>
                          </div>
                      </div>
                  </div>
              </div>

              {/* 5. LOGS (WITH USER COLUMN) */}
              <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                          <Icons.Activity className="w-5 h-5" /> Nhật ký hoạt động
                      </h4>
                      <button onClick={() => fetchAdminLoginLogs().then(logs => logs && setAdminLogs(logs))} className="text-blue-600 text-sm hover:underline">Làm mới</button>
                  </div>
                  <div className="border rounded overflow-hidden max-h-60 overflow-y-auto">
                      <table className="min-w-full text-xs text-left">
                          <thead className="bg-gray-100 font-bold sticky top-0">
                              <tr>
                                  <th className="px-4 py-2">Thời gian</th>
                                  <th className="px-4 py-2">Người dùng</th>
                                  <th className="px-4 py-2">Hành động</th>
                                  <th className="px-4 py-2">IP</th>
                                  <th className="px-4 py-2">Trạng thái</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y">
                              {adminLogs.map(log => (
                                  <tr key={log.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-2">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                      <td className="px-4 py-2 font-bold text-gray-800">{log.username}</td>
                                      <td className="px-4 py-2">{log.method === 'GOOGLE_AUTH' ? 'Đăng nhập (2FA)' : 'Đăng nhập (Password)'}</td>
                                      <td className="px-4 py-2 font-mono text-gray-500">{log.ip_address}</td>
                                      <td className="px-4 py-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                              {log.status}
                                          </span>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* 6. 2FA (PERSONAL) */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <Icons.ShieldCheck className="w-5 h-5" /> Bảo mật 2 lớp (Của bạn)
                  </h4>
                  {(currentAdminUser ? currentAdminUser.is_totp_enabled : totpEnabled) ? (
                      <div className="bg-green-50 border border-green-200 p-4 rounded flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700 font-bold">
                              <Icons.Check className="w-5 h-5" /> Đã kích hoạt bảo mật
                          </div>
                          <button onClick={handleDisableTotp} className="text-red-600 text-sm hover:underline font-bold">Tắt</button>
                      </div>
                  ) : (
                      <div className="bg-gray-50 border p-4 rounded">
                          {!showTotpSetup ? (
                              <button onClick={handleStartTotpSetup} className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">Kích hoạt ngay</button>
                          ) : (
                              <div className="flex flex-col md:flex-row gap-6 animate-fade-in-up">
                                  <div className="bg-white p-2 border rounded inline-block">
                                      <QRCodeSVG value={tempTotpUri} size={140} />
                                  </div>
                                  <div className="space-y-3">
                                      <p className="text-sm">Quét mã QR bằng Google Authenticator và nhập mã 6 số:</p>
                                      <form onSubmit={handleVerifyAndEnableTotp} className="flex gap-2">
                                          <input type="text" className="border rounded px-3 py-2 w-32 text-center tracking-widest font-bold" maxLength={6} value={verificationCode} onChange={e => setVerificationCode(e.target.value)} required />
                                          <button className="bg-[#00695C] text-white px-4 py-2 rounded font-bold">Xác nhận</button>
                                      </form>
                                      <button onClick={() => setShowTotpSetup(false)} className="text-sm text-gray-500 hover:underline">Hủy</button>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
          {settingsFeedback && (
              <div className={`mt-6 p-3 rounded text-center font-bold animate-pulse ${settingsFeedback.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{settingsFeedback}</div>
          )}
      </div>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return renderDashboard(); 
      case 'products': return renderProductManager();
      case 'orders': return renderOrderManager();
      case 'inventory': return renderInventoryManager();
      case 'customers': return renderCustomerManager();
      case 'about': return renderAboutPageEditor();
      case 'home': return renderHomePageSettings();
      case 'header': return renderHeaderSettings();
      case 'settings': return renderSettings();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row">
      <aside className="bg-[#111827] text-white w-full md:w-64 flex-shrink-0">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <div className="bg-[#D4AF37] p-2 rounded-lg">
             <Icons.BarChart2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold font-serif tracking-wider">Sigma Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
           {hasPermission('dashboard') && (
               <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icons.BarChart2 className="w-5 h-5" /> Tổng quan
              </button>
           )}
           {hasPermission('products') && (
               <button 
                onClick={() => setActiveTab('products')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icons.Package className="w-5 h-5" /> Sản phẩm
              </button>
           )}
           {hasPermission('orders') && (
              <button 
                onClick={() => setActiveTab('orders')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icons.ClipboardList className="w-5 h-5" /> Đơn hàng
              </button>
           )}
           {hasPermission('inventory') && (
              <button 
                onClick={() => setActiveTab('inventory')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icons.BarChart2 className="w-5 h-5" /> Kho hàng
              </button>
           )}
           {hasPermission('customers') && (
               <button 
                onClick={() => setActiveTab('customers')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
              >
                <Icons.Users className="w-5 h-5" /> Khách hàng
              </button>
           )}
          
          <div className="pt-4 mt-4 border-t border-gray-700">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Giao diện</p>
            {hasPermission('home') && (
                <button 
                    onClick={() => setActiveTab('home')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                    <Icons.Edit className="w-5 h-5" /> Trang chủ
                </button>
            )}
            {hasPermission('header') && (
                 <button 
                    onClick={() => setActiveTab('header')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'header' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                    <Icons.Layers className="w-5 h-5" /> Header/Menu
                </button>
            )}
            {hasPermission('about') && (
                 <button 
                    onClick={() => setActiveTab('about')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'about' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                    <Icons.Edit className="w-5 h-5" /> Giới thiệu
                </button>
            )}
            {hasPermission('settings') && (
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                    <Icons.User className="w-5 h-5" /> Cài đặt chung
                </button>
            )}
          </div>
        </nav>
        
        <div className="p-4 mt-auto border-t border-gray-700">
             <a href="#/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 px-4 text-sm">
                ← Về Cửa hàng
             </a>
             <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm">
                Đăng xuất
             </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 font-serif">
                {activeTab === 'dashboard' ? 'Tổng quan Hệ thống' : 
                 activeTab === 'products' ? 'Quản lý Sản phẩm' : 
                 activeTab === 'orders' ? 'Quản lý Đơn hàng' : 
                 activeTab === 'inventory' ? 'Nhập xuất Kho' : 
                 activeTab === 'customers' ? 'Danh sách Khách hàng' :
                 activeTab === 'about' ? 'Chỉnh sửa Giới thiệu' :
                 activeTab === 'home' ? 'Cấu hình Trang chủ' :
                 activeTab === 'header' ? 'Cấu hình Menu/Logo' : 'Cài đặt'}
            </h2>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <span className="text-sm font-bold text-gray-800 block">{currentAdminUser ? currentAdminUser.fullname : 'Master Admin'}</span>
                    <span className="text-xs text-gray-500">{new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    {currentAdminUser ? currentAdminUser.username.charAt(0).toUpperCase() : 'A'}
                </div>
            </div>
        </header>

        {renderContent()}
      </main>

      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdminPage;
