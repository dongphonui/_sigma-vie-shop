
import React from 'react';
import type { Product } from '../types';

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
      className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300 ease-in-out cursor-pointer group relative flex flex-col h-full"
      onClick={onClick}
    >
      <div className="relative overflow-hidden h-96">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className={`w-full h-full object-cover transform transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-105'}`}
        />
        {/* Hover overlay for active products */}
        {!isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
        )}
        
        {/* Flash Sale Badge */}
        {isFlashSaleActive && !isOutOfStock && (
          <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 m-2 rounded-md shadow-md flex items-center gap-1 animate-pulse">
            <LightningIcon className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Flash Sale</span>
          </div>
        )}
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                <div className="bg-black/70 text-white px-6 py-3 font-bold tracking-widest border-2 border-white transform -rotate-12 backdrop-blur-sm">
                    HẾT HÀNG
                </div>
            </div>
        )}
      </div>
      <div className="p-6 text-center flex-1 flex flex-col justify-end">
        <h3 className={`text-xl font-semibold mb-2 line-clamp-2 ${isOutOfStock ? 'text-gray-400' : 'text-gray-800'}`}>{product.name}</h3>
        
        <div className="flex items-center justify-center gap-2">
            {isFlashSaleActive && !isOutOfStock ? (
                <>
                    <p className="text-lg font-medium text-gray-400 line-through decoration-red-500">
                        {product.price}
                    </p>
                    <p className="text-xl font-bold text-red-600">
                        {product.salePrice}
                    </p>
                </>
            ) : (
                <p className={`text-lg font-medium ${isOutOfStock ? 'text-gray-400 decoration-slate-400' : 'text-gray-600'}`}>
                    {product.price}
                </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;