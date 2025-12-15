
import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import type { Product, AboutPageContent, HomePageSettings, AboutPageSettings, HeaderSettings, InventoryTransaction, Category, Order, SocialSettings, Customer, AdminLoginLog, BankSettings } from '../types';
import { getProducts, addProduct, deleteProduct, updateProductStock, updateProduct } from '../utils/productStorage';
import { getAboutPageContent, updateAboutPageContent } from '../utils/aboutPageStorage';
import { 
    getAdminEmails, addAdminEmail, removeAdminEmail, getPrimaryAdminEmail,
    isTotpEnabled, generateTotpSecret, getTotpUri, enableTotp, disableTotp, verifyTempTotpToken, verifyTotpToken
} from '../utils/adminSettingsStorage';
import { getHomePageSettings, updateHomePageSettings } from '../utils/homePageSettingsStorage';
import { getAboutPageSettings, updateAboutPageSettings } from '../utils/aboutPageSettingsStorage';
import { getHeaderSettings, updateHeaderSettings } from '../utils/headerSettingsStorage';
import { getTransactions, addTransaction } from '../utils/inventoryStorage';
import { getDashboardMetrics, type DashboardData } from '../utils/analytics';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../utils/categoryStorage';
import { getOrders, updateOrderStatus } from '../utils/orderStorage';
import { getSocialSettings, updateSocialSettings } from '../utils/socialSettingsStorage';
import { getCustomers, updateCustomer, deleteCustomer } from '../utils/customerStorage';
import { getBankSettings, updateBankSettings } from '../utils/bankSettingsStorage';
import { sendEmail, fetchAdminLoginLogs } from '../utils/apiClient';
import { VIET_QR_BANKS } from '../utils/constants';


const ImagePlus: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12H3"/><path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="12" x2="12" y1="8" y2="16"/><line x1="8" x2="16" y1="12" y2="12"/></svg>
);

const Trash2Icon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);

const EditIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);

const PackageIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
);

const BarChart2: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
);

const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const FilterIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
);

const LayersIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
);

const LightningIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({className, style}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} style={style}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ClipboardListIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
);

const UserIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const UsersIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

const ChevronLeftIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 18l-6-6 6-6"/></svg>
);

const ChevronRightIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18l6-6-6-6"/></svg>
);

const CheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);

const TruckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
);

const XCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);

const ShieldCheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

const ActivityIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

const CreditCardIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);

const DollarSignIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

const PrinterIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
);


const AdminPage: React.FC = () => {
  // General State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'about' | 'home' | 'header' | 'settings'>('dashboard');

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
  
  // 2FA State
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


  const refreshProducts = useCallback(() => {
    setProducts(getProducts());
  }, []);

  const refreshCategories = useCallback(() => {
    setCategories(getCategories());
  }, []);

  const refreshOrders = useCallback(() => {
      setOrders(getOrders());
  }, []);

  const refreshCustomers = useCallback(() => {
      setCustomers(getCustomers());
  }, []);
  
  const refreshAboutPage = useCallback(() => {
    setAboutContent(getAboutPageContent());
    setAboutSettings(getAboutPageSettings());
  }, []);

  const refreshSettings = useCallback(() => {
    setAdminEmails(getAdminEmails());
    setSocialSettings(getSocialSettings());
    setTotpEnabled(isTotpEnabled());
    setBankSettings(getBankSettings());
    
    // Fetch Logs
    fetchAdminLoginLogs().then(logs => {
        if (logs) setAdminLogs(logs);
    });
  }, []);

  const refreshHomeSettings = useCallback(() => {
    setHomeSettings(getHomePageSettings());
  }, []);
  
  const refreshHeaderSettings = useCallback(() => {
    setHeaderSettings(getHeaderSettings());
  }, []);

  const refreshInventory = useCallback(() => {
    setTransactions(getTransactions());
  }, []);

  const refreshDashboard = useCallback(() => {
    setDashboardData(getDashboardMetrics());
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

  // Reset pagination when search or filter changes
  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearch, orderFilterStatus]);


  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    window.location.hash = '/';
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
      const tzOffset = date.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      return localISOTime;
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
      setNewProductSizes(product.sizes ? product.sizes.join(', ') : ''); // Load sizes
      setNewProductColors(product.colors ? product.colors.join(', ') : ''); // Load colors
      
      setNewProductFlashSaleStartTime(product.flashSaleStartTime ? toLocalISOString(new Date(product.flashSaleStartTime)) : '');
      setNewProductFlashSaleEndTime(product.flashSaleEndTime ? toLocalISOString(new Date(product.flashSaleEndTime)) : '');

      setIsAddingProduct(true);
  };

  const resetProductForm = () => {
      setNewProductName('');
      setNewProductPrice('');
      setNewProductImportPrice('');
      setNewProductSku('');
      setNewProductCategory('');
      setNewProductBrand('');
      setNewProductStatus('active');
      setNewProductDescription('');
      setNewProductImage(null);
      setNewProductIsFlashSale(false);
      setNewProductSalePrice('');
      setNewProductFlashSaleStartTime('');
      setNewProductFlashSaleEndTime('');
      setNewProductSizes(''); 
      setNewProductColors('');
  };

  const handleCancelProductEdit = () => {
      setIsAddingProduct(false);
      setEditingProduct(null);
      resetProductForm();
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductDescription || !newProductImage) {
      setProductFeedback('Vui lòng điền đầy đủ tất cả các trường và tải lên hình ảnh.');
      return;
    }
    
    if (newProductIsFlashSale && !newProductSalePrice) {
        setProductFeedback('Vui lòng nhập giá khuyến mãi cho Flash Sale.');
        return;
    }
    
    const commonData = {
      name: newProductName,
      price: newProductPrice,
      importPrice: newProductImportPrice || '0₫',
      description: newProductDescription,
      imageUrl: newProductImage,
      sku: newProductSku || `GEN-${Date.now()}`,
      brand: newProductBrand || 'Sigma Vie',
      category: newProductCategory || (categories.length > 0 ? categories[0].name : 'Chung'),
      status: newProductStatus,
      isFlashSale: newProductIsFlashSale,
      salePrice: newProductSalePrice,
      flashSaleStartTime: newProductFlashSaleStartTime ? new Date(newProductFlashSaleStartTime).getTime() : undefined,
      flashSaleEndTime: newProductFlashSaleEndTime ? new Date(newProductFlashSaleEndTime).getTime() : undefined,
      sizes: newProductSizes ? newProductSizes.split(',').map(s => s.trim()).filter(s => s) : [],
      colors: newProductColors ? newProductColors.split(',').map(s => s.trim()).filter(s => s) : []
    };

    if (editingProduct) {
        // Update existing product
        updateProduct({
            ...editingProduct,
            ...commonData,
            stock: editingProduct.stock // Preserve stock
        });
        setProductFeedback('Cập nhật sản phẩm thành công!');
    } else {
        // Add new product
        addProduct({
            ...commonData,
            stock: 0 // Initial stock is 0
        });
        setProductFeedback('Thêm sản phẩm thành công!');
    }
    
    refreshProducts();

    // Reset form
    handleCancelProductEdit();
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
    
    setTimeout(() => setProductFeedback(''), 3000);
  };
  
  const handleDeleteProduct = (productId: number, productName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}" không?`)) {
      deleteProduct(productId);
      setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
      if (editingProduct?.id === productId) {
          handleCancelProductEdit();
      }
      setProductFeedback(`Đã xóa sản phẩm "${productName}".`);
      setTimeout(() => setProductFeedback(''), 3000);
    }
  };

  // Category Handlers
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName) {
        if (editingCategory) {
            // Update existing
            updateCategory({ id: editingCategory.id, name: newCategoryName, description: newCategoryDesc });
            setProductFeedback('Đã cập nhật danh mục.');
        } else {
            // Add new
            addCategory({ name: newCategoryName, description: newCategoryDesc });
            setProductFeedback('Thêm danh mục thành công.');
        }
        
        // Reset form
        setNewCategoryName('');
        setNewCategoryDesc('');
        setEditingCategory(null);
        refreshCategories();
        setTimeout(() => setProductFeedback(''), 3000);
    }
  };

  const handleEditCategory = (category: Category) => {
      setEditingCategory(category);
      setNewCategoryName(category.name);
      setNewCategoryDesc(category.description || '');
  };

  const handleCancelEdit = () => {
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryDesc('');
  }

  const handleDeleteCategory = (id: string, name: string) => {
      if (window.confirm(`Bạn có chắc muốn xóa danh mục "${name}"? Sản phẩm thuộc danh mục này sẽ không bị xóa.`)) {
          deleteCategory(id);
          refreshCategories();
          if (editingCategory?.id === id) {
              handleCancelEdit();
          }
      }
  };

  // Order Handlers
  const handleOrderStatusChange = (orderId: string, newStatus: Order['status']) => {
      updateOrderStatus(orderId, newStatus);
      refreshOrders();
      refreshProducts(); // Refresh products immediately to reflect stock changes
      refreshInventory(); // Refresh inventory history
  };

  // Printer Handler (NEW)
  const handlePrintOrder = (order: Order) => {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (!printWindow) return;

      const storeName = 'Sigma Vie Store'; 
      const storePhone = '0912.345.678';
      const storeAddress = 'Hà Nội, Việt Nam';

      const productUrl = `${window.location.origin}/?product=${order.productId}`;
      
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(productUrl)}`;

      const shippingFee = order.shippingFee || 0;
      const subtotal = order.totalPrice - shippingFee;

      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Hóa đơn ${order.id}</title>
            <style>
                body { font-family: 'Times New Roman', sans-serif; padding: 20px; color: #000; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                .header p { margin: 5px 0; font-size: 14px; }
                .info-section { margin-bottom: 20px; display: flex; justify-content: space-between; }
                .box { border: 1px solid #000; padding: 10px; width: 48%; }
                .box h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                .order-details { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .order-details th, .order-details td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
                .total-section { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; font-style: italic; }
                .qr-section { text-align: center; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; }
                
                @media print {
                    @page { margin: 0.5cm; }
                    body { margin: 0; }
                    .box { width: 45%; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${storeName.toUpperCase()}</h1>
                <p>Phiếu Giao Hàng / Hóa Đơn</p>
                <p>Mã đơn: <strong>${order.id}</strong> | Ngày: ${new Date(order.timestamp).toLocaleDateString('vi-VN')}</p>
            </div>

            <div class="info-section">
                <div class="box">
                    <h3>NGƯỜI GỬI</h3>
                    <p><strong>${storeName}</strong></p>
                    <p>SĐT: ${storePhone}</p>
                    <p>Đ/C: ${storeAddress}</p>
                </div>
                <div class="box">
                    <h3>NGƯỜI NHẬN</h3>
                    <p><strong>${order.customerName}</strong></p>
                    <p>SĐT: <strong>${order.customerContact}</strong></p>
                    <p>Đ/C: ${order.customerAddress}</p>
                </div>
            </div>

            <table class="order-details">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>Phân loại</th>
                        <th>SL</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${order.productName}</td>
                        <td>
                            ${order.productSize ? `Size: ${order.productSize}` : ''} 
                            ${order.productColor ? ` | Màu: ${order.productColor}` : ''}
                            ${!order.productSize && !order.productColor ? '-' : ''}
                        </td>
                        <td>${order.quantity}</td>
                        <td>${new Intl.NumberFormat('vi-VN').format(subtotal / order.quantity)}đ</td>
                        <td>${new Intl.NumberFormat('vi-VN').format(subtotal)}đ</td>
                    </tr>
                </tbody>
            </table>

            <div class="total-section">
                <p>Tạm tính: ${new Intl.NumberFormat('vi-VN').format(subtotal)}đ</p>
                <p>Phí vận chuyển: ${shippingFee === 0 ? '0đ (Miễn phí)' : new Intl.NumberFormat('vi-VN').format(shippingFee) + 'đ'}</p>
                <p>Tổng thu (COD): ${order.paymentMethod === 'COD' ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice) : '0₫ (Đã chuyển khoản)'}</p>
                ${order.paymentMethod === 'BANK_TRANSFER' ? '<p style="font-size: 12px; font-weight: normal;">(Khách đã thanh toán qua Ngân hàng)</p>' : ''}
            </div>

            <div class="qr-section">
                <p>Quét mã để mua thêm sản phẩm này:</p>
                <img src="${qrImageUrl}" alt="QR Code Sản phẩm" width="100" height="100" />
            </div>

            <div class="footer">
                <p>Cảm ơn quý khách đã mua hàng tại ${storeName}!</p>
                <p>Vui lòng quay video khi mở hàng để được hỗ trợ tốt nhất.</p>
            </div>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
          printWindow.print();
      }, 500);
  };

  // Customer Handlers
  const handleEditCustomer = (customer: Customer) => {
      setEditingCustomer(customer);
      setEditCustName(customer.fullName);
      setEditCustEmail(customer.email || '');
      setEditCustPhone(customer.phoneNumber || '');
      setEditCustAddress(customer.address || '');
      setIsEditingCustomer(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
      if(window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"? Hành động này không thể hoàn tác.`)) {
          deleteCustomer(id);
          refreshCustomers();
          setCustomerFeedback(`Đã xóa khách hàng ${name}.`);
          setTimeout(() => setCustomerFeedback(''), 3000);
      }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingCustomer) {
          updateCustomer({
              ...editingCustomer,
              fullName: editCustName,
              email: editCustEmail || undefined,
              phoneNumber: editCustPhone || undefined,
              address: editCustAddress
          });
          setCustomerFeedback('Cập nhật thông tin khách hàng thành công.');
          setIsEditingCustomer(false);
          setEditingCustomer(null);
          refreshCustomers();
          setTimeout(() => setCustomerFeedback(''), 3000);
      }
  }

  const handleInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForInventory || !inventoryQuantity) {
        setInventoryFeedback('Vui lòng chọn sản phẩm và nhập số lượng.');
        return;
    }

    const productId = parseInt(selectedProductForInventory);
    const qty = parseInt(inventoryQuantity);
    const product = products.find(p => p.id === productId);

    if (!product) return;
    if (qty <= 0) {
        setInventoryFeedback('Số lượng phải lớn hơn 0.');
        return;
    }
    
    // Check if product requires size/color
    if (product.sizes && product.sizes.length > 0 && !inventorySize) {
        setInventoryFeedback('Vui lòng chọn Size cho sản phẩm này.');
        return;
    }
    if (product.colors && product.colors.length > 0 && !inventoryColor) {
        setInventoryFeedback('Vui lòng chọn Màu cho sản phẩm này.');
        return;
    }

    const change = inventoryType === 'IMPORT' ? qty : -qty;
    
    // Check for stock availability on export (Variant Aware)
    let currentStock = product.stock;
    if (inventorySize || inventoryColor) {
        const variant = product.variants?.find(v => 
            (v.size === inventorySize || (!v.size && !inventorySize)) && 
            (v.color === inventoryColor || (!v.color && !inventoryColor))
        );
        currentStock = variant ? variant.stock : 0;
    }

    if (inventoryType === 'EXPORT' && currentStock < qty) {
         setInventoryFeedback(`Lỗi: Tồn kho hiện tại (${currentStock}) không đủ để xuất ${qty}.`);
         return;
    }

    // Update with size/color
    const success = updateProductStock(productId, change, inventorySize, inventoryColor);

    if (success) {
        // Construct Note
        let noteDetails = inventoryNote;
        if(inventorySize) noteDetails += ` [Size: ${inventorySize}]`;
        if(inventoryColor) noteDetails += ` [Màu: ${inventoryColor}]`;

        addTransaction({
            productId,
            productName: product.name,
            type: inventoryType,
            quantity: qty,
            note: noteDetails,
            selectedSize: inventorySize,
            selectedColor: inventoryColor
        });
        
        refreshProducts();
        refreshInventory();
        setInventoryFeedback(`Thành công: ${inventoryType === 'IMPORT' ? 'Nhập' : 'Xuất'} ${qty} sản phẩm.`);
        setInventoryQuantity('');
        setInventoryNote('');
        setTimeout(() => setInventoryFeedback(''), 3000);
    } else {
        setInventoryFeedback('Đã xảy ra lỗi khi cập nhật tồn kho.');
    }
  };
  
  const handleAboutContentChange = (field: keyof AboutPageContent, value: string) => {
    if (aboutContent) {
      setAboutContent({ ...aboutContent, [field]: value });
    }
  };
  
  const handleAboutSettingsChange = (field: keyof AboutPageSettings, value: string) => {
    if(aboutSettings) {
        setAboutSettings({ ...aboutSettings, [field]: value });
    }
  };

  const handleAboutImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof AboutPageContent) => {
    const file = e.target.files?.[0];
    if (file && aboutContent) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAboutContent({ ...aboutContent, [field]: reader.result as string });
      };
      reader.onerror = () => {
          setAboutFeedback('Lỗi: Không thể đọc file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAboutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aboutContent && aboutSettings) {
      updateAboutPageContent(aboutContent);
      updateAboutPageSettings(aboutSettings);
      setAboutFeedback('Đã lưu cài đặt trang Giới thiệu thành công!');
      setTimeout(() => setAboutFeedback(''), 3000);
    }
  };
  
   const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminEmail) {
        addAdminEmail(newAdminEmail);
        setNewAdminEmail('');
        refreshSettings();
        setSettingsFeedback(`Đã thêm email ${newAdminEmail} thành công!`);
        setTimeout(() => setSettingsFeedback(''), 3000);
    }
  };

  const handleRemoveEmail = (email: string) => {
      removeAdminEmail(email);
      refreshSettings();
      setSettingsFeedback(`Đã xóa email ${email}.`);
      setTimeout(() => setSettingsFeedback(''), 3000);
  }

  // TOTP Handlers
  const handleStartTotpSetup = () => {
      const secret = generateTotpSecret();
      setTempTotpSecret(secret);
      setTempTotpUri(getTotpUri(secret));
      setShowTotpSetup(true);
      setVerificationCode('');
  };

  const handleVerifyAndEnableTotp = (e: React.FormEvent) => {
      e.preventDefault();
      const cleanCode = verificationCode.replace(/\s/g, '');
      console.log('Verifying TOTP code (cleaned):', cleanCode);

      if (verifyTempTotpToken(cleanCode, tempTotpSecret)) {
          enableTotp(tempTotpSecret);
          refreshSettings();
          setShowTotpSetup(false);
          setSettingsFeedback('✅ Đã bật bảo mật 2 lớp thành công! Từ giờ bạn hãy dùng app Google Authenticator để lấy mã.');
      } else {
          setSettingsFeedback('❌ Mã xác nhận không đúng. Vui lòng kiểm tra lại đồng hồ điện thoại hoặc quét lại mã QR.');
      }
      setTimeout(() => setSettingsFeedback(''), 6000);
  };

  const handleDisableTotp = () => {
      if (window.confirm('Bạn có chắc chắn muốn tắt bảo mật 2 lớp không? Tài khoản của bạn sẽ kém an toàn hơn.')) {
          disableTotp();
          refreshSettings();
          setSettingsFeedback('Đã tắt bảo mật 2 lớp.');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  // Bank Settings Handler (NEW with Security)
  const handleBankSettingsChange = (field: keyof BankSettings, value: string) => {
      if (bankSettings) {
          setBankSettings({ ...bankSettings, [field]: value });
      }
  };

  const executeBankUpdate = () => {
      if (bankSettings) {
          updateBankSettings(bankSettings);
          setSettingsFeedback('Đã cập nhật thông tin Ngân hàng thành công!');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isTotpEnabled()) {
          // If 2FA enabled, show modal
          setShowBankSecurityModal(true);
          setSecurityCode('');
      } else {
          // If not enabled, warn but allow (or force enable - here we allow with warning)
          if(confirm('Cảnh báo: Bạn chưa bật bảo mật 2 lớp. Hành động này kém an toàn. Bạn có muốn tiếp tục lưu không?')) {
              executeBankUpdate();
          }
      }
  };

  const handleVerifyBankUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (verifyTotpToken(securityCode)) {
          executeBankUpdate();
          setShowBankSecurityModal(false);
          setSecurityCode('');
      } else {
          alert('Mã xác thực không đúng! Vui lòng thử lại.');
      }
  };

  // Social Settings Handler
  const handleSocialSettingsChange = (field: keyof SocialSettings, value: string) => {
      if (socialSettings) {
          setSocialSettings({ ...socialSettings, [field]: value });
      }
  };

  const handleSocialSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (socialSettings) {
          updateSocialSettings(socialSettings);
          setSettingsFeedback('Đã cập nhật liên kết mạng xã hội!');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  const handleHomePageSettingsChange = (field: keyof HomePageSettings, value: any) => {
      if (homeSettings) {
          setHomeSettings({ ...homeSettings, [field]: value });
      }
  };

  // NEW: Handler for uploading promo images
  const handlePromoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && homeSettings) {
      if (file.size > 5 * 1024 * 1024) { // 5MB Limit check
          setHomeFeedback('Ảnh quá lớn (Max 5MB)');
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const newUrl = reader.result as string;
        const updatedUrls = [...(homeSettings.promoImageUrls || []), newUrl];
        handleHomePageSettingsChange('promoImageUrls', updatedUrls);
      };
      reader.onerror = () => {
          setHomeFeedback('Lỗi đọc file ảnh.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHomePageSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (homeSettings) {
          setHomeFeedback('Đang lưu...');
          const result = await updateHomePageSettings(homeSettings);
          
          if (result && result.success) {
              setHomeFeedback('✅ Cập nhật Trang chủ thành công trên Server!');
          } else {
              setHomeFeedback(`⚠️ Đã lưu trên máy này nhưng LỖI SERVER: ${result?.message || 'Không xác định'}. (Máy khác sẽ không thấy thay đổi)`);
          }
          setTimeout(() => setHomeFeedback(''), 5000);
      }
  };

  const handleHeaderSettingsChange = (field: keyof HeaderSettings, value: string) => {
      if (headerSettings) {
          setHeaderSettings({ ...headerSettings, [field]: value });
      }
  };

  const handleHeaderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && headerSettings) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderSettings({ ...headerSettings, logoUrl: reader.result as string });
      };
      reader.onerror = () => {
          setHeaderFeedback('Lỗi: Không thể đọc file logo.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeaderSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (headerSettings) {
          updateHeaderSettings(headerSettings);
          setHeaderFeedback('Cập nhật Header thành công!');
          setTimeout(() => setHeaderFeedback(''), 3000);
      }
  };
  
  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.location.hash = path;
  };

  const handleTestEmail = async () => {
      const email = getPrimaryAdminEmail();
      const result = await sendEmail(
          email, 
          'Kiểm tra cấu hình Email Sigma Vie', 
          '<h1>Xin chào!</h1><p>Nếu bạn nhận được email này, hệ thống gửi mail đang hoạt động tốt.</p>'
      );
      
      if(result && result.success) {
          setSettingsFeedback('Thành công: Email kiểm tra đã được gửi.');
      } else {
          setSettingsFeedback('Lỗi: Không thể gửi email. Vui lòng kiểm tra Log trên Render.');
      }
      setTimeout(() => setSettingsFeedback(''), 5000);
  };

  // --- RENDER FUNCTIONS IMPLEMENTATION ---

  const renderDashboard = () => (
      <div className="space-y-6 animate-fade-in-up">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Doanh thu hôm nay</p>
                          <p className="text-2xl font-bold text-gray-800">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardData?.totalRevenueToday || 0)}
                          </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                          <DollarSignIcon className="w-6 h-6 text-blue-600" />
                      </div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Đơn hàng mới</p>
                          <p className="text-2xl font-bold text-gray-800">{orders.filter(o => o.status === 'PENDING').length}</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                          <ClipboardListIcon className="w-6 h-6 text-green-600" />
                      </div>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Tổng sản phẩm</p>
                          <p className="text-2xl font-bold text-gray-800">{products.length}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-full">
                          <PackageIcon className="w-6 h-6 text-purple-600" />
                      </div>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Sắp hết hàng</p>
                          <p className="text-2xl font-bold text-gray-800">{dashboardData?.lowStockProducts.length || 0}</p>
                      </div>
                      <div className="bg-red-100 p-3 rounded-full">
                          <ActivityIcon className="w-6 h-6 text-red-600" />
                      </div>
                  </div>
              </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh số 7 ngày qua</h3>
                  <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dashboardData?.dailySales}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <RechartsTooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)} />
                              <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} name="Doanh thu" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Tồn kho theo sản phẩm</h3>
                   <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData?.stockData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <RechartsTooltip />
                              <Bar dataKey="value" fill="#00695C" name="Số lượng" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderProductManager = () => (
    <div className="space-y-6 animate-fade-in-up">
        {/* Toggle Category Manager */}
        <div className="flex justify-end">
             <button 
                onClick={() => setIsManagingCategories(!isManagingCategories)}
                className="text-[#00695C] border border-[#00695C] px-4 py-2 rounded hover:bg-teal-50"
            >
                {isManagingCategories ? 'Quay lại Quản lý Sản phẩm' : 'Quản lý Danh mục'}
            </button>
        </div>

        {isManagingCategories ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-bold text-gray-800 mb-4">Quản lý Danh mục</h3>
                 <form onSubmit={handleSaveCategory} className="mb-6 flex gap-4">
                     <input 
                        type="text" 
                        placeholder="Tên danh mục" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="border rounded px-3 py-2 flex-1"
                        required
                     />
                     <input 
                        type="text" 
                        placeholder="Mô tả" 
                        value={newCategoryDesc} 
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        className="border rounded px-3 py-2 flex-1"
                     />
                     <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31]">
                         {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                     </button>
                     {editingCategory && (
                         <button type="button" onClick={handleCancelEdit} className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Hủy</button>
                     )}
                 </form>

                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Tên</th>
                                <th className="px-4 py-3">Mô tả</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono">{cat.id}</td>
                                    <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                                    <td className="px-4 py-3">{cat.description}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleEditCategory(cat)} className="text-blue-600 hover:text-blue-800 mr-2"><EditIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        ) : (
            <>
                {/* Product List & Form */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm..." 
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-64"
                            />
                        </div>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border rounded-md px-3 py-2"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang bán</option>
                            <option value="draft">Nháp</option>
                            <option value="archived">Lưu trữ</option>
                        </select>
                    </div>
                    <button 
                        onClick={() => { 
                            if (isAddingProduct) {
                                handleCancelProductEdit();
                            } else {
                                resetProductForm();
                                setEditingProduct(null);
                                setIsAddingProduct(true);
                            }
                        }}
                        className="bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#b89b31]"
                    >
                        {isAddingProduct ? 'Quay lại danh sách' : 'Thêm sản phẩm'}
                    </button>
                </div>

                {isAddingProduct ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">{editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}</h3>
                        <form onSubmit={handleProductSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                                    <input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="w-full border rounded px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                    <input type="text" value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Tự động tạo nếu để trống" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán *</label>
                                    <input type="text" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-full border rounded px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá nhập (Vốn)</label>
                                    <input type="text" value={newProductImportPrice} onChange={(e) => setNewProductImportPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                                    <select value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} className="w-full border rounded px-3 py-2">
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
                                    <input type="text" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước (Size)</label>
                                        <input 
                                            type="text" 
                                            value={newProductSizes} 
                                            onChange={(e) => setNewProductSizes(e.target.value)} 
                                            className="w-full border rounded px-3 py-2" 
                                            placeholder="S, M, L (cách nhau bởi dấu phẩy)" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc (Color)</label>
                                        <input 
                                            type="text" 
                                            value={newProductColors} 
                                            onChange={(e) => setNewProductColors(e.target.value)} 
                                            className="w-full border rounded px-3 py-2" 
                                            placeholder="Đen, Trắng, Đỏ (cách nhau bởi dấu phẩy)" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                    <select value={newProductStatus} onChange={(e) => setNewProductStatus(e.target.value as any)} className="w-full border rounded px-3 py-2">
                                        <option value="active">Đang bán</option>
                                        <option value="draft">Nháp</option>
                                        <option value="archived">Lưu trữ</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* FLASH SALE SETTINGS */}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={newProductIsFlashSale} 
                                        onChange={(e) => setNewProductIsFlashSale(e.target.checked)} 
                                        className="w-4 h-4 text-red-600 rounded"
                                    />
                                    <span className="font-bold text-red-700 flex items-center gap-1"><LightningIcon className="w-4 h-4"/> Bật Flash Sale</span>
                                </label>
                                {newProductIsFlashSale && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giá khuyến mãi *</label>
                                            <input type="text" value={newProductSalePrice} onChange={(e) => setNewProductSalePrice(e.target.value)} className="w-full border rounded px-3 py-2 border-red-300" placeholder="VD: 1,500,000đ" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
                                            <input type="datetime-local" value={newProductFlashSaleStartTime} onChange={(e) => setNewProductFlashSaleStartTime(e.target.value)} className="w-full border rounded px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                                            <input type="datetime-local" value={newProductFlashSaleEndTime} onChange={(e) => setNewProductFlashSaleEndTime(e.target.value)} className="w-full border rounded px-3 py-2" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea rows={4} value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} className="w-full border rounded px-3 py-2" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm *</label>
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded inline-flex items-center">
                                        <ImagePlus className="w-4 h-4 mr-2" />
                                        <span>Chọn ảnh</span>
                                        <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                    </label>
                                    {newProductImage && (
                                        <img src={newProductImage} alt="Preview" className="h-16 w-16 object-cover rounded border" />
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={handleCancelProductEdit} className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-300">Hủy</button>
                                <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded font-bold hover:bg-[#b89b31]">{editingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="min-w-full text-sm text-left text-gray-500">
                            <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3">Sản phẩm</th>
                                    <th className="px-4 py-3">Giá</th>
                                    <th className="px-4 py-3">Tồn kho</th>
                                    <th className="px-4 py-3">Danh mục</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {products
                                    .filter(p => 
                                        (filterStatus === 'all' || p.status === filterStatus) &&
                                        (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                                    )
                                    .map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.isFlashSale ? (
                                                <div>
                                                    <span className="text-red-600 font-bold block">{product.salePrice}</span>
                                                    <span className="text-xs text-gray-400 line-through">{product.price}</span>
                                                </div>
                                            ) : (
                                                product.price
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.sizes?.length || product.colors?.length ? (
                                                <div className="text-xs">
                                                    <span className="font-bold text-[#00695C]">Tổng: {product.stock}</span>
                                                    <div className="text-gray-500 mt-1">
                                                        {product.sizes?.length > 0 && <span>{product.sizes.length} Size</span>}
                                                        {product.sizes?.length > 0 && product.colors?.length > 0 && <span>, </span>}
                                                        {product.colors?.length > 0 && <span>{product.colors.length} Màu</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock < 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {product.stock}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{product.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${product.status === 'active' ? 'bg-green-100 text-green-700' : 
                                                  product.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {product.status === 'active' ? 'Đang bán' : product.status === 'draft' ? 'Nháp' : 'Lưu trữ'}
                                            </span>
                                            {product.isFlashSale && <span className="ml-1 text-xs text-red-500 font-bold">⚡</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-800 mr-2"><EditIcon className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
        {productFeedback && (
             <div className={`mt-4 p-3 rounded text-center font-medium animate-pulse ${productFeedback.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                 {productFeedback}
             </div>
        )}
    </div>
  );

  const renderOrderManager = () => (
      <div className="space-y-6 animate-fade-in-up">
           <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
              <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm mã đơn, tên KH..." 
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-64"
                  />
              </div>
              <select 
                  value={orderFilterStatus} 
                  onChange={(e) => setOrderFilterStatus(e.target.value)}
                  className="border rounded-md px-3 py-2"
              >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="SHIPPED">Đã giao hàng</option>
                  <option value="CANCELLED">Đã hủy</option>
              </select>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                      <tr>
                          <th className="px-4 py-3">Mã Đơn</th>
                          <th className="px-4 py-3">Khách hàng</th>
                          <th className="px-4 py-3">Sản phẩm</th>
                          <th className="px-4 py-3">Tổng tiền</th>
                          <th className="px-4 py-3">Thanh toán</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                      {orders
                          .filter(order => 
                              (orderFilterStatus === 'all' || order.status === orderFilterStatus) &&
                              (order.id.toLowerCase().includes(orderSearch.toLowerCase()) || order.customerName.toLowerCase().includes(orderSearch.toLowerCase()))
                          )
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .slice((orderCurrentPage - 1) * ordersPerPage, orderCurrentPage * ordersPerPage)
                          .map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                              <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{order.customerName}</div>
                                  <div className="text-xs text-gray-400">{order.customerContact}</div>
                              </td>
                              <td className="px-4 py-3">
                                  <div>{order.productName}</div>
                                  <div className="text-xs text-gray-400">
                                    x{order.quantity}
                                    {order.productSize && ` | Size: ${order.productSize}`}
                                    {order.productColor && ` | Màu: ${order.productColor}`}
                                  </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-800">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                              </td>
                              <td className="px-4 py-3">
                                  {order.paymentMethod === 'BANK_TRANSFER' ? (
                                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-bold">Chuyển khoản</span>
                                  ) : (
                                      <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded border font-bold">COD</span>
                                  )}
                              </td>
                              <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold 
                                      ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                        order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : 
                                        order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {order.status === 'PENDING' ? 'Chờ xử lý' : 
                                       order.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                       order.status === 'SHIPPED' ? 'Đã giao' : 'Đã hủy'}
                                  </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handlePrintOrder(order)}
                                            title="In hóa đơn"
                                            className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                                        >
                                            <PrinterIcon className="w-4 h-4" />
                                        </button>
                                        {order.status === 'PENDING' && (
                                            <button 
                                                onClick={() => handleOrderStatusChange(order.id, 'CONFIRMED')}
                                                title="Xác nhận đơn hàng"
                                                className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors"
                                            >
                                                <CheckIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {order.status === 'CONFIRMED' && (
                                            <button 
                                                onClick={() => handleOrderStatusChange(order.id, 'SHIPPED')}
                                                title="Giao hàng"
                                                className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors"
                                            >
                                                <TruckIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {order.status !== 'CANCELLED' && order.status !== 'SHIPPED' && (
                                            <button 
                                                onClick={() => handleOrderStatusChange(order.id, 'CANCELLED')}
                                                title="Hủy đơn hàng"
                                                className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                            >
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                     </div>
                                </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              {/* Pagination (Simple) */}
              <div className="p-4 border-t flex justify-between items-center">
                  <span className="text-sm text-gray-500">Trang {orderCurrentPage}</span>
                  <div className="flex gap-2">
                      <button 
                          disabled={orderCurrentPage === 1}
                          onClick={() => setOrderCurrentPage(c => c - 1)}
                          className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50"
                      >
                          <ChevronLeftIcon className="w-4 h-4"/>
                      </button>
                      <button 
                          onClick={() => setOrderCurrentPage(c => c + 1)}
                          className="px-3 py-1 border rounded hover:bg-gray-100"
                      >
                          <ChevronRightIcon className="w-4 h-4"/>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderInventoryManager = () => (
      <div className="space-y-6 animate-fade-in-up">
           <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setInventoryView('stock')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${inventoryView === 'stock' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Nhập/Xuất Kho
                </button>
                <button 
                    onClick={() => setInventoryView('history')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${inventoryView === 'history' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Lịch sử Giao dịch
                </button>
           </div>

           {inventoryView === 'stock' ? (
                <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Điều chỉnh Tồn kho</h3>
                    <form onSubmit={handleInventorySubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm</label>
                            <select 
                                value={selectedProductForInventory} 
                                onChange={(e) => {
                                    setSelectedProductForInventory(e.target.value);
                                    setInventorySize('');
                                    setInventoryColor('');
                                }}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value="">-- Chọn sản phẩm --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Hiện có: {p.stock})</option>
                                ))}
                            </select>
                        </div>

                        {/* Dynamic Size/Color Selectors */}
                        {selectedProductForInventory && (() => {
                            const p = products.find(prod => prod.id === parseInt(selectedProductForInventory));
                            if (!p) return null;
                            return (
                                <div className="grid grid-cols-2 gap-4">
                                    {p.sizes && p.sizes.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước</label>
                                            <select 
                                                value={inventorySize} 
                                                onChange={(e) => setInventorySize(e.target.value)} 
                                                className="w-full border rounded px-3 py-2"
                                                required
                                            >
                                                <option value="">-- Chọn Size --</option>
                                                {p.sizes.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {p.colors && p.colors.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc</label>
                                            <select 
                                                value={inventoryColor} 
                                                onChange={(e) => setInventoryColor(e.target.value)} 
                                                className="w-full border rounded px-3 py-2"
                                                required
                                            >
                                                <option value="">-- Chọn Màu --</option>
                                                {p.colors.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                                <select 
                                    value={inventoryType} 
                                    onChange={(e) => setInventoryType(e.target.value as any)}
                                    className="w-full border rounded px-3 py-2"
                                >
                                    <option value="IMPORT">Nhập kho (+)</option>
                                    <option value="EXPORT">Xuất kho (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={inventoryQuantity}
                                    onChange={(e) => setInventoryQuantity(e.target.value)}
                                    className="w-full border rounded px-3 py-2"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                            <textarea 
                                value={inventoryNote} 
                                onChange={(e) => setInventoryNote(e.target.value)}
                                className="w-full border rounded px-3 py-2"
                                rows={2}
                            />
                        </div>
                        
                        {/* Stock Display Helper */}
                        {selectedProductForInventory && (
                             <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                 {(() => {
                                     const p = products.find(prod => prod.id === parseInt(selectedProductForInventory));
                                     if (!p) return null;
                                     
                                     let stockDisplay = p.stock;
                                     let label = 'Tổng tồn kho';
                                     
                                     if (inventorySize || inventoryColor) {
                                         const v = p.variants?.find(v => 
                                            (v.size === inventorySize || (!v.size && !inventorySize)) && 
                                            (v.color === inventoryColor || (!v.color && !inventoryColor))
                                         );
                                         stockDisplay = v ? v.stock : 0;
                                         label = `Tồn kho chi tiết`;
                                     }
                                     
                                     return <span><strong>{label}:</strong> {stockDisplay}</span>;
                                 })()}
                             </div>
                        )}

                        <button type="submit" className="w-full bg-[#00695C] text-white py-2 rounded font-bold hover:bg-[#004d40]">
                            Thực hiện
                        </button>
                        {inventoryFeedback && (
                             <div className={`mt-2 text-center text-sm font-medium ${inventoryFeedback.includes('Lỗi') ? 'text-red-600' : 'text-green-600'}`}>
                                 {inventoryFeedback}
                             </div>
                        )}
                    </form>
                </div>
           ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                     <div className="p-4 border-b">
                         <input 
                            type="text" 
                            placeholder="Tìm kiếm giao dịch..." 
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            className="border rounded px-3 py-2 w-full max-w-sm"
                         />
                     </div>
                     <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Sản phẩm</th>
                                <th className="px-4 py-3">Phân loại</th>
                                <th className="px-4 py-3">Loại</th>
                                <th className="px-4 py-3">Số lượng</th>
                                <th className="px-4 py-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions
                                .filter(t => t.productName.toLowerCase().includes(inventorySearch.toLowerCase()) || t.note?.toLowerCase().includes(inventorySearch.toLowerCase()))
                                .map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{new Date(t.timestamp).toLocaleString('vi-VN')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{t.productName}</td>
                                    <td className="px-4 py-3">
                                        {t.selectedSize && <span className="mr-2 text-xs bg-gray-100 px-1 rounded">Size: {t.selectedSize}</span>}
                                        {t.selectedColor && <span className="text-xs bg-gray-100 px-1 rounded">Màu: {t.selectedColor}</span>}
                                        {!t.selectedSize && !t.selectedColor && '-'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'IMPORT' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                            {t.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold">{t.quantity}</td>
                                    <td className="px-4 py-3 italic text-gray-400">{t.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
           )}
      </div>
  );

  const renderCustomerManager = () => (
      <div className="space-y-6 animate-fade-in-up">
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm khách hàng..." 
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-64"
                  />
              </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
               <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                      <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Họ tên</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">SĐT</th>
                          <th className="px-4 py-3">Ngày tham gia</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                      {customers
                        .filter(c => 
                            c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) || 
                            c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.phoneNumber?.includes(customerSearch)
                        )
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{c.fullName}</td>
                              <td className="px-4 py-3">{c.email || '-'}</td>
                              <td className="px-4 py-3">{c.phoneNumber || '-'}</td>
                              <td className="px-4 py-3">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                              <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleEditCustomer(c)} className="text-blue-600 hover:text-blue-800 mr-2"><EditIcon className="w-4 h-4"/></button>
                                  <button onClick={() => handleDeleteCustomer(c.id, c.fullName)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
               </table>
          </div>

          {isEditingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg w-full max-w-md animate-fade-in-up">
                      <h3 className="text-lg font-bold mb-4">Sửa thông tin Khách hàng</h3>
                      <form onSubmit={handleSaveCustomer} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium mb-1">Họ tên</label>
                              <input type="text" value={editCustName} onChange={(e) => setEditCustName(e.target.value)} className="w-full border rounded px-3 py-2" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Email</label>
                              <input type="email" value={editCustEmail} onChange={(e) => setEditCustEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                              <input type="tel" value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} className="w-full border rounded px-3 py-2" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                              <input type="text" value={editCustAddress} onChange={(e) => setEditCustAddress(e.target.value)} className="w-full border rounded px-3 py-2" />
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                              <button type="button" onClick={() => { setIsEditingCustomer(false); setEditingCustomer(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded">Hủy</button>
                              <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">Lưu</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}
           {customerFeedback && (
             <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded shadow-lg animate-fade-in-up">
                 {customerFeedback}
             </div>
           )}
      </div>
  );

  const renderAboutPageEditor = () => (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
        {aboutContent && aboutSettings ? (
            <form onSubmit={handleAboutSubmit} className="space-y-6">
                {/* Hero Section */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Phần Hero (Đầu trang)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề chính</label>
                            <input type="text" value={aboutContent.heroTitle} onChange={(e) => handleAboutContentChange('heroTitle', e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phụ đề</label>
                            <input type="text" value={aboutContent.heroSubtitle} onChange={(e) => handleAboutContentChange('heroSubtitle', e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                         <div className="col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh nền Hero</label>
                             <div className="flex items-center gap-4">
                                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded inline-flex items-center">
                                    <ImagePlus className="w-4 h-4 mr-2" />
                                    <span>Tải ảnh lên</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAboutImageUpload(e, 'heroImageUrl')} />
                                </label>
                                <img src={aboutContent.heroImageUrl} alt="Hero" className="h-20 w-32 object-cover rounded border" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Welcome Section */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Phần Chào mừng</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                            <input type="text" value={aboutContent.welcomeHeadline} onChange={(e) => handleAboutContentChange('welcomeHeadline', e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                            <textarea rows={3} value={aboutContent.welcomeText} onChange={(e) => handleAboutContentChange('welcomeText', e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                    </div>
                </div>

                {/* Styling Settings */}
                <div className="border-b pb-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Cài đặt Giao diện</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Màu tiêu đề</label>
                            <input type="color" value={aboutSettings.headingColor} onChange={(e) => handleAboutSettingsChange('headingColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Font tiêu đề</label>
                            <select value={aboutSettings.headingFont} onChange={(e) => handleAboutSettingsChange('headingFont', e.target.value)} className="w-full border rounded px-3 py-2">
                                <option value="Playfair Display">Playfair Display (Serif)</option>
                                <option value="Poppins">Poppins (Sans-serif)</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Màu nút bấm</label>
                            <input type="color" value={aboutSettings.buttonBgColor} onChange={(e) => handleAboutSettingsChange('buttonBgColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full bg-[#D4AF37] text-white py-3 rounded font-bold hover:bg-[#b89b31]">Lưu Cấu Hình Trang</button>
                 {aboutFeedback && (
                     <div className="mt-4 text-center text-green-600 font-medium animate-pulse">{aboutFeedback}</div>
                 )}
            </form>
        ) : <p>Đang tải dữ liệu...</p>}
    </div>
  );

  const renderHomePageSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
           {homeSettings ? (
               <form onSubmit={handleHomePageSubmit} className="space-y-6">
                   <h3 className="text-xl font-bold text-gray-800 mb-6">Cấu hình Trang Chủ</h3>
                   
                   {/* Hero Headline */}
                   <div className="border p-4 rounded-lg bg-gray-50">
                       <h4 className="font-bold text-gray-700 mb-3">Tiêu đề chính (Headline)</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input type="text" value={homeSettings.headlineText} onChange={(e) => handleHomePageSettingsChange('headlineText', e.target.value)} className="border rounded px-3 py-2" placeholder="Nội dung tiêu đề" />
                           <input type="color" value={homeSettings.headlineColor} onChange={(e) => handleHomePageSettingsChange('headlineColor', e.target.value)} className="w-full h-10 p-1 border rounded" title="Màu chữ" />
                           <select value={homeSettings.headlineFont} onChange={(e) => handleHomePageSettingsChange('headlineFont', e.target.value)} className="border rounded px-3 py-2">
                               <option value="Playfair Display">Playfair Display</option>
                               <option value="Poppins">Poppins</option>
                           </select>
                            <input type="text" value={homeSettings.headlineSize} onChange={(e) => handleHomePageSettingsChange('headlineSize', e.target.value)} className="border rounded px-3 py-2" placeholder="Kích thước (VD: 3rem)" />
                       </div>
                   </div>

                   {/* Promotion Section */}
                   <div className="border p-4 rounded-lg bg-gray-50">
                       <h4 className="font-bold text-gray-700 mb-3">Banner Quảng Cáo (Featured)</h4>
                       <div className="space-y-3">
                           <div>
                               <label className="block text-xs font-bold text-gray-500 uppercase">Hình ảnh (URL hoặc Upload)</label>
                               {homeSettings.promoImageUrls.map((url, idx) => (
                                   <div key={idx} className="flex gap-2 mb-2">
                                       <input 
                                            type="text" 
                                            value={url} 
                                            onChange={(e) => {
                                                const newUrls = [...homeSettings.promoImageUrls];
                                                newUrls[idx] = e.target.value;
                                                handleHomePageSettingsChange('promoImageUrls', newUrls);
                                            }}
                                            className="border rounded px-3 py-2 flex-1 text-sm" 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newUrls = homeSettings.promoImageUrls.filter((_, i) => i !== idx);
                                                handleHomePageSettingsChange('promoImageUrls', newUrls);
                                            }}
                                            className="text-red-500 text-xs hover:underline"
                                        >
                                            Xóa
                                        </button>
                                   </div>
                               ))}
                               <div className="flex gap-4 mt-2">
                                   <button 
                                        type="button" 
                                        onClick={() => handleHomePageSettingsChange('promoImageUrls', [...homeSettings.promoImageUrls, ''])}
                                        className="text-blue-600 text-sm hover:underline"
                                    >
                                        + Thêm dòng URL
                                    </button>
                                    
                                    <label className="cursor-pointer text-[#00695C] text-sm hover:underline font-bold flex items-center gap-1">
                                        <ImagePlus className="w-4 h-4" />
                                        <span>+ Tải ảnh từ máy</span>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*" 
                                            onChange={handlePromoImageUpload} 
                                        />
                                    </label>
                               </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <input type="text" value={homeSettings.promoTitle1} onChange={(e) => handleHomePageSettingsChange('promoTitle1', e.target.value)} className="border rounded px-3 py-2" placeholder="Dòng 1" />
                               <input type="text" value={homeSettings.promoTitle2} onChange={(e) => handleHomePageSettingsChange('promoTitle2', e.target.value)} className="border rounded px-3 py-2" placeholder="Dòng 2" />
                               <input type="text" value={homeSettings.promoTitleHighlight} onChange={(e) => handleHomePageSettingsChange('promoTitleHighlight', e.target.value)} className="border rounded px-3 py-2" placeholder="Từ khóa nổi bật" />
                               <input type="color" value={homeSettings.promoBackgroundColor} onChange={(e) => handleHomePageSettingsChange('promoBackgroundColor', e.target.value)} className="w-full h-10 p-1 border rounded" title="Màu nền" />
                           </div>
                       </div>
                   </div>

                   {/* Flash Sale Section */}
                    <div className="border p-4 rounded-lg bg-gray-50">
                       <h4 className="font-bold text-gray-700 mb-3">Banner Flash Sale</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input type="text" value={homeSettings.flashSaleTitleText} onChange={(e) => handleHomePageSettingsChange('flashSaleTitleText', e.target.value)} className="border rounded px-3 py-2" placeholder="Tiêu đề Flash Sale" />
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block">Màu bắt đầu (Gradient)</label>
                                    <input type="color" value={homeSettings.flashSaleBgColorStart} onChange={(e) => handleHomePageSettingsChange('flashSaleBgColorStart', e.target.value)} className="w-full h-10 p-1 border rounded" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-500 block">Màu kết thúc</label>
                                    <input type="color" value={homeSettings.flashSaleBgColorEnd} onChange={(e) => handleHomePageSettingsChange('flashSaleBgColorEnd', e.target.value)} className="w-full h-10 p-1 border rounded" />
                                </div>
                            </div>
                        </div>
                    </div>

                   <button type="submit" className="w-full bg-[#D4AF37] text-white py-3 rounded font-bold hover:bg-[#b89b31]">Lưu Cấu Hình Trang Chủ</button>
                   {homeFeedback && <p className="text-center text-green-600 mt-2 font-medium">{homeFeedback}</p>}
               </form>
           ) : <p>Đang tải...</p>}
      </div>
  );

  const renderHeaderSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
           {headerSettings ? (
                <form onSubmit={handleHeaderSubmit} className="space-y-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-6">Cấu hình Header & Logo</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Tên thương hiệu (Brand Name)</label>
                             <input type="text" value={headerSettings.brandName} onChange={(e) => handleHeaderSettingsChange('brandName', e.target.value)} className="w-full border rounded px-3 py-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Màu thương hiệu</label>
                             <input type="color" value={headerSettings.brandColor} onChange={(e) => handleHeaderSettingsChange('brandColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-gray-700 mb-1">Logo (Hình ảnh)</label>
                             <div className="flex items-center gap-4">
                                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded inline-flex items-center">
                                    <ImagePlus className="w-4 h-4 mr-2" />
                                    <span>Tải Logo lên</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleHeaderLogoUpload} />
                                </label>
                                {headerSettings.logoUrl && (
                                    <img src={headerSettings.logoUrl} alt="Logo Preview" className="h-12 object-contain border rounded p-1 bg-gray-50" />
                                )}
                            </div>
                        </div>
                        
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Màu nền Header</label>
                             <input type="text" value={headerSettings.brandBackgroundColor} onChange={(e) => handleHeaderSettingsChange('brandBackgroundColor', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="VD: rgba(255, 255, 255, 0.9)" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Font chữ Menu</label>
                             <select value={headerSettings.navFont} onChange={(e) => handleHeaderSettingsChange('navFont', e.target.value)} className="w-full border rounded px-3 py-2">
                                <option value="Poppins">Poppins</option>
                                <option value="Playfair Display">Playfair Display</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Màu chữ Menu</label>
                             <input type="color" value={headerSettings.navColor} onChange={(e) => handleHeaderSettingsChange('navColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Màu Hover Menu</label>
                             <input type="color" value={headerSettings.navHoverColor} onChange={(e) => handleHeaderSettingsChange('navHoverColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-[#D4AF37] text-white py-3 rounded font-bold hover:bg-[#b89b31]">Lưu Cấu Hình Header</button>
                    {headerFeedback && <p className="text-center text-green-600 mt-2 font-medium">{headerFeedback}</p>}
                </form>
           ) : <p>Đang tải...</p>}
      </div>
  );

  const renderSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Cài đặt Chung</h3>
          
          <div className="grid grid-cols-1 gap-8">
              {/* Email Management */}
              <div>
                  <h4 className="font-bold text-gray-700 mb-4">Quản lý Email Admin</h4>
                  <p className="text-sm text-gray-500 mb-4">Các email này sẽ nhận thông báo đơn hàng và mã OTP.</p>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                      <p className="text-sm text-blue-700 font-bold">
                          ℹ️ Hệ thống Email đang hoạt động.
                      </p>
                      <p className="text-xs text-blue-600">
                          Nếu gửi lỗi, mã OTP sẽ tự động hiển thị trên màn hình (Chế độ Fallback).
                      </p>
                  </div>

                  <ul className="mb-4 space-y-2">
                      {adminEmails.map((email, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                              <span className="text-gray-700">{email}</span>
                              <button onClick={() => handleRemoveEmail(email)} className="text-red-500 text-sm hover:underline">Xóa</button>
                          </li>
                      ))}
                  </ul>

                  <form onSubmit={handleAddEmail} className="flex gap-2 mb-4">
                      <input 
                          type="email" 
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="Thêm email mới..."
                          className="flex-1 border rounded px-3 py-2 focus:ring-[#D4AF37]"
                          required
                      />
                      <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded hover:bg-[#004d40]">Thêm</button>
                  </form>
                  
                  <button 
                      onClick={handleTestEmail}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  >
                      📧 Gửi Email kiểm tra
                  </button>
              </div>

              {/* Login Logs Section */}
              <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-gray-700 flex items-center gap-2">
                          <ActivityIcon className="w-5 h-5 text-gray-600" />
                          Nhật ký đăng nhập
                      </h4>
                      <button 
                          onClick={() => {
                              fetchAdminLoginLogs().then(logs => {
                                  if (logs) setAdminLogs(logs);
                                  setSettingsFeedback('Đã làm mới nhật ký.');
                                  setTimeout(() => setSettingsFeedback(''), 3000);
                              });
                          }}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                          Làm mới
                      </button>
                  </div>
                  <div className="bg-gray-50 border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="min-w-full text-xs text-left text-gray-600">
                          <thead className="bg-gray-200 text-gray-700 font-medium sticky top-0">
                              <tr>
                                  <th className="px-3 py-2">Thời gian</th>
                                  <th className="px-3 py-2">Phương thức</th>
                                  <th className="px-3 py-2">IP</th>
                                  <th className="px-3 py-2">Trạng thái</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                              {adminLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-white">
                                      <td className="px-3 py-2">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                      <td className="px-3 py-2">
                                          {log.method === 'GOOGLE_AUTH' ? 
                                            <span className="text-purple-600 font-bold flex items-center gap-1"><ShieldCheckIcon className="w-3 h-3"/> 2FA App</span> : 
                                            <span className="text-blue-600 flex items-center gap-1">📧 Email OTP</span>}
                                      </td>
                                      <td className="px-3 py-2 font-mono">{log.ip_address || 'Unknown'}</td>
                                      <td className="px-3 py-2">
                                          {log.status === 'SUCCESS' ? 
                                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Thành công</span> : 
                                            <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Thất bại</span>}
                                      </td>
                                  </tr>
                              ))}
                              {adminLogs.length === 0 && (
                                  <tr>
                                      <td colSpan={4} className="text-center py-4 italic text-gray-400">Chưa có dữ liệu nhật ký.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              {/* 2FA Setup Section */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
                      Bảo mật 2 lớp (Google Authenticator)
                  </h4>
                  
                  {totpEnabled ? (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                              <div className="bg-green-500 text-white rounded-full p-1">
                                  <CheckIcon className="w-4 h-4" />
                              </div>
                              <h5 className="font-bold text-green-800">Đã kích hoạt</h5>
                          </div>
                          <p className="text-sm text-green-700 mb-4">
                              Tài khoản của bạn đang được bảo vệ bởi Google Authenticator. Bạn cần nhập mã từ ứng dụng khi đăng nhập.
                          </p>
                          <button 
                              onClick={handleDisableTotp}
                              className="text-red-600 hover:text-red-800 text-sm font-medium underline"
                          >
                              Tắt bảo mật 2 lớp
                          </button>
                      </div>
                  ) : (
                      <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                          {!showTotpSetup ? (
                              <>
                                <p className="text-sm text-gray-600 mb-4">
                                    Tăng cường bảo mật bằng cách sử dụng Google Authenticator. Bạn sẽ không cần phụ thuộc vào Email để lấy OTP nữa.
                                </p>
                                <button 
                                    onClick={handleStartTotpSetup}
                                    className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31] transition-colors"
                                >
                                    Thiết lập ngay
                                </button>
                              </>
                          ) : (
                              <div className="space-y-4 animate-fade-in-up">
                                  <h5 className="font-bold text-gray-800">Cài đặt Google Authenticator</h5>
                                  <div className="flex flex-col md:flex-row gap-6">
                                      <div className="bg-white p-2 rounded border inline-block">
                                          <QRCodeSVG value={tempTotpUri} size={150} />
                                      </div>
                                      <div className="flex-1 space-y-3">
                                          <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-2">
                                              <li>Tải ứng dụng <strong>Google Authenticator</strong> trên điện thoại.</li>
                                              <li>Mở ứng dụng và chọn <strong>Quét mã QR</strong>.</li>
                                              <li>Quét mã bên cạnh.</li>
                                              <li>Nhập mã 6 số hiển thị trong ứng dụng vào ô dưới đây để xác nhận.</li>
                                          </ol>
                                          
                                          <form onSubmit={handleVerifyAndEnableTotp} className="mt-4 flex gap-2">
                                              <input 
                                                  type="text" 
                                                  placeholder="Nhập mã 6 số (VD: 123456)"
                                                  value={verificationCode}
                                                  onChange={(e) => setVerificationCode(e.target.value)}
                                                  className="border rounded px-3 py-2 w-48 text-center tracking-widest font-mono"
                                                  maxLength={6}
                                                  required
                                              />
                                              <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded font-bold hover:bg-[#004d40]">
                                                  Kích hoạt
                                              </button>
                                          </form>
                                          <button onClick={() => setShowTotpSetup(false)} className="text-sm text-gray-500 hover:text-gray-700 underline">
                                              Hủy bỏ
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              {/* Bank Settings Section (NEW with Security) */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <CreditCardIcon className="w-5 h-5 text-gray-600" />
                      Cấu hình Thanh toán (VietQR)
                  </h4>
                  {bankSettings && (
                      <form onSubmit={handleBankSettingsSubmit} className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700">Ngân hàng</label>
                                  <select 
                                      value={bankSettings.bankId} 
                                      onChange={(e) => handleBankSettingsChange('bankId', e.target.value)} 
                                      className="mt-1 w-full border rounded px-3 py-2"
                                      required
                                  >
                                      <option value="">-- Chọn ngân hàng --</option>
                                      {VIET_QR_BANKS.map(bank => (
                                          <option key={bank.id} value={bank.id}>{bank.name} ({bank.id})</option>
                                      ))}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700">Số tài khoản</label>
                                  <input 
                                      type="text" 
                                      value={bankSettings.accountNumber} 
                                      onChange={(e) => handleBankSettingsChange('accountNumber', e.target.value)} 
                                      className="mt-1 w-full border rounded px-3 py-2"
                                      required 
                                  />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700">Tên chủ tài khoản (Viết hoa không dấu)</label>
                                  <input 
                                      type="text" 
                                      value={bankSettings.accountName} 
                                      onChange={(e) => handleBankSettingsChange('accountName', e.target.value.toUpperCase())} 
                                      className="mt-1 w-full border rounded px-3 py-2 uppercase"
                                      required 
                                  />
                              </div>
                          </div>
                          <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31]">
                              Lưu thông tin Ngân hàng
                          </button>
                      </form>
                  )}
              </div>

              {/* Social Media Links */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4">Liên kết Mạng xã hội (Footer)</h4>
                  {socialSettings && (
                      <form onSubmit={handleSocialSettingsSubmit} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Facebook URL</label>
                              <input type="url" value={socialSettings.facebook} onChange={(e) => handleSocialSettingsChange('facebook', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">Instagram URL</label>
                              <input type="url" value={socialSettings.instagram} onChange={(e) => handleSocialSettingsChange('instagram', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700">TikTok URL</label>
                              <input type="url" value={socialSettings.tiktok} onChange={(e) => handleSocialSettingsChange('tiktok', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium text-gray-700">Twitter/X URL</label>
                              <input type="url" value={socialSettings.twitter} onChange={(e) => handleSocialSettingsChange('twitter', e.target.value)} className="mt-1 w-full border rounded px-3 py-2" />
                          </div>
                          <button type="submit" className="w-full bg-[#D4AF37] text-white font-bold py-2 rounded hover:bg-[#b89b31]">
                              Cập nhật Liên kết
                          </button>
                      </form>
                  )}
              </div>
          </div>
          
           {settingsFeedback && (
                 <div className={`mt-6 p-3 rounded text-center font-medium animate-pulse ${settingsFeedback.includes('Lỗi') || settingsFeedback.includes('không đúng') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                     {settingsFeedback}
                 </div>
            )}

            {/* Bank Security Modal */}
            {showBankSecurityModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                        <div className="text-center mb-6">
                            <div className="bg-yellow-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ShieldCheckIcon className="w-6 h-6 text-yellow-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800">Xác thực Bảo mật</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Vui lòng nhập mã từ Google Authenticator để xác nhận thay đổi thông tin ngân hàng.
                            </p>
                        </div>
                        
                        <form onSubmit={handleVerifyBankUpdate}>
                            <input 
                                type="text" 
                                placeholder="Nhập mã 6 số"
                                value={securityCode}
                                onChange={(e) => setSecurityCode(e.target.value)}
                                className="w-full text-center text-xl tracking-widest font-mono border rounded px-3 py-3 mb-4 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                                maxLength={6}
                                autoFocus
                                required
                            />
                            <div className="flex gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => { setShowBankSecurityModal(false); setSecurityCode(''); }}
                                    className="flex-1 py-2 border rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-2 bg-[#D4AF37] text-white rounded font-bold hover:bg-[#b89b31]"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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
      default: return renderDashboard();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row">
      <aside className="bg-[#111827] text-white w-full md:w-64 flex-shrink-0">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <div className="bg-[#D4AF37] p-2 rounded-lg">
             <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold font-serif tracking-wider">Sigma Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
           <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <BarChart2 className="w-5 h-5" /> Tổng quan
          </button>
           <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <PackageIcon className="w-5 h-5" /> Sản phẩm
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <ClipboardListIcon className="w-5 h-5" /> Đơn hàng
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <BarChart2 className="w-5 h-5" /> Kho hàng
          </button>
           <button 
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
          >
            <UsersIcon className="w-5 h-5" /> Khách hàng
          </button>
          
          <div className="pt-4 mt-4 border-t border-gray-700">
            <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Giao diện</p>
            <button 
                onClick={() => setActiveTab('home')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <EditIcon className="w-5 h-5" /> Trang chủ
            </button>
             <button 
                onClick={() => setActiveTab('header')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'header' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <LayersIcon className="w-5 h-5" /> Header/Menu
            </button>
             <button 
                onClick={() => setActiveTab('about')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'about' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <EditIcon className="w-5 h-5" /> Giới thiệu
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
                <UserIcon className="w-5 h-5" /> Cài đặt chung
            </button>
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
                <span className="text-sm text-gray-500 hidden md:inline">Đăng nhập: {new Date().toLocaleDateString('vi-VN')}</span>
                <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    A
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
