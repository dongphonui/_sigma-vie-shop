
import React, { useMemo, useState } from 'react';
import type { CartItem, Customer } from '../types';
import { updateCartQuantity, removeFromCart, clearCart } from '../utils/cartStorage';
import { createOrder } from '../utils/orderStorage';
import PaymentModal from './PaymentModal';

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
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');

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
      const successfulOrders: string[] = [];
      const failedItems: string[] = [];
      
      // We will generate a SINGLE Order ID for the whole cart for payment simplicity in this demo,
      // but strictly speaking, our system creates 1 order per product. 
      // To adapt to "1 QR code for many items", we can just use the ID of the first created order as the reference,
      // or sum them up. For simplicity here:
      // 1. Create all orders.
      // 2. Sum up amount.
      // 3. Show QR.
      
      // Let's create orders first
      const createdOrders = [];

      for (const item of items) {
          const result = createOrder(currentUser, item, item.quantity, paymentMethod);
          if (result.success && result.order) {
              successfulOrders.push(`${item.name} (x${item.quantity})`);
              createdOrders.push(result.order);
          } else {
              failedItems.push(item.name);
          }
      }

      if (successfulOrders.length > 0) {
          // If Bank Transfer, show Modal
          if (paymentMethod === 'BANK_TRANSFER') {
              // Use the first order ID as reference or a combined one if we had a "Cart Order" concept.
              // Since we split orders, let's use the ID of the first order for the transaction reference.
              setLastOrderId(createdOrders[0].id);
              setShowQrModal(true);
              // Don't close drawer yet, wait for user confirmation
          } else {
              // COD
              clearCart(); 
              onClose();
              alert('Đơn hàng đã được đặt thành công (Thanh toán khi nhận hàng)!');
          }
      } else {
          alert(`Không thể đặt hàng. Có thể sản phẩm đã hết hàng. Lỗi: ${failedItems.join(', ')}`);
      }
      setIsProcessing(false);
  };

  const handleConfirmPayment = () => {
      setShowQrModal(false);
      clearCart();
      onClose();
      alert('Cảm ơn bạn! Đơn hàng đang được chờ xác nhận thanh toán.');
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
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Phương thức thanh toán:</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setPaymentMethod('COD')}
                            className={`py-2 px-2 text-xs sm:text-sm border rounded-lg font-medium transition-colors ${paymentMethod === 'COD' ? 'bg-[#D4AF37] text-white border-[#D4AF37]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            Tiền mặt (COD)
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('BANK_TRANSFER')}
                            className={`py-2 px-2 text-xs sm:text-sm border rounded-lg font-medium transition-colors ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#00695C] text-white border-[#00695C]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            Chuyển khoản (QR)
                        </button>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Tổng cộng:</span>
                    <span className="text-2xl font-bold text-[#D4AF37]">{formatPrice(totalPrice)}</span>
                </div>
                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-[#00695C] text-white py-3 rounded-full font-bold shadow-lg hover:bg-[#004d40] transition-transform transform hover:-translate-y-0.5 disabled:opacity-70"
                >
                    {isProcessing ? 'Đang xử lý...' : (paymentMethod === 'BANK_TRANSFER' ? 'Tạo mã QR Thanh toán' : 'Tiến hành Đặt hàng')}
                </button>
            </div>
        )}
      </div>

      <PaymentModal 
        isOpen={showQrModal} 
        onClose={() => setShowQrModal(false)}
        orderId={lastOrderId}
        amount={totalPrice}
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
};

export default CartDrawer;
