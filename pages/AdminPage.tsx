
import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import type { Product, AboutPageContent, HomePageSettings, AboutPageSettings, HeaderSettings, InventoryTransaction, Category, Order, SocialSettings, Customer } from '../types';
import { getProducts, addProduct, deleteProduct, updateProductStock, updateProduct } from '../utils/productStorage';
import { getAboutPageContent, updateAboutPageContent } from '../utils/aboutPageStorage';
import { getAdminEmails, addAdminEmail, removeAdminEmail } from '../utils/adminSettingsStorage';
import { getHomePageSettings, updateHomePageSettings } from '../utils/homePageSettingsStorage';
import { getAboutPageSettings, updateAboutPageSettings } from '../utils/aboutPageSettingsStorage';
import { getHeaderSettings, updateHeaderSettings } from '../utils/headerSettingsStorage';
import { getTransactions, addTransaction } from '../utils/inventoryStorage';
import { getDashboardMetrics, type DashboardData } from '../utils/analytics';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../utils/categoryStorage';
import { getOrders, updateOrderStatus } from '../utils/orderStorage';
import { getSocialSettings, updateSocialSettings } from '../utils/socialSettingsStorage';
import { getCustomers, updateCustomer, deleteCustomer } from '../utils/customerStorage';
import { sendEmail } from '../utils/apiClient';


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

const UserPlusIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({className, style}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
);

const ClockIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({className, style}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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
      const emails = getAdminEmails();
      if (emails.length === 0) return;
      
      const targetEmail = emails[0];
      setSettingsFeedback(`Đang gửi email test đến ${targetEmail}...`);
      
      try {
          const result = await sendEmail(
              targetEmail, 
              'Kiểm tra cấu hình Email Sigma Vie', 
              '<div style="padding: 20px; font-family: sans-serif;"><h2>Kiểm tra thành công!</h2><p>Hệ thống gửi email của bạn đang hoạt động tốt.</p></div>'
          );
          
          if (result && result.success) {
              setSettingsFeedback('Thành công: Cấu hình Email hoạt động tốt!');
          } else {
              setSettingsFeedback(`Lỗi: ${result?.message || 'Gửi thất bại'}`);
          }
      } catch (e) {
          setSettingsFeedback('Lỗi kết nối hoặc cấu hình.');
      }
      
      setTimeout(() => setSettingsFeedback(''), 5000);
  };

  const renderDashboard = () => {
    if (!dashboardData) return <div>Đang tải dữ liệu...</div>;

    return (
      <div className="space-y-6 animate-fade-in-up">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-[#D4AF37]">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Doanh thu hôm nay</h3>
                <p className="text-2xl font-bold text-gray-800 mt-2">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardData.totalRevenueToday)}
                </p>
             </div>
             <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                <h3 className="text-gray-500 text-sm font-medium uppercase">Cảnh báo tồn kho</h3>
                <p className="text-2xl font-bold text-red-600 mt-2">
                    {dashboardData.lowStockProducts.length} sản phẩm
                </p>
             </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh số 7 ngày qua</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.dailySales}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.3} name="Doanh thu" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
             <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Tồn kho theo sản phẩm</h3>
                 <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dashboardData.stockData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <RechartsTooltip />
                            <Bar dataKey="value" fill="#00695C" name="Tồn kho" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
        
        {/* Low Stock Warning */}
        {dashboardData.lowStockProducts.length > 0 && (
             <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200">
                <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
                    <span className="text-2xl">⚠️</span> Cảnh báo: Sắp hết hàng
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-red-100">
                            <tr>
                                <th className="px-4 py-2">Sản phẩm</th>
                                <th className="px-4 py-2">SKU</th>
                                <th className="px-4 py-2">Tồn kho</th>
                                <th className="px-4 py-2">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.lowStockProducts.map(p => (
                                <tr key={p.id} className="bg-white border-b hover:bg-red-50">
                                    <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                                    <td className="px-4 py-2">{p.sku}</td>
                                    <td className="px-4 py-2 text-red-600 font-bold">{p.stock}</td>
                                    <td className="px-4 py-2">
                                        <button 
                                            onClick={() => {
                                                setActiveTab('inventory');
                                                setSelectedProductForInventory(p.id.toString());
                                            }}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Nhập kho
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        )}
      </div>
    );
  };
  
  const renderCustomerManager = () => {
    const filteredCustomers = customers.filter(c => 
        c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) || 
        (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
        (c.phoneNumber && c.phoneNumber.includes(customerSearch))
    );

    return (
        <>
            {/* Customer Edit Modal */}
            {isEditingCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up">
                        <h3 className="text-xl font-bold mb-4 text-gray-800">Chỉnh sửa Khách hàng</h3>
                        <form onSubmit={handleSaveCustomer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                                <input 
                                    type="text" 
                                    value={editCustName} 
                                    onChange={(e) => setEditCustName(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input 
                                    type="email" 
                                    value={editCustEmail} 
                                    onChange={(e) => setEditCustEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Số điện thoại</label>
                                <input 
                                    type="text" 
                                    value={editCustPhone} 
                                    onChange={(e) => setEditCustPhone(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                                <textarea 
                                    value={editCustAddress} 
                                    onChange={(e) => setEditCustAddress(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                    rows={3}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setIsEditingCustomer(false)}
                                    className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-[#00695C] text-white rounded hover:bg-[#004d40]"
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                    <UsersIcon className="w-6 h-6"/> Quản lý Khách hàng
                </h3>

                {customerFeedback && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-center">
                        {customerFeedback}
                    </div>
                )}

                <div className="mb-6 relative max-w-md">
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm khách hàng (Tên, Email, SĐT)..." 
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                    />
                    <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Họ và tên</th>
                                <th className="px-4 py-3">Liên hệ</th>
                                <th className="px-4 py-3">Địa chỉ</th>
                                <th className="px-4 py-3">Ngày đăng ký</th>
                                <th className="px-4 py-3 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900">{customer.id.split('-')[1] || customer.id}</td>
                                    <td className="px-4 py-3 font-semibold">{customer.fullName}</td>
                                    <td className="px-4 py-3">
                                        <p>{customer.email || '---'}</p>
                                        <p className="text-xs text-gray-500">{customer.phoneNumber || '---'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 truncate max-w-xs">{customer.address || 'Chưa cập nhật'}</td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleEditCustomer(customer)} className="text-blue-600 hover:text-blue-800 mr-3 transition-colors" title="Sửa">
                                            <EditIcon className="w-4 h-4 inline" />
                                        </button>
                                        <button onClick={() => handleDeleteCustomer(customer.id, customer.fullName)} className="text-red-600 hover:text-red-800 transition-colors" title="Xóa">
                                            <Trash2Icon className="w-4 h-4 inline" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Không tìm thấy khách hàng nào.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
  };

  const renderOrderManager = () => {
    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              order.customerName.toLowerCase().includes(orderSearch.toLowerCase());
        const matchesFilter = orderFilterStatus === 'all' || order.status === orderFilterStatus;
        return matchesSearch && matchesFilter;
    });

    const indexOfLastOrder = orderCurrentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                <ClipboardListIcon className="w-6 h-6"/> Quản lý Đơn hàng
            </h3>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                     <input 
                        type="text" 
                        placeholder="Tìm kiếm đơn hàng..." 
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                     />
                     <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <select 
                    value={orderFilterStatus}
                    onChange={(e) => setOrderFilterStatus(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:ring-[#D4AF37]"
                >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="CONFIRMED">Đã xác nhận</option>
                    <option value="SHIPPED">Đã giao</option>
                    <option value="CANCELLED">Đã hủy</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">Mã Đơn</th>
                            <th className="px-4 py-3">Khách hàng</th>
                            <th className="px-4 py-3">Sản phẩm</th>
                            <th className="px-4 py-3">Tổng tiền</th>
                            <th className="px-4 py-3">Thời gian</th>
                            <th className="px-4 py-3">Trạng thái</th>
                            <th className="px-4 py-3 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {currentOrders.map(order => (
                            <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-gray-900">{order.id}</td>
                                <td className="px-4 py-3">
                                    <p className="font-medium">{order.customerName}</p>
                                    <p className="text-xs text-gray-500">{order.customerContact}</p>
                                </td>
                                <td className="px-4 py-3">
                                    <p>{order.productName}</p>
                                    <p className="text-xs text-gray-500">SL: {order.quantity}</p>
                                </td>
                                <td className="px-4 py-3 font-medium text-[#00695C]">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                                </td>
                                <td className="px-4 py-3 text-gray-500">
                                    {new Date(order.timestamp).toLocaleDateString('vi-VN')}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                        order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                        order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {order.status === 'PENDING' ? 'Chờ xử lý' :
                                         order.status === 'CONFIRMED' ? 'Đã xác nhận' :
                                         order.status === 'SHIPPED' ? 'Đã giao' : 'Đã hủy'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                     <div className="flex items-center justify-center gap-2">
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
                        {currentOrders.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                    Không tìm thấy đơn hàng nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

             {totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                    <button
                        onClick={() => setOrderCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={orderCurrentPage === 1}
                        className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="px-4 py-2">Trang {orderCurrentPage} / {totalPages}</span>
                    <button
                        onClick={() => setOrderCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={orderCurrentPage === totalPages}
                        className="p-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
  };

  const renderCategoryManager = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up mb-8">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                <LayersIcon className="w-6 h-6"/> Quản lý Danh mục
            </h3>

             <form onSubmit={handleSaveCategory} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tên danh mục</label>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                            required
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                         <input
                            type="text"
                            value={newCategoryDesc}
                            onChange={(e) => setNewCategoryDesc(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                        />
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded hover:bg-[#004d40]">
                        {editingCategory ? 'Cập nhật Danh mục' : 'Thêm Danh mục'}
                    </button>
                    {editingCategory && (
                        <button type="button" onClick={handleCancelEdit} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">
                            Hủy bỏ
                        </button>
                    )}
                </div>
            </form>

            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                     <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                        <tr>
                            <th className="px-4 py-3">Tên Danh mục</th>
                            <th className="px-4 py-3">Mô tả</th>
                             <th className="px-4 py-3 text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                         {categories.map(cat => (
                             <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                                 <td className="px-4 py-3 font-medium">{cat.name}</td>
                                 <td className="px-4 py-3 text-gray-600">{cat.description}</td>
                                 <td className="px-4 py-3 text-right">
                                     <button onClick={() => handleEditCategory(cat)} className="text-blue-600 hover:text-blue-800 mr-3">
                                         <EditIcon className="w-4 h-4 inline" />
                                     </button>
                                     <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-600 hover:text-red-800">
                                          <Trash2Icon className="w-4 h-4 inline" />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                    </tbody>
                </table>
            </div>
      </div>
  );

  const renderProductManager = () => (
      <>
        {productFeedback && (
          <div className="mb-4 p-4 bg-blue-100 text-blue-700 rounded-lg animate-pulse text-center font-medium">
            {productFeedback}
          </div>
        )}
        
        {/* Toggle between Product List and Add/Edit Form */}
        {!isAddingProduct && !isManagingCategories ? (
          <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
               <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                  <PackageIcon className="w-6 h-6"/> Danh sách Sản phẩm
               </h3>
               <div className="flex gap-2">
                    <button 
                        onClick={() => setIsManagingCategories(true)}
                        className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2"
                    >
                        <LayersIcon className="w-4 h-4" /> Quản lý Danh mục
                    </button>
                   <button 
                        onClick={() => setIsAddingProduct(true)}
                        className="bg-[#D4AF37] hover:bg-[#b89b31] text-white font-bold py-2 px-4 rounded transition-colors flex items-center gap-2"
                   >
                        <ImagePlus className="w-4 h-4"/> Thêm Sản phẩm
                   </button>
               </div>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                     <input 
                        type="text" 
                        placeholder="Tìm kiếm sản phẩm..." 
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                     />
                     <SearchIcon className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <div className="flex items-center gap-2">
                    <FilterIcon className="w-5 h-5 text-gray-500" />
                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="border rounded-lg px-4 py-2 focus:ring-[#D4AF37]"
                    >
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang bán</option>
                        <option value="draft">Nháp</option>
                        <option value="archived">Lưu trữ</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Hình ảnh</th>
                    <th className="px-4 py-3">Tên sản phẩm</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Giá bán</th>
                    <th className="px-4 py-3">Tồn kho</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) && (filterStatus === 'all' || p.status === filterStatus))
                    .map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover rounded shadow-sm" />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                          {product.name}
                          {product.isFlashSale && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1 rounded font-bold">SALE</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{product.sku}</td>
                      <td className="px-4 py-3 font-medium text-[#00695C]">{product.price}</td>
                      <td className={`px-4 py-3 font-bold ${product.stock < 5 ? 'text-red-500' : 'text-gray-700'}`}>
                          {product.stock}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' : 
                            product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                            {product.status === 'active' ? 'Đang bán' : product.status === 'draft' ? 'Nháp' : 'Lưu trữ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-800 mr-3 transition-colors" title="Sửa">
                           <EditIcon className="w-5 h-5 inline"/>
                         </button>
                        <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-red-600 hover:text-red-800 transition-colors" title="Xóa">
                           <Trash2Icon className="w-5 h-5 inline"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                      <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                              Chưa có sản phẩm nào. Hãy thêm sản phẩm mới.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : isManagingCategories ? (
            <div>
                 <button 
                    onClick={() => setIsManagingCategories(false)}
                    className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-1"
                >
                    <ChevronLeftIcon className="w-4 h-4" /> Quay lại danh sách
                </button>
                {renderCategoryManager()}
            </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md animate-fade-in-up">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">
                    {editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}
                </h3>
                <button onClick={handleCancelProductEdit} className="text-gray-500 hover:text-gray-700">
                    <XCircleIcon className="w-6 h-6"/>
                </button>
             </div>
             
            <form onSubmit={handleProductSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                      <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                        placeholder="VD: Áo Thun Premium"
                        required
                      />
                  </div>
                   <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SKU (Mã kho) *</label>
                      <input
                        type="text"
                        value={newProductSku}
                        onChange={(e) => setNewProductSku(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                        placeholder="VD: AT-001-WHT"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán *</label>
                      <input
                        type="text"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                        placeholder="VD: 500,000₫"
                        required
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Giá nhập (Chỉ Admin thấy)</label>
                      <input
                        type="text"
                        value={newProductImportPrice}
                        onChange={(e) => setNewProductImportPrice(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                        placeholder="VD: 200,000₫"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                      <select
                          value={newProductCategory}
                          onChange={(e) => setNewProductCategory(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                      >
                          <option value="">Chọn danh mục</option>
                          {categories.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                      <select
                          value={newProductStatus}
                          onChange={(e) => setNewProductStatus(e.target.value as any)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                      >
                          <option value="active">Đang bán</option>
                          <option value="draft">Nháp</option>
                          <option value="archived">Lưu trữ (Ẩn)</option>
                      </select>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả sản phẩm *</label>
                <textarea
                  value={newProductDescription}
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                  rows={4}
                  placeholder="Mô tả chi tiết về chất liệu, kiểu dáng..."
                  required
                />
              </div>

              {/* Flash Sale Section */}
              <div className="bg-red-50 p-6 rounded-lg border border-red-100">
                  <div className="flex items-center gap-2 mb-4">
                      <input 
                        type="checkbox" 
                        id="flashSale" 
                        checked={newProductIsFlashSale}
                        onChange={(e) => setNewProductIsFlashSale(e.target.checked)}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                      />
                      <label htmlFor="flashSale" className="font-bold text-red-800 flex items-center gap-1">
                          <LightningIcon className="w-4 h-4"/> Bật Flash Sale cho sản phẩm này
                      </label>
                  </div>
                  
                  {newProductIsFlashSale && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                           <div>
                                <label className="block text-xs font-bold text-red-700 uppercase mb-1">Giá khuyến mãi</label>
                                <input
                                    type="text"
                                    value={newProductSalePrice}
                                    onChange={(e) => setNewProductSalePrice(e.target.value)}
                                    className="w-full px-3 py-2 border border-red-200 rounded focus:ring-red-500 focus:border-red-500"
                                    placeholder="VD: 300,000₫"
                                />
                           </div>
                           <div>
                                <label className="block text-xs font-bold text-red-700 uppercase mb-1">Bắt đầu</label>
                                <input
                                    type="datetime-local"
                                    value={newProductFlashSaleStartTime}
                                    onChange={(e) => setNewProductFlashSaleStartTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-red-200 rounded focus:ring-red-500 focus:border-red-500"
                                />
                           </div>
                           <div>
                                <label className="block text-xs font-bold text-red-700 uppercase mb-1">Kết thúc</label>
                                <input
                                    type="datetime-local"
                                    value={newProductFlashSaleEndTime}
                                    onChange={(e) => setNewProductFlashSaleEndTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-red-200 rounded focus:ring-red-500 focus:border-red-500"
                                />
                           </div>
                      </div>
                  )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm *</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-[#D4AF37] transition-colors">
                  <div className="space-y-1 text-center">
                    {newProductImage ? (
                        <div className="relative inline-block">
                             <img src={newProductImage} alt="Preview" className="h-48 object-contain rounded-md" />
                             <button 
                                type="button"
                                onClick={() => setNewProductImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                             >
                                 <XCircleIcon className="w-4 h-4"/>
                             </button>
                        </div>
                    ) : (
                        <>
                            <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600 justify-center">
                            <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#D4AF37] hover:text-[#b89b31] focus-within:outline-none">
                                <span>Tải ảnh lên</span>
                                <input id="image-upload" name="image-upload" type="file" className="sr-only" accept="image/*" onChange={handleProductImageUpload} />
                            </label>
                            <p className="pl-1">hoặc kéo thả vào đây</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, GIF lên đến 10MB</p>
                        </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                 <button
                  type="button"
                  onClick={handleCancelProductEdit}
                  className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors"
                >
                  {editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        )}
      </>
  );
  
  const renderInventoryManager = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                <BarChart2 className="w-6 h-6"/> Quản lý Kho hàng
            </h3>

            {inventoryFeedback && (
                 <div className={`mb-4 p-3 rounded text-center font-medium ${inventoryFeedback.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                     {inventoryFeedback}
                 </div>
            )}

            <div className="flex border-b mb-6">
                <button 
                    onClick={() => setInventoryView('stock')}
                    className={`px-4 py-2 font-medium ${inventoryView === 'stock' ? 'text-[#00695C] border-b-2 border-[#00695C]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Nhập/Xuất Kho
                </button>
                <button 
                    onClick={() => setInventoryView('history')}
                    className={`px-4 py-2 font-medium ${inventoryView === 'history' ? 'text-[#00695C] border-b-2 border-[#00695C]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Lịch sử Giao dịch
                </button>
            </div>

            {inventoryView === 'stock' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                         <h4 className="font-bold text-gray-700 mb-3">Thao tác kho</h4>
                         <form onSubmit={handleInventorySubmit} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="invType" 
                                            value="IMPORT" 
                                            checked={inventoryType === 'IMPORT'} 
                                            onChange={() => setInventoryType('IMPORT')}
                                            className="text-[#00695C] focus:ring-[#00695C]"
                                        />
                                        <span className="font-medium text-green-700">Nhập kho (+)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="invType" 
                                            value="EXPORT" 
                                            checked={inventoryType === 'EXPORT'} 
                                            onChange={() => setInventoryType('EXPORT')}
                                            className="text-red-600 focus:ring-red-600"
                                        />
                                        <span className="font-medium text-red-700">Xuất kho (-)</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm</label>
                                <select 
                                    value={selectedProductForInventory}
                                    onChange={(e) => setSelectedProductForInventory(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                    required
                                >
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={inventoryQuantity}
                                    onChange={(e) => setInventoryQuantity(e.target.value)}
                                    className="w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                <input 
                                    type="text"
                                    value={inventoryNote}
                                    onChange={(e) => setInventoryNote(e.target.value)}
                                    placeholder="Lý do nhập/xuất..."
                                    className="w-full px-3 py-2 border rounded focus:ring-[#D4AF37]"
                                />
                            </div>

                            <button type="submit" className="w-full bg-[#00695C] text-white font-bold py-2 rounded hover:bg-[#004d40] transition-colors">
                                Xác nhận
                            </button>
                         </form>
                    </div>

                    <div>
                        <h4 className="font-bold text-gray-700 mb-3">Tồn kho hiện tại</h4>
                        <div className="relative mb-3">
                             <input 
                                type="text" 
                                placeholder="Tìm kiếm..." 
                                value={inventorySearch}
                                onChange={(e) => setInventorySearch(e.target.value)}
                                className="w-full pl-8 pr-4 py-2 text-sm border rounded focus:ring-[#D4AF37]"
                             />
                             <SearchIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" />
                        </div>
                        <div className="bg-white border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                            <table className="min-w-full text-sm text-left">
                                <thead className="bg-gray-100 text-gray-700 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Sản phẩm</th>
                                        <th className="px-4 py-2 text-right">Tồn kho</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {products
                                        .filter(p => p.name.toLowerCase().includes(inventorySearch.toLowerCase()))
                                        .map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">{p.name}</td>
                                            <td className={`px-4 py-2 text-right font-bold ${p.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                                                {p.stock}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                     <table className="min-w-full text-left text-sm">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Loại</th>
                                <th className="px-4 py-3">Sản phẩm</th>
                                <th className="px-4 py-3 text-right">Số lượng</th>
                                <th className="px-4 py-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(t.timestamp).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'IMPORT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {t.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{t.productName}</td>
                                    <td className="px-4 py-3 text-right font-mono">{t.quantity}</td>
                                    <td className="px-4 py-3 text-gray-500 italic">{t.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
            )}
      </div>
  );

  const renderAboutPageEditor = () => {
    if (!aboutContent || !aboutSettings) return <div>Đang tải...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <EditIcon className="w-6 h-6"/> Chỉnh sửa trang Giới Thiệu
            </h3>
            
            <form onSubmit={handleAboutSubmit} className="space-y-8">
                 {/* 1. Hero Section */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Phần Đầu Trang (Hero)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề lớn</label>
                            <input type="text" value={aboutContent.heroTitle} onChange={(e) => handleAboutContentChange('heroTitle', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Tiêu đề phụ</label>
                            <input type="text" value={aboutContent.heroSubtitle} onChange={(e) => handleAboutContentChange('heroSubtitle', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Ảnh nền Hero</label>
                             <input type="file" accept="image/*" onChange={(e) => handleAboutImageUpload(e, 'heroImageUrl')} className="mt-1 w-full" />
                             <img src={aboutContent.heroImageUrl} alt="Preview" className="h-32 object-cover mt-2 rounded" />
                        </div>
                    </div>
                 </div>

                 {/* 2. Welcome Section */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Lời Chào Mừng</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề chào mừng</label>
                            <input type="text" value={aboutContent.welcomeHeadline} onChange={(e) => handleAboutContentChange('welcomeHeadline', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Nội dung chào mừng</label>
                            <textarea value={aboutContent.welcomeText} onChange={(e) => handleAboutContentChange('welcomeText', e.target.value)} rows={4} className="mt-1 w-full border rounded p-2" />
                        </div>
                    </div>
                 </div>

                 {/* 3. Philosophy Section */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Triết Lý Thương Hiệu</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề triết lý</label>
                            <input type="text" value={aboutContent.philosophyTitle} onChange={(e) => handleAboutContentChange('philosophyTitle', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Nội dung đoạn 1</label>
                            <textarea value={aboutContent.philosophyText1} onChange={(e) => handleAboutContentChange('philosophyText1', e.target.value)} rows={5} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Nội dung đoạn 2</label>
                            <textarea value={aboutContent.philosophyText2} onChange={(e) => handleAboutContentChange('philosophyText2', e.target.value)} rows={5} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Ảnh minh họa</label>
                             <input type="file" accept="image/*" onChange={(e) => handleAboutImageUpload(e, 'philosophyImageUrl')} className="mt-1 w-full" />
                             <img src={aboutContent.philosophyImageUrl} alt="Preview" className="h-32 object-contain mt-2 rounded" />
                        </div>
                    </div>
                 </div>

                 {/* 4. Settings (Fonts & Colors) */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Cài đặt Giao diện</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Màu Tiêu đề</label>
                            <input type="color" value={aboutSettings.headingColor} onChange={(e) => handleAboutSettingsChange('headingColor', e.target.value)} className="mt-1 w-full h-10 p-1 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Font Tiêu đề</label>
                             <select value={aboutSettings.headingFont} onChange={(e) => handleAboutSettingsChange('headingFont', e.target.value)} className="mt-1 w-full border rounded p-2">
                                <option value="Playfair Display">Playfair Display (Serif)</option>
                                <option value="Poppins">Poppins (Sans-serif)</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Màu Nút Bấm</label>
                            <input type="color" value={aboutSettings.buttonBgColor} onChange={(e) => handleAboutSettingsChange('buttonBgColor', e.target.value)} className="mt-1 w-full h-10 p-1 border rounded" />
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-[#D4AF37] text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-[#b89b31] transition-transform transform hover:-translate-y-1">
                        Lưu Thay Đổi
                    </button>
                 </div>
            </form>
            {aboutFeedback && (
                 <div className="mt-4 p-3 bg-green-100 text-green-700 rounded text-center font-medium animate-pulse">
                     {aboutFeedback}
                 </div>
            )}
        </div>
    );
  };

  const renderHomePageSettings = () => {
      if (!homeSettings) return <div>Loading...</div>;
      
      return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <EditIcon className="w-6 h-6"/> Tùy chỉnh Trang Chủ
            </h3>
            
            <form onSubmit={handleHomePageSubmit} className="space-y-8">
                 {/* Hero Headline */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Tiêu đề chính (Headline)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Nội dung tiêu đề</label>
                            <input type="text" value={homeSettings.headlineText} onChange={(e) => handleHomePageSettingsChange('headlineText', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Màu chữ</label>
                             <input type="color" value={homeSettings.headlineColor} onChange={(e) => handleHomePageSettingsChange('headlineColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Font chữ</label>
                             <select value={homeSettings.headlineFont} onChange={(e) => handleHomePageSettingsChange('headlineFont', e.target.value)} className="mt-1 w-full border rounded p-2">
                                <option value="Playfair Display">Serif (Playfair)</option>
                                <option value="Poppins">Sans-serif (Poppins)</option>
                             </select>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Nội dung phụ đề</label>
                            <input type="text" value={homeSettings.subtitleText} onChange={(e) => handleHomePageSettingsChange('subtitleText', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                    </div>
                 </div>

                 {/* Promotion Section */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Banner Quảng cáo (Slider)</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Danh sách Ảnh Banner (URL)</label>
                            <div className="flex flex-col gap-2 mt-1">
                                {homeSettings.promoImageUrls && homeSettings.promoImageUrls.map((url, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={url} 
                                            onChange={(e) => {
                                                const newUrls = [...homeSettings.promoImageUrls];
                                                newUrls[idx] = e.target.value;
                                                handleHomePageSettingsChange('promoImageUrls', newUrls);
                                            }} 
                                            className="w-full border rounded p-2"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newUrls = homeSettings.promoImageUrls.filter((_, i) => i !== idx);
                                                handleHomePageSettingsChange('promoImageUrls', newUrls);
                                            }}
                                            className="text-red-500 font-bold px-2"
                                        >X</button>
                                    </div>
                                ))}
                                <button 
                                    type="button" 
                                    onClick={() => handleHomePageSettingsChange('promoImageUrls', [...(homeSettings.promoImageUrls || []), ''])}
                                    className="self-start text-sm text-blue-600 hover:underline"
                                >
                                    + Thêm ảnh slide
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Màu nền Banner</label>
                                <input type="color" value={homeSettings.promoBackgroundColor} onChange={(e) => handleHomePageSettingsChange('promoBackgroundColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Màu nhấn (Nút/Text)</label>
                                <input type="color" value={homeSettings.promoAccentColor} onChange={(e) => handleHomePageSettingsChange('promoAccentColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tag nhỏ (VD: Độc Quyền)</label>
                            <input type="text" value={homeSettings.promoTag} onChange={(e) => handleHomePageSettingsChange('promoTag', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề dòng 1</label>
                            <input type="text" value={homeSettings.promoTitle1} onChange={(e) => handleHomePageSettingsChange('promoTitle1', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Từ khóa nổi bật (Màu khác)</label>
                            <input type="text" value={homeSettings.promoTitleHighlight} onChange={(e) => handleHomePageSettingsChange('promoTitleHighlight', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-[#D4AF37] text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-[#b89b31]">
                        Lưu Cấu Hình
                    </button>
                 </div>
            </form>
             {homeFeedback && (
                 <div className="mt-4 p-3 bg-green-100 text-green-700 rounded text-center font-medium animate-pulse">
                     {homeFeedback}
                 </div>
            )}
        </div>
      );
  };

  const renderHeaderSettings = () => {
      if (!headerSettings) return <div>Loading...</div>;

      return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <EditIcon className="w-6 h-6"/> Tùy chỉnh Thanh điều hướng (Header)
            </h3>
            
            <form onSubmit={handleHeaderSubmit} className="space-y-8">
                 {/* Logo & Brand */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Logo & Tên Thương Hiệu</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tên thương hiệu</label>
                            <input type="text" value={headerSettings.brandName} onChange={(e) => handleHeaderSettingsChange('brandName', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Màu chữ Logo</label>
                            <input type="color" value={headerSettings.brandColor} onChange={(e) => handleHeaderSettingsChange('brandColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Font chữ Logo</label>
                            <select value={headerSettings.brandFont} onChange={(e) => handleHeaderSettingsChange('brandFont', e.target.value)} className="mt-1 w-full border rounded p-2">
                                <option value="Playfair Display">Playfair Display</option>
                                <option value="Poppins">Poppins</option>
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Cỡ chữ</label>
                             <input type="text" value={headerSettings.brandFontSize} onChange={(e) => handleHeaderSettingsChange('brandFontSize', e.target.value)} className="mt-1 w-full border rounded p-2" placeholder="e.g. 30px" />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Upload Logo Ảnh (Thay thế text)</label>
                             <input type="file" accept="image/*" onChange={handleHeaderLogoUpload} className="mt-1 w-full" />
                             {headerSettings.logoUrl && <img src={headerSettings.logoUrl} alt="Logo Preview" className="h-16 object-contain mt-2 border p-1 rounded bg-white" />}
                        </div>
                    </div>
                 </div>

                 {/* Colors */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Màu sắc nền & Menu</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Màu nền Header</label>
                            <input type="text" value={headerSettings.brandBackgroundColor} onChange={(e) => handleHeaderSettingsChange('brandBackgroundColor', e.target.value)} className="mt-1 w-full border rounded p-2" placeholder="rgba(255,255,255,0.9)" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Màu viền dưới</label>
                            <input type="color" value={headerSettings.borderColor} onChange={(e) => handleHeaderSettingsChange('borderColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Màu chữ Menu</label>
                            <input type="color" value={headerSettings.navColor} onChange={(e) => handleHeaderSettingsChange('navColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Màu khi Hover</label>
                            <input type="color" value={headerSettings.navHoverColor} onChange={(e) => handleHeaderSettingsChange('navHoverColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                    </div>
                 </div>

                 {/* Login Button */}
                 <div className="p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-bold text-gray-700 mb-4 border-b pb-2">Nút Đăng Nhập</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Nội dung nút</label>
                            <input type="text" value={headerSettings.loginBtnText} onChange={(e) => handleHeaderSettingsChange('loginBtnText', e.target.value)} className="mt-1 w-full border rounded p-2" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Màu nền nút</label>
                            <input type="color" value={headerSettings.loginBtnBgColor} onChange={(e) => handleHeaderSettingsChange('loginBtnBgColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Màu chữ nút</label>
                            <input type="color" value={headerSettings.loginBtnTextColor} onChange={(e) => handleHeaderSettingsChange('loginBtnTextColor', e.target.value)} className="mt-1 w-full h-10 p-1 rounded border" />
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                    <button type="submit" className="bg-[#D4AF37] text-white px-8 py-3 rounded-lg font-bold shadow hover:bg-[#b89b31]">
                        Lưu Header
                    </button>
                 </div>
            </form>
             {headerFeedback && (
                 <div className="mt-4 p-3 bg-green-100 text-green-700 rounded text-center font-medium animate-pulse">
                     {headerFeedback}
                 </div>
            )}
        </div>
      );
  };

  const renderSettings = () => (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Cài đặt Chung</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Email Management */}
              <div>
                  <h4 className="font-bold text-gray-700 mb-4">Quản lý Email Admin</h4>
                  <p className="text-sm text-gray-500 mb-4">Các email này sẽ nhận thông báo đơn hàng và mã OTP.</p>
                  
                  <ul className="mb-4 space-y-2">
                      {adminEmails.map((email, idx) => (
                          <li key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                              <span className="text-gray-700">{email}</span>
                              <button onClick={() => handleRemoveEmail(email)} className="text-red-500 text-sm hover:underline">Xóa</button>
                          </li>
                      ))}
                  </ul>

                  <form onSubmit={handleAddEmail} className="flex gap-2">
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
                  
                  <div className="mt-6 border-t pt-4">
                      <button 
                        onClick={handleTestEmail}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                         Gửi Email kiểm tra
                      </button>
                      <p className="text-xs text-gray-500 mt-2 text-center">Gửi mail test đến {adminEmails[0]} để xác nhận cấu hình Server.</p>
                  </div>
              </div>

              {/* Social Media Links */}
              <div>
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
                 <div className="mt-6 p-3 bg-green-100 text-green-700 rounded text-center font-medium animate-pulse">
                     {settingsFeedback}
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
      {/* Sidebar */}
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

      {/* Main Content */}
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
