
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
      if (!shipName || !shipPhone || !shipAddress) { alert('Quý khách vui lòng cung cấp đủ thông tin nhận hàng.'); return; }

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
              alert(`Đặt hàng thành công! Tổng giá trị: ${formatPrice(totalPrice)}`);
          }
      } else {
          alert('Không thể hoàn tất đơn hàng. Một số mặt hàng có thể đã hết hàng.');
      }
      setIsProcessing(false);
  };

  return (
    <>
      <div className={`fixed inset-0 bg-[#0a1a16]/80 transition-opacity duration-500 z-50 backdrop-blur-sm ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-[0_0_80px_rgba(0,0,0,0.4)] transform transition-transform duration-700 cubic-bezier(0.16, 1, 0.3, 1) z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-[#FCFCFB]">
            <div>
                <h2 className="text-2xl font-sans font-black text-[#111827] uppercase tracking-tighter">Giỏ hàng</h2>
                <p className="text-[10px] font-black text-[#B4975A] uppercase tracking-[0.3em] mt-1">Sigma Vie Boutique</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-colors text-slate-300">
                <XIcon className="w-6 h-6"/>
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-8">
            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-200">
                    <ShoppingBagIcon className="w-16 h-16 mb-6 opacity-10" />
                    <p className="font-sans font-medium italic text-slate-400">Túi đồ của quý khách đang trống</p>
                    <button onClick={onClose} className="mt-8 text-[#B4975A] font-black uppercase text-[10px] tracking-[0.4em] hover:opacity-70 transition-opacity">Tiếp tục mua sắm</button>
                </div>
            ) : (
                items.map(item => (
                    <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex gap-8 group animate-fade-in-up">
                        <div className="w-28 h-36 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg border border-slate-50">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000" />
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                            <div>
                                <h3 className="font-black text-[#111827] text-sm leading-tight line-clamp-2 uppercase tracking-tight font-sans">{item.name}</h3>
                                <div className="flex gap-3 mt-3">
                                    {item.selectedSize && <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-3 py-1 rounded-lg uppercase tracking-tighter">S: {item.selectedSize}</span>}
                                    {item.selectedColor && <span className="text-[9px] font-black text-slate-400 border border-slate-100 px-3 py-1 rounded-lg uppercase tracking-tighter">M: {item.selectedColor}</span>}
                                </div>
                                <p className="text-[#064E3B] font-black text-lg mt-3 font-sans">{formatPrice(item.selectedPrice)}</p>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center bg-slate-50 rounded-xl p-1.5 border border-slate-100 shadow-inner">
                                    <button onClick={() => updateCartQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)} className="w-6 h-6 text-slate-300 hover:text-[#111827] font-bold transition-colors">-</button>
                                    <span className="w-10 text-center text-xs font-black font-sans text-[#111827]">{item.quantity}</span>
                                    <button onClick={() => updateCartQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)} disabled={item.quantity >= item.stock} className="w-6 h-6 text-slate-300 hover:text-[#111827] font-bold disabled:opacity-20 transition-colors">+</button>
                                </div>
                                <button onClick={() => removeFromCart(item.id, item.selectedSize, item.selectedColor)} className="text-slate-200 hover:text-rose-500 transition-colors p-2">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

        {items.length > 0 && (
            <div className="p-10 bg-[#FCFCFB] border-t border-slate-50">
                <div className="space-y-4 mb-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bàn giao vật phẩm</p>
                    <input type="text" placeholder="Họ và tên người nhận" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full bg-transparent border-b border-slate-200 py-2 text-xs font-bold focus:border-[#B4975A] outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full bg-transparent border-b border-slate-200 py-2 text-xs font-bold focus:border-[#B4975A] outline-none" />
                        <input type="text" placeholder="Địa chỉ bàn giao" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full bg-transparent border-b border-slate-200 py-2 text-xs font-bold focus:border-[#B4975A] outline-none" />
                    </div>
                </div>

                <div className="space-y-4 mb-10 border-b border-slate-50 pb-8">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                        <span className="uppercase tracking-widest">Tạm tính</span>
                        <span className="text-[#111827] font-sans">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                        <span className="uppercase tracking-widest">Dịch vụ vận chuyển</span>
                        <span className={shippingFee === 0 ? 'text-emerald-600 font-black' : 'text-[#111827] font-sans'}>{shippingFee === 0 ? 'MIỄN PHÍ' : formatPrice(shippingFee)}</span>
                    </div>
                    <div className="pt-6 flex justify-between items-center">
                        <span className="text-[10px] font-black text-[#B4975A] uppercase tracking-[0.3em]">Tổng thanh toán</span>
                        <span className="text-3xl font-black text-[#111827] font-sans tracking-tighter">{formatPrice(totalPrice)}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#111827] text-white border-[#111827] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>Tiền mặt</button>
                    <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>Chuyển khoản</button>
                </div>

                <button 
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="w-full bg-[#111827] text-white py-6 rounded-full font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
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
