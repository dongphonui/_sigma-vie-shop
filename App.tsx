
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

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash);
    };
    
    // Check for logged in customer
    setCurrentUser(getCurrentCustomer());
    
    // Initial Cart Load
    setCartItems(getCart());

    const handleCartUpdate = () => {
        setCartItems(getCart());
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('sigma_vie_cart_update', handleCartUpdate);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('sigma_vie_cart_update', handleCartUpdate);
    };
  }, []);

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

  const renderPage = () => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';

    switch (route) {
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
        return (
            <Home 
                isAdminLinkVisible={isAdminLinkVisible} 
                onOpenAuth={openAuthModal}
                currentUser={currentUser}
            />
        );
    }
  };

  return (
    <div className="bg-[#F7F5F2] min-h-screen text-gray-800 selection:bg-[#D4AF37] selection:text-white relative">
      {React.cloneElement(renderPage() as React.ReactElement<any>, { 
          cartItemCount: cartItems.reduce((acc, item) => acc + item.quantity, 0),
          onOpenCart: () => setIsCartOpen(true)
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
