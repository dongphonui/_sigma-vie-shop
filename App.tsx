
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
      
      // Robust URL Parsing for Deep Linking
      let pid = null;

      // Priority 1: Direct Query Parameter (e.g. ?product=123)
      const urlParams = new URLSearchParams(search);
      pid = urlParams.get('product');

      if (!pid && fullUrl.includes('product=')) {
          // Case 2: Query param might be stuck inside hash or malformed
          try {
              const urlObj = new URL(fullUrl);
              pid = urlObj.searchParams.get('product');
          } catch (e) {
              // Ignore invalid URL
          }
          
          // Case 3: Query param in hash manually (e.g. /#/?product=123)
          if (!pid && hash.includes('?')) {
               const hashParts = hash.split('?');
               if (hashParts.length > 1) {
                   const hashParams = new URLSearchParams(hashParts[1]);
                   pid = hashParams.get('product');
               }
          }
      }

      if (pid) {
          setInitialProductId(pid);
          // Optional: Clean URL
          // history.replaceState(null, '', window.location.pathname + '#/');
      }

      // Base route logic
      // Remove query params from route state to ensure routing works
      const cleanHash = hash.split('?')[0] || '#/';
      setRoute(cleanHash);
    };
    
    handleHashChange(); // Run on mount
    
    // Check for logged in customer on init
    setCurrentUser(getCurrentCustomer());
    
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Lắng nghe thay đổi giỏ hàng VÀ thay đổi người dùng
  useEffect(() => {
    setCartItems(getCart());

    const handleCartUpdate = () => {
        setCartItems(getCart());
    };

    window.addEventListener('sigma_vie_cart_update', handleCartUpdate);
    return () => {
      window.removeEventListener('sigma_vie_cart_update', handleCartUpdate);
    };
  }, [currentUser]); 

  useEffect(() => {
    const targetSequence = ['x', 'y', 'z'];
    let currentSequence: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      
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
            if (currentSequence.length > targetSequence.length) {
              currentSequence.shift();
            }
            if (JSON.stringify(currentSequence) === JSON.stringify(targetSequence)) {
              setIsAdminLinkVisible(true);
              currentSequence = [];
            }
        } else {
            currentSequence = [];
        }
      } else {
        currentSequence = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const openAuthModal = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
      setAuthMode(mode);
      setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (customer: Customer) => {
      setCurrentUser(customer);
  };

  const handleOpenCart = () => {
      if (!currentUser) {
          openAuthModal('LOGIN');
      } else {
          setIsCartOpen(true);
      }
  };

  const renderPage = () => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    
    // Normalize route to handle potential trailing slashes or query params if not stripped
    const currentPath = route.split('?')[0];

    switch (currentPath) {
      case '#/admin':
        return isAuthenticated ? <AdminPage /> : <LoginPage />;
      case '#/login':
        return <LoginPage />;
      case '#/otp':
        return <AdminOTPPage />;
      case '#/about':
        return <AboutPage isAdminLinkVisible={isAdminLinkVisible} />;
      case '#/my-orders':
        return <MyOrdersPage currentUser={currentUser} isAdminLinkVisible={isAdminLinkVisible} />;
      default:
        // Pass initialProductId to Home for Deep Linking
        return (
            <Home 
                isAdminLinkVisible={isAdminLinkVisible} 
                onOpenAuth={openAuthModal}
                currentUser={currentUser}
                initialProductId={initialProductId}
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
