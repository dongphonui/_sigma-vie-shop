
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
      className="bg-white rounded-[3rem] overflow-hidden shadow-sm hover:shadow-3xl transition-all duration-1000 ease-in-out cursor-pointer group relative flex flex-col h-full border border-slate-50"
      onClick={onClick}
    >
      <div className="relative overflow-hidden h-[480px]">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-[3000ms] ${isOutOfStock ? 'grayscale opacity-50' : 'group-hover:scale-110'}`}
        />
        
        {/* QR Badge Signature */}
        {!isOutOfStock && (
            <div className="absolute bottom-8 right-8 glass-pearl p-4 rounded-3xl shadow-2xl z-10 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-700 text-[#92400E]">
                <QrCodeIcon className="w-5 h-5" />
            </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#064E3B]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-8 left-8 bg-[#92400E] text-white px-5 py-2 rounded-full shadow-2xl z-10 flex items-center gap-2">
            <span className="font-sans-luxury text-[7px]">Limited Edition Sale</span>
          </div>
        )}
        
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                <div className="font-sans-luxury bg-[#064E3B] text-white px-8 py-3 tracking-[0.5em] text-[8px] rounded-lg">
                    OUT OF STOCK
                </div>
            </div>
        )}
      </div>
      
      <div className="p-10 text-center flex-1 flex flex-col items-center">
        <p className="font-sans-luxury text-[8px] text-[#92400E] mb-4">{product.category}</p>
        <h3 className={`text-2xl font-serif font-black mb-6 line-clamp-2 transition-colors duration-500 ${isOutOfStock ? 'text-slate-300' : 'text-[#064E3B] group-hover:text-[#92400E]'}`}>
            {product.name}
        </h3>
        
        <div className="mt-auto pt-6 border-t border-slate-50 w-full flex flex-col items-center gap-2">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-[10px] text-slate-300 line-through font-serif-italic italic">
                        {product.price}
                    </p>
                    <p className="text-2xl font-black text-rose-600 font-sans tracking-tighter">
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className={`text-xl font-black font-sans tracking-tighter ${isOutOfStock ? 'text-slate-300' : 'text-[#064E3B]'}`}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
