
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

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

const QrIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
);

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); 
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showProductQrView, setShowProductQrView] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

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

  const parsePrice = (p: string) => parseInt(p.replace(/[^0-9]/g, ''), 10) || 0;
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN').format(val) + '₫';

  const basePrice = (product.isFlashSale && product.salePrice) ? parsePrice(product.salePrice) : parsePrice(product.price);
  const subtotal = basePrice * quantity;
  const shippingFee = calculateShippingFee(subtotal);
  const total = subtotal + shippingFee;

  const handlePlaceOrder = async () => {
      if (!isLoggedIn) { onOpenAuth(); return; }
      if (hasSizes && !selectedSize) { setFeedbackMsg('Quý khách vui lòng chọn Kích thước'); return; }
      if (hasColors && !selectedColor) { setFeedbackMsg('Quý khách vui lòng chọn Màu sắc'); return; }
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng điền thông tin nhận hàng'); return; }

      setOrderStatus('PROCESSING');
      const result = createOrder(getCurrentCustomer()!, product, quantity, paymentMethod, shippingFee, selectedSize, selectedColor, {
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
      <div className="fixed inset-0 bg-[#064E3B]/90 z-50 flex items-center justify-center p-0 md:p-6 backdrop-blur-xl" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl max-h-screen md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-none md:rounded-[3rem] animate-fade-in-up" onClick={e => e.stopPropagation()}>
            
            {/* ẢNH SẢN PHẨM & SIGNATURE QR */}
            <div className="w-full md:w-[45%] h-[350px] md:h-auto bg-[#F9FAF9] relative overflow-hidden group">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#064E3B]/30 to-transparent"></div>
                
                {/* QR Signature Button */}
                <button 
                    onClick={() => setShowProductQrView(true)}
                    className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white hover:scale-110 active:scale-95 transition-all text-[#92400E] flex flex-col items-center gap-1"
                >
                    <QrIcon />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Xem QR</span>
                </button>

                <button onClick={onClose} className="md:hidden absolute top-4 right-4 bg-white/80 p-2 rounded-full shadow-lg text-[#064E3B]"><XIcon /></button>
            </div>

            {/* NỘI DUNG CHI TIẾT MUA HÀNG */}
            <div className="w-full md:w-[55%] p-6 md:p-12 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 text-slate-300 hover:text-[#064E3B] transition-colors"><XIcon /></button>
                
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-6 h-px bg-[#92400E]"></span>
                        <span className="text-[9px] font-black text-[#92400E] uppercase tracking-[0.4em]">Boutique Collection</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#064E3B] leading-tight mb-4">{product.name}</h1>
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-3xl font-black text-[#064E3B] font-sans tracking-tighter">{product.isFlashSale ? product.salePrice : product.price}</span>
                        {product.isFlashSale && <span className="text-base text-slate-300 line-through font-light italic">{product.price}</span>}
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed border-l-2 border-[#92400E]/20 pl-4 italic">
                        {product.description || 'Sản phẩm cao cấp mang đậm dấu ấn phong cách Sigma Vie, tinh tế trong từng chi tiết.'}
                    </p>
                </div>

                <div className="space-y-8 bg-[#F9FAF9] rounded-[2.5rem] p-6 md:p-10 border border-[#064E3B]/5">
                    
                    {/* Tùy chọn phân loại */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {hasSizes && (
                            <div>
                                <label className="text-[10px] font-black text-[#064E3B]/60 uppercase tracking-widest mb-3 block">1. Chọn Kích thước</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-11 min-w-[3rem] rounded-xl border-2 transition-all text-xs font-bold font-sans ${selectedSize === s ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg shadow-[#064E3B]/20' : 'bg-white text-slate-400 border-white hover:border-[#064E3B]/20'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="text-[10px] font-black text-[#064E3B]/60 uppercase tracking-widest mb-3 block">2. Chọn Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-4 h-11 rounded-xl border-2 transition-all text-xs font-bold font-sans ${selectedColor === c ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg shadow-[#064E3B]/20' : 'bg-white text-slate-400 border-white hover:border-[#064E3B]/20'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Số lượng */}
                    <div className="flex items-center justify-between py-6 border-y border-[#064E3B]/5">
                        <div>
                             <p className={`text-[10px] font-black uppercase tracking-wider mb-1 ${variantStock === 0 ? 'text-rose-500' : 'text-[#064E3B]/60'}`}>
                                {variantStock === 0 ? 'Phiên bản này đã hết hàng' : (variantStock > 0 ? `Sẵn sàng: ${variantStock} sản phẩm` : 'Vui lòng chọn phân loại')}
                             </p>
                             <p className="text-[9px] text-slate-400 font-medium">Kiểm tra tồn kho thời gian thực</p>
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-full h-12 px-3 shadow-inner">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-full text-xl text-slate-300 hover:text-[#064E3B] transition-colors">-</button>
                            <span className="w-10 text-center font-black text-[#064E3B] font-sans">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(q => q + 1)} 
                                disabled={variantStock !== -1 && quantity >= variantStock}
                                className="w-8 h-full text-xl text-slate-300 hover:text-[#064E3B] disabled:opacity-5 transition-colors"
                            >+</button>
                        </div>
                    </div>

                    {/* CHI TIẾT GIÁ & PHÍ VẬN CHUYỂN */}
                    <div className="space-y-4 bg-white p-6 rounded-2xl border border-[#064E3B]/5 shadow-sm">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-medium">Giá sản phẩm:</span>
                            <span className="font-bold text-[#064E3B] font-sans">{formatCurrency(basePrice)} <span className="text-[10px] text-slate-300 font-normal">x {quantity}</span></span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 font-medium">Phí giao hàng dự kiến:</span>
                            <span className={`font-black font-sans ${shippingFee === 0 ? 'text-emerald-600' : 'text-[#064E3B]'}`}>
                                {shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}
                            </span>
                        </div>
                        <div className="pt-4 border-t border-dashed border-[#064E3B]/10 flex justify-between items-center">
                            <span className="text-[10px] font-black text-[#92400E] uppercase tracking-widest">Tổng tiền thanh toán</span>
                            <span className="text-2xl font-black text-[#064E3B] tracking-tighter font-sans">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Thông tin nhận hàng */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-[#064E3B] uppercase tracking-widest block">3. Thông tin người nhận</label>
                        <input type="text" placeholder="Họ và tên khách hàng" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury" />
                            <input type="text" placeholder="Địa chỉ giao hàng" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury" />
                        </div>
                    </div>

                    {/* Thanh toán & Nút mua */}
                    <div className="pt-4">
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200 hover:border-[#064E3B]/30'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#92400E] text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200 hover:border-[#92400E]/30'}`}>Quét QR Bank</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`w-full py-5 rounded-full font-black uppercase tracking-[0.3em] text-[11px] transition-all shadow-2xl flex items-center justify-center gap-3
                                ${variantStock === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-[#064E3B] text-white hover:bg-[#022c22] shadow-[#064E3B]/30 hover:scale-[1.02]'}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'ĐANG KHỞI TẠO...' : (variantStock === 0 ? 'HẾT HÀNG TẠM THỜI' : 'XÁC NHẬN ĐẶT HÀNG')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-4 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Overlay Thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-fade-in backdrop-blur-2xl">
                        <div className="w-24 h-24 bg-[#064E3B] rounded-full flex items-center justify-center text-white mb-10 shadow-2xl shadow-[#064E3B]/30">
                            <CheckIcon />
                        </div>
                        <h2 className="text-4xl font-serif font-bold mb-4 text-[#064E3B] text-center">Đã ghi nhận đơn hàng!</h2>
                        <p className="text-slate-500 text-center max-w-sm mb-12 font-medium leading-relaxed italic">Sigma Vie sẽ sớm liên hệ xác nhận đơn hàng của quý khách.</p>
                        <button onClick={onClose} className="bg-[#92400E] text-white px-16 py-5 rounded-full font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#78350f] transition-all shadow-2xl shadow-[#92400E]/30">Tiếp tục mua sắm</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modal View QR Sản phẩm */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#064E3B]/95 z-[150] flex items-center justify-center p-6" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up border-8 border-[#92400E]/10" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#064E3B]"><XIcon/></button>
                  <h4 className="text-[11px] font-black text-[#92400E] mb-10 uppercase tracking-[0.4em]">Product Signature</h4>
                  <div className="bg-white p-6 border-4 border-slate-50 rounded-[2.5rem] inline-block shadow-inner mb-8">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={200} />
                  </div>
                  <p className="text-[10px] text-slate-400 mb-6 font-mono font-bold tracking-widest uppercase">REF SKU: {product.sku}</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium italic">Sử dụng mã định danh để truy cập nhanh từ các thiết bị khác hoặc chia sẻ cho bạn bè.</p>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
