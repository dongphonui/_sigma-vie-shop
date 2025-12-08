
import React, { useMemo, useState, useEffect } from 'react';
import type { CartItem, Customer } from '../types';
import { updateCartQuantity, removeFromCart, clearCart } from '../utils/cartStorage';
import { createOrder } from '../utils/orderStorage';
import { calculateShippingFee, getShippingSettings } from '../utils/shippingSettingsStorage';
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

const LockIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, currentUser, onOpenAuth }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [shippingSettings, setShippingSettings] = useState(getShippingSettings());

  useEffect(() => {
      if (isOpen) {
          setShippingSettings(getShippingSettings());
      }
  }, [isOpen]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0);
  }, [items]);

  const shippingFee = calculateShippingFee(subtotal);
  const totalPrice = subtotal + shippingFee;

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
      const createdOrders = [];
      
      let isFirstItem = true;

      for (const item of items) {
          const feeForItem = isFirstItem ? shippingFee : 0;
          // Pass selectedSize and selectedColor to createOrder
          const result = createOrder(currentUser, item, item.quantity, paymentMethod, feeForItem, item.selectedSize, item.selectedColor);
          
          if (result.success && result.order) {
              const variants = [];
              if(item.selectedSize) variants.push(item.selectedSize);
              if(item.selectedColor) variants.push(item.selectedColor);
              const variantStr = variants.length > 0 ? `(${variants.join(', ')})` : '';

              successfulOrders.push(`${item.name} ${variantStr} (x${item.quantity})`);
              createdOrders.push(result.order);
              isFirstItem = false; // Only charge shipping once
          } else {
              failedItems.push(item.name);
          }
      }

      if (successfulOrders.length > 0) {
          // If Bank Transfer, show Modal for the total amount
          if (paymentMethod === 'BANK_TRANSFER') {
              // Show QR with info of first order ID but TOTAL Amount
              setLastOrderId(createdOrders[0].id + (createdOrders.length > 1 ? '-COMBINED' : ''));
              setShowQrModal(true);
          } else {
              // COD
              clearCart(); 
              onClose();
              alert(`Đơn hàng đã được đặt thành công! Tổng thanh toán: ${formatPrice(totalPrice)}`);
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

  // NẾU CHƯA ĐĂNG NHẬP: Hiển thị màn hình chặn
  if (!currentUser) {
      return (
        <>
            <div 
                className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            <div 
                className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col items-center justify-center p-8 text-center ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="bg-gray-100 p-4 rounded-full mb-4">
                    <LockIcon className="w-10 h-10 text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Giỏ hàng đã khóa</h2>
                <p className="text-gray-500 mb-6">Vui lòng đăng nhập để xem giỏ hàng và thực hiện thanh toán.</p>
                <button 
                    onClick={() => { onClose(); onOpenAuth(); }}
                    className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-bold hover:bg-[#b89b31]"
                >
                    Đăng nhập ngay
                </button>
                <button onClick={onClose} className="mt-4 text-gray-400 hover:text-gray-600 text-sm">
                    Đóng
                </button>
            </div>
        </>
      );
  }

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
                    <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-4 border-b border-gray-100 pb-4 animate-fade-in-up">
                        <div className="w-20 h-24 flex-shrink-0 rounded-md overflow-hidden border border-gray-200">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="font-medium text-gray-800 line-clamp-2 text-sm">{item.name}</h3>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {item.selectedSize && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 rounded">Size: {item.selectedSize}</span>
                                    )}
                                    {item.selectedColor && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 rounded">Màu: {item.selectedColor}</span>
                                    )}
                                </div>
                                <p className="text-[#00695C] font-bold text-sm mt-1">{formatPrice(item.selectedPrice)}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Kho: {item.stock}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <div className="flex items-center border border-gray-300 rounded">
                                    <button 
                                        onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                                        className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                                    >
                                        -
                                    </button>
                                    <span className="px-2 text-sm font-medium">{item.quantity}</span>
                                    <button 
                                        onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                                        className="px-2 py-0.5 text-gray-600 hover:bg-gray-100"
                                        disabled={item.quantity >= item.stock}
                                    >
                                        +
                                    </button>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)}
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

                <div className="space-y-2 mb-4 border-t pt-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Tạm tính:</span>
                        <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Phí vận chuyển:</span>
                        {shippingFee === 0 ? (
                            <span className="font-bold text-green-600">Miễn phí</span>
                        ) : (
                            <span className="font-medium">{formatPrice(shippingFee)}</span>
                        )}
                    </div>
                    {shippingFee > 0 && shippingSettings.enabled && (
                        <div className="text-xs text-gray-400 text-right">
                            (Mua thêm {formatPrice(shippingSettings.freeShipThreshold - subtotal)} để được Freeship)
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                        <span className="text-gray-800 font-bold">Tổng cộng:</span>
                        <span className="text-2xl font-bold text-[#D4AF37]">{formatPrice(totalPrice)}</span>
                    </div>
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
        amount={totalPrice} // Use Total Price
        onConfirmPayment={handleConfirmPayment}
      />
    </>
  );
};

export default CartDrawer;
