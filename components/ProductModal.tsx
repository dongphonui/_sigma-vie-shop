
import React, { useEffect, useState, useMemo } from 'react';
import type { Product, Order } from '../types';
import { createOrder } from '../utils/orderStorage';
import { getCurrentCustomer } from '../utils/customerStorage';
import { calculateShippingFee, getShippingSettings } from '../utils/shippingSettingsStorage';
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

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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

  // Thông tin giao hàng
  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');

  const shippingSettings = getShippingSettings();

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

  // Logic kiểm tra tồn kho biến thể
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

  // Thông báo trạng thái chọn hàng
  const stockStatus = useMemo(() => {
      if (hasSizes && !selectedSize) return { text: "Quý khách chưa chọn kích thước", type: "wait" };
      if (hasColors && !selectedColor) return { text: "Quý khách chưa chọn màu sắc", type: "wait" };
      if (variantStock === 0) return { text: "Sản phẩm hiện đang hết hàng", type: "error" };
      if (variantStock > 0) return { text: `Sẵn có ${variantStock} sản phẩm`, type: "ready" };
      return { text: "Vui lòng chọn phân loại", type: "wait" };
  }, [selectedSize, selectedColor, variantStock, hasSizes, hasColors]);

  const parsePrice = (p: string) => parseInt(p.replace(/[^0-9]/g, ''), 10) || 0;
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';

  const baseUnitPrice = (product.isFlashSale && product.salePrice) ? parsePrice(product.salePrice) : parsePrice(product.price);
  const subtotal = baseUnitPrice * quantity;
  const shippingFee = calculateShippingFee(subtotal);
  const totalPayable = subtotal + shippingFee;

  const handlePlaceOrder = async () => {
      if (!isLoggedIn) { onOpenAuth(); return; }
      if (hasSizes && !selectedSize) { setFeedbackMsg('Quý khách vui lòng chọn Kích thước'); return; }
      if (hasColors && !selectedColor) { setFeedbackMsg('Quý khách vui lòng chọn Màu sắc'); return; }
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng cung cấp đủ thông tin nhận hàng'); return; }

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
      <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-0 md:p-6 backdrop-blur-md" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl max-h-screen md:max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-none md:rounded-[2rem] animate-fade-in-up" onClick={e => e.stopPropagation()}>
            
            {/* Ảnh Sản Phẩm - chiếm 45% */}
            <div className="w-full md:w-[45%] h-[350px] md:h-auto bg-slate-50 relative">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                <button onClick={onClose} className="md:hidden absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg text-slate-900"><XIcon /></button>
            </div>

            {/* Khối Nội Dung Chính - chiếm 55% */}
            <div className="w-full md:w-[55%] p-6 md:p-12 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 text-slate-300 hover:text-slate-900 transition-colors"><XIcon /></button>
                
                {/* Header Thông Tin Sản Phẩm */}
                <div className="mb-8">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em] mb-3 block">Fashion Boutique</span>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 leading-tight mb-4">{product.name}</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-slate-900 font-sans">{product.isFlashSale ? product.salePrice : product.price}</span>
                        {product.isFlashSale && <span className="text-sm text-slate-300 line-through">{product.price}</span>}
                    </div>
                </div>

                {/* KHỐI TÙY CHỌN & THANH TOÁN (Liền mạch) */}
                <div className="space-y-8">
                    <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-100">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-200 pb-3">Tùy Chọn Mua Hàng</h3>

                        {/* 1. Chọn Size */}
                        {hasSizes && (
                            <div className="mb-8">
                                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-4 block">Chọn Kích thước</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-11 min-w-[3rem] rounded-xl border-2 transition-all text-xs font-bold font-sans ${selectedSize === s ? 'bg-blue-700 text-white border-blue-700 shadow-md' : 'bg-white text-slate-500 border-white hover:border-blue-200'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Chọn Màu */}
                        {hasColors && (
                            <div className="mb-8">
                                <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-4 block">Chọn Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-5 h-11 rounded-xl border-2 transition-all text-xs font-bold font-sans ${selectedColor === c ? 'bg-blue-700 text-white border-blue-700 shadow-md' : 'bg-white text-slate-500 border-white hover:border-blue-200'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Tồn kho & Số lượng */}
                        <div className="flex items-center justify-between py-6 border-y border-slate-200 mb-8">
                            <div>
                                 <p className={`text-[11px] font-bold uppercase tracking-wider ${stockStatus.type === 'error' ? 'text-rose-500' : 'text-slate-400'}`}>
                                    {stockStatus.text}
                                 </p>
                            </div>
                            <div className="flex items-center bg-white border border-slate-200 rounded-full h-12 px-3 shadow-sm">
                                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-full text-xl text-slate-300 hover:text-blue-700">-</button>
                                <span className="w-10 text-center font-bold text-slate-900 font-sans">{quantity}</span>
                                <button 
                                    onClick={() => setQuantity(q => q + 1)} 
                                    disabled={variantStock !== -1 && quantity >= variantStock}
                                    className="w-8 h-full text-xl text-slate-300 hover:text-blue-700 disabled:opacity-5"
                                >+</button>
                            </div>
                        </div>

                        {/* 4. Chi tiết Giá & Ship (Bổ sung theo yêu cầu) */}
                        <div className="space-y-3 mb-8 bg-white/50 p-4 rounded-2xl border border-slate-100">
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Giá bán:</span>
                                <span className="font-medium text-slate-800 font-sans">{formatCurrency(baseUnitPrice)} x {quantity}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Tạm tính:</span>
                                <span className="font-medium text-slate-800 font-sans">{formatCurrency(subtotal)}</span>
                             </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Phí vận chuyển:</span>
                                <span className={`font-bold font-sans ${shippingFee === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                                    {shippingFee === 0 ? 'Miễn phí' : formatCurrency(shippingFee)}
                                </span>
                             </div>
                             <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng thanh toán</span>
                                <span className="text-2xl font-black text-blue-800 tracking-tighter font-sans">{formatCurrency(totalPayable)}</span>
                             </div>
                        </div>

                        {/* 5. Form Giao Hàng */}
                        <div className="space-y-4 mb-8">
                            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest block">Thông tin nhận hàng</label>
                            <input type="text" placeholder="Họ và tên khách hàng" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
                                <input type="text" placeholder="Địa chỉ giao hàng" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm" />
                            </div>
                        </div>

                        {/* 6. Phương thức thanh toán & Nút mua */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>Chuyển khoản</button>
                        </div>

                        <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2
                                ${variantStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800 hover:-translate-y-0.5'}`}
                        >
                            {orderStatus === 'PROCESSING' ? 'Đang khởi tạo đơn hàng...' : (variantStock === 0 ? 'Tạm hết hàng' : 'Xác nhận Đặt hàng ngay')}
                        </button>
                        
                        {feedbackMsg && <p className="mt-4 text-center text-[11px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Overlay Thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-fade-in backdrop-blur-xl">
                        <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-200">
                            <CheckIcon />
                        </div>
                        <h2 className="text-3xl font-serif font-bold mb-4 text-slate-900 text-center">Đặt hàng hoàn tất!</h2>
                        <p className="text-slate-500 text-center max-w-sm mb-10 font-medium leading-relaxed">Đơn hàng đã được ghi nhận thành công. Sigma Vie sẽ liên hệ quý khách sớm nhất để xác nhận.</p>
                        <button onClick={onClose} className="bg-blue-700 text-white px-12 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-blue-800 transition-all shadow-lg shadow-blue-200">Quay lại Cửa hàng</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={totalPayable} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
