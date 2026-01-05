
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
      <div className="fixed inset-0 bg-[#064E3B]/95 z-50 flex items-center justify-center p-0 md:p-10 backdrop-blur-2xl transition-all duration-700" onClick={onClose}>
        <div className="relative bg-white w-full max-w-7xl h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-none md:rounded-[4rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* CỘT TRÁI: VISUAL GALLERY */}
            <div className="w-full md:w-[45%] h-[400px] md:h-auto relative overflow-hidden group">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#064E3B]/40 via-transparent to-transparent"></div>
                
                {/* QR Boutique Label */}
                <div className="absolute top-12 left-0 z-10 glass-pearl py-2 px-6 rounded-r-full border-l-0">
                    <span className="font-sans-luxury text-[8px] text-[#92400E]">Boutique No. {product.id}</span>
                </div>

                <button 
                    onClick={() => setShowProductQrView(true)}
                    className="absolute bottom-10 left-10 glass-pearl p-5 rounded-[2rem] shadow-2xl hover:scale-110 active:scale-95 transition-all text-[#92400E] flex flex-col items-center gap-1 group/qr"
                >
                    <QrIcon />
                    <span className="font-sans-luxury text-[7px] tracking-[0.2em] group-hover/qr:tracking-[0.4em] transition-all">Identity QR</span>
                </button>

                <button onClick={onClose} className="md:hidden absolute top-8 right-8 glass-pearl p-3 rounded-full text-[#064E3B]"><XIcon /></button>
            </div>

            {/* CỘT PHẢI: EDITORIAL CONTENT */}
            <div className="w-full md:w-[55%] p-8 md:p-16 overflow-y-auto flex flex-col bg-[#FCFCF9]">
                <button onClick={onClose} className="hidden md:flex absolute top-12 right-12 text-slate-300 hover:text-[#92400E] transition-all hover:rotate-90 duration-500"><XIcon /></button>
                
                <div className="mb-14">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="w-12 h-[1px] bg-[#92400E]"></span>
                        <span className="font-sans-luxury text-[9px] text-[#92400E]">Exclusive Editorial</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-serif font-black text-[#064E3B] leading-[1.1] mb-8">
                        {product.name.split(' ').map((word, i) => i % 2 === 1 ? <span key={i} className="font-serif-italic font-normal italic text-[#92400E] ml-2">{word} </span> : word + ' ')}
                    </h1>
                    
                    <div className="flex items-center gap-6 mb-10">
                        <div className="bg-[#064E3B] text-white px-6 py-3 rounded-2xl shadow-xl">
                            <span className="text-2xl font-black font-sans tracking-tighter">{product.isFlashSale ? product.salePrice : product.price}</span>
                        </div>
                        {product.isFlashSale && <span className="text-lg text-slate-300 line-through font-serif-italic">Original: {product.price}</span>}
                    </div>
                    
                    <div className="relative pl-8 border-l border-[#92400E]/30">
                        <p className="pro-description text-sm italic opacity-80 leading-loose">
                            {product.description || 'Nghệ thuật cắt may đỉnh cao kết hợp cùng tư duy thẩm mỹ hiện đại, thiết kế này không chỉ là trang phục mà còn là biểu ngôn cho phong cách sống thượng lưu.'}
                        </p>
                    </div>
                </div>

                {/* KHỐI TÙY CHỌN LIỀN MẠCH */}
                <div className="space-y-12">
                    
                    {/* 1. Phân loại */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 border-t border-slate-100 pt-10">
                        {hasSizes && (
                            <div>
                                <label className="font-sans-luxury text-[10px] text-[#064E3B]/40 mb-5 block">01. Kích thước</label>
                                <div className="flex flex-wrap gap-3">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-12 w-12 rounded-2xl border-2 transition-all text-xs font-bold font-sans flex items-center justify-center ${selectedSize === s ? 'bg-[#92400E] text-white border-[#92400E] shadow-xl translate-y-[-4px]' : 'bg-white text-slate-400 border-slate-100 hover:border-[#92400E]/50'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="font-sans-luxury text-[10px] text-[#064E3B]/40 mb-5 block">02. Màu sắc</label>
                                <div className="flex flex-wrap gap-3">
                                    {product.colors?.map(c => (
                                        /* Fixed syntax error: changed key(c) to key={c} which was causing a cascade of errors including invalid key type and uncallable expression errors. */
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-6 h-12 rounded-2xl border-2 transition-all text-xs font-bold font-sans ${selectedColor === c ? 'bg-[#92400E] text-white border-[#92400E] shadow-xl translate-y-[-4px]' : 'bg-white text-slate-400 border-slate-100 hover:border-[#92400E]/50'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Số lượng & Kho */}
                    <div className="flex items-center justify-between py-10 border-y border-slate-100">
                        <div>
                             <p className={`font-sans-luxury text-[10px] mb-2 ${variantStock === 0 ? 'text-rose-500' : 'text-[#064E3B]'}`}>
                                {variantStock === 0 ? 'Hết hàng (Sold Out)' : (variantStock > 0 ? `Sẵn sàng: ${variantStock} phẩm vật` : 'Vui lòng chọn phiên bản')}
                             </p>
                             <p className="text-[10px] text-slate-400 font-serif-italic">Cập nhật kho thực tế từ Sigma Atelier</p>
                        </div>
                        <div className="flex items-center glass-pearl rounded-full h-14 px-6 gap-6">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-2xl text-slate-300 hover:text-[#92400E] transition-all">-</button>
                            <span className="text-lg font-black text-[#064E3B] font-sans w-6 text-center">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(q => q + 1)} 
                                disabled={variantStock !== -1 && quantity >= variantStock}
                                className="text-2xl text-slate-300 hover:text-[#92400E] transition-all"
                            >+</button>
                        </div>
                    </div>

                    {/* 3. Thông báo giá Premium */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-5">
                        <div className="flex justify-between items-center text-xs font-bold tracking-widest text-slate-400">
                            <span>GIÁ NIÊM YẾT</span>
                            <span className="text-[#064E3B] font-sans">{formatCurrency(basePrice)} x {quantity}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold tracking-widest text-slate-400">
                            <span>VẬN CHUYỂN</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600' : 'text-[#064E3B] font-sans'}>{shippingFee === 0 ? 'FREE DELIVERY' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="font-sans-luxury text-[9px] text-[#92400E]">Tổng cộng thanh toán</span>
                                <span className="text-[10px] text-slate-400 italic">Bao gồm các loại thuế phí</span>
                            </div>
                            <span className="text-5xl font-black text-[#064E3B] tracking-tighter font-sans">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* 4. Delivery Info */}
                    <div className="space-y-6 pt-6">
                        <label className="font-sans-luxury text-[10px] text-[#064E3B]/40 block">03. Thông tin nhận hàng</label>
                        <input type="text" placeholder="Quý danh khách hàng" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <input type="tel" placeholder="Số điện thoại liên lạc" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line font-sans" />
                            <input type="text" placeholder="Địa chỉ giao hỏa tốc" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line" />
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="pt-10 pb-10">
                         <div className="flex gap-4 mb-8">
                            <button onClick={() => setPaymentMethod('COD')} className={`flex-1 py-4 rounded-2xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#064E3B]/30'}`}>Thanh toán COD</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`flex-1 py-4 rounded-2xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#92400E] text-white border-[#92400E] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#92400E]/30'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-luxury-main w-full hover:scale-[1.02] ${variantStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : ''}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang khởi tạo...' : (variantStock === 0 ? 'Sản phẩm đã hết' : 'Hoàn tất đặt mua')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-6 text-center font-sans-luxury text-[8px] text-rose-500 animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* OVERLAY THÀNH CÔNG KIỂU TẠP CHÍ */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up backdrop-blur-3xl">
                        <div className="text-center space-y-10 max-w-md">
                            <div className="w-24 h-24 bg-[#064E3B] rounded-full flex items-center justify-center text-white mx-auto shadow-3xl">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h2 className="text-6xl font-serif font-black text-[#064E3B] leading-tight">Tuyệt phẩm<br/><span className="font-serif-italic font-normal italic text-[#92400E]">đã được chọn</span></h2>
                            <p className="pro-description text-sm opacity-70 italic">Chúng tôi đã nhận được yêu cầu của quý khách. Một chuyên viên tư vấn của Sigma Vie sẽ liên hệ xác nhận trong giây lát.</p>
                            <button onClick={onClose} className="btn-luxury-main mx-auto">Trở về cửa hàng</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* MODAL QR IDENTITY */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#064E3B]/98 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[4rem] p-16 max-w-md w-full text-center relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-t-[12px] border-[#92400E]" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-10 right-10 text-slate-300 hover:text-[#064E3B] transition-all"><XIcon/></button>
                  <h4 className="font-sans-luxury text-[10px] text-[#92400E] mb-12">Product Signature QR</h4>
                  <div className="bg-white p-8 border border-slate-100 rounded-[3rem] inline-block shadow-inner mb-10">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={240} />
                  </div>
                  <div className="space-y-4">
                      <p className="font-sans-luxury text-[9px] text-slate-400">Reference: {product.sku}</p>
                      <p className="text-xs text-slate-500 font-serif-italic leading-relaxed px-6">Quét mã định danh này để truy xuất nguồn gốc và thông tin chế tác của sản phẩm trên mọi thiết bị.</p>
                  </div>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
