
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Product, HomePageSettings, Customer } from '../types';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import Footer from '../components/Footer';
import { getProducts, forceReloadProducts } from '../utils/productStorage';
import { getHomePageSettings } from '../utils/homePageSettingsStorage';

interface HomeProps {
  isAdminLinkVisible: boolean;
  onOpenAuth: (mode: 'LOGIN' | 'REGISTER') => void;
  currentUser: Customer | null;
  cartItemCount: number;
  onOpenCart: () => void;
  initialProductId: string | null;
}

const SearchIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);

const UserPlusIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({className, style}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
);

const LightningIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({className, style}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className} style={style}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ClockIcon: React.FC<{className?: string, style?: React.CSSProperties}> = ({className, style}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const FlashSaleTimer: React.FC<{ textColor?: string; targetDate?: number }> = ({ textColor, targetDate }) => {
    const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        if (!targetDate) return;
        const updateTimer = () => {
             const now = Date.now();
            const difference = targetDate - now;

            if (difference <= 0) {
                setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
            } else {
                const hours = Math.floor(difference / (1000 * 60 * 60));
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                setTimeLeft({ hours, minutes, seconds });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return (
        <div className="flex gap-1 font-mono font-bold text-lg" style={{ color: textColor }}>
            <span>{String(timeLeft.hours).padStart(2, '0')}</span>:
            <span>{String(timeLeft.minutes).padStart(2, '0')}</span>:
            <span>{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
    );
};

const Home: React.FC<HomeProps> = ({ isAdminLinkVisible, onOpenAuth, currentUser, cartItemCount, onOpenCart, initialProductId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<HomePageSettings | null>(null);
  const [flashSaleProducts, setFlashSaleProducts] = useState<Product[]>([]);
  const [flashSaleEndTime, setFlashSaleEndTime] = useState<number | undefined>(undefined);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [isLookingForProduct, setIsLookingForProduct] = useState(false);

  // Link for Registration QR
  const registrationLink = `${window.location.origin}/?register=true`;

  useEffect(() => {
    const allProducts = getProducts();
    setProducts(allProducts);
    setFilteredProducts(allProducts);
    setSettings(getHomePageSettings());

    forceReloadProducts().then(() => console.log("Forced reload complete"));
    
    const retrySettings = setInterval(() => setSettings(getHomePageSettings()), 2000);
    setTimeout(() => clearInterval(retrySettings), 6000);

    if (initialProductId) {
        const found = allProducts.find(p => String(p.id) === String(initialProductId));
        if (found) setSelectedProduct(found);
        else setIsLookingForProduct(true);
    }

    const handleProductUpdate = () => {
        const updated = getProducts();
        setProducts(updated);
        if (!searchQuery) setFilteredProducts(updated);
        if (initialProductId) {
            const found = updated.find(p => String(p.id) === String(initialProductId));
            if (found) { setSelectedProduct(found); setIsLookingForProduct(false); }
            else setIsLookingForProduct(false);
        }
    };
    
    const handleSettingsUpdate = () => setSettings(getHomePageSettings());
    
    window.addEventListener('sigma_vie_products_update', handleProductUpdate);
    window.addEventListener('sigma_vie_home_settings_update', handleSettingsUpdate);
    
    return () => {
        window.removeEventListener('sigma_vie_products_update', handleProductUpdate);
        window.removeEventListener('sigma_vie_home_settings_update', handleSettingsUpdate);
        clearInterval(retrySettings);
    };
  }, [initialProductId]); 

  useEffect(() => {
    const now = Date.now();
    const activeFlashSales = products.filter(p => {
        const isValidTime = (!p.flashSaleStartTime || now >= p.flashSaleStartTime) &&
                            (!p.flashSaleEndTime || now <= p.flashSaleEndTime);
        return p.isFlashSale === true && p.status === 'active' && isValidTime;
    });
    setFlashSaleProducts(activeFlashSales);
    if (activeFlashSales.length > 0) {
        const sortedEndTimes = activeFlashSales
            .map(p => p.flashSaleEndTime)
            .filter((t): t is number => t !== undefined && t > now)
            .sort((a, b) => a - b);
        if (sortedEndTimes.length > 0) setFlashSaleEndTime(sortedEndTimes[0]);
    }
  }, [products]);

  useEffect(() => {
      if (!settings || !settings.promoImageUrls || settings.promoImageUrls.length <= 1) return;
      const interval = setInterval(() => {
          setCurrentPromoIndex((prevIndex) => 
              prevIndex === settings.promoImageUrls.length - 1 ? 0 : prevIndex + 1
          );
      }, 5000); 
      return () => clearInterval(interval);
  }, [settings]);

  useEffect(() => {
    const lowercasedQuery = searchQuery.toLowerCase().trim();
    if (lowercasedQuery === '') setFilteredProducts(products);
    else setFilteredProducts(products.filter(p => p.name.toLowerCase().includes(lowercasedQuery)));
  }, [searchQuery, products]);
  
  const handleProductClick = (product: Product) => setSelectedProduct(product);
  const handleCloseModal = () => { setSelectedProduct(null); setIsLookingForProduct(false); };
  const scrollToProducts = () => document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' });
  
  return (
    <>
      <Header onOpenAuth={() => onOpenAuth('LOGIN')} currentUser={currentUser} cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
        
        {isLookingForProduct && !selectedProduct && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white p-6 rounded-lg shadow-xl flex items-center gap-4 animate-fade-in-up">
                    <div className="w-8 h-8 border-4 border-[#00695C] border-t-transparent rounded-full animate-spin"></div>
                    <div><p className="font-bold text-gray-800 text-lg">Đang tìm sản phẩm...</p><p className="text-sm text-gray-500">Vui lòng chờ trong giây lát</p></div>
                </div>
            </div>
        )}

        <div className="text-center mb-12">
          {settings ? (
            <>
              <h1 className="font-bold" style={{ color: settings.headlineColor, fontFamily: `'${settings.headlineFont}', serif`, fontSize: settings.headlineSize || '3rem' }}>{settings.headlineText}</h1>
              <p className="mt-4 text-lg" style={{ color: settings.subtitleColor, fontFamily: `'${settings.subtitleFont}', sans-serif` }}>{settings.subtitleText}</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl font-bold font-serif text-gray-900">Hàng Mới Về</h1>
              <p className="mt-4 text-lg text-gray-700">Khám phá bộ sưu tập mới nhất với những thiết kế vượt thời gian.</p>
            </>
          )}
        </div>
        
        <div className="mb-16 max-w-2xl mx-auto">
            <div className="relative">
                <input type="text" placeholder="Tìm kiếm sản phẩm theo tên..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-5 pr-12 py-3 text-base bg-white border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-shadow" />
                <div className="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none"><SearchIcon className="h-6 w-6 text-gray-400" /></div>
            </div>
        </div>

        {/* Featured Promotion Section */}
        {settings && (
        <div className="mb-16 rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col md:flex-row transform transition-all hover:scale-[1.01] duration-500 min-h-[500px] md:min-h-[400px]">
            <div className="md:w-1/2 relative bg-gray-200">
                {settings.promoImageUrls && settings.promoImageUrls.length > 0 ? (
                    settings.promoImageUrls.map((url, idx) => (
                        <div key={idx} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentPromoIndex ? 'opacity-100' : 'opacity-0'}`}>
                            <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
                        </div>
                    ))
                ) : <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">No Image</div>}
                {settings.promoImageUrls && settings.promoImageUrls.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                        {settings.promoImageUrls.map((_, idx) => (
                            <button key={idx} onClick={() => setCurrentPromoIndex(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentPromoIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
                        ))}
                    </div>
                )}
            </div>
            <div className="md:w-1/2 p-8 md:p-12 text-white flex flex-col justify-center" style={{ backgroundColor: settings.promoBackgroundColor }}>
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold px-2 py-1 rounded text-white uppercase tracking-wider" style={{ backgroundColor: settings.promoAccentColor, fontFamily: 'Poppins, sans-serif' }}>{settings.promoTag}</span>
                    <span className="text-sm font-medium tracking-wider uppercase" style={{ fontFamily: 'Poppins, sans-serif', color: settings.promoDescriptionColor || 'rgba(255,255,255,0.8)' }}>{settings.promoSubTag}</span>
                </div>
                <h2 className="font-bold mb-6 leading-tight" style={{ fontFamily: `'${settings.promoTitleFont}', serif`, color: settings.promoTitleColor, fontSize: settings.promoTitleSize || '2.25rem' }}>{settings.promoTitle1} <br/> <span style={{ color: settings.promoAccentColor }}>{settings.promoTitleHighlight}</span> {' '}{settings.promoTitle2}</h2>
                <p className="mb-8 leading-relaxed font-light" style={{ fontFamily: `'${settings.promoDescriptionFont}', sans-serif`, color: settings.promoDescriptionColor, fontSize: settings.promoDescriptionSize || '1.125rem' }}>{settings.promoDescription}</p>
                <div><button onClick={scrollToProducts} className="inline-block font-semibold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1" style={{ backgroundColor: settings.promoButtonBgColor || settings.promoAccentColor, color: settings.promoButtonTextColor || '#fff', fontFamily: `'${settings.promoDescriptionFont}', sans-serif` }}>{settings.promoButtonText}</button></div>
            </div>
        </div>
        )}

        {/* Membership Registration Section (WITH QR CODE - UPDATED TO BE STRAIGHT AND CLEAR) */}
        {!currentUser && settings && (
            <div 
                className="mb-16 shadow-xl relative overflow-hidden"
                style={{
                    background: `linear-gradient(to right, ${settings.regBgColorStart || '#111827'}, ${settings.regBgColorEnd || '#1F2937'})`,
                    padding: settings.regPadding || '3rem',
                    borderRadius: settings.regBorderRadius || '1rem'
                }}
            >
                 <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                     <svg width="100%" height="100%"><pattern id="pattern-circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="2" fill="currentColor" /></pattern><rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" className="text-white" /></svg>
                 </div>
                 
                 <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 max-w-5xl mx-auto">
                     <div className="flex-1 text-center lg:text-left">
                        <UserPlusIcon className="w-12 h-12 mx-auto lg:mx-0 mb-4" style={{ color: settings.regButtonBgColor }} />
                        <h2 className="font-bold mb-4" style={{ color: settings.regHeadlineColor, fontFamily: `'${settings.regHeadlineFont}', serif`, fontSize: settings.regHeadlineSize || '1.875rem' }}>{settings.regHeadlineText}</h2>
                        <p className="mb-8" style={{ color: settings.regDescriptionColor, fontFamily: `'${settings.regDescriptionFont}', sans-serif`, fontSize: settings.regDescriptionSize || '1.125rem' }}>{settings.regDescriptionText}</p>
                        <button 
                            onClick={() => onOpenAuth('REGISTER')}
                            className="font-bold py-3 px-8 shadow-lg transition-transform transform hover:-translate-y-1 inline-flex items-center gap-2"
                            style={{ backgroundColor: settings.regButtonBgColor, color: settings.regButtonTextColor, borderRadius: '9999px', fontFamily: `'${settings.regButtonFont || 'Poppins'}', sans-serif`, fontSize: settings.regButtonFontSize || '1rem' }}
                        >
                            <span>{settings.regButtonText}</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </button>
                     </div>

                     <div className="flex flex-col items-center gap-3">
                         <div className="bg-white p-2 rounded-2xl shadow-2xl border-4 border-white/20 transition-all duration-300 hover:scale-105">
                             <QRCodeSVG 
                                value={registrationLink} 
                                size={160} 
                                level="H" 
                                includeMargin={true}
                             />
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 animate-pulse">Quét để Đăng ký ngay</p>
                     </div>
                 </div>
            </div>
        )}

        {/* FLASH SALE SECTION */}
        {flashSaleProducts.length > 0 && settings && (
            <div className="mb-16 rounded-2xl shadow-2xl overflow-hidden relative" style={{ background: `linear-gradient(to right, ${settings.flashSaleBgColorStart || '#DC2626'}, ${settings.flashSaleBgColorEnd || '#F97316'})` }}>
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none"><div className="absolute top-10 left-10 w-32 h-32 bg-yellow-300 rounded-full blur-3xl"></div><div className="absolute bottom-10 right-10 w-40 h-40 bg-yellow-300 rounded-full blur-3xl"></div></div>
                <div className="p-8 md:p-10 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <div className="flex items-center gap-3"><LightningIcon className="w-10 h-10 animate-pulse" style={{ color: settings.flashSaleTextColor }} /><h2 className="font-bold font-serif italic tracking-wider shadow-sm" style={{ color: settings.flashSaleTitleColor, fontFamily: `'${settings.flashSaleTitleFont}', serif`, fontSize: settings.flashSaleTitleSize || '2.25rem' }}>{settings.flashSaleTitleText || 'FLASH SALE'}</h2></div>
                        {flashSaleEndTime && <div className="flex items-center gap-3 bg-white/20 px-6 py-3 rounded-full backdrop-blur-sm shadow-inner"><ClockIcon className="w-5 h-5" style={{ color: settings.flashSaleTextColor }} /><p className="font-medium mr-2" style={{ color: settings.flashSaleTextColor }}>Kết thúc trong:</p><FlashSaleTimer textColor={settings.flashSaleTextColor} targetDate={flashSaleEndTime} /></div>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">{flashSaleProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p)} />)}</div>
                </div>
            </div>
        )}

        <div id="product-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">{filteredProducts.length > 0 ? filteredProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => handleProductClick(p)} />) : <div className="col-span-full text-center py-12"><h3 className="text-2xl font-semibold text-gray-700">Không tìm thấy sản phẩm</h3><p className="mt-2 text-gray-500">Vui lòng thử một từ khóa tìm kiếm khác.</p></div>}</div>
      </main>
      {selectedProduct && <ProductModal product={selectedProduct} onClose={handleCloseModal} isLoggedIn={!!currentUser} onOpenAuth={() => onOpenAuth('LOGIN')} />}
      <Footer isAdminLinkVisible={isAdminLinkVisible} />
    </>
  );
};

export default Home;
