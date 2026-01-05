
import React, { useState, useEffect } from 'react';
import type { AdminUser } from '../types';
import { 
    BarChart2, PackageIcon, ClipboardListIcon, UsersIcon, LayersIcon, 
    UserIcon, FileTextIcon, ActivityIcon, RefreshIcon, AlertCircleIcon, 
    CheckIcon, SettingsIcon, MonitorIcon 
} from '../components/Icons';
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
    // Tự động kiểm tra mỗi 30 giây
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
          setTimeout(() => setIsCheckingConnection(false), 600);
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
    <div className="min-h-screen bg-[#F7F5F2] flex flex-col md:flex-row font-sans">
      {/* THANH THÔNG BÁO OFFLINE KHI MẤT KẾT NỐI */}
      {!isServerOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white py-2 z-[1000] text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl">
          <AlertCircleIcon className="w-4 h-4 animate-pulse" />
          Mất kết nối máy chủ - Đang hoạt động ở chế độ Ngoại tuyến
          <button onClick={checkStatus} className="bg-white text-red-600 px-3 py-0.5 rounded-full hover:bg-red-50 transition-all">Thử lại</button>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside className="bg-[#111827] text-white w-full md:w-72 flex-shrink-0 print:hidden shadow-2xl z-20 flex flex-col h-screen sticky top-0">
        <div className="p-8 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-[#B4975A] p-2.5 rounded-xl shadow-lg shadow-amber-900/20">
            <ActivityIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Sigma Admin</h1>
            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mt-1">Management Suite</p>
          </div>
        </div>

        {/* ĐÈN BÁO KẾT NỐI SERVER TẠI MENU */}
        <div className="px-6 py-4 border-b border-gray-800/50 bg-black/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] ${isServerOnline ? 'bg-emerald-500 animate-pulse shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`}></div>
                <div className="flex flex-col">
                    <span className={`text-[9px] font-black uppercase tracking-wider ${isServerOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isServerOnline ? 'Server Online' : 'Server Offline'}
                    </span>
                    <span className="text-[8px] text-gray-500 font-medium">Đồng bộ đám mây</span>
                </div>
            </div>
            <button 
                onClick={checkStatus} 
                disabled={isCheckingConnection}
                className="p-2 hover:bg-white/5 rounded-lg transition-all active:scale-90 disabled:opacity-30"
                title="Làm mới kết nối"
            >
                <RefreshIcon className={`w-3.5 h-3.5 text-gray-400 ${isCheckingConnection ? 'animate-spin text-[#B4975A]' : ''}`} />
            </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
           {hasPermission('dashboard') && (
               <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-[#B4975A] text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <BarChart2 className="w-5 h-5" /> <span className="text-sm font-bold">Tổng quan</span>
              </button>
           )}
           {hasPermission('products') && (
               <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all ${activeTab === 'products' ? 'bg-[#B4975A] text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <PackageIcon className="w-5 h-5" /> <span className="text-sm font-bold">Sản phẩm</span>
              </button>
           )}
           {hasPermission('orders') && (
              <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-[#B4975A] text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <ClipboardListIcon className="w-5 h-5" /> <span className="text-sm font-bold">Đơn hàng</span>
              </button>
           )}
           {hasPermission('inventory') && (
              <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-[#B4975A] text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <LayersIcon className="w-5 h-5" /> <span className="text-sm font-bold">Kho hàng</span>
              </button>
           )}
           {hasPermission('customers') && (
               <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all ${activeTab === 'customers' ? 'bg-[#B4975A] text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <UsersIcon className="w-5 h-5" /> <span className="text-sm font-bold">Khách hàng</span>
              </button>
           )}
           {hasPermission('reports') && (
               <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-[#B4975A] text-white shadow-xl translate-x-1' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                <FileTextIcon className="w-5 h-5" /> <span className="text-sm font-bold">Báo cáo</span>
              </button>
           )}

           {hasPermission('settings_ui') && (
               <div className="pt-6 mt-6 border-t border-gray-800/50">
                    <p className="px-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <MonitorIcon className="w-3 h-3" /> Giao diện Website
                    </p>
                    <button onClick={() => setActiveTab('home')} className={`w-full text-left px-5 py-2.5 rounded-xl text-xs transition-all ${activeTab === 'home' ? 'text-[#B4975A] font-black bg-white/5' : 'text-gray-500 hover:text-white'}`}>Trang chủ</button>
                    <button onClick={() => setActiveTab('products_ui')} className={`w-full text-left px-5 py-2.5 rounded-xl text-xs transition-all ${activeTab === 'products_ui' ? 'text-[#B4975A] font-black bg-white/5' : 'text-gray-500 hover:text-white'}`}>Trang Sản phẩm</button>
                    <button onClick={() => setActiveTab('header')} className={`w-full text-left px-5 py-2.5 rounded-xl text-xs transition-all ${activeTab === 'header' ? 'text-[#B4975A] font-black bg-white/5' : 'text-gray-500 hover:text-white'}`}>Header & Logo</button>
                    <button onClick={() => setActiveTab('about')} className={`w-full text-left px-5 py-2.5 rounded-xl text-xs transition-all ${activeTab === 'about' ? 'text-[#B4975A] font-black bg-white/5' : 'text-gray-500 hover:text-white'}`}>Trang Giới thiệu</button>
               </div>
           )}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-800">
             <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl mb-4 transition-all ${activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                <UserIcon className="w-5 h-5" /> <span className="text-sm font-bold">Cấu hình hệ thống</span>
             </button>
             <button onClick={handleLogout} className="w-full bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Đăng xuất</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-h-screen">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 print:hidden">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="w-8 h-[1px] bg-[#B4975A]"></span>
                    <p className="text-[10px] font-black text-[#B4975A] uppercase tracking-[0.4em]">Sigma Vie Hub</p>
                </div>
                <h2 className="text-4xl font-black text-[#111827] uppercase tracking-tighter">
                    {activeTab === 'dashboard' ? 'Bảng điều khiển' : 
                     activeTab === 'products' ? 'Danh mục Sản phẩm' : 
                     activeTab === 'orders' ? 'Đơn hàng' : 
                     activeTab === 'inventory' ? 'Kho hàng' : 
                     activeTab === 'customers' ? 'Khách hàng' : 
                     activeTab === 'reports' ? 'Báo cáo & Thống kê' : 
                     activeTab === 'home' ? 'Giao diện Trang chủ' :
                     activeTab === 'products_ui' ? 'Giao diện Sản phẩm' :
                     activeTab === 'header' ? 'Header & Logo' :
                     activeTab === 'about' ? 'Trang Giới thiệu' : 'Hệ thống'}
                </h2>
            </div>
            
            <div className="flex items-center gap-6 bg-white p-3 pr-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-[#B4975A] font-black shadow-lg text-xl">
                    {currentAdminUser?.fullname?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="text-left">
                    <p className="text-xs font-black text-[#111827] uppercase leading-none">{currentAdminUser?.fullname}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {currentAdminUser?.role === 'MASTER' ? 'Quản trị tối cao' : 'Nhân viên vận hành'}
                    </p>
                </div>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto pb-20">
            {renderContent()}
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #374151; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #4B5563; }
      `}</style>
    </div>
  );
};

export default AdminPage;
