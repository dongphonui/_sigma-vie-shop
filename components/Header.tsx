
import React, { useEffect, useState } from 'react';
import { getHeaderSettings } from '../utils/headerSettingsStorage';
import { getCurrentCustomer, logoutCustomer } from '../utils/customerStorage';
import { hardResetProducts } from '../utils/productStorage';
import { API_BASE_URL } from '../utils/apiClient';
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
      const confirmReset = window.confirm("Cập nhật dữ liệu mới nhất từ xưởng may Sigma Vie?");
      if (!confirmReset) return;
      setIsRefreshing(true);
      try {
          await hardResetProducts();
          window.location.reload();
      } catch (e) {
          alert(`Lỗi kết nối.`);
      } finally {
          setIsRefreshing(false);
      }
  };

  return (
    <header className="backdrop-blur-md shadow-sm sticky top-0 z-40 bg-white/80 border-b border-[#064E3B]/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24">
          <a 
            href="#/" 
            onClick={(e) => handleNavigate(e, '/')} 
            className="font-bold tracking-[0.2em] cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 flex items-center gap-4"
          >
            {settings?.logoUrl && (
                <img src={settings.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
            )}
            <div className="flex flex-col">
                <span className="text-2xl font-serif font-black text-[#064E3B] leading-none uppercase">Sigma Vie</span>
                <span className="text-[8px] font-black text-[#92400E] uppercase tracking-[0.5em] mt-1">Fashion Boutique</span>
            </div>
          </a>
          
          <div className="flex items-center space-x-10">
            <nav className="hidden lg:flex items-center space-x-10">
                <a 
                    href="#/" 
                    onClick={(e) => handleNavigate(e, '/')} 
                    className="text-[#064E3B] font-black text-[10px] uppercase tracking-[0.3em] hover:text-[#92400E] transition-colors"
                >
                    {settings?.navStoreText || 'Collections'}
                </a>
                <a 
                    href="#/about" 
                    onClick={(e) => handleNavigate(e, '/about')} 
                    className="text-[#064E3B] font-black text-[10px] uppercase tracking-[0.3em] hover:text-[#92400E] transition-colors"
                >
                    {settings?.navAboutText || 'Our Story'}
                </a>
            </nav>

            <div className="flex items-center gap-6">
                <button onClick={handleManualRefresh} className="p-2 text-[#064E3B]/40 hover:text-[#92400E] transition-all">
                    <RefreshIcon className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-[#92400E]' : ''}`} />
                </button>

                <button onClick={onOpenCart} className="relative p-2 text-[#064E3B] hover:text-[#92400E] transition-colors">
                    <ShoppingBagIcon className="w-6 h-6" />
                    {cartItemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-[#92400E] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">
                            {cartItemCount}
                        </span>
                    )}
                </button>

                <div className="relative">
                    {currentUser ? (
                        <div className="relative">
                            <button onClick={() => setUserMenuVisible(!userMenuVisible)} className="flex items-center gap-3 group">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[9px] font-black text-[#92400E] uppercase tracking-widest">Member</p>
                                    <p className="text-xs font-bold text-[#064E3B]">{currentUser.fullName.split(' ').pop()}</p>
                                </div>
                                <div className="bg-[#064E3B] p-2.5 rounded-2xl group-hover:bg-[#92400E] transition-colors shadow-lg">
                                    <UserIcon className="w-5 h-5 text-white"/>
                                </div>
                            </button>
                            {userMenuVisible && (
                                <div className="absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl py-3 border border-slate-50 animate-fade-in-up">
                                    <div className="px-5 py-3 border-b border-slate-50 mb-2">
                                        <p className="text-[10px] font-black text-[#92400E] uppercase tracking-widest">Tài khoản</p>
                                        <p className="text-sm font-bold text-[#064E3B] truncate">{currentUser.fullName}</p>
                                    </div>
                                    <a href="#/my-orders" onClick={(e) => handleNavigate(e, '/my-orders')} className="block px-5 py-2 text-xs font-bold text-slate-600 hover:text-[#064E3B] hover:bg-slate-50">Lịch sử đơn hàng</a>
                                    <button onClick={handleLogout} className="block w-full text-left px-5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50">Đăng xuất</button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button onClick={onOpenAuth} className="btn-primary py-3 px-8 rounded-full shadow-[#064E3B]/10">
                            Đăng nhập
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
