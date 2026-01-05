
import React from 'react';
import type { Product } from '../types';
import { QrCodeIcon } from './Icons';

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick }) => {
  const isOutOfStock = product.stock <= 0;
  
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
          className={`w-full h-full object-cover transform transition-transform duration-[3000ms] ${isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-105'}`}
        />
        
        {/* QR Badge Signature */}
        {!isOutOfStock && (
            <div className="absolute bottom-6 right-6 bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-2xl z-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 text-white">
                <QrCodeIcon className="w-5 h-5" />
            </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-6 left-6 bg-[#B4975A] text-white px-4 py-1.5 rounded-full shadow-2xl z-10 flex items-center gap-2">
            <span className="font-sans text-[8px] font-black uppercase tracking-widest">Ưu đãi giới hạn</span>
          </div>
        )}
        
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[2px]">
                <div className="font-sans bg-[#111827] text-white px-8 py-3 tracking-[0.3em] text-[9px] font-black rounded-lg uppercase">
                    Tạm hết hàng
                </div>
            </div>
        )}
      </div>
      
      <div className="p-8 text-center flex-1 flex flex-col items-center">
        <p className="font-sans text-[9px] font-black text-[#B4975A] mb-3 uppercase tracking-[0.2em]">{product.category}</p>
        <h3 className={`text-lg font-sans font-black mb-5 line-clamp-2 transition-colors duration-300 leading-tight uppercase tracking-tight ${isOutOfStock ? 'text-slate-300' : 'text-[#111827] group-hover:text-[#B4975A]'}`}>
            {product.name}
        </h3>
        
        <div className="mt-auto pt-5 border-t border-slate-50 w-full flex flex-col items-center gap-1">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-[10px] text-slate-300 line-through font-sans italic">
                        {product.price}
                    </p>
                    <p className="text-xl font-black text-[#064E3B] font-sans tracking-tighter">
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className={`text-lg font-black font-sans tracking-tighter ${isOutOfStock ? 'text-slate-300' : 'text-[#064E3B]'}`}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
