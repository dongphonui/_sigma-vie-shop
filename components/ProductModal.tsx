
import React, { useEffect, useState, useMemo } from 'react';
import type { Product, Order } from '../types';
import { createOrder } from '../utils/orderStorage';
import { getCurrentCustomer } from '../utils/customerStorage';
import { calculateShippingFee } from '../utils/shippingSettingsStorage';
import PaymentModal from './PaymentModal';
import { QRCodeSVG } from 'qrcode.react';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  isLoggedIn: boolean;
  onOpenAuth: () => void;
}

const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

const CheckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);

const QrCodeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
);

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); 
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showProductQr, setShowProductQr] = useState(false);

  // Delivery Info
  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');

  useEffect(() => {
      const customer = getCurrentCustomer();
      if (customer) {
          setShipName(customer.fullName);
          setShipPhone(customer.phoneNumber || '');
          setShipAddress(customer.address || '');
      }
  }, [isLoggedIn]);

  const hasSizes = product.sizes && product.sizes.length > 0;
  const hasColors = product.colors && product.colors.length > 0;

  // Stock logic for variant
  const variantStock = useMemo(() => {
    if (!hasSizes && !hasColors) return product.stock;
    if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) return -1;
    if (!product.variants) return 0;
    const variant = product.variants.find(v => 
        (v.size === selectedSize || (!hasSizes && !v.size)) && 
        (v.color === selectedColor || (!hasColors && !v.color))
    );
    return variant ? variant.stock : 0;
  }, [product, selectedSize, selectedColor]);

  // SMART FEEDBACK MESSAGE AS REQUESTED
  const stockFeedback = useMemo(() => {
      if (hasSizes && !selectedSize) return { text: "Vui lòng chọn size", type: "hint" };
      if (hasColors && !selectedColor) return { text: "Vui lòng chọn màu sắc", type: "hint" };
      
      // Both selected or single-attribute product
      if (variantStock === 0) return { text: "Hiện đã hết hàng cho phân loại này", type: "error" };
      if (variantStock > 0) return { text: `Sẵn có ${variantStock} sản phẩm`, type: "success" };
      return { text: "Vui lòng hoàn tất lựa chọn", type: "hint" };
  }, [selectedSize, selectedColor, variantStock, hasSizes, hasColors]);

  const parsePrice = (p: string) => parseInt(p.replace(/[^0-9]/g, ''), 10) || 0;
  const formatCurrency = (a: number) => new Intl.NumberFormat('vi-VN').format(a) + ' ₫';

  const basePrice = (product.isFlashSale && product.salePrice) ? parsePrice(product.salePrice) : parsePrice(product.price);
  const total = (basePrice * quantity) + calculateShippingFee(basePrice * quantity);

  const handlePlaceOrder = async () => {
      if (!isLoggedIn) { onOpenAuth(); return; }
      if (hasSizes && !selectedSize) { setFeedbackMsg('Vui lòng chọn kích thước.'); return; }
      if (hasColors && !selectedColor) { setFeedbackMsg('Vui lòng chọn màu sắc.'); return; }
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Thông tin giao hàng còn thiếu.'); return; }
      if (variantStock < quantity) { setFeedbackMsg('Số lượng không đủ.'); return; }

      setOrderStatus('PROCESSING');
      const result = createOrder(getCurrentCustomer()!, product, quantity, paymentMethod, 0, selectedSize, selectedColor, {
          name: shipName, phone: shipPhone, address: shipAddress
      });

      if (result.success && result.order) {
          setCreatedOrder(result.order);
          if (paymentMethod === 'BANK_TRANSFER') setShowQrModal(true);
          else setOrderStatus('SUCCESS');
      } else {
          setFeedbackMsg(result.message);
          setOrderStatus('IDLE');
      }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-0 md:p-6 backdrop-blur-md" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl max-h-screen md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.3)] animate-fade-in" onClick={e => e.stopPropagation()}>
            
            {/* Image Gallery Side */}
            <div className="w-full md:w-1/2 h-[40vh] md:h-auto relative bg-[#f8f8f8]">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                <button onClick={() => setShowProductQr(true)} className="absolute bottom-8 left-8 bg-white/80 p-4 rounded-full hover:scale-110 transition-transform shadow-xl">
                    <QrCodeIcon className="w-6 h-6 text-gray-800" />
                </button>
            </div>

            {/* Premium Content Side */}
            <div className="w-full md:w-1/2 p-8 md:p-16 overflow-y-auto bg-white flex flex-col">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-300 hover:text-gray-900 transition-colors"><XIcon className="w-8 h-8"/></button>
                
                {/* Product Header */}
                <div className="mb-12">
                    <h2 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.4em] mb-4">Sigma Vie Collection</h2>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-6">{product.name}</h1>
                    <div className="flex items-baseline gap-4 mb-8">
                        <span className="text-3xl font-light text-gray-900 font-sans tracking-tight">{product.isFlashSale ? product.salePrice : product.price}</span>
                        {product.isFlashSale && <span className="text-lg text-gray-300 line-through font-light">{product.price}</span>}
                    </div>
                    <p className="text-gray-500 text-sm leading-relaxed font-light italic max-w-md border-l-2 border-gray-100 pl-6">
                        {product.description || 'A timeless piece designed for the modern individual, blending elegance with effortless style.'}
                    </p>
                </div>

                {/* Purchase Controls - THE RE-DESIGNED SECTION */}
                <div className="space-y-12 border-t border-gray-100 pt-12">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Tùy Chọn Mua Hàng</h3>

                    {/* Size Selector */}
                    {hasSizes && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <label className="text-[11px] font-semibold text-gray-900 uppercase tracking-widest">Kích thước</label>
                                <span className="text-[10px] text-gray-400 underline cursor-pointer hover:text-gray-900 transition-colors">Bảng size</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {product.sizes?.map(s => (
                                    <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-12 min-w-[3.5rem] border transition-all text-xs font-bold tracking-widest ${selectedSize === s ? 'bg-black text-white border-black' : 'bg-transparent text-gray-400 border-gray-200 hover:border-gray-900 hover:text-gray-900'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Color Selector */}
                    {hasColors && (
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-900 uppercase tracking-widest mb-6">Màu sắc</label>
                            <div className="flex flex-wrap gap-4">
                                {product.colors?.map(c => (
                                    <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-6 h-12 border transition-all text-xs font-bold tracking-widest ${selectedColor === c ? 'bg-black text-white border-black shadow-lg' : 'bg-transparent text-gray-400 border-gray-200 hover:border-gray-900 hover:text-gray-900'}`}>{c}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inventory & Quantity Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 py-8 border-y border-gray-50">
                        <div>
                             <p className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-2 ${
                                stockFeedback.type === 'hint' ? 'text-amber-500 italic' : 
                                stockFeedback.type === 'error' ? 'text-red-500' : 'text-gray-400'
                             }`}>
                                {stockFeedback.text}
                             </p>
                             <p className="text-[10px] text-gray-300">Giao hàng dự kiến: 2-3 ngày làm việc</p>
                        </div>
                        <div className="flex items-center border border-gray-200 h-14 px-4 bg-white">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-full text-xl text-gray-300 hover:text-black transition-colors">-</button>
                            <span className="w-12 text-center font-bold text-gray-900 font-sans">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(q => q + 1)} 
                                disabled={variantStock !== -1 && quantity >= variantStock}
                                className="w-10 h-full text-xl text-gray-300 hover:text-black transition-colors disabled:opacity-10"
                            >+</button>
                        </div>
                    </div>

                    {/* Delivery Form - Clean Style */}
                    <div className="space-y-6">
                        <label className="block text-[11px] font-semibold text-gray-900 uppercase tracking-widest">Thông tin giao hàng</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="text" placeholder="HỌ TÊN" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full border-b border-gray-200 py-3 text-xs font-medium tracking-widest outline-none focus:border-black transition-colors placeholder:text-gray-300" />
                            <input type="tel" placeholder="SỐ ĐIỆN THOẠI" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full border-b border-gray-200 py-3 text-xs font-medium tracking-widest outline-none focus:border-black transition-colors placeholder:text-gray-300" />
                        </div>
                        <input type="text" placeholder="ĐỊA CHỈ NHẬN HÀNG CHI TIẾT" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full border-b border-gray-200 py-3 text-xs font-medium tracking-widest outline-none focus:border-black transition-colors placeholder:text-gray-300" />
                    </div>

                    {/* Payment & CTA */}
                    <div className="pt-8">
                         <div className="flex justify-between items-center mb-10">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">Tổng cộng</span>
                            <span className="text-3xl font-bold text-gray-900 font-sans tracking-tighter">{formatCurrency(total)}</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Thanh toán khi nhận</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 text-[10px] font-bold uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-black text-white' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`w-full py-6 text-xs font-bold uppercase tracking-[0.4em] transition-all relative overflow-hidden ${variantStock === 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800 shadow-2xl'}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'Processing...' : (variantStock === 0 ? 'Out of Stock' : 'Confirm Purchase')}
                         </button>
                         {feedbackMsg && <p className="mt-4 text-center text-[10px] font-bold text-red-500 uppercase tracking-widest">{feedbackMsg}</p>}
                    </div>

                    {/* Success Overlay */}
                    {orderStatus === 'SUCCESS' && (
                        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-fade-in">
                            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white mb-10 shadow-2xl">
                                <CheckIcon className="w-10 h-10" />
                            </div>
                            <h2 className="text-4xl font-serif font-bold mb-4 tracking-tight">Cảm ơn quý khách!</h2>
                            <p className="text-gray-400 text-center max-w-sm mb-12 font-light leading-relaxed">Đơn hàng của bạn đã được tiếp nhận. Đội ngũ Sigma Vie sẽ liên hệ xác nhận trong thời gian sớm nhất.</p>
                            <button onClick={onClose} className="bg-black text-white px-12 py-5 text-xs font-bold uppercase tracking-[0.3em] hover:scale-105 transition-all">Quay lại Shop</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>

      {/* QR Modal - Clean Minimalist */}
      {showProductQr && (
          <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-8" onClick={() => setShowProductQr(false)}>
              <div className="bg-white p-12 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQr(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black"><XIcon className="w-6 h-6"/></button>
                  <h4 className="text-[10px] font-bold text-gray-900 mb-10 uppercase tracking-[0.3em]">Authenticity Code</h4>
                  <div className="p-4 border border-gray-100 mb-10 inline-block shadow-inner">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={200} />
                  </div>
                  <p className="text-[9px] text-gray-300 mb-2 font-mono tracking-widest">REF: {product.sku}</p>
                  <p className="text-xs text-gray-500 font-light leading-relaxed px-4 italic">Scan this code to access the official digital product page.</p>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
