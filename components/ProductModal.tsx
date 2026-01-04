
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

  // THÔNG BÁO THÔNG MINH: Chỉ hiện Hết hàng khi đã chọn đủ Size và Màu
  const stockStatus = useMemo(() => {
      if (hasSizes && !selectedSize) return { text: "Vui lòng chọn Kích thước", type: "wait" };
      if (hasColors && !selectedColor) return { text: "Vui lòng chọn Màu sắc", type: "wait" };
      
      if (variantStock === 0) return { text: "Rất tiếc, phân loại này hiện đã hết hàng", type: "error" };
      if (variantStock > 0) return { text: `Hiện có ${variantStock} sản phẩm sẵn sàng`, type: "ready" };
      return { text: "Vui lòng hoàn tất tùy chọn", type: "wait" };
  }, [selectedSize, selectedColor, variantStock, hasSizes, hasColors]);

  const parsePrice = (p: string) => parseInt(p.replace(/[^0-9]/g, ''), 10) || 0;
  const basePrice = (product.isFlashSale && product.salePrice) ? parsePrice(product.salePrice) : parsePrice(product.price);
  const total = (basePrice * quantity) + calculateShippingFee(basePrice * quantity);

  const handlePlaceOrder = async () => {
      if (!isLoggedIn) { onOpenAuth(); return; }
      if (hasSizes && !selectedSize) { setFeedbackMsg('Quý khách vui lòng chọn Kích thước'); return; }
      if (hasColors && !selectedColor) { setFeedbackMsg('Quý khách vui lòng chọn Màu sắc'); return; }
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng điền đủ thông tin giao hàng'); return; }

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
      <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-0 md:p-8 backdrop-blur-md" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl max-h-screen md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl rounded-none md:rounded-[2.5rem] animate-fade-in-up" onClick={e => e.stopPropagation()}>
            
            {/* Khối Ảnh Sản Phẩm */}
            <div className="w-full md:w-[45%] h-[350px] md:h-auto bg-slate-50 relative group">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <button onClick={onClose} className="md:hidden absolute top-6 right-6 bg-white/80 p-2 rounded-full shadow-lg text-slate-900"><XIcon /></button>
            </div>

            {/* Khối Nội Dung */}
            <div className="w-full md:w-[55%] p-8 md:p-14 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors"><XIcon /></button>
                
                {/* Header Thông Tin */}
                <div className="mb-10">
                    <span className="text-[10px] font-black text-[#059669] uppercase tracking-[0.4em] mb-4 block">Bộ sưu tập Sigma Vie</span>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 leading-tight mb-6">{product.name}</h1>
                    <div className="flex items-center gap-6 mb-8">
                        <span className="text-3xl font-light text-emerald-700 tracking-tight">{product.isFlashSale ? product.salePrice : product.price}</span>
                        {product.isFlashSale && <span className="text-lg text-slate-300 line-through font-light">{product.price}</span>}
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed italic border-l-2 border-emerald-100 pl-6 mb-10">
                        {product.description || 'Sản phẩm cao cấp được chế tác tỉ mỉ, mang lại vẻ thanh lịch tối giản cho người mặc.'}
                    </p>
                </div>

                {/* Phần Tùy Chọn - Nhóm lại thành khối để không rời rạc */}
                <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-10">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center border-b border-slate-200 pb-4">Tùy Chọn Mua Hàng</h3>

                    {/* Chọn Size */}
                    {hasSizes && (
                        <div>
                            <label className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-4 block">1. Kích thước</label>
                            <div className="flex flex-wrap gap-3">
                                {product.sizes?.map(s => (
                                    <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-12 min-w-[3.5rem] rounded-xl border-2 transition-all text-xs font-bold ${selectedSize === s ? 'bg-[#059669] text-white border-[#059669] shadow-lg shadow-emerald-900/20' : 'bg-white text-slate-400 border-white hover:border-emerald-200'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Chọn Màu */}
                    {hasColors && (
                        <div>
                            <label className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-4 block">2. Màu sắc</label>
                            <div className="flex flex-wrap gap-3">
                                {product.colors?.map(c => (
                                    <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-6 h-12 rounded-xl border-2 transition-all text-xs font-bold ${selectedColor === c ? 'bg-[#059669] text-white border-[#059669] shadow-lg shadow-emerald-900/20' : 'bg-white text-slate-400 border-white hover:border-emerald-200'}`}>{c}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Trạng thái tồn kho & Số lượng */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 border-y border-slate-200">
                        <div className="text-center md:text-left">
                             <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${
                                stockStatus.type === 'wait' ? 'text-amber-500 animate-pulse' : 
                                stockStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'
                             }`}>
                                {stockStatus.text}
                             </p>
                             <p className="text-[10px] text-slate-400 font-medium">Giao hàng toàn quốc: 2-3 ngày</p>
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-full h-14 px-4 shadow-sm">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-10 h-full text-2xl text-slate-300 hover:text-[#059669] transition-colors">-</button>
                            <span className="w-12 text-center font-bold text-slate-900">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(q => q + 1)} 
                                disabled={variantStock !== -1 && quantity >= variantStock}
                                className="w-10 h-full text-2xl text-slate-300 hover:text-[#059669] transition-colors disabled:opacity-5"
                            >+</button>
                        </div>
                    </div>

                    {/* Form Giao Hàng */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-bold text-slate-900 uppercase tracking-widest block">3. Thông tin nhận hàng</label>
                        <input type="text" placeholder="HỌ VÀ TÊN" value={shipName} onChange={e => setShipName(e.target.value)} className="input-premium" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="tel" placeholder="SỐ ĐIỆN THOẠI" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-premium" />
                            <input type="text" placeholder="ĐỊA CHỈ NHẬN HÀNG" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-premium" />
                        </div>
                    </div>

                    {/* Thanh toán & Nút mua */}
                    <div className="pt-6">
                         <div className="flex justify-between items-center mb-8">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng thanh toán</span>
                            <span className="text-3xl font-black text-emerald-800 tracking-tighter">
                                {new Intl.NumberFormat('vi-VN').format(total)}₫
                            </span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border border-slate-200'}`}>Chuyển khoản</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-primary w-full py-5 text-sm ${variantStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : ''}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang gửi đơn hàng...' : (variantStock === 0 ? 'Sản phẩm đã hết hàng' : 'Xác nhận Đặt mua')}
                         </button>
                         {feedbackMsg && <p className="mt-4 text-center text-[11px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Overlay Thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-fade-in backdrop-blur-xl">
                        <div className="w-24 h-24 bg-[#059669] rounded-full flex items-center justify-center text-white mb-10 shadow-2xl shadow-emerald-200">
                            <CheckIcon />
                        </div>
                        <h2 className="text-4xl font-serif font-bold mb-4 tracking-tight text-slate-900">Đặt hàng thành công!</h2>
                        <p className="text-slate-400 text-center max-w-sm mb-12 font-medium leading-relaxed">Cảm ơn quý khách. Đội ngũ Sigma Vie sẽ liên hệ xác nhận đơn hàng qua điện thoại trong giây lát.</p>
                        <button onClick={onClose} className="btn-primary px-16 py-5">Quay lại Cửa hàng</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
