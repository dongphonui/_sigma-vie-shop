
import React, { useEffect, useState } from 'react';
import type { Product } from '../types';
import { getPrimaryAdminEmail } from '../utils/adminSettingsStorage';
import { createOrder } from '../utils/orderStorage';
import { getCurrentCustomer } from '../utils/customerStorage';
import { addToCart } from '../utils/cartStorage';
import { sendEmail } from '../utils/apiClient';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
}

const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const LightningIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

const ShoppingCartIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
);

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const [managerEmail, setManagerEmail] = useState('');
  const isOutOfStock = product.stock <= 0;
  
  const now = Date.now();
  const isFlashSaleActive = product.isFlashSale && 
                            product.salePrice && 
                            !isOutOfStock &&
                            (!product.flashSaleStartTime || now >= product.flashSaleStartTime) &&
                            (!product.flashSaleEndTime || now <= product.flashSaleEndTime);
  
  // Order Logic State
  const [quantity, setQuantity] = useState(1);
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    setManagerEmail(getPrimaryAdminEmail());

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose]);

  const handleQuantityChange = (delta: number) => {
      const newQty = quantity + delta;
      if (newQty >= 1 && newQty <= product.stock) {
          setQuantity(newQty);
      }
  };

  const handleAddToCart = () => {
      addToCart(product, quantity);
      setFeedbackMsg('Đã thêm vào giỏ hàng!');
      setTimeout(() => setFeedbackMsg(''), 2000);
  };

  const handlePlaceOrder = async () => {
      const customer = getCurrentCustomer();
      if (!customer) {
          onOpenAuth();
          return;
      }

      setOrderStatus('PROCESSING');

      // Use the sale price if available and active
      const productForOrder = { ...product };
      if (isFlashSaleActive && product.salePrice) {
          productForOrder.price = product.salePrice; 
      }

      const result = createOrder(customer, productForOrder, quantity);

      if (result.success && result.order) {
          if (managerEmail) {
             const totalPriceFormatted = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(result.order.totalPrice);
             
             // Send Real Email
             const subject = `Đơn hàng mới: ${product.name} - KH: ${customer.fullName}`;
             const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; border: 1px solid #e0e0e0; padding: 20px;">
                    <h2 style="color: #00695C; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">Đơn hàng Đặt nhanh</h2>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0;">Thông tin khách hàng</h3>
                        <p><strong>Họ tên:</strong> ${customer.fullName}</p>
                        <p><strong>Liên hệ:</strong> ${customer.email || customer.phoneNumber}</p>
                        <p><strong>Địa chỉ:</strong> ${customer.address || 'Chưa cập nhật'}</p>
                        <p><strong>Mã KH:</strong> ${customer.id}</p>
                    </div>

                    <h3 style="color: #00695C;">Chi tiết sản phẩm</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px; font-weight: bold;">Sản phẩm:</td>
                            <td style="padding: 10px;">${product.name} (SKU: ${product.sku})</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px; font-weight: bold;">Đơn giá:</td>
                            <td style="padding: 10px;">${productForOrder.price} ${isFlashSaleActive ? '(Giá Flash Sale)' : ''}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px; font-weight: bold;">Số lượng:</td>
                            <td style="padding: 10px;">${quantity}</td>
                        </tr>
                        <tr style="background-color: #00695C; color: white;">
                            <td style="padding: 10px; font-weight: bold;">TỔNG TIỀN:</td>
                            <td style="padding: 10px; font-weight: bold; font-size: 18px;">${totalPriceFormatted}</td>
                        </tr>
                    </table>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://sigmavie-shop.vercel.app" style="background-color: #D4AF37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Truy cập Admin Panel</a>
                    </div>
                </div>
             `;

             await sendEmail(managerEmail, subject, html);
          }
          setOrderStatus('SUCCESS');
      } else {
          setFeedbackMsg(result.message);
          setOrderStatus('IDLE');
      }
  };


  const renderOrderSection = () => {
      if (isOutOfStock) {
          return (
            <div className="py-4">
                <h3 className="text-xl font-bold text-gray-500 mb-2">Sản phẩm tạm hết hàng</h3>
                <p className="text-gray-400">Vui lòng quay lại sau hoặc liên hệ với chúng tôi để biết thêm chi tiết.</p>
            </div>
          );
      }

      if (orderStatus === 'SUCCESS') {
          return (
            <div className="py-8 text-center animate-fade-in-up">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-green-700 mb-2">Đặt hàng thành công!</h3>
                <p className="text-gray-600 mb-6">
                    Đơn hàng của bạn đã được ghi nhận. <br/>
                    Email thông báo đã được gửi đến quản trị viên.
                </p>
                <button 
                    onClick={onClose}
                    className="bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-gray-700 transition-colors"
                >
                    Tiếp tục mua sắm
                </button>
            </div>
          );
      }

      return (
        <div className="py-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mua Sản Phẩm</h3>
            
            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 mb-6">
                <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || orderStatus === 'PROCESSING'}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    -
                </button>
                <div className="w-16 text-center">
                    <span className="text-xl font-bold text-gray-800">{quantity}</span>
                </div>
                <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock || orderStatus === 'PROCESSING'}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    +
                </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Còn lại {product.stock} sản phẩm trong kho</p>

            <div className="flex flex-col gap-3">
                 <button 
                    onClick={handleAddToCart}
                    disabled={orderStatus === 'PROCESSING'}
                    className="w-full text-[#00695C] border-2 border-[#00695C] font-bold py-3 px-8 rounded-full transition-transform transform hover:-translate-y-1 flex items-center justify-center gap-2 hover:bg-teal-50 disabled:opacity-50"
                >
                    <ShoppingCartIcon className="w-5 h-5" />
                    <span>Thêm vào Giỏ Hàng</span>
                </button>

                {!isLoggedIn ? (
                    <button 
                        onClick={onOpenAuth}
                        className="w-full bg-[#D4AF37] hover:bg-[#b89b31] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:-translate-y-1"
                    >
                        Đăng nhập để Mua ngay
                    </button>
                ) : (
                    <button 
                        onClick={handlePlaceOrder}
                        disabled={orderStatus === 'PROCESSING'}
                        className={`w-full text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:-translate-y-1 flex items-center justify-center gap-2 ${isFlashSaleActive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00695C] hover:bg-[#004d40]'} disabled:opacity-70`}
                    >
                        {isFlashSaleActive && <LightningIcon className="w-5 h-5" />}
                        <span>{orderStatus === 'PROCESSING' ? 'Đang xử lý...' : 'Mua ngay (Đặt nhanh)'}</span>
                    </button>
                )}
            </div>
            
            {feedbackMsg && <p className={`mt-4 font-medium text-center animate-pulse ${feedbackMsg.includes('thêm') ? 'text-[#00695C]' : 'text-red-600'}`}>{feedbackMsg}</p>}
        </div>
      );
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 transition-colors z-10"
          aria-label="Đóng cửa sổ"
        >
          <XIcon className="w-8 h-8"/>
        </button>
        
        <div className="w-full md:w-1/2 relative">
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className={`w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none ${isOutOfStock ? 'grayscale opacity-75' : ''}`} 
          />
           {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="bg-black/70 text-white px-8 py-4 font-bold text-2xl tracking-widest border-4 border-white transform -rotate-12 backdrop-blur-sm">
                    HẾT HÀNG
                </div>
            </div>
           )}
           {isFlashSaleActive && !isOutOfStock && (
               <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1 z-10">
                   <LightningIcon className="w-4 h-4" />
                   FLASH SALE
               </div>
           )}
        </div>

        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h2 className="text-3xl font-bold font-serif mb-4 text-gray-900">{product.name}</h2>
          
          <div className="flex items-end gap-3 mb-6">
             {isFlashSaleActive ? (
                 <>
                    <p className="text-3xl font-bold text-red-600">{product.salePrice}</p>
                    <p className="text-xl text-gray-400 line-through mb-1">{product.price}</p>
                 </>
             ) : (
                 <p className="text-2xl text-gray-700">{product.price}</p>
             )}
             
             {isOutOfStock && <span className="text-red-600 font-bold border border-red-600 px-2 py-0.5 text-sm rounded mb-1">Hết hàng</span>}
          </div>
          
          <p className="text-gray-600 mb-8">{product.description}</p>

          <div className={`p-6 rounded-lg text-center ${isOutOfStock ? 'bg-gray-100' : (isFlashSaleActive ? 'bg-red-50 border border-red-100' : 'bg-gray-50')}`}>
            {renderOrderSection()}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ProductModal;
