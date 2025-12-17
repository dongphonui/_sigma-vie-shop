
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

// Import Setting Components Directly
import HomePageSettingsTab from '../components/admin/settings/HomePageSettingsTab';
import HeaderSettingsTab from '../components/admin/settings/HeaderSettingsTab';
import AboutPageSettingsTab from '../components/admin/settings/AboutPageSettingsTab';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'reports' | 'settings' | 'home' | 'header' | 'about'>('dashboard');
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);
  
  // Server Connection State
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);

  useEffect(() => {
    // 1. Try to get detailed user info
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
        setCurrentAdminUser(JSON.parse(userStr));
    } else {
        // 2. FALLBACK for Legacy Login (Fixes "Empty Menu" issue)
        const isAuth = sessionStorage.getItem('isAuthenticated') === 'true';
        if (isAuth) {
            setCurrentAdminUser({
                id: 'local_master',
                username: 'admin',
                fullname: 'Quản trị viên',
                role: 'MASTER',
                permissions: ['ALL']
            });
        }
    }

    // 3. Start Connection Check Loop
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
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

  const handleRetryConnection = () => {
      checkStatus();
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('adminUser');
    window.location.hash = '/';
  };

  const hasPermission = (perm: string) => {
      if (!currentAdminUser) return false;
      // Master always has permission
      if (currentAdminUser.role === 'MASTER' || currentAdminUser.username === 'admin') return true;
      // Check specific permission or ALL
      return currentAdminUser.permissions?.includes(perm) || currentAdminUser.permissions?.includes('ALL');
  };

  // Helper to check if user has ANY setting permission to show the "Settings" tab
  const canAccessGeneralSettings = () => {
      return hasPermission('settings_info') || 
             hasPermission('settings_shipping') || 
             hasPermission('settings_data') || 
             hasPermission('settings_logs') ||
             hasPermission('settings_accounts') || // Usually for Master
             hasPermission('ALL');
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
      case 'settings': return <SettingsTab currentUser={currentAdminUser} />;
      default: return <DashboardTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row">
      
      {/* Offline Warning Banner */}
      {!isServerOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 text-sm font-bold shadow-md flex items-center justify-center gap-3 z-[100]">
            <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Mất kết nối Server! Chế độ Offline.
            </span>
            <button 
                onClick={handleRetryConnection} 
                disabled={isCheckingConnection}
                className="bg-white text-red-600 px-3 py-0.5 rounded text-xs hover:bg-gray-100 disabled:opacity-70 flex items-center gap-1"
            >
                {isCheckingConnection ? (
                    <svg className="animate-spin h-3 w-3 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                )}
                {isCheckingConnection ? 'Đang thử...' : 'Kết nối lại'}
            </button>
        </div>
      )}

      <aside className={`bg-[#111827] text-white w-full md:w-64 flex-shrink-0 ${!isServerOnline ? 'pt-8 md:pt-0' : ''} print:hidden`}>
        <div className="p-6 border-b border-gray-700 flex items-center gap-3">
          <div className="bg-[#D4AF37] p-2 rounded-lg">
             <BarChart2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold font-serif tracking-wider">Sigma Admin</h1>
        </div>
        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
           {hasPermission('dashboard') && (
               <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <BarChart2 className="w-5 h-5" /> Tổng quan
              </button>
           )}
           {hasPermission('products') && (
               <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'products' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <PackageIcon className="w-5 h-5" /> Sản phẩm
              </button>
           )}
           {hasPermission('orders') && (
              <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <ClipboardListIcon className="w-5 h-5" /> Đơn hàng
              </button>
           )}
           {hasPermission('inventory') && (
              <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inventory' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <BarChart2 className="w-5 h-5" /> Kho hàng
              </button>
           )}
           
           {/* CUSTOMERS TAB */}
           {hasPermission('customers') && (
               <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <UsersIcon className="w-5 h-5" /> Khách hàng
              </button>
           )}
           
           {/* REPORTS TAB */}
           {hasPermission('reports') && (
               <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reports' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <FileTextIcon className="w-5 h-5" /> Báo cáo
              </button>
           )}
           
           {/* GIAO DIỆN SECTION */}
           {(hasPermission('settings_ui') || hasPermission('ALL')) && (
               <div className="pt-4 mt-4 border-t border-gray-700">
                    <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Giao diện Web</p>
                    <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'home' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <EditIcon className="w-5 h-5" /> Trang chủ
                    </button>
                    <button onClick={() => setActiveTab('header')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'header' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <LayersIcon className="w-5 h-5" /> Header & Logo
                    </button>
                    <button onClick={() => setActiveTab('about')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'about' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <ImagePlus className="w-5 h-5" /> Giới thiệu
                    </button>
               </div>
           )}

           {canAccessGeneralSettings() && (
               <div className="pt-2 mt-2">
                   <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    <UserIcon className="w-5 h-5" /> Cài đặt chung
                  </button>
               </div>
           )}
        </nav>
        
        <div className="p-4 mt-auto border-t border-gray-700">
             <div className="mb-4 px-4 flex items-center gap-3 text-xs" title="Trạng thái kết nối Server Database">
                 <span className="relative flex h-3 w-3">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCheckingConnection ? 'bg-yellow-400' : (isServerOnline ? 'bg-green-400' : 'bg-red-400')}`}></span>
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isCheckingConnection ? 'bg-yellow-500' : (isServerOnline ? 'bg-green-500' : 'bg-red-500')}`}></span>
                 </span>
                 <span className={`font-medium ${isServerOnline ? 'text-green-400' : (isCheckingConnection ? 'text-yellow-400' : 'text-red-400')}`}>
                     {isCheckingConnection ? 'Đang kiểm tra...' : (isServerOnline ? 'Hệ thống Online' : 'Mất kết nối')}
                 </span>
             </div>

             <a href="#/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 px-4 text-sm">← Về Cửa hàng</a>
             <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm">Đăng xuất</button>
        </div>
      </aside>

      <main className={`flex-1 p-4 md:p-8 overflow-y-auto ${!isServerOnline ? 'pt-12 md:pt-12' : ''} print:p-0 print:overflow-visible`}>
        <header className="flex justify-between items-center mb-8 print:hidden">
            <h2 className="text-2xl font-bold text-gray-800 font-serif">
                {activeTab === 'dashboard' ? 'Tổng quan Hệ thống' : 
                 activeTab === 'products' ? 'Quản lý Sản phẩm' : 
                 activeTab === 'orders' ? 'Quản lý Đơn hàng' : 
                 activeTab === 'inventory' ? 'Nhập xuất Kho' : 
                 activeTab === 'customers' ? 'Danh sách Khách hàng' : 
                 activeTab === 'reports' ? 'Báo cáo & Thống kê' : 
                 activeTab === 'home' ? 'Cấu hình Trang chủ' :
                 activeTab === 'header' ? 'Cấu hình Header & Logo' :
                 activeTab === 'about' ? 'Nội dung trang Giới thiệu' :
                 'Cài đặt & Bảo mật'}
            </h2>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <span className="text-sm font-bold text-gray-800 block">{currentAdminUser ? currentAdminUser.fullname : 'Quản trị viên'}</span>
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
