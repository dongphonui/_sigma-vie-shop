
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
import { getCustomers } from '../utils/customerStorage';
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

  // ... (renderDashboard, renderCategoryManager, renderProductManager, renderOrderManager, renderInventoryManager, renderAboutPageEditor kept same) ...
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
                                    <td className="px-4 py-2 font-bold text-red-600">{p.stock}</td>
                                    <td className="px-4 py-2">
                                        <button 
                                            onClick={() => {
                                                setSelectedProductForInventory(p.id.toString());
                                                setActiveTab('inventory');
                                            }}
                                            className="text-blue-600 hover:underline"
                                        >
                                            Nhập hàng
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

  const renderCategoryManager = () => (
    <div className="bg-white p-6 rounded-lg shadow-lg animate-fade-in-up">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Quản lý Danh mục</h2>
            <button onClick={() => { setIsManagingCategories(false); handleCancelEdit(); }} className="text-gray-500 hover:text-gray-700">
                Quay lại Sản phẩm
            </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Form */}
             <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold mb-4">{editingCategory ? 'Cập nhật Danh mục' : 'Thêm Danh mục Mới'}</h3>
                <form onSubmit={handleSaveCategory}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên Danh mục</label>
                        <input 
                            type="text" 
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                        <textarea 
                            value={newCategoryDesc}
                            onChange={e => setNewCategoryDesc(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2">
                         <button type="submit" className="flex-1 bg-[#00695C] text-white py-2 rounded-md hover:bg-[#004d40]">
                            {editingCategory ? 'Lưu Cập nhật' : 'Thêm Mới'}
                         </button>
                         {editingCategory && (
                             <button type="button" onClick={handleCancelEdit} className="px-4 border border-gray-300 rounded-md hover:bg-gray-100">Hủy</button>
                         )}
                    </div>
                </form>
             </div>

             {/* List */}
             <div className="lg:col-span-2 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mô tả</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {categories.map(cat => (
                            <tr key={cat.id}>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{cat.description}</td>
                                <td className="px-6 py-4 text-right text-sm font-medium">
                                    <button onClick={() => handleEditCategory(cat)} className="text-blue-600 hover:text-blue-900 mr-4">Sửa</button>
                                    <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="text-red-600 hover:text-red-900">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    </div>
  );

  const renderProductManager = () => {
    if (isManagingCategories) {
        return renderCategoryManager();
    }

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                              p.sku.toLowerCase().includes(productSearch.toLowerCase());
        const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (isAddingProduct) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold font-serif text-gray-800">
                        {editingProduct ? 'Cập nhật Sản phẩm' : 'Thêm Sản phẩm Mới'}
                    </h2>
                    <button onClick={handleCancelProductEdit} className="text-gray-500 hover:text-gray-700">
                        Hủy bỏ
                    </button>
                </div>
                <form onSubmit={handleProductSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Sản phẩm</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="space-y-1 text-center">
                                {newProductImage ? (
                                    <div className="relative">
                                        <img src={newProductImage} alt="Preview" className="mx-auto h-64 w-auto object-contain rounded-md shadow-sm" />
                                        <button type="button" onClick={() => setNewProductImage(null)} className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><Trash2Icon className="w-4 h-4" /></button>
                                    </div>
                                ) : (
                                    <>
                                        <ImagePlus className="mx-auto h-12 w-12 text-gray-400"/>
                                        <div className="flex text-sm text-gray-600 justify-center">
                                            <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-[#D4AF37] hover:text-[#b89b31] focus-within:outline-none">
                                                <span>Tải lên một tệp</span>
                                                <input id="image-upload" name="image-upload" type="file" className="sr-only" onChange={handleProductImageUpload} onClick={(e) => (e.currentTarget.value = '')} accept="image/*" />
                                            </label>
                                        </div>
                                        <p className="text-xs text-gray-500">PNG, JPG, GIF tối đa 10MB</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Tên Sản phẩm <span className="text-red-500">*</span></label><input type="text" id="name" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="mt-1 block w-full input-style" required placeholder="VD: Áo Thun Premium" /></div>
                            <div><label htmlFor="sku" className="block text-sm font-medium text-gray-700">Mã SKU</label><input type="text" id="sku" value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} className="mt-1 block w-full input-style" placeholder="VD: AT-001-BL" /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div><label htmlFor="price" className="block text-sm font-medium text-gray-700">Giá bán <span className="text-red-500">*</span></label><input type="text" id="price" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="mt-1 block w-full input-style" required placeholder="VD: 500,000₫" /></div>
                            <div><label htmlFor="importPrice" className="block text-sm font-medium text-gray-700">Giá nhập</label><input type="text" id="importPrice" value={newProductImportPrice} onChange={(e) => setNewProductImportPrice(e.target.value)} className="mt-1 block w-full input-style" placeholder="VD: 300,000₫" /></div>
                            <div><label htmlFor="category" className="block text-sm font-medium text-gray-700">Danh mục</label><select id="category" value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} className="mt-1 block w-full input-style h-11"><option value="">-- Chọn danh mục --</option>{categories.map(cat => (<option key={cat.id} value={cat.name}>{cat.name}</option>))}</select></div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-md border border-red-100">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="flex items-center h-5"><input id="isFlashSale" type="checkbox" checked={newProductIsFlashSale} onChange={(e) => setNewProductIsFlashSale(e.target.checked)} className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300 rounded" /></div>
                                <div className="flex-1"><label htmlFor="isFlashSale" className="font-medium text-gray-700 flex items-center gap-2"><LightningIcon className="w-4 h-4 text-red-600" /> Bật Flash Sale</label></div>
                            </div>
                            {newProductIsFlashSale && (
                                <div className="ml-7 space-y-3">
                                    <div><label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">Giá khuyến mãi</label><input type="text" id="salePrice" value={newProductSalePrice} onChange={(e) => setNewProductSalePrice(e.target.value)} className="mt-1 block w-full input-style border-red-300 focus:border-red-500 focus:ring-red-500" placeholder="VD: 350,000₫" /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label htmlFor="startTime" className="block text-sm font-medium text-gray-700">Bắt đầu</label><input type="datetime-local" id="startTime" value={newProductFlashSaleStartTime} onChange={(e) => setNewProductFlashSaleStartTime(e.target.value)} className="mt-1 block w-full input-style" /></div>
                                        <div><label htmlFor="endTime" className="block text-sm font-medium text-gray-700">Kết thúc</label><input type="datetime-local" id="endTime" value={newProductFlashSaleEndTime} onChange={(e) => setNewProductFlashSaleEndTime(e.target.value)} className="mt-1 block w-full input-style" /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div><label htmlFor="brand" className="block text-sm font-medium text-gray-700">Thương hiệu</label><input type="text" id="brand" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="mt-1 block w-full input-style" placeholder="VD: Sigma Vie" /></div>
                             <div><label htmlFor="status" className="block text-sm font-medium text-gray-700">Trạng thái</label><select id="status" value={newProductStatus} onChange={(e) => setNewProductStatus(e.target.value as any)} className="mt-1 block w-full input-style h-10"><option value="active">Đang kinh doanh</option><option value="draft">Nháp</option><option value="archived">Ngừng kinh doanh</option></select></div>
                        </div>
                        <div><label htmlFor="description" className="block text-sm font-medium text-gray-700">Mô tả chi tiết <span className="text-red-500">*</span></label><textarea id="description" value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} rows={4} className="mt-1 block w-full input-style" required placeholder="Mô tả chất liệu, kiểu dáng..." /></div>
                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <button type="button" onClick={handleCancelProductEdit} className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Hủy</button>
                            <button type="submit" className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00695C] hover:bg-[#004d40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00695C]">{editingProduct ? 'Lưu Cập nhật' : 'Lưu Sản phẩm'}</button>
                        </div>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[800px]">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h2 className="text-xl font-bold font-serif text-gray-800">Quản lý Kho hàng & Sản phẩm</h2>
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{filteredProducts.length} sản phẩm</span>
                </div>
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <input type="text" placeholder="Tìm kiếm..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] w-full md:w-64" />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                    <div className="flex items-center gap-2">
                        <FilterIcon className="w-4 h-4 text-gray-500"/>
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-md text-sm py-2 pl-2 pr-8 focus:ring-[#D4AF37] focus:border-[#D4AF37]"><option value="all">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="draft">Nháp</option><option value="archived">Ngừng bán</option></select>
                    </div>
                    <button onClick={() => setIsManagingCategories(true)} className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"><LayersIcon className="w-4 h-4"/> Quản lý Danh mục</button>
                    <button onClick={() => setIsAddingProduct(true)} className="bg-[#D4AF37] hover:bg-[#b89b31] text-white py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-all"><span className="text-lg leading-none">+</span> Thêm mới</button>
                </div>
            </div>
            {productFeedback && <div className={`p-3 text-sm text-center font-medium ${productFeedback.includes('xóa') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{productFeedback}</div>}
            <div className="flex-1 overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Ảnh</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thông tin sản phẩm</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Danh mục</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Giá bán</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredProducts.length > 0 ? filteredProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="h-12 w-12 rounded-md overflow-hidden border border-gray-200"><img className="h-full w-full object-cover" src={product.imageUrl} alt="" /></div>
                                </td>
                                <td className="px-6 py-4"><div className="flex flex-col"><span className="text-sm font-medium text-gray-900 line-clamp-1" title={product.name}>{product.name}</span><span className="text-xs text-gray-500">SKU: {product.sku}</span><span className="text-xs text-gray-400">{product.brand}</span>{product.isFlashSale && <span className="text-xs text-red-600 font-bold flex items-center mt-1"><LightningIcon className="w-3 h-3 mr-1"/> Flash Sale: {product.salePrice}</span>}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-800">{product.category}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.status === 'active' ? 'bg-green-100 text-green-800' : product.status === 'draft' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'}`}>{product.status === 'active' ? 'Đang bán' : product.status === 'draft' ? 'Nháp' : 'Ngừng bán'}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"><span className={product.stock < 5 ? 'text-red-600 font-bold' : ''}>{product.stock}</span></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium"><div className="flex flex-col items-end"><span className={product.isFlashSale ? 'line-through text-gray-400 text-xs' : ''}>{product.price}</span>{product.isFlashSale && <span className="text-red-600 font-bold">{product.salePrice}</span>}</div></td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEditProduct(product)} className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-full hover:bg-blue-50" title="Sửa sản phẩm"><EditIcon className="w-5 h-5" /></button>
                                        <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50" title="Xóa sản phẩm"><Trash2Icon className="w-5 h-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (<tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Không tìm thấy sản phẩm nào phù hợp.</td></tr>)}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between"><span>Hiển thị {filteredProducts.length} kết quả</span><span>Dữ liệu được cập nhật theo thời gian thực</span></div>
        </div>
    );
  };

  const renderOrderManager = () => {
    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                              order.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                              order.customerContact.toLowerCase().includes(orderSearch.toLowerCase());
        const matchesStatus = orderFilterStatus === 'all' || order.status === orderFilterStatus;
        return matchesSearch && matchesStatus;
    });

    // Pagination Logic
    const indexOfLastOrder = orderCurrentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const handleNextPage = () => {
        if (orderCurrentPage < totalPages) {
            setOrderCurrentPage(prev => prev + 1);
        }
    };

    const handlePrevPage = () => {
        if (orderCurrentPage > 1) {
            setOrderCurrentPage(prev => prev - 1);
        }
    };

    return (
      <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in-up flex flex-col h-full">
         <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between gap-4 bg-gray-50">
            <h2 className="text-xl font-bold font-serif text-gray-800">Quản lý Đơn hàng</h2>
            <div className="flex flex-col md:flex-row gap-3">
                 <input 
                    type="text" 
                    placeholder="Tìm đơn hàng, khách hàng..." 
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                 />
                 <select 
                    value={orderFilterStatus} 
                    onChange={(e) => setOrderFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                 >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="CONFIRMED">Đã xác nhận</option>
                    <option value="SHIPPED">Đã giao</option>
                    <option value="CANCELLED">Đã hủy</option>
                 </select>
            </div>
         </div>
         
         <div className="overflow-x-auto">
             <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã ĐH</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Khách hàng</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tổng tiền</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đặt</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hành động</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {currentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{order.id}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                                <div className="font-medium">{order.customerName}</div>
                                <div className="text-gray-500 text-xs">{order.customerContact}</div>
                                <div className="text-gray-500 text-xs truncate max-w-xs" title={order.customerAddress}>{order.customerAddress}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                                <div>{order.productName}</div>
                                <div className="text-gray-500 text-xs">SL: {order.quantity}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(order.timestamp).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                    ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                      order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                                      order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' : 
                                      'bg-gray-100 text-gray-800'}`}>
                                    {order.status === 'PENDING' ? 'Chờ xử lý' : 
                                     order.status === 'CONFIRMED' ? 'Đã xác nhận' :
                                     order.status === 'SHIPPED' ? 'Đã giao' : 'Đã hủy'}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <select 
                                    value={order.status}
                                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value as any)}
                                    className="border border-gray-300 rounded text-xs py-1 px-2"
                                >
                                    <option value="PENDING">Chờ xử lý</option>
                                    <option value="CONFIRMED">Xác nhận</option>
                                    <option value="SHIPPED">Đã giao</option>
                                    <option value="CANCELLED">Hủy</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Không có đơn hàng nào.</td></tr>
                    )}
                </tbody>
             </table>
         </div>
         
         {/* Pagination Controls */}
         {filteredOrders.length > ordersPerPage && (
             <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                 <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                     <div>
                         <p className="text-sm text-gray-700">
                             Hiển thị <span className="font-medium">{indexOfFirstOrder + 1}</span> đến <span className="font-medium">{Math.min(indexOfLastOrder, filteredOrders.length)}</span> trong số <span className="font-medium">{filteredOrders.length}</span> đơn hàng
                         </p>
                     </div>
                     <div>
                         <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                             <button
                                 onClick={handlePrevPage}
                                 disabled={orderCurrentPage === 1}
                                 className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 <span className="sr-only">Previous</span>
                                 <ChevronLeftIcon className="h-5 w-5" />
                             </button>
                             {/* Page Numbers */}
                             {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => setOrderCurrentPage(page)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                        orderCurrentPage === page
                                            ? 'z-10 bg-[#00695C] border-[#00695C] text-white'
                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {page}
                                </button>
                             ))}
                             <button
                                 onClick={handleNextPage}
                                 disabled={orderCurrentPage === totalPages}
                                 className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 <span className="sr-only">Next</span>
                                 <ChevronRightIcon className="h-5 w-5" />
                             </button>
                         </nav>
                     </div>
                 </div>
                 {/* Mobile Pagination View */}
                 <div className="flex items-center justify-between sm:hidden w-full">
                    <button
                        onClick={handlePrevPage}
                        disabled={orderCurrentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        Trước
                    </button>
                    <span className="text-sm text-gray-700">Trang {orderCurrentPage} / {totalPages}</span>
                    <button
                        onClick={handleNextPage}
                        disabled={orderCurrentPage === totalPages}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                        Sau
                    </button>
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
        <div className="bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in-up flex flex-col h-full">
            <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between gap-4 bg-gray-50">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold font-serif text-gray-800">Quản lý Khách hàng</h2>
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">{filteredCustomers.length} người dùng</span>
                </div>
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm tên, email, sđt..."
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#D4AF37] focus:border-[#D4AF37] w-full md:w-64"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Họ và Tên</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liên hệ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Địa chỉ</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày đăng ký</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCustomers.map(customer => (
                            <tr key={customer.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-gray-200 rounded-full p-1"><UserIcon className="w-4 h-4 text-gray-600"/></div>
                                        {customer.fullName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {customer.email && <div>Email: {customer.email}</div>}
                                    {customer.phoneNumber && <div>SĐT: {customer.phoneNumber}</div>}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {customer.address || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                                </td>
                            </tr>
                        ))}
                        {filteredCustomers.length === 0 && (
                            <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-500">Không tìm thấy khách hàng nào.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      );
  };

  const renderInventoryManager = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <PackageIcon className="w-5 h-5"/> Nhập/Xuất Kho
                </h2>
                
                {inventoryFeedback && (
                    <div className={`p-3 mb-4 text-sm rounded ${inventoryFeedback.includes('Lỗi') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {inventoryFeedback}
                    </div>
                )}

                <form onSubmit={handleInventorySubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                        <div className="flex rounded-md shadow-sm">
                            <button
                                type="button"
                                onClick={() => setInventoryType('IMPORT')}
                                className={`flex-1 py-2 text-sm font-medium rounded-l-md border ${inventoryType === 'IMPORT' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Nhập kho
                            </button>
                            <button
                                type="button"
                                onClick={() => setInventoryType('EXPORT')}
                                className={`flex-1 py-2 text-sm font-medium rounded-r-md border ${inventoryType === 'EXPORT' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                Xuất kho
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm</label>
                        <select 
                            value={selectedProductForInventory} 
                            onChange={(e) => setSelectedProductForInventory(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                            required
                        >
                            <option value="">-- Chọn sản phẩm --</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (Hiện có: {p.stock})</option>
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
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                        <textarea 
                            value={inventoryNote}
                            onChange={(e) => setInventoryNote(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                            rows={3}
                            placeholder="VD: Nhập hàng mới, Xuất cho đơn hàng #123..."
                        />
                    </div>

                    <button 
                        type="submit" 
                        className={`w-full py-2 px-4 rounded-md text-white font-medium shadow-sm ${inventoryType === 'IMPORT' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        Xác nhận {inventoryType === 'IMPORT' ? 'Nhập' : 'Xuất'}
                    </button>
                </form>
            </div>

            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Lịch sử Giao dịch</h3>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={inventorySearch}
                            onChange={(e) => setInventorySearch(e.target.value)}
                            className="border border-gray-300 rounded-md pl-8 pr-3 py-1 text-sm"
                        />
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute left-2 top-1.5" />
                    </div>
                </div>
                <div className="overflow-auto flex-1 max-h-[600px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Thời gian</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions
                                .filter(t => t.productName.toLowerCase().includes(inventorySearch.toLowerCase()) || (t.note && t.note.toLowerCase().includes(inventorySearch.toLowerCase())))
                                .map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(t.timestamp).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.productName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.type === 'IMPORT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {t.type === 'IMPORT' ? 'Nhập' : 'Xuất'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-700">
                                        {t.quantity}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 italic truncate max-w-xs" title={t.note}>
                                        {t.note || '-'}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">Chưa có giao dịch nào.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const renderAboutPageEditor = () => {
    if (!aboutContent || !aboutSettings) return <div>Loading...</div>;

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg animate-fade-in-up">
            <h2 className="text-2xl font-bold font-serif text-gray-800 mb-6">Chỉnh sửa Trang Giới Thiệu</h2>
            {aboutFeedback && <div className="p-3 mb-6 bg-green-50 text-green-700 text-sm font-medium rounded">{aboutFeedback}</div>}
            
            <form onSubmit={handleAboutSubmit} className="space-y-8">
                {/* Hero Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-700 mb-4">Phần Hero (Đầu trang)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề chính</label>
                            <input type="text" value={aboutContent.heroTitle} onChange={(e) => handleAboutContentChange('heroTitle', e.target.value)} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề phụ</label>
                            <input type="text" value={aboutContent.heroSubtitle} onChange={(e) => handleAboutContentChange('heroSubtitle', e.target.value)} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Ảnh nền Hero</label>
                             <div className="mt-2 flex items-center gap-4">
                                <img src={aboutContent.heroImageUrl} alt="Hero Preview" className="h-20 w-32 object-cover rounded bg-gray-200" />
                                <input type="file" onChange={(e) => handleAboutImageUpload(e, 'heroImageUrl')} className="text-sm" accept="image/*" />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Welcome Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-700 mb-4">Phần Chào mừng</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề chào mừng</label>
                            <input type="text" value={aboutContent.welcomeHeadline} onChange={(e) => handleAboutContentChange('welcomeHeadline', e.target.value)} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nội dung chào mừng</label>
                            <textarea value={aboutContent.welcomeText} onChange={(e) => handleAboutContentChange('welcomeText', e.target.value)} rows={4} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                    </div>
                </div>

                {/* Philosophy Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-700 mb-4">Phần Triết lý</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Tiêu đề</label>
                            <input type="text" value={aboutContent.philosophyTitle} onChange={(e) => handleAboutContentChange('philosophyTitle', e.target.value)} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Đoạn văn 1</label>
                            <textarea value={aboutContent.philosophyText1} onChange={(e) => handleAboutContentChange('philosophyText1', e.target.value)} rows={6} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Đoạn văn 2</label>
                            <textarea value={aboutContent.philosophyText2} onChange={(e) => handleAboutContentChange('philosophyText2', e.target.value)} rows={6} className="mt-1 block w-full border p-2 rounded" />
                        </div>
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Ảnh minh họa</label>
                             <div className="mt-2 flex items-center gap-4">
                                <img src={aboutContent.philosophyImageUrl} alt="Philosophy Preview" className="h-32 w-24 object-cover rounded bg-gray-200" />
                                <input type="file" onChange={(e) => handleAboutImageUpload(e, 'philosophyImageUrl')} className="text-sm" accept="image/*" />
                             </div>
                        </div>
                    </div>
                </div>
                
                {/* Styling Settings */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-lg text-gray-700 mb-4">Cài đặt Giao diện (Styling)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Màu tiêu đề</label>
                             <input type="color" value={aboutSettings.headingColor} onChange={(e) => handleAboutSettingsChange('headingColor', e.target.value)} className="mt-1 h-10 w-full rounded cursor-pointer" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Font tiêu đề</label>
                             <select value={aboutSettings.headingFont} onChange={(e) => handleAboutSettingsChange('headingFont', e.target.value)} className="mt-1 block w-full border p-2 rounded h-10">
                                <option value="Playfair Display">Playfair Display</option>
                                <option value="Poppins">Poppins</option>
                                <option value="Arial">Arial</option>
                             </select>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Màu văn bản</label>
                             <input type="color" value={aboutSettings.paragraphColor} onChange={(e) => handleAboutSettingsChange('paragraphColor', e.target.value)} className="mt-1 h-10 w-full rounded cursor-pointer" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-[#00695C] text-white py-3 px-8 rounded-md hover:bg-[#004d40] font-bold shadow-md">
                        Lưu Thay Đổi
                    </button>
                </div>
            </form>
        </div>
    );
  };

  const renderHomePageManager = () => {
      if (!homeSettings) return <div>Loading...</div>;

      const addPromoImage = () => {
          if (!homeSettings.promoImageUrls) homeSettings.promoImageUrls = [];
          handleHomePageSettingsChange('promoImageUrls', [...homeSettings.promoImageUrls, '']);
      };

      const updatePromoImage = (index: number, value: string) => {
          const newImages = [...(homeSettings.promoImageUrls || [])];
          newImages[index] = value;
          handleHomePageSettingsChange('promoImageUrls', newImages);
      };

      const removePromoImage = (index: number) => {
          const newImages = [...(homeSettings.promoImageUrls || [])];
          newImages.splice(index, 1);
          handleHomePageSettingsChange('promoImageUrls', newImages);
      };

      return (
        <div className="bg-white p-8 rounded-lg shadow-lg animate-fade-in-up">
            <h2 className="text-2xl font-bold font-serif text-gray-800 mb-6">Quản lý Trang Chủ</h2>
            
            {/* --- HOME PAGE LIVE PREVIEW --- */}
            <div className="mb-10 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Xem trước trực tiếp (Home Page Preview)
                </div>
                <div className="p-6 bg-[#F7F5F2] space-y-8">
                    {/* 1. Headline Preview */}
                    <div className="text-center">
                        <h1 className="font-bold" style={{ color: homeSettings.headlineColor, fontFamily: homeSettings.headlineFont, fontSize: homeSettings.headlineSize || '3rem' }}>
                            {homeSettings.headlineText}
                        </h1>
                        <p className="mt-2 text-lg" style={{ color: homeSettings.subtitleColor, fontFamily: homeSettings.subtitleFont }}>
                            {homeSettings.subtitleText}
                        </p>
                    </div>

                    {/* 2. Promo Banner Preview */}
                    <div className="rounded-2xl overflow-hidden shadow-lg bg-white flex flex-col md:flex-row min-h-[300px]">
                        <div className="md:w-1/2 relative bg-gray-200">
                            {homeSettings.promoImageUrls && homeSettings.promoImageUrls.length > 0 ? (
                                <img src={homeSettings.promoImageUrls[0]} alt="Promo Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                            )}
                        </div>
                        <div className="md:w-1/2 p-8 flex flex-col justify-center" style={{ backgroundColor: homeSettings.promoBackgroundColor }}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold px-2 py-1 rounded text-white uppercase" style={{ backgroundColor: homeSettings.promoAccentColor }}>{homeSettings.promoTag}</span>
                                <span className="text-xs font-medium uppercase text-white/80">{homeSettings.promoSubTag}</span>
                            </div>
                            <h2 className="font-bold mb-4 leading-tight" style={{ fontFamily: homeSettings.promoTitleFont, color: homeSettings.promoTitleColor, fontSize: homeSettings.promoTitleSize || '2rem' }}>
                                {homeSettings.promoTitle1} <br/> <span style={{ color: homeSettings.promoAccentColor }}>{homeSettings.promoTitleHighlight}</span> {homeSettings.promoTitle2}
                            </h2>
                            <p className="mb-6 font-light" style={{ fontFamily: homeSettings.promoDescriptionFont, color: homeSettings.promoDescriptionColor, fontSize: homeSettings.promoDescriptionSize || '1rem' }}>
                                {homeSettings.promoDescription}
                            </p>
                            <div>
                                <button className="font-semibold py-2 px-6 rounded-full shadow-lg" style={{ backgroundColor: homeSettings.promoButtonBgColor || homeSettings.promoAccentColor, color: homeSettings.promoButtonTextColor }}>
                                    {homeSettings.promoButtonText}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3. Registration Preview */}
                    <div className="text-center p-8 rounded-2xl shadow-lg relative overflow-hidden" 
                        style={{ 
                            background: `linear-gradient(to right, ${homeSettings.regBgColorStart}, ${homeSettings.regBgColorEnd})`, 
                            color: 'white',
                            padding: homeSettings.regPadding || '3rem',
                            borderRadius: homeSettings.regBorderRadius || '1rem'
                        }}>
                        <div className="relative z-10">
                            <UserPlusIcon className="w-10 h-10 mx-auto mb-3" style={{ color: homeSettings.regButtonBgColor }}/>
                            <h2 className="font-bold mb-2" style={{ color: homeSettings.regHeadlineColor, fontFamily: homeSettings.regHeadlineFont, fontSize: homeSettings.regHeadlineSize || '1.875rem' }}>{homeSettings.regHeadlineText}</h2>
                            <p className="mb-6" style={{ color: homeSettings.regDescriptionColor, fontFamily: homeSettings.regDescriptionFont, fontSize: homeSettings.regDescriptionSize || '1.125rem' }}>{homeSettings.regDescriptionText}</p>
                            <button className="font-bold py-2 px-6 shadow-lg" style={{ 
                                backgroundColor: homeSettings.regButtonBgColor, 
                                color: homeSettings.regButtonTextColor, 
                                fontFamily: homeSettings.regButtonFont, 
                                fontSize: homeSettings.regButtonFontSize, 
                                borderRadius: '9999px' 
                            }}>
                                {homeSettings.regButtonText}
                            </button>
                        </div>
                    </div>

                    {/* 4. Flash Sale Preview */}
                    <div className="p-8 rounded-2xl shadow-lg" style={{ background: `linear-gradient(to right, ${homeSettings.flashSaleBgColorStart}, ${homeSettings.flashSaleBgColorEnd})` }}>
                        <div className="flex items-center gap-3 mb-4">
                            <LightningIcon className="w-8 h-8" style={{ color: homeSettings.flashSaleTextColor }} />
                            <h2 className="font-bold italic tracking-wider" style={{ color: homeSettings.flashSaleTitleColor, fontFamily: homeSettings.flashSaleTitleFont, fontSize: homeSettings.flashSaleTitleSize || '2rem' }}>{homeSettings.flashSaleTitleText || 'FLASH SALE'}</h2>
                        </div>
                        <div className="h-32 bg-white/10 rounded-lg flex items-center justify-center text-white/50 border-2 border-dashed border-white/20">
                            [Product Grid Placeholder]
                        </div>
                    </div>
                </div>
            </div>

            {homeFeedback && <div className="p-3 mb-6 bg-green-50 text-green-700 text-sm font-medium rounded">{homeFeedback}</div>}

            <form onSubmit={handleHomePageSubmit} className="space-y-8">
                {/* Headline Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4">Tiêu đề chính</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Văn bản tiêu đề</label>
                             <input type="text" value={homeSettings.headlineText} onChange={e => handleHomePageSettingsChange('headlineText', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 col-span-2">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Màu chữ</label>
                                <input type="color" value={homeSettings.headlineColor} onChange={e => handleHomePageSettingsChange('headlineColor', e.target.value)} className="mt-1 w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Font chữ</label>
                                <select value={homeSettings.headlineFont} onChange={e => handleHomePageSettingsChange('headlineFont', e.target.value)} className="mt-1 w-full h-10 border rounded p-2">
                                    <option value="Playfair Display">Playfair Display</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Arial">Arial</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Cỡ chữ</label>
                                <input type="text" value={homeSettings.headlineSize} onChange={e => handleHomePageSettingsChange('headlineSize', e.target.value)} className="mt-1 w-full h-10 border rounded p-2" placeholder="3rem" />
                             </div>
                        </div>

                         <div className="col-span-2 border-t pt-4 mt-2">
                             <label className="block text-sm font-medium text-gray-700">Văn bản phụ</label>
                             <input type="text" value={homeSettings.subtitleText} onChange={e => handleHomePageSettingsChange('subtitleText', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 col-span-2">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Màu chữ phụ</label>
                                <input type="color" value={homeSettings.subtitleColor} onChange={e => handleHomePageSettingsChange('subtitleColor', e.target.value)} className="mt-1 w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Font chữ phụ</label>
                                <select value={homeSettings.subtitleFont} onChange={e => handleHomePageSettingsChange('subtitleFont', e.target.value)} className="mt-1 w-full h-10 border rounded p-2">
                                    <option value="Playfair Display">Playfair Display</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Arial">Arial</option>
                                </select>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Promo Section */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4">Banner Khuyến mãi</h3>
                    
                    {/* Image Slider Management */}
                    <div className="mb-4">
                         <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh Banner (Slider)</label>
                         {homeSettings.promoImageUrls && homeSettings.promoImageUrls.map((url, index) => (
                             <div key={index} className="flex gap-2 mb-2">
                                 <input 
                                    type="text" 
                                    value={url} 
                                    onChange={e => updatePromoImage(index, e.target.value)} 
                                    className="flex-1 border p-2 rounded text-sm"
                                    placeholder="URL hình ảnh"
                                 />
                                 <button type="button" onClick={() => removePromoImage(index)} className="text-red-500 hover:text-red-700 px-2">Xóa</button>
                             </div>
                         ))}
                         <button type="button" onClick={addPromoImage} className="text-sm text-blue-600 hover:underline mt-1">+ Thêm hình ảnh</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Màu nền</label>
                             <input type="color" value={homeSettings.promoBackgroundColor} onChange={e => handleHomePageSettingsChange('promoBackgroundColor', e.target.value)} className="mt-1 w-full h-10 rounded" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Màu nhấn (Button/Highlight)</label>
                             <input type="color" value={homeSettings.promoAccentColor} onChange={e => handleHomePageSettingsChange('promoAccentColor', e.target.value)} className="mt-1 w-full h-10 rounded" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Tag nhỏ</label>
                             <input type="text" value={homeSettings.promoTag} onChange={e => handleHomePageSettingsChange('promoTag', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Sub-tag</label>
                             <input type="text" value={homeSettings.promoSubTag} onChange={e => handleHomePageSettingsChange('promoSubTag', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Tiêu đề dòng 1</label>
                             <input type="text" value={homeSettings.promoTitle1} onChange={e => handleHomePageSettingsChange('promoTitle1', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Từ khóa nổi bật</label>
                             <input type="text" value={homeSettings.promoTitleHighlight} onChange={e => handleHomePageSettingsChange('promoTitleHighlight', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                        </div>
                         <div className="col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Mô tả</label>
                             <textarea value={homeSettings.promoDescription} onChange={e => handleHomePageSettingsChange('promoDescription', e.target.value)} rows={3} className="mt-1 w-full border p-2 rounded" />
                        </div>
                    </div>
                </div>

                {/* Registration Section Settings */}
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-800 text-white">
                     <h3 className="font-bold text-white mb-4 border-b border-gray-700 pb-2">Phần Đăng Ký Thành Viên</h3>
                     <div className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Tiêu đề</label>
                                <input type="text" value={homeSettings.regHeadlineText} onChange={e => handleHomePageSettingsChange('regHeadlineText', e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                 <div>
                                    <label className="block text-sm font-medium text-gray-300">Màu chữ</label>
                                    <input type="color" value={homeSettings.regHeadlineColor} onChange={e => handleHomePageSettingsChange('regHeadlineColor', e.target.value)} className="w-full h-10 bg-gray-800 rounded cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">Font</label>
                                    <select value={homeSettings.regHeadlineFont} onChange={e => handleHomePageSettingsChange('regHeadlineFont', e.target.value)} className="w-full h-10 bg-gray-800 text-white border-gray-600 rounded">
                                        <option value="Playfair Display">Playfair</option>
                                        <option value="Poppins">Poppins</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300">Cỡ chữ</label>
                                    <input type="text" value={homeSettings.regHeadlineSize || '1.875rem'} onChange={e => handleHomePageSettingsChange('regHeadlineSize', e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="1.875rem" />
                                </div>
                            </div>
                         </div>

                         <div>
                             <label className="block text-sm font-medium text-gray-300">Mô tả</label>
                             <textarea value={homeSettings.regDescriptionText} onChange={e => handleHomePageSettingsChange('regDescriptionText', e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" rows={2} />
                             <div className="grid grid-cols-3 gap-4 mt-2">
                                 <input type="color" value={homeSettings.regDescriptionColor} onChange={e => handleHomePageSettingsChange('regDescriptionColor', e.target.value)} className="h-8 w-full rounded cursor-pointer" />
                                 <select value={homeSettings.regDescriptionFont} onChange={e => handleHomePageSettingsChange('regDescriptionFont', e.target.value)} className="h-8 bg-gray-800 text-white border-gray-600 rounded text-sm">
                                     <option value="Poppins">Poppins</option>
                                     <option value="Playfair Display">Playfair</option>
                                 </select>
                                 <input type="text" value={homeSettings.regDescriptionSize || '1.125rem'} onChange={e => handleHomePageSettingsChange('regDescriptionSize', e.target.value)} className="h-8 bg-gray-800 border-gray-600 rounded px-2 text-white text-sm" placeholder="Size" />
                             </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-300">Màu Nền (Gradient Start)</label>
                                 <input type="color" value={homeSettings.regBgColorStart} onChange={e => handleHomePageSettingsChange('regBgColorStart', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-300">Màu Nền (Gradient End)</label>
                                 <input type="color" value={homeSettings.regBgColorEnd} onChange={e => handleHomePageSettingsChange('regBgColorEnd', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Kích thước khung (Padding)</label>
                                <input type="text" value={homeSettings.regPadding} onChange={e => handleHomePageSettingsChange('regPadding', e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="3rem" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-300">Độ bo góc (Radius)</label>
                                <input type="text" value={homeSettings.regBorderRadius} onChange={e => handleHomePageSettingsChange('regBorderRadius', e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" placeholder="1rem" />
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-5 gap-4 border-t border-gray-700 pt-4">
                             <div className="md:col-span-2">
                                 <label className="block text-sm font-medium text-gray-300">Text Nút</label>
                                 <input type="text" value={homeSettings.regButtonText} onChange={e => handleHomePageSettingsChange('regButtonText', e.target.value)} className="w-full bg-gray-800 border-gray-600 rounded p-2 text-white" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-300">Màu nền</label>
                                 <input type="color" value={homeSettings.regButtonBgColor} onChange={e => handleHomePageSettingsChange('regButtonBgColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-300">Màu chữ</label>
                                 <input type="color" value={homeSettings.regButtonTextColor} onChange={e => handleHomePageSettingsChange('regButtonTextColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-300">Cỡ chữ</label>
                                 <input type="text" value={homeSettings.regButtonFontSize || '1rem'} onChange={e => handleHomePageSettingsChange('regButtonFontSize', e.target.value)} className="w-full h-10 bg-gray-800 border-gray-600 rounded px-2 text-white" />
                             </div>
                         </div>
                     </div>
                 </div>

                {/* Flash Sale Section Config */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-700 mb-4">Cấu hình Flash Sale</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Nội dung Tiêu đề</label>
                                <input 
                                    type="text" 
                                    value={homeSettings.flashSaleTitleText || 'FLASH SALE'} 
                                    onChange={e => handleHomePageSettingsChange('flashSaleTitleText', e.target.value)} 
                                    className="mt-1 w-full border p-2 rounded" 
                                />
                            </div>
                            <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu nền bắt đầu</label>
                                 <input type="color" value={homeSettings.flashSaleBgColorStart} onChange={e => handleHomePageSettingsChange('flashSaleBgColorStart', e.target.value)} className="mt-1 w-full h-10 rounded" />
                            </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu nền kết thúc</label>
                                 <input type="color" value={homeSettings.flashSaleBgColorEnd} onChange={e => handleHomePageSettingsChange('flashSaleBgColorEnd', e.target.value)} className="mt-1 w-full h-10 rounded" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu chữ Tiêu đề</label>
                                 <input type="color" value={homeSettings.flashSaleTitleColor} onChange={e => handleHomePageSettingsChange('flashSaleTitleColor', e.target.value)} className="mt-1 w-full h-10 rounded" />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700">Font Tiêu đề</label>
                                <select value={homeSettings.flashSaleTitleFont || 'Playfair Display'} onChange={e => handleHomePageSettingsChange('flashSaleTitleFont', e.target.value)} className="mt-1 w-full h-10 border rounded p-2">
                                    <option value="Playfair Display">Playfair Display</option>
                                    <option value="Poppins">Poppins</option>
                                    <option value="Arial">Arial</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cỡ chữ (VD: 2.25rem)</label>
                                <input type="text" value={homeSettings.flashSaleTitleSize || '2.25rem'} onChange={e => handleHomePageSettingsChange('flashSaleTitleSize', e.target.value)} className="mt-1 w-full h-10 border rounded p-2" />
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700">Màu chữ phụ (Timer)</label>
                             <input type="color" value={homeSettings.flashSaleTextColor} onChange={e => handleHomePageSettingsChange('flashSaleTextColor', e.target.value)} className="mt-1 w-full h-10 rounded cursor-pointer" style={{ maxWidth: '100px' }} />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-[#00695C] text-white py-3 px-8 rounded-md hover:bg-[#004d40] font-bold shadow-md">
                        Lưu Cấu Hình Trang Chủ
                    </button>
                </div>
            </form>
        </div>
      );
  };

  const renderHeaderManager = () => {
     if (!headerSettings) return <div>Loading...</div>;
     return (
        <div className="bg-white p-8 rounded-lg shadow-lg animate-fade-in-up">
             <h2 className="text-2xl font-bold font-serif text-gray-800 mb-6">Quản lý Header & Menu</h2>
             {headerFeedback && <div className="p-3 mb-6 bg-green-50 text-green-700 text-sm font-medium rounded">{headerFeedback}</div>}
             
             <form onSubmit={handleHeaderSubmit} className="space-y-8">
                 {/* Logo & Brand */}
                 <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                     <h3 className="font-bold text-gray-700 mb-4">Logo & Tên Thương hiệu</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Tên thương hiệu</label>
                             <input type="text" value={headerSettings.brandName} onChange={e => handleHeaderSettingsChange('brandName', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                         </div>
                          <div>
                             <label className="block text-sm font-medium text-gray-700">Logo (Ảnh)</label>
                             <div className="mt-1 flex items-center gap-4">
                                 {headerSettings.logoUrl && <img src={headerSettings.logoUrl} alt="Logo" className="h-10 w-auto" />}
                                 <input type="file" accept="image/*" onChange={handleHeaderLogoUpload} className="text-sm" />
                             </div>
                         </div>
                         <div className="grid grid-cols-3 gap-2 md:col-span-2">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu chữ</label>
                                 <input type="color" value={headerSettings.brandColor} onChange={e => handleHeaderSettingsChange('brandColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Font chữ</label>
                                 <select value={headerSettings.brandFont} onChange={e => handleHeaderSettingsChange('brandFont', e.target.value)} className="w-full h-10 border rounded p-2">
                                     <option value="Playfair Display">Playfair Display</option>
                                     <option value="Poppins">Poppins</option>
                                 </select>
                             </div>
                              <div>
                                 <label className="block text-sm font-medium text-gray-700">Cỡ chữ</label>
                                 <input type="text" value={headerSettings.brandFontSize} onChange={e => handleHeaderSettingsChange('brandFontSize', e.target.value)} className="w-full border p-2 rounded" />
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Styling */}
                 <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                     <h3 className="font-bold text-gray-700 mb-4">Giao diện chung</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Màu nền Header</label>
                             <input type="text" value={headerSettings.brandBackgroundColor} onChange={e => handleHeaderSettingsChange('brandBackgroundColor', e.target.value)} className="mt-1 w-full border p-2 rounded" placeholder="rgba(255, 255, 255, 0.8) or #ffffff" />
                         </div>
                         <div className="grid grid-cols-3 gap-2">
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu viền</label>
                                 <input type="color" value={headerSettings.borderColor} onChange={e => handleHeaderSettingsChange('borderColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Kiểu viền</label>
                                 <select value={headerSettings.borderStyle} onChange={e => handleHeaderSettingsChange('borderStyle', e.target.value)} className="w-full h-10 border rounded p-2">
                                     <option value="solid">Solid</option>
                                     <option value="dashed">Dashed</option>
                                     <option value="none">None</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Độ dày</label>
                                 <input type="text" value={headerSettings.borderWidth} onChange={e => handleHeaderSettingsChange('borderWidth', e.target.value)} className="w-full border p-2 rounded" />
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Navigation */}
                 <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                     <h3 className="font-bold text-gray-700 mb-4">Menu Điều hướng</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Text "Cửa Hàng"</label>
                             <input type="text" value={headerSettings.navStoreText} onChange={e => handleHeaderSettingsChange('navStoreText', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700">Text "Về Chúng Tôi"</label>
                             <input type="text" value={headerSettings.navAboutText} onChange={e => handleHeaderSettingsChange('navAboutText', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu chữ</label>
                                 <input type="color" value={headerSettings.navColor} onChange={e => handleHeaderSettingsChange('navColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu Hover</label>
                                 <input type="color" value={headerSettings.navHoverColor} onChange={e => handleHeaderSettingsChange('navHoverColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                             </div>
                         </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-sm font-medium text-gray-700">Font chữ</label>
                                 <select value={headerSettings.navFont} onChange={e => handleHeaderSettingsChange('navFont', e.target.value)} className="w-full h-10 border rounded p-2">
                                     <option value="Poppins">Poppins</option>
                                     <option value="Playfair Display">Playfair Display</option>
                                     <option value="Arial">Arial</option>
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-sm font-medium text-gray-700">Cỡ chữ</label>
                                 <input type="text" value={headerSettings.navFontSize} onChange={e => handleHeaderSettingsChange('navFontSize', e.target.value)} className="w-full border p-2 rounded" />
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Login Button */}
                 <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                     <h3 className="font-bold text-gray-700 mb-4">Nút Đăng nhập</h3>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700">Text nút</label>
                             <input type="text" value={headerSettings.loginBtnText} onChange={e => handleHeaderSettingsChange('loginBtnText', e.target.value)} className="mt-1 w-full border p-2 rounded" />
                         </div>
                          <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu nền</label>
                                 <input type="color" value={headerSettings.loginBtnBgColor} onChange={e => handleHeaderSettingsChange('loginBtnBgColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                          </div>
                          <div>
                                 <label className="block text-sm font-medium text-gray-700">Màu chữ</label>
                                 <input type="color" value={headerSettings.loginBtnTextColor} onChange={e => handleHeaderSettingsChange('loginBtnTextColor', e.target.value)} className="w-full h-10 rounded cursor-pointer" />
                          </div>
                     </div>
                 </div>

                 <div className="flex justify-end">
                    <button type="submit" className="bg-[#00695C] text-white py-3 px-8 rounded-md hover:bg-[#004d40] font-bold shadow-md">
                        Lưu Cấu Hình Header
                    </button>
                </div>
             </form>
        </div>
     );
  }

  const renderSettingsManager = () => {
      return (
        <div className="bg-white p-8 rounded-lg shadow-lg animate-fade-in-up">
             <h2 className="text-2xl font-bold font-serif text-gray-800 mb-6">Cài đặt Chung</h2>
             {settingsFeedback && <div className="p-3 mb-6 bg-green-50 text-green-700 text-sm font-medium rounded">{settingsFeedback}</div>}

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 {/* Admin Emails */}
                 <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
                            <UserIcon className="w-5 h-5"/> Quản lý Email Admin
                        </h3>
                        <button 
                            type="button"
                            onClick={handleTestEmail}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 shadow-sm transition-colors"
                        >
                            Gửi Email kiểm tra
                        </button>
                    </div>
                     <p className="text-sm text-gray-500 mb-4">Các email này sẽ nhận được thông báo khi có đơn hàng mới hoặc mã OTP đăng nhập.</p>
                     
                     <div className="space-y-3 mb-6">
                         {adminEmails.map(email => (
                             <div key={email} className="flex justify-between items-center bg-gray-50 p-3 rounded border border-gray-200">
                                 <span className="text-gray-700">{email}</span>
                                 {adminEmails.length > 1 && (
                                     <button onClick={() => handleRemoveEmail(email)} className="text-red-500 hover:text-red-700 text-sm">Xóa</button>
                                 )}
                             </div>
                         ))}
                     </div>

                     <form onSubmit={handleAddEmail} className="flex gap-2">
                         <input 
                            type="email" 
                            value={newAdminEmail} 
                            onChange={e => setNewAdminEmail(e.target.value)} 
                            placeholder="nhap@email.com"
                            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                            required
                         />
                         <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded hover:bg-[#b89b31]">Thêm</button>
                     </form>
                 </div>

                 {/* Social Media Links */}
                 <div>
                     <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                         <ClipboardListIcon className="w-5 h-5"/> Liên kết Mạng xã hội
                     </h3>
                     <form onSubmit={handleSocialSettingsSubmit} className="space-y-4">
                         {socialSettings && Object.entries(socialSettings).map(([key, value]) => (
                             <div key={key}>
                                 <label className="block text-sm font-medium text-gray-700 capitalize mb-1">{key}</label>
                                 <input 
                                    type="url" 
                                    value={value as string}
                                    onChange={e => handleSocialSettingsChange(key as any, e.target.value)}
                                    className="w-full border border-gray-300 rounded px-3 py-2"
                                    placeholder={`Link to ${key}`}
                                 />
                             </div>
                         ))}
                         <button type="submit" className="w-full bg-[#00695C] text-white px-4 py-2 rounded hover:bg-[#004d40] mt-2">Lưu Liên Kết</button>
                     </form>
                 </div>
             </div>
        </div>
      );
  }

  // Main Render Logic
  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="bg-white w-full md:w-64 shadow-lg flex-shrink-0 z-10 flex flex-col md:h-screen sticky top-0">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between md:block">
                <h1 className="text-2xl font-bold font-serif text-[#00695C]">Admin Panel</h1>
                <button onClick={handleLogout} className="md:hidden text-gray-500"><UserIcon className="w-6 h-6"/></button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'dashboard' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <BarChart2 className="w-5 h-5"/> Dashboard
                </button>
                <button 
                    onClick={() => setActiveTab('products')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'products' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <LayersIcon className="w-5 h-5"/> Sản phẩm
                </button>
                <button 
                    onClick={() => setActiveTab('orders')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'orders' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <ClipboardListIcon className="w-5 h-5"/> Đơn hàng
                </button>
                <button 
                    onClick={() => setActiveTab('inventory')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'inventory' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <PackageIcon className="w-5 h-5"/> Kho hàng
                </button>
                <button 
                    onClick={() => setActiveTab('customers')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'customers' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <UsersIcon className="w-5 h-5"/> Khách hàng
                </button>
                
                <div className="pt-4 pb-2">
                    <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cấu hình Web</p>
                </div>

                <button 
                    onClick={() => setActiveTab('home')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'home' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <EditIcon className="w-5 h-5"/> Trang Chủ
                </button>
                <button 
                    onClick={() => setActiveTab('about')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'about' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <EditIcon className="w-5 h-5"/> Trang Giới Thiệu
                </button>
                <button 
                    onClick={() => setActiveTab('header')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'header' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <EditIcon className="w-5 h-5"/> Header & Menu
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`w-full text-left px-4 py-3 rounded-md flex items-center gap-3 transition-colors ${activeTab === 'settings' ? 'bg-[#00695C] text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <UserIcon className="w-5 h-5"/> Cài đặt Chung
                </button>
            </nav>
            <div className="p-4 border-t border-gray-200">
                <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-2 rounded-md hover:bg-red-100 font-medium transition-colors flex items-center justify-center gap-2">
                   Đăng xuất
                </button>
                <a href="#/" onClick={(e) => handleNavigate(e, '/')} className="block text-center text-sm text-gray-500 mt-4 hover:text-[#00695C]">
                    Về trang cửa hàng
                </a>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-auto h-screen">
            <div className="max-w-7xl mx-auto">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'products' && renderProductManager()}
                {activeTab === 'orders' && renderOrderManager()}
                {activeTab === 'inventory' && renderInventoryManager()}
                {activeTab === 'customers' && renderCustomerManager()}
                {activeTab === 'home' && renderHomePageManager()}
                {activeTab === 'about' && renderAboutPageEditor()}
                {activeTab === 'header' && renderHeaderManager()}
                {activeTab === 'settings' && renderSettingsManager()}
            </div>
        </main>

        <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
            }
            .input-style {
                border: 1px solid #D1D5DB;
                border-radius: 0.375rem;
                padding: 0.5rem 0.75rem;
                transition: all 0.2s;
            }
            .input-style:focus {
                outline: none;
                ring: 2px solid #00695C;
                border-color: #00695C;
            }
        `}</style>
    </div>
  );
};

export default AdminPage;
