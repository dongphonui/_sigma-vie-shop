
import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import AdminOTPPage from './pages/AdminOTPPage';
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
      default:
        // Pass cart-related props to Home if needed, but Header handles the icon
        return (
            <Home 
                isAdminLinkVisible={isAdminLinkVisible} 
                onOpenAuth={openAuthModal}
                currentUser={currentUser}
            />
        );
    }
  };

  // We need to pass cart props to Header inside Home/About or wrap pages. 
  // Since Header is inside pages, we can either:
  // 1. Lift Header out (Refactor)
  // 2. Clone element (Complicated)
  // 3. Just pass the cart state down to Home and About. 
  
  // Let's modify Home.tsx and AboutPage.tsx to accept cart props and pass to Header.
  // Actually, simpler approach: The Header component is imported in pages. 
  // But Header needs `cartItemCount`.
  // I will refactor `Home` and `AboutPage` slightly to accept `cartItemCount` and `onOpenCart`.
  
  // Wait, I can't modify Home/About easily without rewriting them in the XML.
  // Actually, I am already modifying App.tsx. I should modify Home.tsx and AboutPage.tsx as well.
  // OR, I can use a Portal or just have Header accept props.
  // The provided `Home.tsx` uses `<Header ... />`. I need to change `Home.tsx` to accept these props and pass them.
  
  // However, I can avoid modifying Home/About if I make `Header` connect to storage directly?
  // No, `Header` is UI. `App` manages state.
  // `Header` currently imports `getHeaderSettings`.
  
  // Let's just modify `pages/Home.tsx` and `pages/AboutPage.tsx` to wire the cart props.
  // It's cleaner.
  
  // WAIT: I can't modify `Home.tsx` in this block because I didn't include it in the plan initially?
  // I said "Update App.tsx... integrate new components".
  // If I don't update Home.tsx, the Header inside Home won't get the cart count.
  // I will update Home.tsx and AboutPage.tsx in the XML.

  return (
    <div className="bg-[#F7F5F2] min-h-screen text-gray-800 selection:bg-[#D4AF37] selection:text-white relative">
      {/* We need to pass cart props to the pages. I'll clone the page element or just render directly with props if I update the page components. */}
      {/* Since I am updating Home/About below, I will pass props here. */}
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
