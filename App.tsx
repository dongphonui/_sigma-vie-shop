
import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import AdminOTPPage from './pages/AdminOTPPage';
import MyOrdersPage from './pages/MyOrdersPage';
import ChatWidget from './components/ChatWidget';
import AuthModal from './components/AuthModal';
import CartDrawer from './components/CartDrawer';
import { getCurrentCustomer } from './utils/customerStorage';
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

  // Khởi tạo và lắng nghe thay đổi route / user
  useEffect(() => {
    const handleHashChange = () => {
      const fullUrl = window.location.href;
      const hash = window.location.hash;
      const search = window.location.search;
      
      const urlParams = new URLSearchParams(search);

      // 1. Check for Auto-Registration via QR
      if (urlParams.get('register') === 'true') {
          console.log("Auto-registration QR detected");
          if (!getCurrentCustomer()) {
              setAuthMode('REGISTER');
              setIsAuthModalOpen(true);
          }
      }

      // 2. Robust URL Parsing for Product Deep Linking
      let pid = urlParams.get('product');

      if (!pid && hash.includes('product=')) {
          try {
             const hashParts = hash.split('?');
             if (hashParts.length > 1) {
                 const hashParams = new URLSearchParams(hashParts[1]);
                 pid = hashParams.get('product');
             }
          } catch(e) {}
      }

      if (!pid && fullUrl.includes('product=')) {
          try {
              const match = fullUrl.match(/[?&]product=([^&]+)/);
              if (match) pid = match[1];
          } catch (e) {}
      }

      if (pid) {
          console.log("Deep link detected for product:", pid);
          setInitialProductId(pid);
      }

      // Base route logic
      const cleanHash = hash.split('?')[0] || '#/';
      setRoute(cleanHash);
    };
    
    handleHashChange(); 
    
    const user = getCurrentCustomer();
    setCurrentUser(user);
    if (user) {
        forceReloadOrders().catch(e => console.error("Auto sync failed:", e));
    }
    
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
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
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.key === 'Control') return;

      if (e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'c') {
          setIsAdminLinkVisible(false);
          currentSequence = []; 
          return;
        }
        if (targetSequence.includes(key)) {
            currentSequence.push(key);
            if (currentSequence.length > targetSequence.length) currentSequence.shift();
            if (JSON.stringify(currentSequence) === JSON.stringify(targetSequence)) {
              setIsAdminLinkVisible(true);
              currentSequence = [];
            }
        } else currentSequence = [];
      } else currentSequence = [];
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
      forceReloadOrders().catch(e => console.error("Login sync failed:", e));
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
