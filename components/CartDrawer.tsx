
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

// Fix: Added missing ShoppingBagIcon definition
const ShoppingBagIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
);

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, items, currentUser, onOpenAuth }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');

  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');

  useEffect(() => {
      if (isOpen && currentUser) {
          setShipName(currentUser.fullName);
          setShipPhone(currentUser.phoneNumber || '');
          setShipAddress(currentUser.address || '');
      }
  }, [isOpen, currentUser]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.selectedPrice * item.quantity), 0);
  }, [items]);

  const shippingFee = calculateShippingFee(subtotal);
  const totalPrice = subtotal + shippingFee;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price) + '₫';
  };

  const handleCheckout = async () => {
      if (!currentUser) { onClose(); onOpenAuth(); return; }
      if (!shipName || !shipPhone || !shipAddress) { alert('Vui lòng điền đủ thông tin nhận hàng.'); return; }

      setIsProcessing(true);
      const createdOrders = [];
      let isFirstItem = true;

      for (const item of items) {
          const fee = isFirstItem ? shippingFee : 0;
          const result = createOrder(currentUser, item, item.quantity, paymentMethod, fee, item.selectedSize, item.selectedColor, {
              name: shipName, phone: shipPhone, address: shipAddress
          });
          if (result.success && result.order) {
              createdOrders.push(result.order);
              isFirstItem = false;
          }
      }

      if (createdOrders.length > 0) {
          if (paymentMethod === 'BANK_TRANSFER') {
              setLastOrderId(createdOrders[0].id + (createdOrders.length > 1 ? '-PACK' : ''));
              setShowQrModal(true);
          } else {
              clearCart(); 
              onClose();
              alert(`Đặt hàng thành công! Tổng: ${formatPrice(totalPrice)}`);
          }
      } else {
          alert('Không thể hoàn tất đơn hàng. Một số mặt hàng có thể đã hết hàng.');
      }
      setIsProcessing(false);
  };

  return (
    <>
      <div className={`fixed inset-0 bg-[#064E3B]/60 transition-opacity duration-500 z-50 backdrop-blur-sm ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[450px] bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)] transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="p-8 border-b border-[#064E3B]/5 flex justify-between items-center bg-[#F9FAF9]">
            <div>
                <h2 className="text-2xl font-serif font-black text-[#064E3B]">Giỏ Hàng</h2>
                <p className="text-[10px] font-black text-[#92400E] uppercase tracking-widest">Signature Boutique</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-[#064E3B]/5 rounded-full transition-colors text-[#064E3B]">
                <XIcon className="w-6 h-6"/>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                    <ShoppingBagIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-serif italic">Túi đồ của quý khách đang trống</p>
                    <button onClick={onClose} className="mt-6 text-[#92400E] font-black uppercase text-[10px] tracking-widest hover:underline">Quay lại cửa hàng</button>
                </div>
            ) : (
                items.map(item => (
                    <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-6 group animate-fade-in-up">
                        <div className="w-24 h-32 flex-shrink-0 rounded-2xl overflow-hidden shadow-md">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <h3 className="font-bold text-[#064E3B] text-sm leading-snug line-clamp-2">{item.name}</h3>
                                <div className="flex gap-3 mt-2">
                                    {item.selectedSize && <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Size: {item.selectedSize}</span>}
                                    {item.selectedColor && <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">Màu: {item.selectedColor}</span>}
                                </div>
                                <p className="text-[#064E3B] font-black text-base mt-2 font-sans">{formatPrice(item.selectedPrice)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center bg-slate-50 rounded-lg p-1">
                                    <button onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)} className="w-6 h-6 text-slate-400 hover:text-[#064E3B]">-</button>
                                    <span className="w-8 text-center text-xs font-black font-sans">{item.quantity}</span>
                                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)} disabled={item.quantity >= item.stock} className="w-6 h-6 text-slate-400 hover:text-[#064E3B] disabled:opacity-20">+</button>
                                </div>
                                <button onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)} className="text-slate-300 hover:text-rose-500 transition-colors">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {items.length > 0 && (
            <div className="p-8 bg-[#F9FAF9] border-t border-[#064E3B]/5">
                <div className="space-y-4 mb-8">
                    <p className="text-[10px] font-black text-[#064E3B] uppercase tracking-widest">Địa chỉ giao hàng</p>
                    <input type="text" placeholder="Người nhận" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury py-2 text-xs" />
                    <div className="grid grid-cols-2 gap-3">
                        <input type="tel" placeholder="SĐT" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury py-2 text-xs" />
                        <input type="text" placeholder="Địa chỉ" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury py-2 text-xs" />
                    </div>
                </div>

                <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-slate-400">Tạm tính:</span>
                        <span className="text-[#064E3B] font-sans font-bold">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-slate-400">Phí vận chuyển:</span>
                        <span className={shippingFee === 0 ? 'text-emerald-600 font-bold' : 'text-[#064E3B] font-sans'}>{shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}</span>
                    </div>
                    <div className="pt-4 border-t border-[#064E3B]/10 flex justify-between items-center">
                        <span className="text-xs font-black text-[#92400E] uppercase tracking-widest">Tổng cộng</span>
                        <span className="text-3xl font-black text-[#064E3B] font-sans tracking-tighter">{formatPrice(totalPrice)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <button onClick={() => setPaymentMethod('COD')} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Tiền mặt</button>
                    <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#92400E] text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}>Chuyển khoản</button>
                </div>

                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-[#064E3B] text-white py-5 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-[#022c22] transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                    {isProcessing ? 'ĐANG XỬ LÝ...' : 'TIẾN HÀNH THANH TOÁN'}
                </button>
            </div>
        )}
      </div>

      <PaymentModal 
        isOpen={showQrModal} 
        onClose={() => setShowQrModal(false)}
        orderId={lastOrderId}
        amount={totalPrice}
        onConfirmPayment={() => { setShowQrModal(false); clearCart(); onClose(); alert('Cảm ơn quý khách! Đơn hàng đang được chờ xác nhận.'); }}
      />
    </>
  );
};

export default CartDrawer;
