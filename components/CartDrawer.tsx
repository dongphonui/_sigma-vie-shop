
import React, { useMemo, useState } from 'react';
import type { CartItem, Customer } from '../types';
import { updateCartQuantity, removeFromCart, clearCart } from '../utils/cartStorage';
import { createOrder } from '../utils/orderStorage';
// import { getPrimaryAdminEmail } from '../utils/adminSettingsStorage';
// import { sendEmail } from '../utils/apiClient';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentUser: Customer | null;
  onOpenAuth: () => void;
}

const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, currentUser, onOpenAuth }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const totalPrice = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0);
  }, [items]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCheckout = async () => {
      if (!currentUser) {
          onClose();
          onOpenAuth();
          return;
      }

      setIsProcessing(true);
      // const adminEmail = getPrimaryAdminEmail();
      const successfulOrders: string[] = [];
      const failedItems: string[] = [];
      // const emailItems: {name: string, quantity: number, price: string, total: string}[] = [];

      // Process orders for each item
      items.forEach(item => {
          // Note: createOrder handles stock check and deduction
          const result = createOrder(currentUser, item, item.quantity);
          if (result.success && result.order) {
              successfulOrders.push(`${item.name} (x${item.quantity})`);
              /*
              emailItems.push({
                  name: item.name,
                  quantity: item.quantity,
                  price: formatPrice(item.selectedPrice),
                  total: formatPrice(item.selectedPrice * item.quantity)
              });
              */
          } else {
              failedItems.push(item.name);
          }
      });

      if (successfulOrders.length > 0) {
          // --- EMAIL TẠM TẮT ---
          /*
          const subject = `Đơn hàng mới từ ${currentUser.fullName} - ${successfulOrders.length} sản phẩm`;
          const html = `...`; // (Removed for brevity)
          await sendEmail(adminEmail, subject, html);
          */
          
          clearCart(); 
          onClose();
          alert('Đơn hàng đã được tạo thành công! (Chức năng gửi email tạm tắt)');
      } else {
          alert('Không thể tạo đơn hàng. Vui lòng kiểm tra lại tồn kho.');
      }
      setIsProcessing(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-xl font-bold font-serif text-[#00695C] flex items-center gap-2">
                Giỏ Hàng <span className="text-sm font-sans font-normal text-gray-500">({items.length} món)</span>
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <XIcon className="w-6 h-6 text-gray-600"/>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <p className="text-lg">Giỏ hàng trống</p>
                    <button onClick={onClose} className="mt-4 text-[#D4AF37] font-medium hover:underline">Tiếp tục mua sắm</button>
                </div>
            ) : (
                items.map(item => (
                    <div key={item.id} className="flex gap-4 border-b border-gray-100 pb-4 animate-fade-in-up">
                        <div className="w-20 h-24 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-medium text-gray-800 line-clamp-2 text-sm">{item.name}</h3>
                                <p className="text-[#00695C] font-bold text-sm mt-1">{formatPrice(item.selectedPrice)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Kho: {item.stock}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center border border-gray-300 rounded">
                                    <button 
                                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                        className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 text-sm font-medium">{item.quantity}</span>
                                    <button 
                                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                        className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                                        disabled={item.quantity >= item.stock}
                                    >
                                        +
                                    </button>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Xóa"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {items.length > 0 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Tổng cộng:</span>
                    <span className="text-2xl font-bold text-[#D4AF37]">{formatPrice(totalPrice)}</span>
                </div>
                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-[#00695C] text-white py-3 rounded-full font-bold shadow-lg hover:bg-[#004d40] transition-transform transform hover:-translate-y-0.5 disabled:opacity-70"
                >
                    {isProcessing ? 'Đang xử lý...' : 'Tiến hành Đặt hàng'}
                </button>
            </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
