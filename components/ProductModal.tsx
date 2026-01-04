
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

const XIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const QrCodeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
);

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const now = Date.now();
  const isFlashSaleActive = product.isFlashSale && 
                            product.salePrice && 
                            (!product.flashSaleStartTime || now >= product.flashSaleStartTime) &&
                            (!product.flashSaleEndTime || now <= product.flashSaleEndTime);
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); 
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [showProductQr, setShowProductQr] = useState(false);

  // Shipping Info State
  const [shipName, setShipName] = useState('');
  const [shipPhone, setShipPhone] = useState('');
  const [shipAddress, setShipAddress] = useState('');

  // Tồn kho cụ thể của BIẾN THỂ
  const variantStock = useMemo(() => {
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasColors = product.colors && product.colors.length > 0;
    
    if (!hasSizes && !hasColors) return product.stock;
    if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) return -1;

    if (!product.variants || product.variants.length === 0) return 0;
    
    const variant = product.variants.find(v => 
        (v.size === selectedSize || (!hasSizes && !v.size)) && 
        (v.color === selectedColor || (!hasColors && !v.color))
    );
    
    return variant ? variant.stock : 0;
  }, [product, selectedSize, selectedColor]);

  // Logic hiển thị tin nhắn hướng dẫn chọn hàng
  const stockDisplayMessage = useMemo(() => {
    const hasSizes = product.sizes && product.sizes.length > 0;
    const hasColors = product.colors && product.colors.length > 0;

    if (hasSizes && hasColors) {
        if (!selectedSize && !selectedColor) return { text: 'Vui lòng xác định Size & Màu sắc', type: 'hint' };
        if (selectedSize && !selectedColor) return { text: 'Vui lòng chọn thêm màu sắc', type: 'hint' };
        if (!selectedSize && selectedColor) return { text: 'Vui lòng chọn thêm kích thước', type: 'hint' };
    } 
    else if (hasSizes && !selectedSize) return { text: 'Vui lòng xác định kích thước', type: 'hint' };
    else if (hasColors && !selectedColor) return { text: 'Vui lòng xác định màu sắc', type: 'hint' };

    if (variantStock === 0) return { text: 'Hiện đã hết hàng cho phân loại này', type: 'error' };
    return { text: `Sẵn có ${variantStock} sản phẩm trong hệ thống`, type: 'success' };
  }, [product, selectedSize, selectedColor, variantStock]);

  useEffect(() => {
      const customer = getCurrentCustomer();
      if (customer) {
          setShipName(customer.fullName);
          setShipPhone(customer.phoneNumber || '');
          setShipAddress(customer.address || '');
      }
  }, [isLoggedIn]);

  const parsePrice = (priceStr: string): number => {
      return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
  };

  const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
  };

  const basePrice = isFlashSaleActive && product.salePrice ? parsePrice(product.salePrice) : parsePrice(product.price);
  const subtotal = basePrice * quantity;
  const shippingFee = calculateShippingFee(subtotal);
  const total = subtotal + shippingFee;

  const handleQuantityChange = (delta: number) => {
      const newQty = quantity + delta;
      if (newQty >= 1 && (variantStock === -1 || newQty <= variantStock)) {
          setQuantity(newQty);
      }
  };

  const handlePlaceOrder = async () => {
      const customer = getCurrentCustomer();
      if (!customer) { onOpenAuth(); return; }
      
      const hasSizes = product.sizes && product.sizes.length > 0;
      const hasColors = product.colors && product.colors.length > 0;

      if (hasSizes && !selectedSize) { setFeedbackMsg('Vui lòng chọn Kích thước.'); return; }
      if (hasColors && !selectedColor) { setFeedbackMsg('Vui lòng chọn Màu sắc.'); return; }
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Thông tin giao hàng chưa đầy đủ.'); return; }

      if (variantStock < quantity) {
          setFeedbackMsg('Phân loại này hiện không đủ số lượng tồn kho.');
          return;
      }

      setOrderStatus('PROCESSING');
      const result = createOrder(customer, product, quantity, paymentMethod, shippingFee, selectedSize, selectedColor, {
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
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="relative bg-[#FAF9F6] rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col md:flex-row animate-fade-in-up" onClick={e => e.stopPropagation()}>
            
            {/* Left: Product Image */}
            <div className="w-full md:w-[45%] h-[350px] md:h-auto relative overflow-hidden bg-white">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                <button onClick={() => setShowProductQr(true)} className="absolute bottom-6 left-6 bg-white/95 p-3 rounded-full shadow-xl hover:scale-110 transition-transform">
                    <QrCodeIcon className="w-6 h-6 text-[#00695C]" />
                </button>
            </div>

            {/* Right: Content Area */}
            <div className="w-full md:w-[55%] p-6 md:p-10 overflow-y-auto bg-white">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors z-20"><XIcon className="w-8 h-8"/></button>
                
                {/* Header Information */}
                <div className="mb-10">
                    <div className="flex justify-between items-start mb-3">
                        <h1 className="text-3xl font-black text-gray-900 font-serif leading-tight">{product.name}</h1>
                        <div className="text-right">
                            {isFlashSaleActive ? (
                                <>
                                    <span className="text-2xl font-black text-red-600 block">{product.salePrice}</span>
                                    <span className="text-sm text-gray-400 line-through font-medium">{product.price}</span>
                                </>
                            ) : (
                                <span className="text-2xl font-black text-[#00695C] block">{product.price}</span>
                            )}
                        </div>
                    </div>
                    <div className="h-0.5 w-16 bg-[#D4AF37] mb-6"></div>
                    <p className="text-gray-500 leading-relaxed text-sm italic font-serif opacity-80 max-w-md">
                        {product.description || 'Tuyển tập thiết kế cao cấp dành cho quý khách hàng của Sigma Vie.'}
                    </p>
                </div>

                {/* Purchase Card Start */}
                <div className="bg-[#FDFDFD] rounded-[2rem] p-8 border border-gray-100 mb-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)]">
                    <h3 className="text-xl font-bold text-center font-serif text-gray-800 mb-10 tracking-widest uppercase border-b border-gray-50 pb-4">Tùy Chọn Mua Hàng</h3>

                    <div className="space-y-8">
                        {/* Size Selection */}
                        {product.sizes && product.sizes.length > 0 && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">Kích thước / Size</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.sizes.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setQuantity(1); setFeedbackMsg(''); }} className={`min-w-[50px] h-12 rounded-xl border-2 font-bold transition-all text-xs tracking-widest ${selectedSize === s ? 'border-[#00695C] bg-[#00695C] text-white shadow-lg shadow-teal-900/10' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Color Selection */}
                        {product.colors && product.colors.length > 0 && (
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">Màu sắc / Color</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.colors.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setQuantity(1); setFeedbackMsg(''); }} className={`px-6 h-12 rounded-xl border-2 font-bold transition-all text-xs tracking-widest ${selectedColor === c ? 'border-[#00695C] bg-[#00695C] text-white shadow-lg shadow-teal-900/10' : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inventory Info & Quantity Picker */}
                        <div className="flex flex-col items-center gap-5 pt-6 border-t border-gray-50">
                            <div className="min-h-[20px]">
                                <p className={`text-[11px] font-bold uppercase tracking-widest text-center ${
                                    stockDisplayMessage.type === 'hint' ? 'text-amber-500 italic' : 
                                    stockDisplayMessage.type === 'error' ? 'text-red-500' : 'text-gray-400'
                                }`}>
                                    {stockDisplayMessage.text}
                                </p>
                            </div>

                            <div className="flex items-center gap-10 bg-white p-1.5 rounded-full px-6 shadow-sm border border-gray-100">
                                <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-2xl text-gray-300 hover:text-[#D4AF37] transition-colors">-</button>
                                <span className="text-xl font-black text-gray-900 w-6 text-center font-sans">{quantity}</span>
                                <button 
                                    onClick={() => handleQuantityChange(1)} 
                                    disabled={variantStock !== -1 && quantity >= variantStock}
                                    className="w-10 h-10 flex items-center justify-center text-2xl text-gray-300 hover:text-[#D4AF37] transition-colors disabled:opacity-10"
                                >+</button>
                            </div>
                        </div>

                        {/* Total Price Section */}
                        <div className="pt-8 border-t border-gray-50">
                            <div className="flex justify-between items-center bg-teal-50/30 p-5 rounded-2xl border border-teal-50">
                                <span className="text-[10px] font-black text-[#00695C] uppercase tracking-[0.2em]">Tổng thanh toán</span>
                                <span className="text-2xl font-black text-[#00695C] font-sans">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        {/* Delivery Information Form */}
                        <div className="space-y-4 pt-8">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">Thông tin nhận hàng</label>
                            <input type="text" placeholder="Họ và tên quý khách" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full bg-gray-50/50 border-gray-100 border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-teal-500/5 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="tel" placeholder="Số điện thoại liên lạc" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full bg-gray-50/50 border-gray-100 border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-teal-500/5 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                                <input type="text" placeholder="Địa chỉ giao hàng chi tiết" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full bg-gray-50/50 border-gray-100 border rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-teal-500/5 focus:bg-white transition-all text-sm font-medium text-gray-800" />
                            </div>
                        </div>

                        {/* Payment Selection */}
                        <div className="pt-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4">Phương thức thanh toán</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'border-[#D4AF37] bg-amber-50 text-[#D4AF37]' : 'border-gray-50 bg-white text-gray-400 hover:border-gray-200 shadow-sm'}`}>Thanh toán COD</button>
                                <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'border-[#00695C] bg-teal-50 text-[#00695C]' : 'border-gray-50 bg-white text-gray-400 hover:border-gray-200 shadow-sm'}`}>Chuyển khoản</button>
                            </div>
                        </div>

                        {/* Call to Action */}
                        <div className="pt-6">
                            <button 
                                onClick={handlePlaceOrder} 
                                disabled={orderStatus === 'PROCESSING' || variantStock === 0} 
                                className={`w-full py-5 text-white rounded-2xl font-black uppercase tracking-[0.3em] text-xs shadow-2xl transition-all ${variantStock === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#00695C] hover:bg-[#004d40] hover:-translate-y-1 shadow-teal-900/20'}`}
                            >
                                {orderStatus === 'PROCESSING' ? 'Đang khởi tạo đơn hàng...' : (variantStock === 0 ? 'Sản phẩm đã hết' : 'Xác nhận Đặt mua')}
                            </button>
                            {feedbackMsg && <p className="text-center text-[11px] font-bold text-red-500 mt-4 bg-red-50 py-2.5 rounded-xl border border-red-100">{feedbackMsg}</p>}
                        </div>
                    </div>
                </div>

                {/* Success Overlay */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-[#00695C] z-[100] flex flex-col items-center justify-center text-white p-6 animate-fade-in backdrop-blur-md">
                        <CheckCircleIcon className="w-24 h-24 mb-6 text-[#D4AF37]" />
                        <h2 className="text-4xl font-serif font-bold mb-3 tracking-wide">Đặt hàng thành công!</h2>
                        <p className="text-teal-100 mb-10 text-center max-w-sm font-light leading-relaxed">Cảm ơn bạn đã lựa chọn Sigma Vie. Chúng tôi sẽ sớm liên hệ xác nhận và giao món quà này đến bạn.</p>
                        <button onClick={onClose} className="bg-white text-[#00695C] px-16 py-4 rounded-full font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-all shadow-2xl">Quay lại Shop</button>
                    </div>
                )}

                <div className="mt-8 text-center">
                    <button onClick={onClose} className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] hover:text-gray-500 transition-colors">Đóng cửa sổ</button>
                </div>
            </div>
        </div>
      </div>

      {/* QR Identification Modal */}
      {showProductQr && (
          <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4" onClick={() => setShowProductQr(false)}>
              <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQr(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-800"><XIcon className="w-6 h-6"/></button>
                  <h4 className="font-black text-slate-800 mb-8 uppercase tracking-[0.25em] text-[10px] border-b border-gray-50 pb-5">Product Identity Code</h4>
                  <div className="p-5 bg-white border border-gray-50 rounded-[2rem] inline-block shadow-[inner_0_2px_10px_rgba(0,0,0,0.02)] mb-8">
                      <QRCodeSVG 
                        value={`${window.location.origin}/?product=${product.id}`} 
                        size={220} 
                        level="H" 
                        includeMargin={true}
                      />
                  </div>
                  <p className="text-[10px] text-slate-400 mb-8 font-mono font-bold tracking-widest">SERIAL: {product.sku}</p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed italic px-4">Quét mã QR để truy cập trực tiếp trang sản phẩm này trên thiết bị di động của bạn.</p>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
