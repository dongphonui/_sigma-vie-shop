
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
      <div className="fixed inset-0 bg-[#04382c]/95 z-50 flex items-center justify-center p-0 md:p-10 backdrop-blur-2xl" onClick={onClose}>
        <div className="relative bg-white w-full max-w-7xl h-full md:h-auto md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-none md:rounded-[3rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* CỘT TRÁI: VISUAL GALLERY VỚI NỀN DEEP TEAL */}
            <div className="w-full md:w-[45%] h-[400px] md:h-auto relative overflow-hidden group bg-luxury-teal sparkle-effect">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-110 opacity-90" />
                
                {/* Accent Line & Text nghệ thuật như ảnh mẫu */}
                <div className="absolute top-12 left-8 z-10">
                    <p className="font-sans-luxury text-[8px] text-white/60 mb-2">Boutique Exclusive</p>
                    <p className="font-script text-3xl text-[#D4AF37] drop-shadow-lg">Nâng tầm phong thái</p>
                </div>

                <button 
                    onClick={() => setShowProductQrView(true)}
                    className="absolute bottom-10 left-10 bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-3xl shadow-2xl hover:bg-white/20 transition-all text-[#D4AF37]"
                >
                    <QrIcon />
                </button>

                <button onClick={onClose} className="md:hidden absolute top-8 right-8 bg-white/20 backdrop-blur-md p-3 rounded-full text-white"><XIcon /></button>
            </div>

            {/* CỘT PHẢI: NỘI DUNG ROBOTO SANG TRỌNG */}
            <div className="w-full md:w-[55%] p-8 md:p-16 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-12 right-12 text-slate-200 hover:text-[#064E3B] transition-all duration-500"><XIcon /></button>
                
                <div className="mb-14">
                    <div className="flex items-center gap-4 mb-6">
                        <span className="w-12 h-[2px] bg-[#D4AF37]"></span>
                        <span className="font-sans-luxury text-[9px] text-[#D4AF37] tracking-[0.4em]">Sản phẩm cao cấp</span>
                    </div>
                    
                    {/* TIÊU ĐỀ ĐỒNG NHẤT MỘT MÀU XANH LÁ ĐẬM */}
                    <h1 className="text-4xl md:text-6xl font-serif font-black text-[#064E3B] leading-[1.1] mb-8 uppercase">
                        {product.name}
                    </h1>
                    
                    <div className="flex items-baseline gap-6 mb-10">
                        <span className="text-4xl font-black text-[#064E3B] tracking-tighter">
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-lg text-slate-300 line-through font-light">{product.price}</span>}
                    </div>
                    
                    <div className="relative pl-8 border-l-2 border-[#D4AF37]">
                        <p className="pro-description italic">
                            {product.description || 'Chế tác từ những chất liệu tinh tuyển nhất, thiết kế này là tuyên ngôn của sự lịch lãm và đẳng cấp vượt thời gian, dành riêng cho những quý chủ nhân thượng lưu.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-12">
                    {/* Phân loại sản phẩm */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-50">
                        {hasSizes && (
                            <div>
                                <label className="font-sans-luxury text-[10px] text-slate-400 mb-5 block">Kích thước</label>
                                <div className="flex flex-wrap gap-3">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-12 w-12 rounded-xl border-2 transition-all text-xs font-bold ${selectedSize === s ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border-slate-100 hover:border-[#D4AF37]/50'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="font-sans-luxury text-[10px] text-slate-400 mb-5 block">Màu sắc</label>
                                <div className="flex flex-wrap gap-3">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-6 h-12 rounded-xl border-2 transition-all text-xs font-bold ${selectedColor === c ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl translate-y-[-2px]' : 'bg-white text-slate-400 border-slate-100 hover:border-[#D4AF37]/50'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tồn kho & Số lượng */}
                    <div className="flex items-center justify-between py-10 border-y border-slate-50">
                        <div>
                             <p className={`font-sans-luxury text-[10px] mb-1 ${variantStock === 0 ? 'text-rose-500' : 'text-[#064E3B]'}`}>
                                {variantStock === 0 ? 'Tuyệt phẩm đã cháy hàng' : (variantStock > 0 ? `Sẵn sàng phục vụ: ${variantStock} món` : 'Vui lòng chọn phiên bản')}
                             </p>
                             <p className="font-script text-lg text-[#D4AF37]">Chuẩn mực sống sang</p>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-full h-14 px-6 gap-8 shadow-inner">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-2xl text-slate-300 hover:text-[#064E3B] transition-all">-</button>
                            <span className="text-lg font-bold text-[#064E3B] w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="text-2xl text-slate-300 hover:text-[#064E3B] disabled:opacity-10 transition-all">+</button>
                        </div>
                    </div>

                    {/* Khối thanh toán Gold/White */}
                    <div className="bg-[#FCFCF9] p-8 rounded-[2.5rem] border border-[#D4AF37]/10 shadow-2xl space-y-4">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span>Giá trị vật phẩm</span>
                            <span className="text-slate-600 font-bold">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                            <span>Đặc quyền vận chuyển</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600' : 'text-slate-600'}>{shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-6 border-t border-dashed border-[#D4AF37]/30 flex justify-between items-center">
                            <span className="font-sans-luxury text-[10px] text-[#D4AF37]">Tổng giá trị thanh toán</span>
                            <span className="text-5xl font-black text-[#064E3B] tracking-tighter">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Thông tin khách hàng */}
                    <div className="space-y-6 pt-6">
                        <label className="font-sans-luxury text-[10px] text-slate-400 block">Danh tính người sở hữu</label>
                        <input type="text" placeholder="Quý danh khách hàng" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line text-lg" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <input type="tel" placeholder="Số điện thoại liên lạc" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line" />
                            <input type="text" placeholder="Địa chỉ giao vật phẩm" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line" />
                        </div>
                    </div>

                    {/* Action Buttons: Gold Theme */}
                    <div className="pt-10 pb-16">
                         <div className="grid grid-cols-2 gap-4 mb-8">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-2xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#064E3B]/30'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-2xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#D4AF37]/30'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-luxury-main w-full py-6 text-xs ${variantStock === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : ''}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang khởi tạo yêu cầu...' : (variantStock === 0 ? 'Sản phẩm tạm hết' : 'Xác nhận sở hữu ngay')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-6 text-center font-sans-luxury text-[8px] text-rose-500 animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Success Screen: Elegant White/Teal */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up backdrop-blur-3xl">
                        <div className="text-center space-y-8 max-w-sm">
                            <div className="w-24 h-24 bg-[#064E3B] rounded-full flex items-center justify-center text-[#D4AF37] mx-auto shadow-3xl">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h2 className="text-5xl font-serif font-black text-[#064E3B] leading-tight">Yêu cầu<br/>đã được tiếp nhận</h2>
                            <p className="pro-description text-center italic opacity-80">Cảm ơn quý khách đã tin chọn Sigma Vie. Chúng tôi sẽ sớm liên hệ để hoàn tất thủ tục bàn giao sản phẩm.</p>
                            <button onClick={onClose} className="btn-luxury-main mx-auto">Về cửa hàng</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* QR Modal Identity */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#04382c]/98 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[4rem] p-16 max-w-md w-full text-center relative shadow-[0_50px_100px_rgba(0,0,0,0.8)] border-t-[12px] border-[#D4AF37]" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-10 right-10 text-slate-300 hover:text-[#064E3B] transition-all"><XIcon/></button>
                  <h4 className="font-sans-luxury text-[10px] text-[#D4AF37] mb-12">Định danh sản phẩm (QR)</h4>
                  <div className="bg-white p-8 border border-slate-100 rounded-[3rem] inline-block shadow-inner mb-10">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={240} />
                  </div>
                  <div className="space-y-4">
                      <p className="font-sans-luxury text-[9px] text-slate-400">SKU Ref: {product.sku}</p>
                      <p className="font-script text-2xl text-[#064E3B]">Sigma Vie Signature</p>
                  </div>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
