
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
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const QrIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M12 21v-1"/></svg>
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
      <div className="fixed inset-0 bg-[#04382c]/96 z-50 flex items-center justify-center p-0 md:p-10 backdrop-blur-2xl transition-all duration-700" onClick={onClose}>
        <div className="relative bg-[#FCFCFB] w-full max-w-6xl h-full md:h-auto md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-[0_40px_120px_-20px_rgba(0,0,0,0.6)] rounded-none md:rounded-[2rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* LEFT SIDE: LUXURY VISUAL GALLERY */}
            <div className="w-full md:w-[46%] h-[350px] md:h-auto relative overflow-hidden group bg-slate-100">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[6000ms] ease-out group-hover:scale-105" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-40"></div>

                <div className="absolute top-10 left-10 z-10 flex flex-col gap-2">
                    <span className="bg-white/10 backdrop-blur-md border border-white/10 px-4 py-1 rounded text-[8px] font-black uppercase tracking-[0.4em] text-white shadow-sm">Collection 2025</span>
                    <p className="font-script text-2xl text-[#B4975A] drop-shadow-md">Sigma Vie Archive</p>
                </div>

                <div className="absolute bottom-8 left-8 flex gap-3">
                  <button 
                      onClick={() => setShowProductQrView(true)}
                      className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl hover:bg-white/20 transition-all text-[#B4975A] active:scale-90"
                  >
                      <QrIcon />
                  </button>
                </div>

                <button onClick={onClose} className="md:hidden absolute top-6 right-6 bg-white/10 backdrop-blur-md p-2.5 rounded-full text-white border border-white/10"><XIcon /></button>
            </div>

            {/* RIGHT SIDE: REFINED BOUTIQUE CONTENT */}
            <div className="w-full md:w-[54%] p-8 md:p-16 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-200 hover:text-[#B4975A] transition-all duration-300 hover:rotate-90"><XIcon /></button>
                
                <div className="mb-12">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-sans-luxury text-[8px] text-[#B4975A] tracking-[0.4em] font-black">Private Selection</span>
                        <div className="h-[1px] flex-1 bg-slate-50"></div>
                    </div>
                    
                    {/* REFINED TITLE: ROBOTO, SMALLER SIZE, CHAMPAGNE GOLD */}
                    <h1 className="text-xl md:text-2xl font-sans font-black text-[#B4975A] leading-tight mb-4 uppercase tracking-tighter">
                        {product.name}
                    </h1>
                    
                    <div className="flex items-center gap-6 mb-10">
                        <span className="text-xl font-black text-[#064E3B] tracking-tighter">
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-xs text-slate-300 line-through font-light">{product.price}</span>}
                        <div className="h-3 w-[1px] bg-slate-100"></div>
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50/50 px-3 py-1 rounded uppercase tracking-[0.15em] border border-emerald-100/30">Available Now</span>
                    </div>
                    
                    <div className="relative pl-6 border-l border-slate-100">
                        <p className="pro-description text-slate-400 font-light leading-relaxed text-sm italic">
                            {product.description || 'Được chế tác tỉ mỉ từ những chất liệu cao cấp nhất, mẫu thiết kế này đại diện cho sự cân bằng hoàn hảo giữa tính đương đại và vẻ đẹp trường tồn.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* SELECTORS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-50">
                        {hasSizes && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-300 mb-5 block tracking-[0.2em]">Size</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-11 w-11 rounded-lg border transition-all text-[11px] font-black ${selectedSize === s ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl shadow-teal-900/10' : 'bg-white text-slate-400 border-slate-100 hover:border-[#B4975A]/40'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-300 mb-5 block tracking-[0.2em]">Color</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-5 h-11 rounded-lg border transition-all text-[11px] font-black ${selectedColor === c ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl shadow-teal-900/10' : 'bg-white text-slate-400 border-slate-100 hover:border-[#B4975A]/40'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* STOCK & QUANTITY */}
                    <div className="flex items-center justify-between py-8 border-y border-slate-50">
                        <div className="flex flex-col">
                             <span className="font-sans-luxury text-[8px] text-slate-400 tracking-widest">Quantity</span>
                             <span className="text-[10px] font-bold text-[#B4975A] mt-1.5 uppercase tracking-tight italic">{variantStock > 0 ? `Limited Edition: ${variantStock} remaining` : 'Select variant'}</span>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-xl h-12 px-3 gap-6 border border-slate-100">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-lg text-slate-300 hover:text-[#064E3B] transition-all">-</button>
                            <span className="text-sm font-black text-[#064E3B] w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="w-8 h-8 flex items-center justify-center text-lg text-slate-300 hover:text-[#064E3B] disabled:opacity-5 transition-all">+</button>
                        </div>
                    </div>

                    {/* INVOICE PREVIEW */}
                    <div className="bg-[#FAF9F7] p-8 rounded-[1.5rem] border border-slate-100 space-y-4 shadow-sm">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Item Value</span>
                            <span className="text-slate-600 font-sans">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Priority Delivery</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600 font-black' : 'text-slate-600 font-sans'}>{shippingFee === 0 ? 'COMPLIMENTARY' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-6 border-t border-dashed border-slate-200 flex justify-between items-baseline">
                            <span className="font-sans-luxury text-[9px] text-[#B4975A] tracking-[0.2em]">Total Investment</span>
                            <span className="text-3xl font-black text-[#064E3B] tracking-tighter font-sans">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* IDENTITY INFO */}
                    <div className="space-y-4 pt-4">
                        <label className="font-sans-luxury text-[8px] text-slate-300 block uppercase tracking-[0.3em]">Acquirer Information</label>
                        <input type="text" placeholder="Full Name" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line py-3 placeholder:text-slate-200" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <input type="tel" placeholder="Phone Number" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line py-3 placeholder:text-slate-200" />
                            <input type="text" placeholder="Delivery Address" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line py-3 placeholder:text-slate-200" />
                        </div>
                    </div>

                    {/* FINAL ACTIONS */}
                    <div className="pt-10 pb-16">
                         <div className="grid grid-cols-2 gap-4 mb-8">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-2xl shadow-teal-900/20' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>Pay on Delivery</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-2xl shadow-amber-900/20' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>Bank Transfer</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-luxury-main w-full py-6 text-[10px] tracking-[0.4em] ${variantStock === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : ''}`}
                            style={{ backgroundColor: variantStock === 0 ? '#f3f4f6' : '#064E3B' }}
                         >
                            {orderStatus === 'PROCESSING' ? 'INITIATING...' : (variantStock === 0 ? 'SOLD OUT' : 'ACQUIRE NOW')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-6 text-center font-sans-luxury text-[8px] text-rose-500 animate-pulse tracking-widest">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* SUCCESS SCREEN OVERLAY */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up">
                        <div className="text-center space-y-12 max-w-sm">
                            <div className="w-24 h-24 bg-[#064E3B] rounded-full flex items-center justify-center text-white mx-auto shadow-2xl relative">
                                <div className="absolute inset-0 rounded-full animate-ping bg-[#064E3B]/20"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-sans font-black text-[#064E3B] leading-none uppercase tracking-tighter">Reservation<br/>Confirmed</h2>
                                <p className="pro-description text-center italic opacity-60 leading-relaxed px-4">Đơn đặt hàng đã được khởi tạo thành công. Chuyên viên Sigma Vie sẽ liên hệ với quý khách trong thời gian sớm nhất.</p>
                            </div>
                            <button onClick={onClose} className="btn-luxury-main mx-auto px-16">Return to Boutique</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* SIGNATURE QR MODAL */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#04382c]/98 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[3rem] p-16 max-w-md w-full text-center relative shadow-[0_60px_120px_rgba(0,0,0,0.8)] border-t-[6px] border-[#B4975A] animate-float-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-10 right-10 text-slate-200 hover:text-[#064E3B] transition-all"><XIcon/></button>
                  <h4 className="font-sans-luxury text-[9px] text-[#B4975A] mb-12 tracking-[0.5em]">Identity Authentication</h4>
                  <div className="bg-white p-8 border-2 border-slate-50 rounded-[3rem] inline-block shadow-inner mb-10">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={220} />
                  </div>
                  <div className="space-y-4">
                      <p className="font-sans-luxury text-[8px] text-slate-300 tracking-[0.3em]">Model Reference: {product.sku}</p>
                      <p className="font-script text-3xl text-[#064E3B]">Sigma Vie Authentic</p>
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
