
import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { QrCodeIcon } from './Icons';
import { getProductPageSettings } from '../utils/productPageSettingsStorage';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const [ui, setUi] = useState(getProductPageSettings());
  const isOutOfStock = product.stock <= 0;
  
  useEffect(() => {
    const handleUpdate = () => setUi(getProductPageSettings());
    window.addEventListener('sigma_vie_product_ui_update', handleUpdate);
    return () => window.removeEventListener('sigma_vie_product_ui_update', handleUpdate);
  }, []);

  const now = Date.now();
  const isFlashSaleActive = product.isFlashSale && 
                            product.salePrice && 
                            (!product.flashSaleStartTime || now >= product.flashSaleStartTime) &&
                            (!product.flashSaleEndTime || now <= product.flashSaleEndTime);

  return (
    <div 
      className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 ease-in-out cursor-pointer group relative flex flex-col h-full border border-slate-50"
      onClick={onClick}
    >
      <div className="relative overflow-hidden h-[400px]">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-[3000ms] ${isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105'}`}
        />
        
        {/* Khôi phục QR Badge rõ ràng */}
        {ui.qrIconVisible && !isOutOfStock && (
            <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-md p-3.5 rounded-2xl shadow-2xl z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-y-0 md:translate-y-4 md:group-hover:translate-y-0 transition-all duration-500 text-white border border-white/20">
                <QrCodeIcon className="w-6 h-6" />
            </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-6 left-6 bg-[#DC2626] text-white px-4 py-1.5 rounded-full shadow-2xl z-10 flex items-center gap-2">
            <span className="font-sans text-[8px] font-black uppercase tracking-widest">Ưu đãi ⚡</span>
          </div>
        )}
        
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <div className="bg-black text-white px-8 py-3 tracking-[0.3em] text-[10px] font-black rounded-lg uppercase">
                    Hết hàng
                </div>
            </div>
        )}
      </div>
      
      <div className="p-8 text-center flex-1 flex flex-col items-center">
        <p className="font-sans text-[9px] font-black text-[#B4975A] mb-2 uppercase tracking-[0.2em]">{product.category}</p>
        
        <h3 
            className={`font-black mb-4 line-clamp-2 transition-colors duration-300 leading-tight uppercase tracking-tight ${isOutOfStock ? 'text-slate-300' : 'text-black group-hover:text-[#B4975A]'}`}
            style={{ fontFamily: ui.titleFont, fontSize: ui.titleSize, color: isOutOfStock ? '#cbd5e1' : ui.titleColor }}
        >
            {product.name}
        </h3>
        
        <div className="mt-auto pt-4 border-t border-slate-50 w-full flex flex-col items-center gap-1">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-[11px] text-slate-300 line-through italic" style={{ fontFamily: ui.priceFont }}>
                        {product.price}
                    </p>
                    <p className="font-black tracking-tighter" style={{ fontFamily: ui.priceFont, fontSize: ui.priceSize, color: ui.priceColor }}>
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className="font-black tracking-tighter" style={{ fontFamily: ui.priceFont, fontSize: ui.priceSize, color: isOutOfStock ? '#cbd5e1' : ui.priceColor }}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
