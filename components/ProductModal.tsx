
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
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const QrIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M12 21v-1"/></svg>
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
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng hoàn thiện thông tin giao hàng'); return; }

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
      <div className="fixed inset-0 bg-[#064E3B]/90 z-50 flex items-center justify-center p-0 md:p-10 backdrop-blur-xl" onClick={onClose}>
        <div className="relative bg-white w-full max-w-7xl h-full md:h-auto md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-none md:rounded-[3rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* CỘT TRÁI: VISUAL GALLERY */}
            <div className="w-full md:w-[45%] h-[350px] md:h-auto relative overflow-hidden group">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" />
                
                {/* ID Tag */}
                <div className="absolute top-8 left-8 z-10 glass-pearl py-2 px-5 rounded-full border-none">
                    <span className="font-sans-luxury text-[7px] text-[#064E3B] opacity-70">Model ID: {product.sku}</span>
                </div>

                <button 
                    onClick={() => setShowProductQrView(true)}
                    className="absolute bottom-8 left-8 glass-pearl p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all text-[#92400E]"
                >
                    <QrIcon />
                </button>

                <button onClick={onClose} className="md:hidden absolute top-6 right-6 glass-pearl p-3 rounded-full text-[#064E3B]"><XIcon /></button>
            </div>

            {/* CỘT PHẢI: EDITORIAL CONTENT */}
            <div className="w-full md:w-[55%] p-8 md:p-14 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-200 hover:text-[#064E3B] transition-all duration-300"><XIcon /></button>
                
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-5">
                        <span className="w-8 h-[2px] bg-[#D4AF37]"></span>
                        <span className="font-sans-luxury text-[8px] text-[#D4AF37] tracking-[0.4em]">Official Boutique Item</span>
                    </div>
                    
                    {/* TIÊU ĐỀ ĐỒNG NHẤT MỘT MÀU XANH LÁ */}
                    <h1 className="text-4xl md:text-5xl font-serif font-black text-[#064E3B] leading-tight mb-6">
                        {product.name}
                    </h1>
                    
                    <div className="flex items-center gap-5 mb-8">
                        <span className="text-3xl font-black text-[#064E3B] tracking-tighter">
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-base text-slate-300 line-through font-light">{product.price}</span>}
                    </div>
                    
                    <div className="pt-6 border-t border-slate-50">
                        <p className="pro-description">
                            {product.description || 'Sản phẩm được chế tác từ những vật liệu cao cấp nhất, kết hợp giữa truyền thống thủ công và hơi thở đương đại, tạo nên một tuyệt phẩm dành riêng cho phong cách của quý khách.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Tùy chọn phân loại */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {hasSizes && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-400 mb-4 block">Chọn Kích thước</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-11 w-11 rounded-lg border transition-all text-xs font-bold ${selectedSize === s ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg shadow-emerald-900/20' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-400 mb-4 block">Chọn Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-5 h-11 rounded-lg border transition-all text-xs font-bold ${selectedColor === c ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg shadow-emerald-900/20' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Số lượng & Kho */}
                    <div className="flex items-center justify-between py-6 border-y border-slate-50">
                        <div>
                             <p className={`font-sans-luxury text-[9px] ${variantStock === 0 ? 'text-rose-500' : 'text-[#064E3B]'}`}>
                                {variantStock === 0 ? 'Hiện tại đã hết hàng' : (variantStock > 0 ? `Tồn kho: ${variantStock} sản phẩm` : 'Vui lòng chọn phân loại')}
                             </p>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-full h-11 px-4 gap-5">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-xl text-slate-400 hover:text-[#064E3B]">-</button>
                            <span className="text-sm font-bold text-[#064E3B] w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="text-xl text-slate-400 hover:text-[#064E3B] disabled:opacity-10">+</button>
                        </div>
                    </div>

                    {/* Tổng tiền Simple */}
                    <div className="bg-[#F9FAF9] p-7 rounded-[2rem] space-y-3">
                        <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                            <span>Sản phẩm: {formatCurrency(basePrice)} x {quantity}</span>
                            <span className="text-slate-600">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-medium text-slate-400">
                            <span>Phí vận chuyển:</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>{shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-200/50 flex justify-between items-center">
                            <span className="font-sans-luxury text-[10px] text-[#92400E]">Tổng thanh toán</span>
                            <span className="text-3xl font-black text-[#064E3B] tracking-tighter">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Giao hàng Info */}
                    <div className="space-y-4 pt-4">
                        <label className="font-sans-luxury text-[9px] text-slate-400 block">Thông tin nhận hàng</label>
                        <input type="text" placeholder="Họ và tên khách hàng" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line" />
                            <input type="text" placeholder="Địa chỉ giao hàng" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-6 pb-10">
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-xl font-sans-luxury text-[8px] transition-all border ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-xl font-sans-luxury text-[8px] transition-all border ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#92400E] text-white border-[#92400E] shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>Quét mã Bank</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-luxury-main w-full ${variantStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : ''}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang gửi yêu cầu...' : (variantStock === 0 ? 'Sản phẩm tạm hết' : 'Đặt mua ngay')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-5 text-center font-sans-luxury text-[8px] text-rose-500 animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Overlay Thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up">
                        <div className="w-20 h-20 bg-[#064E3B] rounded-full flex items-center justify-center text-white mb-8 shadow-xl">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <h2 className="text-4xl font-serif font-black text-[#064E3B] mb-4 text-center">Cảm ơn quý khách</h2>
                        <p className="pro-description text-center max-w-xs mb-10">Đơn hàng của quý khách đã được ghi nhận. Sigma Vie sẽ liên hệ xác nhận trong giây lát.</p>
                        <button onClick={onClose} className="btn-luxury-main">Tiếp tục mua sắm</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modal QR Identity */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#064E3B]/98 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center relative shadow-2xl animate-float-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#064E3B]"><XIcon/></button>
                  <h4 className="font-sans-luxury text-[9px] text-[#92400E] mb-10">Product Identification</h4>
                  <div className="bg-white p-6 border border-slate-50 rounded-[2.5rem] inline-block shadow-inner mb-8">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={200} />
                  </div>
                  <p className="text-xs text-slate-500 font-normal leading-relaxed italic">Quét mã để truy cập nhanh hoặc chia sẻ sản phẩm này.</p>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
