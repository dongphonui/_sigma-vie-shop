
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
      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 ease-in-out cursor-pointer group relative flex flex-col h-full border border-slate-100"
      onClick={onClick}
    >
      <div className="relative overflow-hidden h-96">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-700 ${isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-110'}`}
        />
        
        {/* Permanent QR Indicator - Fixed visibility */}
        {!isOutOfStock && (
            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md p-2.5 rounded-full shadow-xl z-10 border border-teal-50 transition-transform group-hover:scale-110">
                <QrCodeIcon className="w-5 h-5 text-[#00695C]" />
            </div>
        )}

        {!isOutOfStock && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
        )}
        
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full shadow-md flex items-center gap-1 animate-pulse z-10">
            <LightningIcon className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Flash Sale</span>
          </div>
        )}
        
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                <div className="bg-slate-900 text-white px-6 py-2 font-black tracking-widest transform -rotate-2 shadow-xl">
                    HẾT HÀNG
                </div>
            </div>
        )}
      </div>
      <div className="p-6 text-center flex-1 flex flex-col justify-end">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{product.category}</p>
        <h3 className={`text-lg font-bold mb-3 line-clamp-2 transition-colors ${isOutOfStock ? 'text-gray-300' : 'text-slate-800 group-hover:text-[#D4AF37]'}`}>{product.name}</h3>
        
        <div className="flex items-center justify-center gap-3">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-sm font-medium text-slate-300 line-through">
                        {product.price}
                    </p>
                    <p className="text-xl font-black text-red-600">
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className={`text-lg font-black ${isOutOfStock ? 'text-gray-300' : 'text-slate-900'}`}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
