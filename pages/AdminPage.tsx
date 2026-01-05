
import React, { useState, useEffect } from 'react';
import type { AdminUser } from '../types';
import { BarChart2, PackageIcon, ClipboardListIcon, UsersIcon, EditIcon, LayersIcon, UserIcon, ImagePlus, FileTextIcon } from '../components/Icons';
import { checkServerConnection } from '../utils/apiClient';

// Import Components
import DashboardTab from '../components/admin/DashboardTab';
import ProductTab from '../components/admin/ProductTab';
import OrderTab from '../components/admin/OrderTab';
import InventoryTab from '../components/admin/InventoryTab';
import CustomerTab from '../components/admin/CustomerTab';
import SettingsTab from '../components/admin/SettingsTab';
import ReportsTab from '../components/admin/ReportsTab';

// Import Setting Components
import HomePageSettingsTab from '../components/admin/settings/HomePageSettingsTab';
import HeaderSettingsTab from '../components/admin/settings/HeaderSettingsTab';
import AboutPageSettingsTab from '../components/admin/settings/AboutPageSettingsTab';
import ProductPageSettingsTab from '../components/admin/settings/ProductPageSettingsTab';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'reports' | 'settings' | 'home' | 'header' | 'about' | 'products_ui'>('dashboard');
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
        setCurrentAdminUser(JSON.parse(userStr));
    } else if (sessionStorage.getItem('isAuthenticated') === 'true') {
        setCurrentAdminUser({ id: 'local_master', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER', permissions: ['ALL'] });
    }
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
      setIsCheckingConnection(true);
      try {
          const online = await checkServerConnection();
          setIsServerOnline(online);
      } catch (e) {
          setIsServerOnline(false);
      } finally {
          setIsCheckingConnection(false);
      }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('adminUser');
    window.location.hash = '/';
  };

  const hasPermission = (perm: string) => {
      if (!currentAdminUser) return false;
      if (currentAdminUser.role === 'MASTER' || currentAdminUser.username === 'admin') return true;
      return currentAdminUser.permissions?.includes(perm) || currentAdminUser.permissions?.includes('ALL');
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'products': return <ProductTab />;
      case 'orders': return <OrderTab />;
      case 'inventory': return <InventoryTab />;
      case 'customers': return <CustomerTab />;
      case 'reports': return <ReportsTab />; 
      case 'home': return <HomePageSettingsTab />;     
      case 'header': return <HeaderSettingsTab />;     
      case 'about': return <AboutPageSettingsTab />;   
      case 'products_ui': return <ProductPageSettingsTab />;   
      case 'settings': return <SettingsTab currentUser={currentAdminUser} />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row">
      {!isServerOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-[100] text-sm font-bold">Mất kết nối Server! Chế độ Offline.</div>
      )}
      <aside className="bg-[#111827] text-white w-full md:w-64 flex-shrink-0 print:hidden">
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <div className="bg-[#D4AF37] p-2 rounded-lg"><BarChart2 className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-bold font-serif tracking-wider">Sigma Admin</h1>
        </div>
        <nav className="p-4 space-y-1">
           {hasPermission('dashboard') && (
               <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'dashboard' ? 'bg-[#D4AF37]' : 'text-gray-400 hover:bg-gray-800'}`}>
                <BarChart2 className="w-5 h-5" /> Tổng quan
              </button>
           )}
           {hasPermission('products') && (
               <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'products' ? 'bg-[#D4AF37]' : 'text-gray-400 hover:bg-gray-800'}`}>
                <PackageIcon className="w-5 h-5" /> Sản phẩm
              </button>
           )}
           {hasPermission('orders') && (
              <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'orders' ? 'bg-[#D4AF37]' : 'text-gray-400 hover:bg-gray-800'}`}>
                <ClipboardListIcon className="w-5 h-5" /> Đơn hàng
              </button>
           )}
           {hasPermission('inventory') && (
              <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'inventory' ? 'bg-[#D4AF37]' : 'text-gray-400 hover:bg-gray-800'}`}>
                <BarChart2 className="w-5 h-5" /> Kho hàng
              </button>
           )}
           {hasPermission('customers') && (
               <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg ${activeTab === 'customers' ? 'bg-[#D4AF37]' : 'text-gray-400 hover:bg-gray-800'}`}>
                <UsersIcon className="w-5 h-5" /> Khách hàng
              </button>
           )}
           {hasPermission('settings_ui') && (
               <div className="pt-4 mt-4 border-t border-gray-700">
                    <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Giao diện Web</p>
                    <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${activeTab === 'home' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Trang chủ</button>
                    <button onClick={() => setActiveTab('products_ui')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${activeTab === 'products_ui' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Sản phẩm</button>
                    <button onClick={() => setActiveTab('header')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${activeTab === 'header' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Header & Logo</button>
                    <button onClick={() => setActiveTab('about')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm ${activeTab === 'about' ? 'text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Giới thiệu</button>
               </div>
           )}
           <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mt-4 ${activeTab === 'settings' ? 'bg-[#D4AF37]' : 'text-gray-400 hover:bg-gray-800'}`}>
            <UserIcon className="w-5 h-5" /> Cài đặt chung
           </button>
        </nav>
        <div className="p-4 mt-auto border-t border-gray-700">
             <a href="#/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 px-4 text-sm">← Cửa hàng</a>
             <button onClick={handleLogout} className="w-full bg-red-600 text-white py-2 rounded-lg text-sm font-bold">Đăng xuất</button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-8 print:hidden">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">
                {activeTab === 'dashboard' ? 'Tổng quan' : 
                 activeTab === 'products' ? 'Sản phẩm' : 
                 activeTab === 'orders' ? 'Đơn hàng' : 
                 activeTab === 'inventory' ? 'Kho hàng' : 
                 activeTab === 'customers' ? 'Khách hàng' : 
                 activeTab === 'reports' ? 'Báo cáo' : 
                 activeTab === 'home' ? 'Trang chủ' :
                 activeTab === 'products_ui' ? 'Giao diện Sản phẩm' :
                 activeTab === 'header' ? 'Header & Logo' :
                 activeTab === 'about' ? 'Giới thiệu' : 'Cài đặt'}
            </h2>
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase">{new Date().toLocaleDateString('vi-VN')}</span>
                <div className="w-10 h-10 bg-[#D4AF37] rounded-full flex items-center justify-center text-white font-black shadow-lg">A</div>
            </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
};

export default AdminPage;
