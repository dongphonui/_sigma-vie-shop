
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
      className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 ease-in-out cursor-pointer group relative flex flex-col h-full border border-slate-50"
      onClick={onClick}
    >
      <div className="relative overflow-hidden h-[420px]">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-[4000ms] ${isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-110'}`}
        />
        
        {/* NÂNG CẤP QR ICON: Luôn hiển thị tinh tế trên mobile, hiện rõ khi hover trên Desktop */}
        {ui.qrIconVisible && !isOutOfStock && (
            <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-xl p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-10 transition-all duration-500 text-white border border-white/20 group-hover:scale-110 group-hover:bg-[#B4975A]/80">
                <QrCodeIcon className="w-6 h-6" />
            </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-6 left-6 bg-rose-600 text-white px-5 py-2 rounded-full shadow-2xl z-10 flex items-center gap-2 border border-white/20">
            <span className="font-sans text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">Tuyệt tác ⚡</span>
          </div>
        )}
        
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[4px]">
                <div className="bg-[#111827] text-white px-10 py-4 tracking-[0.4em] text-[10px] font-black rounded-2xl uppercase shadow-2xl">
                    Tạm hết hàng
                </div>
            </div>
        )}
      </div>
      
      <div className="p-10 text-center flex-1 flex flex-col items-center">
        <p className="font-sans text-[10px] font-black text-[#B4975A] mb-3 uppercase tracking-[0.3em]">{product.category}</p>
        
        <h3 
            className={`font-black mb-5 line-clamp-2 transition-colors duration-500 leading-tight uppercase tracking-tight ${isOutOfStock ? 'text-slate-300' : 'text-[#111827] group-hover:text-[#B4975A]'}`}
            style={{ fontFamily: ui.titleFont, fontSize: ui.titleSize, color: isOutOfStock ? '#cbd5e1' : ui.titleColor }}
        >
            {product.name}
        </h3>
        
        <div className="mt-auto pt-6 border-t border-slate-50 w-full flex flex-col items-center gap-1">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-[11px] text-slate-300 line-through italic opacity-60" style={{ fontFamily: ui.priceFont }}>
                        {product.price}
                    </p>
                    <p className="font-black tracking-tighter text-2xl" style={{ fontFamily: ui.priceFont, fontSize: ui.priceSize, color: ui.priceColor }}>
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className="font-black tracking-tighter text-xl" style={{ fontFamily: ui.priceFont, fontSize: ui.priceSize, color: isOutOfStock ? '#cbd5e1' : ui.priceColor }}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
