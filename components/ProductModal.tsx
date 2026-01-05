
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

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); 
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
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
      if (!shipName || !shipPhone || !shipAddress) { setFeedbackMsg('Vui lòng hoàn thiện địa chỉ bàn giao'); return; }

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
      <div className="fixed inset-0 bg-[#0a0a0a]/95 z-50 flex items-center justify-center p-0 md:p-10 backdrop-blur-2xl transition-all duration-700" onClick={onClose}>
        <div className="relative bg-white w-full max-w-6xl h-full md:h-auto md:max-h-[95vh] overflow-hidden flex flex-col md:flex-row shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-none md:rounded-[2.5rem] animate-float-up" onClick={e => e.stopPropagation()}>
            
            {/* Ảnh Sản Phẩm */}
            <div className="w-full md:w-1/2 h-[400px] md:h-auto relative overflow-hidden group bg-slate-50">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-105" />
                <div className="absolute top-8 left-8 z-10 flex flex-col gap-2">
                    <span className="bg-[#B4975A] text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-xl">Mã vật phẩm: {product.sku}</span>
                    <p className="font-serif text-white italic text-xl drop-shadow-lg">Sigma Vie Signature</p>
                </div>
                <button onClick={onClose} className="md:hidden absolute top-6 right-6 bg-black/20 backdrop-blur-md p-2 rounded-full text-white"><XIcon /></button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="w-full md:w-1/2 p-8 md:p-16 overflow-y-auto flex flex-col bg-white">
                <button onClick={onClose} className="hidden md:flex absolute top-10 right-10 text-slate-300 hover:text-black transition-all hover:rotate-90"><XIcon /></button>
                
                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-[10px] text-[#B4975A] tracking-[0.4em] font-black uppercase">Tuyển chọn cao cấp</span>
                        <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>
                    
                    {/* Tiêu đề Roboto, màu đen, size vừa phải */}
                    <h1 className="text-2xl md:text-3xl font-bold text-[#111827] leading-tight mb-4 uppercase tracking-tighter">
                        {product.name}
                    </h1>
                    
                    <div className="flex items-center gap-6 mb-8">
                        <span className="text-2xl font-black text-[#064E3B] tracking-tighter">
                            {product.isFlashSale ? product.salePrice : product.price}
                        </span>
                        {product.isFlashSale && <span className="text-sm text-slate-300 line-through">{product.price}</span>}
                        <div className="h-3 w-[1px] bg-slate-200"></div>
                        <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Sẵn sàng bàn giao</span>
                    </div>
                    
                    <p className="text-slate-500 leading-relaxed text-sm italic border-l-2 border-slate-100 pl-6">
                        {product.description || 'Tuyệt tác thời trang được chế tác từ những chất liệu tinh quý nhất, mang đậm dấu ấn cá nhân và sự sang trọng vượt thời gian.'}
                    </p>
                </div>

                <div className="space-y-10">
                    {/* Phân loại */}
                    <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                        {hasSizes && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-4 block uppercase tracking-widest">Kích thước</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.sizes?.map(s => (
                                        <button key={s} onClick={() => setSelectedSize(s)} className={`h-10 w-10 rounded-lg border transition-all text-xs font-bold ${selectedSize === s ? 'bg-[#111827] text-white border-[#111827] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-[#B4975A]'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasColors && (
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 mb-4 block uppercase tracking-widest">Màu sắc</label>
                                <div className="flex flex-wrap gap-2.5">
                                    {product.colors?.map(c => (
                                        <button key={c} onClick={() => setSelectedColor(c)} className={`px-4 h-10 rounded-lg border transition-all text-xs font-bold ${selectedColor === c ? 'bg-[#111827] text-white border-[#111827] shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-[#B4975A]'}`}>{c}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Số lượng */}
                    <div className="flex items-center justify-between py-6 border-y border-slate-50">
                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số lượng sở hữu</span>
                             <span className="text-[11px] font-bold text-[#B4975A] mt-1 italic">{variantStock > 0 ? `Chỉ còn ${variantStock} vật phẩm` : 'Vui lòng chọn phân loại'}</span>
                        </div>
                        <div className="flex items-center bg-slate-50 rounded-xl h-12 px-4 gap-6 border border-slate-100">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="text-xl text-slate-300 hover:text-black">-</button>
                            <span className="text-sm font-black w-4 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} disabled={variantStock !== -1 && quantity >= variantStock} className="text-xl text-slate-300 hover:text-black">+</button>
                        </div>
                    </div>

                    {/* Hóa đơn tóm tắt */}
                    <div className="bg-[#FAF9F7] p-8 rounded-[2rem] border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                            <span>Giá trị vật phẩm</span>
                            <span className="text-slate-700">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                            <span>Phí vận chuyển</span>
                            <span className={shippingFee === 0 ? 'text-emerald-600 font-black' : 'text-slate-700'}>{shippingFee === 0 ? 'MIỄN PHÍ' : formatCurrency(shippingFee)}</span>
                        </div>
                        <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-baseline">
                            <span className="text-[10px] font-black text-[#B4975A] tracking-widest uppercase">Tổng thanh toán</span>
                            <span className="text-3xl font-black text-[#111827] tracking-tighter">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    {/* Thông tin giao nhận */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Địa chỉ bàn giao</label>
                        <input type="text" placeholder="Họ và tên Quý khách" value={shipName} onChange={e => setShipName(e.target.value)} className="input-luxury-line" />
                        <div className="grid grid-cols-2 gap-6">
                            <input type="tel" placeholder="Số điện thoại" value={shipPhone} onChange={e => setShipPhone(e.target.value)} className="input-luxury-line" />
                            <input type="text" placeholder="Địa chỉ chi tiết" value={shipAddress} onChange={e => setShipAddress(e.target.value)} className="input-luxury-line" />
                        </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="pt-8 pb-12">
                         <div className="grid grid-cols-2 gap-4 mb-6">
                            <button onClick={() => setPaymentMethod('COD')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === 'COD' ? 'bg-[#111827] text-white border-[#111827] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>Tiền mặt (COD)</button>
                            <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${paymentMethod === 'BANK_TRANSFER' ? 'bg-[#B4975A] text-white border-[#B4975A] shadow-xl' : 'bg-white text-slate-300 border-slate-100 hover:border-slate-200'}`}>Chuyển khoản QR</button>
                         </div>

                         <button 
                            onClick={handlePlaceOrder} 
                            disabled={orderStatus === 'PROCESSING' || variantStock === 0}
                            className="btn-luxury-main w-full"
                         >
                            {orderStatus === 'PROCESSING' ? 'Đang khởi tạo...' : (variantStock === 0 ? 'Hết hàng' : 'Xác nhận sở hữu')}
                         </button>
                         
                         {feedbackMsg && <p className="mt-4 text-center text-[10px] font-bold text-rose-500 uppercase tracking-widest animate-pulse">{feedbackMsg}</p>}
                    </div>
                </div>

                {/* Màn hình thành công */}
                {orderStatus === 'SUCCESS' && (
                    <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-12 animate-float-up">
                        <div className="text-center space-y-10 max-w-sm">
                            <div className="w-20 h-20 bg-[#111827] rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div className="space-y-3">
                                <h2 className="text-3xl font-bold text-[#111827] uppercase tracking-tighter">Đặt hàng thành công</h2>
                                <p className="text-slate-400 text-sm italic">Cảm ơn quý khách. Một chuyên viên sẽ liên hệ để hoàn tất thủ tục bàn giao trong thời gian sớm nhất.</p>
                            </div>
                            <button onClick={onClose} className="btn-luxury-main">Quay lại cửa hàng</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

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
