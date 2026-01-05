
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
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const QrIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M12 21v-1"/></svg>
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
      <div className="fixed inset-0 bg-[#04382c]/95 z-50 flex items-center justify-center p-0 md:p-6 backdrop-blur-xl transition-all duration-500" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl h-full md:h-auto md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-none md:rounded-3xl animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* LEFT SIDE: HIGH-END VISUALS */}
            <div className="w-full md:w-[45%] h-[400px] md:h-auto relative overflow-hidden group bg-[#f3f4f6]">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-105" />
                
                {/* Visual Accent */}
                <div className="absolute top-10 left-10 z-10 flex flex-col gap-2">
                    <span className="bg-white/90 backdrop-blur px-3 py-1 rounded text-[8px] font-black uppercase tracking-[0.2em] text-[#064E3B] shadow-sm">Collection 2025</span>
                    <p className="font-script text-2xl text-white drop-shadow-md">Sigma Vie Signature</p>
                </div>

                <div className="absolute bottom-8 left-8 flex gap-3">
                  <button 
                      onClick={() => setShowProductQrView(true)}
                      className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl hover:bg-white/30 transition-all text-white"
                  >
                      <QrIcon />
                  </button>
                </div>

                <button onClick={onClose} className="md:hidden absolute top-6 right-6 bg-white/20 backdrop-blur-md p-3 rounded-full text-white"><XIcon /></button>
            </div>

            {/* RIGHT SIDE: PREMIUM CONTENT */}
            <div className="w-full md:w-[55%] p-8 md:p-14 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-8 right-8 text-slate-300 hover:text-[#064E3B] transition-all"><XIcon /></button>
                
                <div className="mb-10">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-sans-luxury text-[8px] text-[#D4AF37] tracking-[0.3em]">Masterpiece Selection</span>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    
                    {/* TITLE RE-STYLED: ROBOTO BOLD AND WARM GOLD */}
                    <h1 className="text-3xl md:text-5xl font-sans font-black text-[#92400E] leading-none mb-6 uppercase tracking-tighter">
                        {product.name}
                    </h1>
                    
                    <div className="flex items-center gap-6 mb-8">
                        <span className="text-2xl font-black text-[#064E3B] tracking-tighter">
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-sm text-slate-300 line-through font-light">{product.price}</span>}
                        <div className="h-4 w-[1px] bg-slate-200"></div>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded uppercase tracking-widest">In Stock</span>
                    </div>
                    
                    <p className="pro-description text-slate-400 italic font-light leading-relaxed">
                        {product.description || 'Chế tác từ những chất liệu tinh tuyển nhất, thiết kế này là tuyên ngôn của sự lịch lãm và đẳng cấp vượt thời gian.'}
                    </p>
                </div>

                <div className="space-y-10">
                    {/* Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                        {hasSizes && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-400 mb-4 block">Kích thước</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-11 w-11 rounded-xl border-2 transition-all text-[11px] font-bold ${selectedSize === s ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-400 mb-4 block">Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-4 h-11 rounded-xl border-2 transition-all text-[11px] font-bold ${selectedColor === c ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between py-6 border-y border-slate-50">
                        <div className="flex flex-col">
                             <span className="font-sans-luxury text-[8px] text-slate-400">Số lượng sở hữu</span>
                             <span className="text-[10px] font-bold text-[#064E3B] mt-1 uppercase tracking-tight">{variantStock > 0 ? `Chỉ còn ${variantStock} phẩm vật` : 'Chọn phân loại'}</span>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-2xl h-12 px-3 gap-6 shadow-inner">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-xl text-slate-300 hover:text-[#064E3B] transition-all">-</button>
                            <span className="text-sm font-black text-[#064E3B] w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="w-8 h-8 flex items-center justify-center text-xl text-slate-300 hover:text-[#064E3B] disabled:opacity-5 transition-all">+</button>
                        </div>
                    </div>

                    {/* Billing Block */}
                    <div className="bg-[#fcfcfc] p-8 rounded-3xl border border-slate-50 space-y-4">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                            <span>Giá trị vật phẩm</span>
                            <span className="text-slate-600">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">
                            <span>Dịch vụ vận chuyển</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600' : 'text-slate-600'}>{shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-end">
                            <div className="flex flex-col">
                                <span className="font-sans-luxury text-[8px] text-[#D4AF37]">Trị giá thanh toán</span>
                                <p className="font-script text-lg text-slate-400">Sigma Vie Experience</p>
                            </div>
                            <span className="text-4xl font-black text-[#064E3B] tracking-tighter leading-none">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Shipping Info */}
                    <div className="space-y-4 pt-4">
                        <label className="font-sans-luxury text-[8px] text-slate-300 block uppercase tracking-widest">Thông tin bàn giao</label>
                        <input type="text" placeholder="Họ tên Quý khách" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line py-3" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line py-3" />
                            <input type="text" placeholder="Địa chỉ giao hàng" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line py-3" />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-10 pb-16">
                         <div className="grid grid-cols-2 gap-4 mb-8">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-2xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl' : 'bg-white text-slate-300 border-slate-50 hover:border-slate-200'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-2xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#92400E] text-white border-[#92400E] shadow-xl' : 'bg-white text-slate-300 border-slate-50 hover:border-slate-200'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-luxury-main w-full py-6 text-[10px] ${variantStock === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : ''}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'ĐANG KHỞI TẠO...' : (variantStock === 0 ? 'VẬT PHẨM TẠM HẾT' : 'XÁC NHẬN SỞ HỮU')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-6 text-center font-sans-luxury text-[8px] text-rose-500 animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* SUCCESS SCREEN OVERLAY */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up">
                        <div className="text-center space-y-10 max-w-sm">
                            <div className="w-20 h-20 bg-[#064E3B] rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h2 className="text-4xl font-sans font-black text-[#064E3B] leading-tight uppercase tracking-tighter">Giao dịch<br/>đã sẵn sàng</h2>
                            <p className="pro-description text-center italic opacity-60 leading-relaxed">Cảm ơn quý khách đã tin chọn Sigma Vie. Một chuyên viên sẽ sớm liên hệ để hoàn tất thủ tục bàn giao.</p>
                            <button onClick={onClose} className="btn-luxury-main mx-auto border-2 border-transparent">VỀ CỬA HÀNG</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* QR MODAL */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#04382c]/98 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[3rem] p-16 max-w-md w-full text-center relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-t-[8px] border-[#92400E]" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-10 right-10 text-slate-200 hover:text-[#064E3B] transition-all"><XIcon/></button>
                  <h4 className="font-sans-luxury text-[9px] text-[#92400E] mb-12">Signature Identity Code</h4>
                  <div className="bg-white p-8 border-2 border-slate-50 rounded-[3rem] inline-block shadow-inner mb-10">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={220} />
                  </div>
                  <div className="space-y-4">
                      <p className="font-sans-luxury text-[8px] text-slate-300">Model Ref: {product.sku}</p>
                      <p className="font-script text-2xl text-[#064E3B]">Sigma Vie Authentic</p>
                  </div>
              </div>
          </div>
      )}

      <PaymentModal 
          isOpen={showQrModal} 
          onClose={() => setShowQrModal(false)} 
          orderId={createdOrder?.id || ''} 
          amount={total} 
          onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} 
      />
    </>
  );
};

export default ProductModal;
