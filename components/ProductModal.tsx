
import React, { useEffect, useState, useMemo } from 'react';
import type { Product, Order } from '../types';
import { createOrder } from '../utils/orderStorage';
import { getCurrentCustomer } from '../utils/customerStorage';
import { calculateShippingFee } from '../utils/shippingSettingsStorage';
import { getProductPageSettings } from '../utils/productPageSettingsStorage';
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

const QrIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M12 21v-1"/></svg>
);

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const [ui, setUi] = useState(getProductPageSettings());
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); 
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showQrCheck, setShowQrCheck] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');

  useEffect(() => {
      const handleUpdate = () => setUi(getProductPageSettings());
      window.addEventListener('sigma_vie_product_ui_update', handleUpdate);
      
      const customer = getCurrentCustomer();
      if (customer) {
          setShipName(customer.fullName);
          setShipPhone(customer.phoneNumber || '');
          setShipAddress(customer.address || '');
      }
      return () => window.removeEventListener('sigma_vie_product_ui_update', handleUpdate);
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
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng hoàn thiện địa chỉ giao hàng'); return; }

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
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-0 md:p-10 backdrop-blur-2xl transition-all duration-700" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl h-full md:h-auto md:max-h-[92vh] overflow-hidden flex flex-col md:flex-row shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] rounded-none md:rounded-[2.5rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* Ảnh sản phẩm */}
            <div className="w-full md:w-[48%] h-[350px] md:h-auto relative overflow-hidden group bg-slate-50">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[5000ms] group-hover:scale-110" />
                
                <div className="absolute top-8 left-8 z-10 flex flex-col gap-2">
                    <span 
                        className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/20"
                        style={{ backgroundColor: ui.badgeBgColor, color: ui.badgeTextColor }}
                    >
                        {ui.badgeLabel}: {product.sku}
                    </span>
                    <p className="font-serif text-white italic text-xl drop-shadow-md">Sigma Vie Archive</p>
                </div>

                <div className="absolute bottom-8 left-8 flex gap-3">
                  <button 
                      onClick={() => setShowQrCheck(true)}
                      className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl hover:bg-white/30 transition-all text-white active:scale-90"
                  >
                      <QrIcon />
                  </button>
                </div>

                <button onClick={onClose} className="md:hidden absolute top-6 right-6 bg-black/20 backdrop-blur-md p-2 rounded-full text-white"><XIcon /></button>
            </div>

            {/* Thông tin nội dung */}
            <div className="w-full md:w-[52%] p-8 md:p-16 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-200 hover:text-black transition-all hover:rotate-90"><XIcon /></button>
                
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-[10px] text-[#B4975A] tracking-[0.4em] font-black uppercase">Tuyển chọn thượng lưu</span>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    
                    <h1 
                        className="leading-tight mb-4 uppercase tracking-tighter font-black"
                        style={{ fontFamily: ui.titleFont, fontSize: ui.titleSize, color: ui.titleColor }}
                    >
                        {product.name}
                    </h1>
                    
                    <div className="flex items-center gap-6 mb-8">
                        <span className="font-black tracking-tighter" style={{ fontFamily: ui.priceFont, fontSize: ui.priceSize, color: ui.priceColor }}>
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-sm text-slate-300 line-through">{product.price}</span>}
                        <div className="h-4 w-[1px] bg-slate-200"></div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest border-b border-emerald-100">Tình trạng: Có sẵn</span>
                    </div>
                    
                    <p 
                        className="leading-relaxed border-l-4 border-slate-50 pl-6 italic"
                        style={{ fontFamily: ui.descFont, fontSize: ui.descSize, color: ui.descColor }}
                    >
                        {product.description || 'Chế tác từ những chất liệu cao quý nhất, mang phong thái thời thượng và đẳng cấp.'}
                    </p>
                </div>

                <div className="space-y-10">
                    {/* Phân loại */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                        {hasSizes && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-4 block uppercase tracking-widest">Kích thước</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => setSelectedSize(s)} className={`h-11 w-11 rounded-xl border transition-all text-xs font-black ${selectedSize === s ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-[#B4975A]'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-4 block uppercase tracking-widest">Màu sắc</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => setSelectedColor(c)} className={`px-5 h-11 rounded-xl border transition-all text-xs font-black ${selectedColor === c ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-[#B4975A]'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Số lượng */}
                    <div className="flex items-center justify-between py-6 border-y border-slate-50">
                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số lượng sở hữu</span>
                             <span className="text-[11px] font-bold text-[#B4975A] mt-1 italic">{variantStock > 0 ? `Sản phẩm còn: ${variantStock}` : 'Vui lòng chọn loại'}</span>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-xl h-12 px-4 gap-6 border border-slate-100">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-2xl text-slate-300 hover:text-black">-</button>
                            <span className="text-sm font-black w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="text-2xl text-slate-300 hover:text-black">+</button>
                        </div>
                    </div>

                    {/* Hóa đơn nháp */}
                    <div className="bg-[#FAF9F7] p-8 rounded-[2rem] border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                            <span>Giá trị sản phẩm</span>
                            <span className="text-black">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                            <span>Dịch vụ vận chuyển</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600 font-black' : 'text-black'}>{shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-[#B4975A] tracking-widest uppercase">Tổng thanh toán</span>
                            <span className="text-3xl font-black text-black tracking-tighter">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Thông tin giao nhận */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Địa chỉ bàn giao sản phẩm</label>
                        <input type="text" placeholder="Họ và tên Quý khách" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full bg-transparent border-b border-slate-200 py-3 focus:border-[#B4975A] outline-none font-bold text-black" />
                        <div className="grid grid-cols-2 gap-6">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full bg-transparent border-b border-slate-200 py-3 focus:border-[#B4975A] outline-none font-bold text-black" />
                            <input type="text" placeholder="Địa chỉ chi tiết" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full bg-transparent border-b border-slate-200 py-3 focus:border-[#B4975A] outline-none font-bold text-black" />
                        </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="pt-8 pb-12">
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#B4975A]'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-[#B4975A]'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className={`w-full py-6 rounded-full font-black text-[11px] tracking-[0.4em] uppercase transition-all shadow-2xl active:scale-95 ${variantStock === 0 ? 'bg-slate-100 text-slate-300' : ''}`}
                            style={{ backgroundColor: variantStock === 0 ? '#f1f5f9' : ui.buyBtnBgColor, color: ui.buyBtnTextColor }}
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang khởi tạo...' : (variantStock === 0 ? 'Hết hàng' : ui.buyBtnText)}
                         </button>
                         
                         {feedbackMsg && <p className="mt-4 text-center text-[10px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Màn hình thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up">
                        <div className="text-center space-y-10 max-w-sm">
                            <div className="w-20 h-20 bg-[#B4975A] rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">Đặt hàng thành công</h2>
                                <p className="text-slate-400 text-sm italic">Cảm ơn quý khách. Chúng tôi sẽ sớm liên hệ để hoàn tất thủ tục bàn giao sản phẩm.</p>
                            </div>
                            <button onClick={onClose} className="bg-[#B4975A] text-white px-10 py-4 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-[#a3864a] transition-all">Quay lại cửa hàng</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* QR MODAL XÁC THỰC */}
      {showQrCheck && (
          <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-6 backdrop-blur-3xl" onClick={() => setShowQrCheck(false)}>
              <div className="bg-white rounded-[3rem] p-12 max-w-sm w-full text-center relative shadow-2xl animate-float-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowQrCheck(false)} className="absolute top-10 right-10 text-slate-200 hover:text-black transition-all"><XIcon/></button>
                  <h4 className="text-[10px] font-black text-[#B4975A] mb-10 tracking-[0.4em] uppercase">Xác thực sản phẩm</h4>
                  <div className="bg-white p-6 border-4 border-slate-50 rounded-[3rem] inline-block shadow-inner mb-8">
                      <QRCodeSVG value={`${window.location.origin}/?product=${product.id}`} size={200} />
                  </div>
                  <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Reference: {product.sku}</p>
                      <p className="font-serif text-3xl text-black">Sigma Vie Archive</p>
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
