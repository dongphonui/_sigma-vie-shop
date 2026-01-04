
import React from 'react';
import type { Product } from '../types';
import { QrCodeIcon } from './Icons';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const LightningIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const isOutOfStock = product.stock <= 0;
  
  const now = Date.now();
  const isFlashSaleActive = product.isFlashSale && 
                            product.salePrice && 
                            (!product.flashSaleStartTime || now >= product.flashSaleStartTime) &&
                            (!product.flashSaleEndTime || now <= product.flashSaleEndTime);

  return (
    <div 
      className="bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 ease-in-out cursor-pointer group relative flex flex-col h-full border border-slate-100"
      onClick={onClick}
    >
      <div className="relative overflow-hidden h-[420px]">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-1000 ${isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-110'}`}
        />
        
        {/* QR Indicator - Màu vàng đồng sang trọng */}
        {!isOutOfStock && (
            <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl z-10 border border-[#92400E]/10 transition-all group-hover:scale-110 group-hover:bg-[#92400E] group-hover:text-white text-[#92400E]">
                <QrCodeIcon className="w-5 h-5" />
            </div>
        )}

        {!isOutOfStock && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#064E3B]/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
        )}
        
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-6 left-6 bg-rose-600 text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 animate-pulse z-10">
            <LightningIcon className="w-3 h-3" />
            <span className="text-[10px] font-black uppercase tracking-widest">Limited Sale</span>
          </div>
        )}
        
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
                <div className="bg-[#064E3B] text-white px-8 py-3 font-black tracking-widest transform -rotate-3 shadow-2xl text-xs uppercase rounded-lg">
                    OUT OF STOCK
                </div>
            </div>
        )}
      </div>
      
      <div className="p-8 text-center flex-1 flex flex-col justify-between">
        <div>
            <p className="text-[9px] text-[#92400E] font-black uppercase tracking-[0.4em] mb-3">{product.category}</p>
            <h3 className={`text-xl font-bold mb-4 line-clamp-2 transition-colors font-serif ${isOutOfStock ? 'text-slate-300' : 'text-[#064E3B] group-hover:text-[#92400E]'}`}>{product.name}</h3>
        </div>
        
        <div className="flex items-center justify-center gap-4">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-sm font-medium text-slate-300 line-through italic font-sans">
                        {product.price}
                    </p>
                    <p className="text-2xl font-black text-rose-600 font-sans tracking-tighter">
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className={`text-xl font-black font-sans tracking-tight ${isOutOfStock ? 'text-slate-300' : 'text-[#064E3B]'}`}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
