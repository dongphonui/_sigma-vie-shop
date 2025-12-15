
import React, { useState, useEffect } from 'react';
import type { AdminUser } from '../types';
import { BarChart2, PackageIcon, ClipboardListIcon, UsersIcon, EditIcon, LayersIcon, UserIcon, ImagePlus } from '../components/Icons';

// Import Components
import DashboardTab from '../components/admin/DashboardTab';
import ProductTab from '../components/admin/ProductTab';
import OrderTab from '../components/admin/OrderTab';
import InventoryTab from '../components/admin/InventoryTab';
import CustomerTab from '../components/admin/CustomerTab';
import SettingsTab from '../components/admin/SettingsTab';

// Import Setting Components Directly
import HomePageSettingsTab from '../components/admin/settings/HomePageSettingsTab';
import HeaderSettingsTab from '../components/admin/settings/HeaderSettingsTab';
import AboutPageSettingsTab from '../components/admin/settings/AboutPageSettingsTab';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'inventory' | 'customers' | 'settings' | 'home' | 'header' | 'about'>('dashboard');
  const [currentAdminUser, setCurrentAdminUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    // 1. Try to get detailed user info
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
        setCurrentAdminUser(JSON.parse(userStr));
    } else {
        // 2. FALLBACK for Legacy Login (Fixes "Empty Menu" issue)
        // If authenticated but no user object exists, assume it's the local Master Admin
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
  }, []);

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

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardTab />;
      case 'products': return <ProductTab />;
      case 'orders': return <OrderTab />;
      case 'inventory': return <InventoryTab />;
      case 'customers': return <CustomerTab />;
      case 'home': return <HomePageSettingsTab />;     // New Tab
      case 'header': return <HeaderSettingsTab />;     // New Tab
      case 'about': return <AboutPageSettingsTab />;   // New Tab
      case 'settings': return <SettingsTab currentUser={currentAdminUser} />;
      default: return <DashboardTab />;
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
        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-180px)]">
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
           {hasPermission('customers') && (
               <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'customers' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <UsersIcon className="w-5 h-5" /> Khách hàng
              </button>
           )}
           
           {/* GIAO DIỆN SECTION */}
           {(hasPermission('settings') || hasPermission('ALL')) && (
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

           {hasPermission('settings') && (
               <div className="pt-2 mt-2">
                   <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-[#D4AF37] text-white font-bold' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    <UserIcon className="w-5 h-5" /> Cài đặt chung
                  </button>
               </div>
           )}
        </nav>
        
        <div className="p-4 mt-auto border-t border-gray-700">
             <a href="#/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 px-4 text-sm">← Về Cửa hàng</a>
             <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors font-medium text-sm">Đăng xuất</button>
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
