
import React, { useState, useEffect } from 'react';
import type { AdminUser } from '../types';
import { BarChart2, PackageIcon, ClipboardListIcon, UsersIcon, LayersIcon, UserIcon, FileTextIcon, ActivityIcon, RefreshIcon, AlertCircleIcon, CheckIcon } from '../components/Icons';
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
    // Kiểm tra định kỳ mỗi 30 giây
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
          setTimeout(() => setIsCheckingConnection(false), 500); // Tạo hiệu ứng mượt
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
      {/* THANH THÔNG BÁO OFFLINE CẢI TIẾN */}
      {!isServerOnline && (
        <div className="fixed top-0 left-0 right-0 bg-rose-600 text-white py-2.5 z-[1000] text-sm font-black flex items-center justify-center gap-4 shadow-2xl animate-bounce-short">
          <AlertCircleIcon className="w-5 h-5" />
          <span className="uppercase tracking-widest">Hệ thống đang hoạt động Ngoại tuyến (Offline Mode)</span>
          <button 
            onClick={checkStatus} 
            disabled={isCheckingConnection}
            className="bg-white text-rose-600 px-4 py-1 rounded-full text-[10px] hover:bg-rose-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshIcon className={`w-3 h-3 ${isCheckingConnection ? 'animate-spin' : ''}`} />
            {isCheckingConnection ? 'Đang thử...' : 'KẾT NỐI LẠI'}
          </button>
        </div>
      )}

      <aside className="bg-[#111827] text-white w-full md:w-64 flex-shrink-0 print:hidden shadow-2xl z-20">
        <div className="p-8 border-b border-gray-800 flex items-center gap-3">
          <div className="bg-[#D4AF37] p-2.5 rounded-xl shadow-lg"><ActivityIcon className="w-6 h-6 text-white" /></div>
          <h1 className="text-xl font-black font-sans tracking-tighter uppercase">Sigma Admin</h1>
        </div>
        <nav className="p-4 space-y-1">
           {hasPermission('dashboard') && (
               <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <BarChart2 className="w-5 h-5" /> Tổng quan
              </button>
           )}
           {hasPermission('products') && (
               <button onClick={() => setActiveTab('products')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${activeTab === 'products' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <PackageIcon className="w-5 h-5" /> Sản phẩm
              </button>
           )}
           {hasPermission('orders') && (
              <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${activeTab === 'orders' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <ClipboardListIcon className="w-5 h-5" /> Đơn hàng
              </button>
           )}
           {hasPermission('inventory') && (
              <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <LayersIcon className="w-5 h-5" /> Kho hàng
              </button>
           )}
           {hasPermission('customers') && (
               <button onClick={() => setActiveTab('customers')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${activeTab === 'customers' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <UsersIcon className="w-5 h-5" /> Khách hàng
              </button>
           )}
           {hasPermission('reports') && (
               <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl transition-all ${activeTab === 'reports' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <FileTextIcon className="w-5 h-5" /> Báo cáo
              </button>
           )}

           {hasPermission('settings_ui') && (
               <div className="pt-6 mt-6 border-t border-gray-800">
                    <p className="px-5 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Giao diện Web</p>
                    <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm transition-all ${activeTab === 'home' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Trang chủ</button>
                    <button onClick={() => setActiveTab('products_ui')} className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm transition-all ${activeTab === 'products_ui' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Sản phẩm</button>
                    <button onClick={() => setActiveTab('header')} className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm transition-all ${activeTab === 'header' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Header & Logo</button>
                    <button onClick={() => setActiveTab('about')} className={`w-full flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm transition-all ${activeTab === 'about' ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'}`}>Giới thiệu</button>
               </div>
           )}
           <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-5 py-3 rounded-xl mt-6 transition-all ${activeTab === 'settings' ? 'bg-[#D4AF37] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
            <UserIcon className="w-5 h-5" /> Cài đặt chung
           </button>
        </nav>
        <div className="p-4 mt-auto border-t border-gray-800">
             <a href="#/" className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 px-5 text-sm transition-colors font-bold uppercase tracking-tighter italic">← Về Cửa hàng</a>
             <button onClick={handleLogout} className="w-full bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Đăng xuất</button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-10 overflow-y-auto">
        <header className="flex justify-between items-start mb-10 print:hidden">
            <div>
                <p className="text-[10px] font-black text-[#B4975A] uppercase tracking-[0.4em] mb-1">Sigma Vie Management</p>
                <h2 className="text-3xl font-black text-[#111827] uppercase tracking-tighter">
                    {activeTab === 'dashboard' ? 'Tổng quan' : 
                     activeTab === 'products' ? 'Danh mục Vật phẩm' : 
                     activeTab === 'orders' ? 'Quản lý Đơn hàng' : 
                     activeTab === 'inventory' ? 'Kiểm soát Kho' : 
                     activeTab === 'customers' ? 'Tài khoản Khách hàng' : 
                     activeTab === 'reports' ? 'Thống kê & Báo cáo' : 
                     activeTab === 'home' ? 'Giao diện Trang chủ' :
                     activeTab === 'products_ui' ? 'Cấu hình Sản phẩm' :
                     activeTab === 'header' ? 'Header & Logo' :
                     activeTab === 'about' ? 'Trang Giới thiệu' : 'Hệ thống'}
                </h2>
                
                {/* INDICATOR TRẠNG THÁI SERVER TRONG HEADER */}
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isServerOnline ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isServerOnline ? 'Máy chủ: Trực tuyến' : 'Máy chủ: Ngoại tuyến'}
                  </span>
                  <button 
                    onClick={checkStatus} 
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors ml-1"
                    title="Kiểm tra kết nối"
                  >
                    <RefreshIcon className={`w-3 h-3 text-slate-400 ${isCheckingConnection ? 'animate-spin' : ''}`} />
                  </button>
                </div>
            </div>
            
            <div className="flex items-center gap-5">
                <div className="text-right hidden sm:block">
                    <p className="text-xs font-black text-[#111827]">{currentAdminUser?.fullname}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Quản trị viên</p>
                </div>
                <div className="w-12 h-12 bg-[#111827] rounded-2xl flex items-center justify-center text-white font-black shadow-2xl border border-white/10 text-xl">A</div>
            </div>
        </header>
        <div className="max-w-7xl mx-auto">
            {renderContent()}
        </div>
      </main>

      <style>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-short {
          animation: bounce-short 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default AdminPage;
