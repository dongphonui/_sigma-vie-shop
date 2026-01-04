
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
    if ((hasSizes && !selectedSize) || (hasColors && !selectedColor)) return -1; // Trạng thái chưa chọn đủ

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

    // Case 1: Có cả 2 nhưng chưa chọn gì hoặc chọn thiếu
    if (hasSizes && hasColors) {
        if (!selectedSize && !selectedColor) return { text: 'Vui lòng chọn Size & Màu sắc', type: 'hint' };
        if (selectedSize && !selectedColor) return { text: 'Vui lòng chọn màu sắc', type: 'hint' };
        if (!selectedSize && selectedColor) return { text: 'Vui lòng chọn size', type: 'hint' };
    } 
    // Case 2: Chỉ có Size nhưng chưa chọn
    else if (hasSizes && !selectedSize) {
        return { text: 'Vui lòng chọn size', type: 'hint' };
    }
    // Case 3: Chỉ có Màu nhưng chưa chọn
    else if (hasColors && !selectedColor) {
        return { text: 'Vui lòng chọn màu sắc', type: 'hint' };
    }

    // Đã chọn đủ hoặc sản phẩm không phân loại -> Kiểm tra kho thực tế
    if (variantStock === 0) return { text: 'Hết hàng cho phân loại này', type: 'error' };
    return { text: `Sẵn có ${variantStock} sản phẩm trong kho`, type: 'success' };
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

      if (hasSizes && !selectedSize) { setFeedbackMsg('Vui lòng chọn Size.'); return; }
      if (hasColors && !selectedColor) { setFeedbackMsg('Vui lòng chọn Màu sắc.'); return; }
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng điền đủ thông tin giao hàng.'); return; }

      if (variantStock < quantity) {
          setFeedbackMsg('Loại hàng này hiện đã hết hoặc không đủ số lượng.');
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
            
            {/* Left: Sticky Image */}
            <div className="w-full md:w-[45%] h-[400px] md:h-auto relative overflow-hidden bg-white">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                <button onClick={() => setShowProductQr(true)} className="absolute bottom-6 left-6 bg-white/90 p-3 rounded-full shadow-xl hover:scale-110 transition-transform">
                    <QrCodeIcon className="w-6 h-6 text-[#00695C]" />
                </button>
            </div>

            {/* Right: Content Area */}
            <div className="w-full md:w-[55%] p-6 md:p-10 overflow-y-auto bg-white">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors z-20"><XIcon className="w-8 h-8"/></button>
                
                <div className="mb-8">
                    <div className="flex justify-between items-start mb-2">
                        <h1 className="text-3xl font-black text-gray-900 font-serif leading-tight">{product.name}</h1>
                        <div className="text-right">
                            {isFlashSaleActive ? (
                                <>
                                    <span className="text-2xl font-black text-red-600 block">{product.salePrice}</span>
                                    <span className="text-sm text-gray-400 line-through">{product.price}</span>
                                </>
                            ) : (
                                <span className="text-2xl font-black text-[#00695C] block">{product.price}</span>
                            )}
                        </div>
                    </div>
                    <div className="h-0.5 w-16 bg-[#D4AF37] mb-6"></div>
                    <p className="text-gray-600 leading-relaxed text-base italic font-serif opacity-90">
                        {product.description || 'Sản phẩm Sigma Vie tuyển chọn.'}
                    </p>
                </div>

                <div className="bg-[#F8F9FA] rounded-3xl p-8 border border-slate-100 mb-6 shadow-inner">
                    <h3 className="text-xl font-bold text-center font-serif text-gray-800 mb-8 uppercase tracking-widest">Tùy Chọn Mua Hàng</h3>

                    <div className="space-y-6">
                        {/* Size Selection */}
                        {product.sizes && product.sizes.length > 0 && (
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Kích thước (Size):</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.sizes.map(s => (
                                        <button key={s} onClick={() => { setSelectedSize(s); setQuantity(1); setFeedbackMsg(''); }} className={`min-w-[44px] h-11 rounded-lg border-2 font-bold transition-all ${selectedSize === s ? 'border-[#00695C] bg-teal-50 text-[#00695C]' : 'border-white bg-white text-gray-400 hover:border-slate-200 shadow-sm'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Color Selection */}
                        {product.colors && product.colors.length > 0 && (
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Màu sắc (Color):</label>
                                <div className="flex flex-wrap gap-2">
                                    {product.colors.map(c => (
                                        <button key={c} onClick={() => { setSelectedColor(c); setQuantity(1); setFeedbackMsg(''); }} className={`px-5 h-11 rounded-lg border-2 font-bold transition-all ${selectedColor === c ? 'border-[#00695C] bg-teal-50 text-[#00695C]' : 'border-white bg-white text-gray-400 hover:border-slate-200 shadow-sm'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inventory Info & Quantity */}
                        <div className="flex flex-col items-center gap-3 pt-4 border-t border-slate-200">
                            {/* Thông báo tồn kho thông minh */}
                            <div className="text-center min-h-[20px]">
                                <p className={`text-[11px] font-bold uppercase tracking-tight ${
                                    stockDisplayMessage.type === 'hint' ? 'text-amber-600 animate-pulse italic' : 
                                    stockDisplayMessage.type === 'error' ? 'text-red-500' : 'text-gray-400'
                                }`}>
                                    {stockDisplayMessage.text}
                                </p>
                            </div>

                            <div className="flex items-center gap-8 bg-white p-2 rounded-full px-4 shadow-sm border border-slate-100">
                                <button onClick={() => handleQuantityChange(-1)} className="w-10 h-10 flex items-center justify-center text-2xl text-gray-400 hover:text-gray-800 transition-colors">-</button>
                                <span className="text-xl font-black text-gray-900 w-6 text-center">{quantity}</span>
                                <button 
                                    onClick={() => handleQuantityChange(1)} 
                                    disabled={variantStock !== -1 && quantity >= variantStock}
                                    className="w-10 h-10 flex items-center justify-center text-2xl text-gray-400 hover:text-gray-800 transition-colors disabled:opacity-20"
                                >+</button>
                            </div>
                        </div>

                        {/* Price Breakdown */}
                        <div className="pt-6 border-t border-slate-200 space-y-2">
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-base font-black text-gray-800 uppercase tracking-tighter">Tổng thanh toán:</span>
                                <span className="text-2xl font-black text-[#00695C]">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        {/* Recipient Info */}
                        <div className="space-y-3 pt-6 border-t border-slate-200">
                            <input type="text" placeholder="Họ và tên người nhận" value={shipName} onChange={e => setShipName(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-100 transition-all font-medium text-gray-800 shadow-sm" />
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-100 transition-all font-medium text-gray-800 shadow-sm" />
                            <input type="text" placeholder="Địa chỉ giao hàng" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="w-full bg-white border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-teal-100 transition-all font-medium text-gray-800 shadow-sm" />
                        </div>

                        {/* Payment Selection */}
                        <div className="pt-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setPaymentMethod('COD')} className={`py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${paymentMethod === 'COD' ? 'border-[#D4AF37] bg-amber-50 text-[#D4AF37]' : 'border-white bg-white text-gray-400 hover:border-slate-200 shadow-sm'}`}>Tiền mặt</button>
                                <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'border-[#00695C] bg-teal-50 text-[#00695C]' : 'border-white bg-white text-gray-400 hover:border-slate-200 shadow-sm'}`}>Chuyển khoản</button>
                            </div>
                        </div>

                        <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0} 
                            className={`w-full py-5 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all ${variantStock === 0 ? 'bg-gray-400 cursor-not-allowed opacity-50' : 'bg-[#00695C] hover:bg-[#004d40] hover:-translate-y-1 shadow-teal-900/20'}`}
                        >
                            {orderStatus === 'PROCESSING' ? 'Đang đặt hàng...' : (variantStock === 0 ? 'Hết hàng' : 'Xác nhận Đặt mua')}
                        </button>
                        {feedbackMsg && <p className="text-center text-xs font-bold text-red-500 mt-2 bg-red-50 py-2 rounded-lg">{feedbackMsg}</p>}
                    </div>
                </div>

                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-[#00695C] z-[100] flex flex-col items-center justify-center text-white p-6 animate-fade-in">
                        <CheckCircleIcon className="w-24 h-24 mb-6" />
                        <h2 className="text-3xl font-serif font-bold mb-2">Đặt hàng thành công!</h2>
                        <p className="text-teal-100 mb-8 text-center max-w-sm">Cảm ơn bạn đã tin tưởng Sigma Vie. Chúng tôi sẽ sớm liên hệ xác nhận đơn hàng.</p>
                        <button onClick={onClose} className="bg-white text-[#00695C] px-12 py-3 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-all">Về Trang Chủ</button>
                    </div>
                )}
            </div>
        </div>
      </div>

      {showProductQr && (
          <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4" onClick={() => setShowProductQr(false)}>
              <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setShowProductQr(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-800"><XIcon className="w-6 h-6"/></button>
                  <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-sm border-b pb-4 italic">Product Identifier</h4>
                  <div className="p-4 bg-white border-4 border-slate-50 rounded-3xl inline-block shadow-inner mb-6">
                      <QRCodeSVG 
                        value={`${window.location.origin}/?product=${product.id}`} 
                        size={220} 
                        level="H" 
                        includeMargin={true}
                      />
                  </div>
                  <p className="text-[10px] text-slate-400 mb-6 font-mono font-bold tracking-widest">SERIAL: {product.sku}</p>
                  <p className="text-sm font-medium text-slate-600">Quét mã để truy cập trực tiếp trang sản phẩm này trên thiết bị di động.</p>
              </div>
          </div>
      )}

      <PaymentModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} orderId={createdOrder?.id || ''} amount={total} onConfirmPayment={() => { setShowQrModal(false); setOrderStatus('SUCCESS'); }} />
    </>
  );
};

export default ProductModal;
