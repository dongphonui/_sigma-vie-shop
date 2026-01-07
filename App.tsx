
import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import AdminOTPPage from './pages/AdminOTPPage';
import MyOrdersPage from './pages/MyOrdersPage';
import ChatWidget from './components/ChatWidget';
import CustomerSupportChat from './components/CustomerSupportChat';
import AuthModal from './components/AuthModal';
import CartDrawer from './components/CartDrawer';
import { getCurrentCustomer, getCustomers, syncWithServer } from './utils/customerStorage';
import { getCart } from './utils/cartStorage';
import { forceReloadOrders } from './utils/orderStorage';
import type { Customer, CartItem } from './types';

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash);
  const [isAdminLinkVisible, setIsAdminLinkVisible] = useState(false);
  
  // Auth State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);

  // Cart State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Deep Link State
  const [initialProductId, setInitialProductId] = useState<string | null>(null);

  useEffect(() => {
    // Khởi tạo người dùng ban đầu
    const user = getCurrentCustomer();
    setCurrentUser(user);
    
    // Tải danh sách khách hàng (trigger sync ngầm)
    getCustomers();

    // THIẾT LẬP ĐỒNG BỘ ĐỊNH KỲ (Background Polling)
    // Cứ 30 giây kiểm tra xem máy khác có thay đổi Avatar/Thông tin không
    const syncInterval = setInterval(() => {
        if (getCurrentCustomer()) {
            syncWithServer();
        }
    }, 30000);

    const handleHashChange = () => {
      const hash = window.location.hash;
      const search = window.location.search;
      const urlParams = new URLSearchParams(search);

      if (urlParams.get('register') === 'true' && !getCurrentCustomer()) {
          setAuthMode('REGISTER');
          setIsAuthModalOpen(true);
      }

      let pid = urlParams.get('product');
      if (pid) setInitialProductId(pid);

      const cleanHash = hash.split('?')[0] || '#/';
      setRoute(cleanHash);
    };
    
    handleHashChange(); 
    window.addEventListener('hashchange', handleHashChange);

    // Lắng nghe sự kiện cập nhật khách hàng (từ Profile máy này hoặc Sync từ máy khác)
    const handleCustomerUpdate = () => {
        const updatedUser = getCurrentCustomer();
        setCurrentUser(updatedUser);
    };
    window.addEventListener('sigma_vie_customers_update', handleCustomerUpdate);

    return () => {
        clearInterval(syncInterval);
        window.removeEventListener('hashchange', handleHashChange);
        window.removeEventListener('sigma_vie_customers_update', handleCustomerUpdate);
    };
  }, []);

  useEffect(() => {
    setCartItems(getCart());
    const handleCartUpdate = () => setCartItems(getCart());
    window.addEventListener('sigma_vie_cart_update', handleCartUpdate);
    return () => window.removeEventListener('sigma_vie_cart_update', handleCartUpdate);
  }, [currentUser]); 

  useEffect(() => {
    const targetSequence = ['x', 'y', 'z'];
    let currentSequence: string[] = [];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'c') { setIsAdminLinkVisible(false); return; }
        currentSequence.push(key);
        if (currentSequence.length > 3) currentSequence.shift();
        if (JSON.stringify(currentSequence) === JSON.stringify(targetSequence)) setIsAdminLinkVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
      setAuthMode(mode);
      setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (customer: Customer) => {
      setCurrentUser(customer);
      forceReloadOrders().catch(e => console.error(e));
  };

  const handleOpenCart = () => {
      if (!currentUser) openAuthModal('LOGIN');
      else setIsCartOpen(true);
  };

  const renderPage = () => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    const currentPath = route.split('?')[0];

    switch (currentPath) {
      case '#/admin': return isAuthenticated ? <AdminPage /> : <LoginPage />;
      case '#/login': return <LoginPage />;
      case '#/otp': return <AdminOTPPage />;
      case '#/about': return <AboutPage isAdminLinkVisible={isAdminLinkVisible} />;
      case '#/my-orders': return <MyOrdersPage currentUser={currentUser} isAdminLinkVisible={isAdminLinkVisible} />;
      default:
        return (
            <Home 
                isAdminLinkVisible={isAdminLinkVisible} 
                onOpenAuth={openAuthModal}
                currentUser={currentUser}
                initialProductId={initialProductId}
                cartItemCount={0}
                onOpenCart={() => {}}
            />
        );
    }
  };

  const visibleCartCount = currentUser ? cartItems.reduce((acc, item) => acc + item.quantity, 0) : 0;

  return (
    <div className="bg-[#F7F5F2] min-h-screen text-gray-800 selection:bg-[#D4AF37] selection:text-white relative">
      {React.cloneElement(renderPage() as React.ReactElement<any>, { 
          cartItemCount: visibleCartCount,
          onOpenCart: handleOpenCart
      })}
      
      <ChatWidget />
      <CustomerSupportChat />
      
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
        onLoginSuccess={handleLoginSuccess}
      />

      <CartDrawer 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        currentUser={currentUser}
        onOpenAuth={() => openAuthModal('LOGIN')}
      />
    </div>
  );
};

export default App;
