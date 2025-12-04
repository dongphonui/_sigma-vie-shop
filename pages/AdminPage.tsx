
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
    isTotpEnabled, generateTotpSecret, getTotpUri, enableTotp, disableTotp, verifyTempTotpToken
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


const AdminPage: React.FC = () => {
  // General State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'about' | 'home' | 'header' | 'settings'>('dashboard');

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Product Form State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null); // Track product being edited

  const [isManagingCategories, setIsManagingCategories] = useState(false); // Toggle Category Manager
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImportPrice, setNewProductImportPrice] = useState(''); // NEW: Import Price
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
  const [adminLogs, setAdminLogs] = useState<AdminLoginLog[]>([]); // New state for logs
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null); // Bank Settings State
  
  // 2FA State
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [tempTotpSecret, setTempTotpSecret] = useState('');
  const [tempTotpUri, setTempTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showTotpSetup, setShowTotpSetup] = useState(false);

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
  const [inventoryView, setInventoryView] = useState<'stock' | 'history'>('stock'); // 'stock' or 'history'
  const [inventorySearch, setInventorySearch] = useState('');

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

  // ... (Keep all handlers as previously defined) ...
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
      
      setNewProductFlashSaleStartTime(product.flashSaleStartTime ? toLocalISOString(new Date(product.flashSaleStartTime)) : '');
      setNewProductFlashSaleEndTime(product.flashSaleEndTime ? toLocalISOString(new Date(product.flashSaleEndTime)) : '');

      setIsAddingProduct(true);
  };

  const handleCancelProductEdit = () => {
      setIsAddingProduct(false);
      setEditingProduct(null);
      // Reset form
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

    const change = inventoryType === 'IMPORT' ? qty : -qty;
    
    // Check for stock availability on export
    if (inventoryType === 'EXPORT' && product.stock < qty) {
         setInventoryFeedback(`Lỗi: Tồn kho hiện tại (${product.stock}) không đủ để xuất ${qty}.`);
         return;
    }

    const success = updateProductStock(productId, change);

    if (success) {
        addTransaction({
            productId,
            productName: product.name,
            type: inventoryType,
            quantity: qty,
            note: inventoryNote
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

  // Bank Settings Handler (NEW)
  const handleBankSettingsChange = (field: keyof BankSettings, value: string) => {
      if (bankSettings) {
          setBankSettings({ ...bankSettings, [field]: value });
      }
  };

  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (bankSettings) {
          updateBankSettings(bankSettings);
          setSettingsFeedback('Đã cập nhật thông tin Ngân hàng thành công!');
          setTimeout(() => setSettingsFeedback(''), 3000);
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

  const handleHomePageSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (homeSettings) {
          updateHomePageSettings(homeSettings);
          setHomeFeedback('Cập nhật Trang chủ thành công!');
          setTimeout(() => setHomeFeedback(''), 3000);
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

  // ... (Keep existing render methods) ...
  // Keeping renderDashboard, renderProductManager, etc. as they are. 
  // Just inserting Bank Settings into renderSettings.

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

              {/* Bank Settings Section (NEW) */}
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
      </div>
  );

  // ... (Keep existing renderContent) ...
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

  // ... (Return JSX) ...
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
