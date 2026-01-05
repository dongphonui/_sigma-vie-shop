
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
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M12 21v-1"/></svg>
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
        <div className="relative bg-white w-full max-w-7xl h-full md:h-auto md:max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-[0_50px_100px_rgba(0,0,0,0.5)] rounded-none md:rounded-[2.5rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* CỘT TRÁI: VISUAL GALLERY */}
            <div className="w-full md:w-[42%] h-[350px] md:h-auto relative overflow-hidden group bg-luxury-teal sparkle-effect">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-105 opacity-90" />
                
                <div className="absolute top-10 left-8 z-10">
                    <p className="font-sans-luxury text-[7px] text-white/50 mb-1">Sigma Vie Archive</p>
                    <p className="font-script text-2xl text-[#D4AF37]">Nâng tầm chuẩn sống sang</p>
                </div>

                <button 
                    onClick={() => setShowProductQrView(true)}
                    className="absolute bottom-8 left-8 bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl shadow-2xl hover:bg-white/15 transition-all text-[#D4AF37]"
                >
                    <QrIcon />
                </button>

                <button onClick={onClose} className="md:hidden absolute top-6 right-6 bg-white/10 backdrop-blur-md p-2.5 rounded-full text-white"><XIcon /></button>
            </div>

            {/* CỘT PHẢI: NỘI DUNG SẠCH SẼ, CÂN ĐỐI */}
            <div className="w-full md:w-[58%] p-8 md:p-14 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-200 hover:text-[#92400E] transition-all duration-300"><XIcon /></button>
                
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-[1px] bg-[#D4AF37]"></span>
                        <span className="font-sans-luxury text-[8px] text-[#D4AF37] tracking-[0.3em]">Boutique Collection</span>
                    </div>
                    
                    {/* TIÊU ĐỀ ĐỔI SANG FONT ROBOTO (SANS) VÀ MÀU VÀNG GOLD ẤM ÁP GIỐNG ẢNH MẪU */}
                    <h1 className="text-3xl md:text-4xl font-sans font-black text-[#D4AF37] leading-tight mb-6 uppercase tracking-tighter">
                        {product.name}
                    </h1>
                    
                    <div className="flex items-baseline gap-4 mb-8">
                        <span className="text-2xl font-black text-[#064E3B] tracking-tighter">
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-sm text-slate-300 line-through font-light">{product.price}</span>}
                    </div>
                    
                    <div className="relative pl-6 border-l-2 border-[#D4AF37]/30">
                        <p className="pro-description italic opacity-80 leading-relaxed text-[#064E3B]/70">
                            {product.description || 'Chế tác từ những chất liệu tinh tuyển nhất, thiết kế này là tuyên ngôn của sự lịch lãm và đẳng cấp vượt thời gian, dành riêng cho những quý chủ nhân thượng lưu.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-10">
                    {/* Phân loại sản phẩm */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-50">
                        {hasSizes && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-400 mb-4 block">Chọn Kích thước</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setFeedbackMsg(''); }} className={`h-10 w-10 rounded-lg border-2 transition-all text-[11px] font-bold ${selectedSize === s ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-[#D4AF37]/50'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="font-sans-luxury text-[9px] text-slate-400 mb-4 block">Chọn Màu sắc</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setFeedbackMsg(''); }} className={`px-4 h-10 rounded-lg border-2 transition-all text-[11px] font-bold ${selectedColor === c ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-[#D4AF37]/50'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tồn kho & Số lượng */}
                    <div className="flex items-center justify-between py-8 border-y border-slate-50">
                        <div>
                             <p className={`font-sans-luxury text-[8px] mb-1 ${variantStock === 0 ? 'text-rose-500' : 'text-[#064E3B] opacity-60'}`}>
                                {variantStock === 0 ? 'Hiện tại đã cháy hàng' : (variantStock > 0 ? `Sẵn sàng: ${variantStock} phẩm vật` : 'Quý khách vui lòng chọn phiên bản')}
                             </p>
                             <p className="font-script text-lg text-[#D4AF37]">Nâng tầm phong thái</p>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-full h-11 px-4 gap-6">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-xl text-slate-300 hover:text-[#064E3B] transition-all">-</button>
                            <span className="text-sm font-bold text-[#064E3B] w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="text-xl text-slate-300 hover:text-[#064E3B] disabled:opacity-5 transition-all">+</button>
                        </div>
                    </div>

                    {/* KHỐI THANH TOÁN */}
                    <div className="bg-[#FFFBFA] p-6 rounded-[1.5rem] border border-[#D4AF37]/5 space-y-3 shadow-sm">
                        <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            <span>Giá trị vật phẩm</span>
                            <span className="text-slate-600">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                            <span>Đặc quyền vận chuyển</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600 font-bold' : 'text-slate-600'}>{shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-4 border-t border-dashed border-[#D4AF37]/20 flex justify-between items-center">
                            <span className="font-sans-luxury text-[9px] text-[#D4AF37]">Tổng trị giá thanh toán</span>
                            <span className="text-3xl font-black text-[#064E3B] tracking-tighter">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Thông tin khách hàng */}
                    <div className="space-y-4 pt-4">
                        <label className="font-sans-luxury text-[9px] text-slate-400 block tracking-widest">Danh tính người sở hữu</label>
                        <input type="text" placeholder="Họ tên Quý khách" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line" />
                            <input type="text" placeholder="Địa chỉ bàn giao" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line" />
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-6 pb-12">
                         <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-3.5 rounded-xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#064E3B] text-white border-[#064E3B] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#064E3B]/30'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-3.5 rounded-xl font-sans-luxury text-[8px] transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#D4AF37] text-white border-[#D4AF37] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#D4AF37]/30'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`btn-luxury-main w-full ${variantStock === 0 ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : ''}`}
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang khởi tạo...' : (variantStock === 0 ? 'Vật phẩm tạm hết' : 'Xác nhận sở hữu ngay')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-5 text-center font-sans-luxury text-[8px] text-rose-500 animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Success Overlay */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up backdrop-blur-3xl">
                        <div className="text-center space-y-6 max-w-sm">
                            <div className="w-16 h-16 bg-[#064E3B] rounded-full flex items-center justify-center text-[#D4AF37] mx-auto shadow-xl">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h2 className="text-3xl font-serif font-black text-[#064E3B] leading-tight">Yêu cầu đã được tiếp nhận</h2>
                            <p className="pro-description text-center italic opacity-70">Cảm ơn quý khách đã tin chọn Sigma Vie. Một chuyên viên tư vấn sẽ liên hệ ngay để hoàn tất thủ tục bàn giao.</p>
                            <button onClick={onClose} className="btn-luxury-main mx-auto">Về cửa hàng</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modal QR */}
      {showProductQrView && (
          <div className="fixed inset-0 bg-[#04382c]/98 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowProductQrView(false)}>
              <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center relative shadow-2xl animate-float-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQrView(false)} className="absolute top-8 right-8 text-slate-300 hover:text-[#064E3B] transition-all"><XIcon/></button>
                  <h4 className="font-sans-luxury text-[9px] text-[#D4AF37] mb-8">Product Signature Code</h4>
                  <div className="bg-white p-5 border border-slate-50 rounded-[2rem] inline-block shadow-inner mb-6">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={200} />
                  </div>
                  <div className="space-y-3">
                      <p className="font-sans-luxury text-[8px] text-slate-400">Model Ref: {product.sku}</p>
                      <p className="font-script text-xl text-[#064E3B]">Sigma Vie Signature</p>
                  </div>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
