
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

const QrCodeIcon = ({ className }: { className?: string }) => (
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

  const stockStatus = useMemo(() => {
      if (hasSizes && !selectedSize) return { text: "Vui lòng chọn Kích thước", type: "wait" };
      if (hasColors && !selectedColor) return { text: "Vui lòng chọn Màu sắc", type: "wait" };
      if (variantStock === 0) return { text: "Phiên bản này đã hết hàng", type: "error" };
      if (variantStock > 0) return { text: `Sẵn có ${variantStock} sản phẩm`, type: "ready" };
      return { text: "Vui lòng hoàn tất lựa chọn", type: "wait" };
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
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng điền đủ thông tin nhận hàng'); return; }

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
      <div className="fixed inset-0 bg-slate-900/95 z-50 flex items-center justify-center p-0 md:p-6 backdrop-blur-xl" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl max-h-screen md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-[0_0_50px_rgba(0,0,0,0.3)] rounded-none md:rounded-[2.5rem] animate-fade-in-up" onClick={e => e.stopPropagation()}>
            
            {/* Cột Trái: Ảnh Sản Phẩm & QR Button */}
            <div className="w-full md:w-[45%] h-[350px] md:h-auto bg-slate-100 relative group">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                
                {/* Nút Xem QR - Khôi phục theo yêu cầu */}
                <button 
                    onClick={() => setShowProductQrView(true)}
                    className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white hover:scale-110 active:scale-95 transition-all text-blue-700 flex flex-col items-center gap-1"
                >
                    <QrCodeIcon className="w-6 h-6" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">Mã QR</span>
                </button>

                <button onClick={onClose} className="md:hidden absolute top-4 right-4 bg-white/90 p-2 rounded-full shadow-lg text-slate-900"><XIcon /></button>
            </div>

            {/* Cột Phải: Nội dung chi tiết */}
            <div className="w-full md:w-[55%] p-6 md:p-14 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-300 hover:text-slate-900 transition-colors"><XIcon /></button>
                
                <div className="mb-10">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4 block">Sản phẩm độc quyền</span>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 leading-tight mb-4">{product.name}</h1>
                    <div className="flex items-baseline gap-3 mb-6">
                        <span className="text-3xl font-black text-blue-800 font-sans tracking-tighter">{product.isFlashSale ? product.salePrice : product.price}</span>
                        {product.isFlashSale && <span className="text-lg text-slate-300 line-through font-light italic">{product.price}</span>}
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed italic border-l-4 border-blue-50 pl-6">
                        {product.description || 'Thiết kế cao cấp mang phong cách hiện đại, tỉ mỉ trong từng đường kim mũi chỉ.'}
                    </p>
                </div>

                <div className="space-y-8 bg-slate-50 rounded-[2rem] p-6 md:p-10 border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center border-b border-slate-200 pb-4">Cấu hình Đơn hàng</h3>

                    {/* Lựa chọn phân loại */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {hasSizes && (
                            <div>
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 block">1. Kích thước</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-11 min-w-[3rem] rounded-xl border-2 transition-all text-xs font-bold font-sans ${selectedSize === s ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-white text-slate-500 border-white hover:border-blue-100'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 block">2. Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-5 h-11 rounded-xl border-2 transition-all text-xs font-bold font-sans ${selectedColor === c ? 'bg-blue-700 text-white border-blue-700 shadow-lg' : 'bg-white text-slate-500 border-white hover:border-blue-100'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Số lượng & Tồn kho */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 border-y border-slate-200">
                        <div className="text-center md:text-left">
                             <p className={`text-[11px] font-black uppercase tracking-wider mb-1 ${stockStatus.type === 'error' ? 'text-rose-500' : (stockStatus.type === 'ready' ? 'text-emerald-600' : 'text-blue-500')}`}>
                                {stockStatus.text}
                             </p>
                             <p className="text-[10px] text-slate-400">Kiểm tra tồn kho tự động theo thời gian thực</p>
                        </div>
                        <div className="flex items-center bg-white border border-slate-200 rounded-full h-12 px-3 shadow-inner">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-full text-2xl text-slate-300 hover:text-blue-700 transition-colors">-</button>
                            <span className="w-10 text-center font-black text-slate-900 font-sans">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(q => q + 1)} 
                                disabled={variantStock !== -1 && quantity >= variantStock}
                                className="w-8 h-full text-2xl text-slate-300 hover:text-blue-700 disabled:opacity-5"
                            >+</button>
                        </div>
                    </div>

                    {/* BẢNG GIÁ CHI TIẾT - CHUYÊN NGHIỆP */}
                    <div className="space-y-4 bg-white/80 p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Giá sản phẩm:</span>
                            <span className="font-bold text-slate-900 font-sans">{formatCurrency(baseUnitPrice)} <span className="text-slate-300 text-xs font-normal">x {quantity}</span></span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-medium">Phí vận chuyển:</span>
                            <span className={`font-black font-sans ${shippingFee === 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                                {shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}
                            </span>
                        </div>
                        <div className="pt-4 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tổng thanh toán</span>
                            <span className="text-3xl font-black text-blue-800 tracking-tighter font-sans">{formatCurrency(totalPayable)}</span>
                        </div>
                    </div>

                    {/* Thông tin giao hàng */}
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest block">3. Thông tin nhận hàng</label>
                        <input type="text" placeholder="Họ và tên quý khách" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-700 transition-all text-sm font-bold placeholder:font-normal" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-700 transition-all text-sm font-bold" />
                            <input type="text" placeholder="Địa chỉ giao hàng chi tiết" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-700 transition-all text-sm font-bold" />
                        </div>
                    </div>

                    {/* Phương thức & Nút xác nhận */}
                    <div className="pt-4">
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'bg-slate-900 text-white shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-blue-700 text-white shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-400'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all shadow-2xl flex items-center justify-center gap-3
                                ${variantStock === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-700 text-white hover:bg-blue-800 hover:scale-[1.02] shadow-blue-900/20'}`}
                         >
                            {orderStatus === 'PROCESSING' ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    <span>Đang xử lý...</span>
                                </>
                            ) : (variantStock === 0 ? 'TẠM HẾT HÀNG' : 'XÁC NHẬN ĐẶT HÀNG')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-4 text-center text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Overlay Thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-fade-in backdrop-blur-2xl">
                        <div className="w-24 h-24 bg-blue-700 rounded-full flex items-center justify-center text-white mb-10 shadow-2xl shadow-blue-200">
                            <CheckIcon />
                        </div>
                        <h2 className="text-4xl font-serif font-bold mb-4 text-slate-900 text-center">Đặt hàng hoàn tất!</h2>
                        <p className="text-slate-500 text-center max-w-sm mb-12 font-medium leading-relaxed">Cảm ơn quý khách đã lựa chọn Sigma Vie. Chúng tôi sẽ gọi xác nhận đơn hàng của quý khách trong vài phút tới.</p>
                        <button onClick={onClose} className="bg-blue-700 text-white px-16 py-5 rounded-full font-black uppercase tracking-[0.2em] text-xs hover:bg-blue-800 transition-all shadow-2xl shadow-blue-200">Quay lại Cửa hàng</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modal View QR Sản phẩm */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-slate-900/95 z-[150] flex items-center justify-center p-6" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center relative shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><XIcon/></button>
                  <h4 className="text-[11px] font-black text-slate-900 mb-10 uppercase tracking-[0.4em]">Mã QR Sản Phẩm</h4>
                  <div className="bg-white p-5 border-4 border-slate-50 rounded-[2.5rem] inline-block shadow-inner mb-8">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={200} />
                  </div>
                  <p className="text-[10px] text-slate-400 mb-4 font-mono font-bold uppercase tracking-widest">SKU: {product.sku}</p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium italic">Quét mã này trên điện thoại khác để xem nhanh thông tin hoặc chia sẻ với bạn bè.</p>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={totalPayable} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
