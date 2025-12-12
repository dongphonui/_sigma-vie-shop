
import React, { useEffect, useState } from 'react';
import { getHeaderSettings } from '../utils/headerSettingsStorage';
import { getCurrentCustomer, logoutCustomer } from '../utils/customerStorage';
import { forceReloadProducts } from '../utils/productStorage';
import type { HeaderSettings, Customer } from '../types';

interface HeaderProps {
    onOpenAuth?: () => void;
    currentUser?: Customer | null;
    cartItemCount?: number;
    onOpenCart?: () => void;
}

const UserIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const ShoppingBagIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
);

const Header: React.FC<HeaderProps> = ({ onOpenAuth, currentUser, cartItemCount = 0, onOpenCart }) => {
  const [settings, setSettings] = useState<HeaderSettings | null>(null);
  const [userMenuVisible, setUserMenuVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setSettings(getHeaderSettings());
  }, []);

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.location.hash = path;
  };

  const handleLogout = () => {
      logoutCustomer();
      window.location.hash = '#/'; 
      window.location.reload(); 
  };

  const handleManualRefresh = async () => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      try {
          const updatedProducts = await forceReloadProducts();
          
          // Kiểm tra xem dữ liệu có thực sự được tải không
          // Chúng ta không hiển thị alert vì UX, nhưng có thể console.log
          console.log("Dữ liệu đã được làm mới:", updatedProducts.length, "sản phẩm");
          
      } catch (e) {
          console.error("Refresh failed", e);
          alert("Không thể kết nối với máy chủ. Vui lòng kiểm tra Wifi hoặc Tường lửa trên máy tính.");
      } finally {
          // Delay tắt xoay để người dùng cảm nhận được hành động
          setTimeout(() => setIsRefreshing(false), 800);
      }
  };

  const brandStyle = settings ? {
    color: settings.brandColor,
    fontSize: settings.brandFontSize,
    fontFamily: `'${settings.brandFont}', serif`,
    textShadow: settings.brandColor === '#00695C' ? `
      1px 1px 0px #b2dfdb, 
      2px 2px 0px #80cbc4, 
      3px 3px 0px #4db6ac, 
      4px 4px 8px rgba(0, 0, 0, 0.2)` : 'none'
  } : {};

  const navStyle = settings ? {
      color: settings.navColor,
      fontFamily: `'${settings.navFont}', sans-serif`,
      fontSize: settings.navFontSize,
  } : {};

  const loginBtnStyle = settings ? {
      color: settings.loginBtnTextColor,
      backgroundColor: settings.loginBtnBgColor,
      fontFamily: `'${settings.loginBtnFont}', sans-serif`,
      fontSize: settings.loginBtnFontSize,
  } : {};

  return (
    <header 
      className="backdrop-blur-md shadow-sm sticky top-0 z-40 transition-all duration-300"
      style={{ 
          backgroundColor: settings?.brandBackgroundColor || 'rgba(255, 255, 255, 0.8)',
          borderBottomWidth: settings?.borderWidth || '0px',
          borderBottomColor: settings?.borderColor || 'transparent',
          borderBottomStyle: (settings?.borderStyle || 'solid') as any,
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <a 
            href="#/" 
            onClick={(e) => handleNavigate(e, '/')} 
            className="font-bold tracking-wider cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 flex items-center gap-3"
          >
            {settings?.logoUrl && (
                <img 
                    src={settings.logoUrl} 
                    alt={settings.brandName} 
                    className="h-12 w-auto object-contain max-w-[150px]" 
                />
            )}
            <span style={brandStyle}>
                {settings ? settings.brandName : 'Sigma Vie'}
            </span>
          </a>
          
          <div className="flex items-center space-x-8">
            <nav className="hidden md:flex items-center space-x-8">
                <a 
                    href="#/" 
                    onClick={(e) => handleNavigate(e, '/')} 
                    className="transition-colors font-medium"
                    style={navStyle}
                    onMouseEnter={(e) => e.currentTarget.style.color = settings?.navHoverColor || '#D4AF37'}
                    onMouseLeave={(e) => e.currentTarget.style.color = settings?.navColor || '#4B5563'}
                >
                    {settings ? settings.navStoreText : 'Cửa Hàng'}
                </a>
                <a 
                    href="#/about" 
                    onClick={(e) => handleNavigate(e, '/about')} 
                    className="transition-colors font-medium"
                    style={navStyle}
                    onMouseEnter={(e) => e.currentTarget.style.color = settings?.navHoverColor || '#D4AF37'}
                    onMouseLeave={(e) => e.currentTarget.style.color = settings?.navColor || '#4B5563'}
                >
                    {settings ? settings.navAboutText : 'Về Chúng Tôi'}
                </a>
            </nav>

            <div className="flex items-center gap-4">
                {/* Refresh Button (Mobile Friendly) */}
                <button 
                    onClick={handleManualRefresh}
                    className={`p-2 text-gray-600 transition-all rounded-full hover:bg-gray-100 ${isRefreshing ? 'bg-yellow-50 text-[#D4AF37]' : 'hover:text-[#D4AF37]'}`}
                    title="Làm mới dữ liệu từ Server"
                >
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Cart Icon */}
                <button 
                    onClick={onOpenCart}
                    className="relative p-2 text-gray-600 hover:text-[#D4AF37] transition-colors"
                >
                    <ShoppingBagIcon className="w-6 h-6" />
                    {cartItemCount > 0 && (
                        <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center shadow-sm">
                            {cartItemCount}
                        </span>
                    )}
                </button>

                {/* User Section */}
                <div className="relative">
                    {currentUser ? (
                        <div className="relative">
                            <button 
                                onClick={() => setUserMenuVisible(!userMenuVisible)}
                                className="flex items-center gap-2 text-gray-700 hover:text-[#00695C] transition-colors"
                            >
                                <span className="text-sm font-medium hidden sm:block">Xin chào, {currentUser.fullName.split(' ').pop()}</span>
                                <div className="bg-teal-100 p-2 rounded-full">
                                    <UserIcon className="w-5 h-5 text-[#00695C]"/>
                                </div>
                            </button>
                            
                            {/* Dropdown Menu */}
                            {userMenuVisible && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 animate-fade-in-up">
                                    <div className="px-4 py-2 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-900 truncate">{currentUser.fullName}</p>
                                        <p className="text-xs text-gray-500 truncate">{currentUser.email || currentUser.phoneNumber}</p>
                                    </div>
                                    <a 
                                        href="#/my-orders" 
                                        onClick={(e) => handleNavigate(e, '/my-orders')}
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Đơn hàng của tôi
                                    </a>
                                    <button 
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                    >
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button 
                            onClick={onOpenAuth}
                            className="flex items-center gap-2 font-medium px-4 py-2 rounded-full transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            style={loginBtnStyle}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                            <UserIcon className="w-4 h-4"/>
                            <span>{settings ? settings.loginBtnText : 'Đăng nhập'}</span>
                        </button>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
