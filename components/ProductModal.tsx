
import React, { useEffect, useState } from 'react';
import type { Product, Order } from '../types';
import { getPrimaryAdminEmail } from '../utils/adminSettingsStorage';
import { createOrder } from '../utils/orderStorage';
import { getCurrentCustomer } from '../utils/customerStorage';
import { addToCart } from '../utils/cartStorage';
import { calculateShippingFee } from '../utils/shippingSettingsStorage';
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

const LightningIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
);

const ShoppingCartIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
);

const DollarSignIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

const CreditCardIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);

const QrCodeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
);

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, isLoggedIn, onOpenAuth }) => {
  const [managerEmail, setManagerEmail] = useState('');
  
  const now = Date.now();
  const isFlashSaleActive = product.isFlashSale && 
                            product.salePrice && 
                            (!product.flashSaleStartTime || now >= product.flashSaleStartTime) &&
                            (!product.flashSaleEndTime || now <= product.flashSaleEndTime);
  
  // Order Logic State
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>(''); 
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK_TRANSFER'>('COD');
  const [showQrModal, setShowQrModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  // Product QR Code State
  const [showProductQr, setShowProductQr] = useState(false);

  // NEW: Current Stock state for variants
  const [currentStock, setCurrentStock] = useState(product.stock);

  // Effect to update current stock when selection changes
  useEffect(() => {
      // Check if product needs variant selection
      const needsSize = product.sizes && product.sizes.length > 0;
      const needsColor = product.colors && product.colors.length > 0;

      if (needsSize || needsColor) {
          if (product.variants) {
              const variant = product.variants.find(v => 
                  (v.size === selectedSize || (!needsSize)) &&
                  (v.color === selectedColor || (!needsColor))
              );
              // Show variant stock only if all required options are selected
              if ((!needsSize || selectedSize) && (!needsColor || selectedColor)) {
                  setCurrentStock(variant ? variant.stock : 0);
              } else {
                  // Fallback to general stock or 0? 
                  // Better UX: Show total stock of product, or hint to select options
                  setCurrentStock(product.stock); 
              }
          } else {
              setCurrentStock(product.stock);
          }
      } else {
          setCurrentStock(product.stock);
      }
  }, [selectedSize, selectedColor, product]);

  const isOutOfStock = currentStock <= 0;

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showProductQr) {
            setShowProductQr(false);
        } else {
            onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    setManagerEmail(getPrimaryAdminEmail());

    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, showProductQr]);

  const handleQuantityChange = (delta: number) => {
      const newQty = quantity + delta;
      if (newQty >= 1 && newQty <= currentStock) {
          setQuantity(newQty);
      }
  };

  const handleAddToCart = () => {
      if (!isLoggedIn) {
          onOpenAuth();
          return;
      }
      
      // Validate
      if (product.sizes && product.sizes.length > 0 && !selectedSize) {
          setFeedbackMsg('Vui lòng chọn Size.');
          setTimeout(() => setFeedbackMsg(''), 2000);
          return;
      }
      if (product.colors && product.colors.length > 0 && !selectedColor) {
          setFeedbackMsg('Vui lòng chọn Màu sắc.');
          setTimeout(() => setFeedbackMsg(''), 2000);
          return;
      }

      addToCart(product, quantity, selectedSize, selectedColor);
      
      setFeedbackMsg('Đã thêm vào giỏ hàng!');
      setTimeout(() => setFeedbackMsg(''), 2000);
  };

  const parsePrice = (priceStr: string): number => {
      return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
  };

  const handlePlaceOrder = async () => {
      const customer = getCurrentCustomer();
      if (!customer) {
          onOpenAuth();
          return;
      }
      
      // Validate
      if (product.sizes && product.sizes.length > 0 && !selectedSize) {
          setFeedbackMsg('Vui lòng chọn Size.');
          setTimeout(() => setFeedbackMsg(''), 2000);
          return;
      }
      if (product.colors && product.colors.length > 0 && !selectedColor) {
          setFeedbackMsg('Vui lòng chọn Màu sắc.');
          setTimeout(() => setFeedbackMsg(''), 2000);
          return;
      }

      setOrderStatus('PROCESSING');

      const productForOrder = { ...product };
      if (isFlashSaleActive && product.salePrice) {
          productForOrder.price = product.salePrice; 
      }

      const pricePerUnit = parsePrice(productForOrder.price);
      const subtotal = pricePerUnit * quantity;
      const shippingFee = calculateShippingFee(subtotal);

      // Pass selectedSize and selectedColor
      const result = createOrder(customer, productForOrder, quantity, paymentMethod, shippingFee, selectedSize, selectedColor);

      if (result.success && result.order) {
          setCreatedOrder(result.order);
          if (paymentMethod === 'BANK_TRANSFER') {
              setShowQrModal(true);
              setOrderStatus('IDLE');
          } else {
              setOrderStatus('SUCCESS');
          }
      } else {
          setFeedbackMsg(result.message);
          setOrderStatus('IDLE');
      }
  };

  const handleConfirmPayment = () => {
      setShowQrModal(false);
      setOrderStatus('SUCCESS');
  };

  const renderOrderSection = () => {
      if (isOutOfStock) {
          return (
            <div className="py-4">
                <h3 className="text-xl font-bold text-gray-500 mb-2">
                    {(product.sizes?.length || product.colors?.length) ? 'Biến thể này tạm hết hàng' : 'Sản phẩm tạm hết hàng'}
                </h3>
                <p className="text-gray-400">Vui lòng chọn phân loại khác hoặc quay lại sau.</p>
            </div>
          );
      }

      if (orderStatus === 'SUCCESS') {
          return (
            <div className="py-8 text-center animate-fade-in-up">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-green-700 mb-2">Đặt hàng thành công!</h3>
                <p className="text-gray-600 mb-6">
                    {paymentMethod === 'BANK_TRANSFER' 
                        ? 'Cảm ơn bạn đã thanh toán. Chúng tôi sẽ xử lý đơn hàng sớm nhất.' 
                        : 'Đơn hàng của bạn đã được ghi nhận. Bạn sẽ thanh toán khi nhận hàng.'}
                </p>
                <button 
                    onClick={onClose}
                    className="bg-gray-800 text-white px-6 py-2 rounded-full hover:bg-gray-700 transition-colors"
                >
                    Tiếp tục mua sắm
                </button>
            </div>
          );
      }

      // Calculate estimate
      const currentPrice = isFlashSaleActive && product.salePrice ? parsePrice(product.salePrice) : parsePrice(product.price);
      const estimateSubtotal = currentPrice * quantity;
      const estimateShipping = calculateShippingFee(estimateSubtotal);
      const estimateTotal = estimateSubtotal + estimateShipping;

      return (
        <div className="py-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Mua Sản Phẩm</h3>
            
            {/* Size Selector */}
            {product.sizes && product.sizes.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2 text-left">Chọn Kích thước:</p>
                    <div className="flex flex-wrap gap-2">
                        {product.sizes.map(size => (
                            <button
                                key={size}
                                onClick={() => setSelectedSize(size)}
                                className={`min-w-[40px] px-3 py-2 rounded border font-medium text-sm transition-colors ${selectedSize === size ? 'bg-[#00695C] text-white border-[#00695C]' : 'bg-white text-gray-700 border-gray-300 hover:border-[#00695C]'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Color Selector */}
            {product.colors && product.colors.length > 0 && (
                <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2 text-left">Chọn Màu sắc:</p>
                    <div className="flex flex-wrap gap-2">
                        {product.colors.map(color => (
                            <button
                                key={color}
                                onClick={() => setSelectedColor(color)}
                                className={`px-3 py-2 rounded border font-medium text-sm transition-colors ${selectedColor === color ? 'bg-[#00695C] text-white border-[#00695C]' : 'bg-white text-gray-700 border-gray-300 hover:border-[#00695C]'}`}
                            >
                                {color}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 mb-2">
                <button 
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || orderStatus === 'PROCESSING'}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    -
                </button>
                <div className="w-16 text-center">
                    <span className="text-xl font-bold text-gray-800">{quantity}</span>
                </div>
                <button 
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= currentStock || orderStatus === 'PROCESSING'}
                    className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    +
                </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
                {product.sizes?.length || product.colors?.length 
                    ? `Còn lại ${currentStock} sản phẩm` 
                    : `Kho: ${currentStock}`
                }
            </p>

            {/* Price Preview */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                    <span>Tạm tính:</span>
                    <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(estimateSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Phí vận chuyển:</span>
                    {estimateShipping === 0 ? <span className="text-green-600 font-bold">Miễn phí</span> : <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(estimateShipping)}</span>}
                </div>
                <div className="flex justify-between border-t pt-1 mt-1 font-bold text-gray-800">
                    <span>Tổng cộng:</span>
                    <span className="text-[#00695C]">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(estimateTotal)}</span>
                </div>
            </div>

            {/* Payment Method Selector */}
            {isLoggedIn && (
                <div className="mb-6">
                    <p className="text-sm font-medium text-gray-700 mb-2 text-left">Phương thức thanh toán:</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => setPaymentMethod('COD')}
                            className={`flex flex-col items-center justify-center py-2 px-2 border rounded-lg transition-all ${paymentMethod === 'COD' ? 'bg-orange-50 border-[#D4AF37] text-[#D4AF37] ring-1 ring-[#D4AF37]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <DollarSignIcon className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold">Tiền mặt (COD)</span>
                        </button>
                        <button 
                            onClick={() => setPaymentMethod('BANK_TRANSFER')}
                            className={`flex flex-col items-center justify-center py-2 px-2 border rounded-lg transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-teal-50 border-[#00695C] text-[#00695C] ring-1 ring-[#00695C]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <CreditCardIcon className="w-5 h-5 mb-1" />
                            <span className="text-xs font-bold">Chuyển khoản (QR)</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3">
                 <button 
                    onClick={handleAddToCart}
                    disabled={orderStatus === 'PROCESSING'}
                    className="w-full text-[#00695C] border-2 border-[#00695C] font-bold py-3 px-8 rounded-full transition-transform transform hover:-translate-y-1 flex items-center justify-center gap-2 hover:bg-teal-50 disabled:opacity-50"
                >
                    <ShoppingCartIcon className="w-5 h-5" />
                    <span>Thêm vào Giỏ Hàng</span>
                </button>

                {!isLoggedIn ? (
                    <button 
                        onClick={onOpenAuth}
                        className="w-full bg-[#D4AF37] hover:bg-[#b89b31] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:-translate-y-1"
                    >
                        Đăng nhập để Mua ngay
                    </button>
                ) : (
                    <button 
                        onClick={handlePlaceOrder}
                        disabled={orderStatus === 'PROCESSING'}
                        className={`w-full text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:-translate-y-1 flex items-center justify-center gap-2 ${isFlashSaleActive ? 'bg-red-600 hover:bg-red-700' : 'bg-[#00695C] hover:bg-[#004d40]'} disabled:opacity-70`}
                    >
                        {isFlashSaleActive && <LightningIcon className="w-5 h-5" />}
                        <span>{orderStatus === 'PROCESSING' ? 'Đang xử lý...' : (paymentMethod === 'BANK_TRANSFER' ? 'Thanh toán & Mua ngay' : 'Mua ngay (Đặt nhanh)')}</span>
                    </button>
                )}
            </div>
            
            {feedbackMsg && <p className={`mt-4 font-medium text-center animate-pulse ${feedbackMsg.includes('thêm') ? 'text-[#00695C]' : 'text-red-600'}`}>{feedbackMsg}</p>}
        </div>
      );
  };

  // Generate Direct Link for QR (Query Param Only - Best Compatibility)
  // Example: https://domain.com/?product=123
  const productUrl = `${window.location.origin}/?product=${product.id}`;

  return (
    <>
        <div 
        className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
        >
        <div 
            className="relative bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col md:flex-row animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={() => setShowProductQr(true)}
                    className="text-gray-400 hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-gray-100"
                    title="Mã QR Sản phẩm"
                    aria-label="Hiện mã QR"
                >
                    <QrCodeIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-800 transition-colors p-1 rounded-full hover:bg-gray-100"
                    aria-label="Đóng cửa sổ"
                >
                    <XIcon className="w-8 h-8"/>
                </button>
            </div>
            
            <div className="w-full md:w-1/2 relative">
            <img 
                src={product.imageUrl} 
                alt={product.name} 
                className={`w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none ${isOutOfStock ? 'grayscale opacity-75' : ''}`} 
            />
            {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-black/70 text-white px-8 py-4 font-bold text-2xl tracking-widest border-4 border-white transform -rotate-12 backdrop-blur-sm">
                        HẾT HÀNG
                    </div>
                </div>
            )}
            {isFlashSaleActive && !isOutOfStock && (
                <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-1 z-10">
                    <LightningIcon className="w-4 h-4" />
                    FLASH SALE
                </div>
            )}
            </div>

            <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            {/* PRODUCT TITLE - FIXED VISIBILITY */}
            <h2 className="text-3xl font-bold font-serif mb-2 text-gray-900 pr-10 leading-tight">{product.name}</h2>
            <p className="text-sm text-gray-500 mb-6">SKU: {product.sku}</p>
            
            <div className="flex items-end gap-3 mb-6">
                {isFlashSaleActive ? (
                    <>
                        <p className="text-3xl font-bold text-red-600">{product.salePrice}</p>
                        <p className="text-xl text-gray-400 line-through mb-1">{product.price}</p>
                    </>
                ) : (
                    <p className="text-2xl text-gray-700">{product.price}</p>
                )}
                
                {isOutOfStock && <span className="text-red-600 font-bold border border-red-600 px-2 py-0.5 text-sm rounded mb-1">Hết hàng</span>}
            </div>
            
            <p className="text-gray-600 mb-8">{product.description}</p>

            <div className={`p-6 rounded-lg text-center ${isOutOfStock ? 'bg-gray-100' : (isFlashSaleActive ? 'bg-red-50 border border-red-100' : 'bg-gray-50')}`}>
                {renderOrderSection()}
            </div>
            </div>
        </div>
        <style>{`
            @keyframes fade-in-up {
                from { opacity: 0; transform: translateY(20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-fade-in-up {
                animation: fade-in-up 0.3s ease-out forwards;
            }
        `}</style>
        </div>

        {/* Product QR Code Modal */}
        {showProductQr && (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-[60] flex items-center justify-center p-4" onClick={() => setShowProductQr(false)}>
                <div className="bg-white rounded-lg p-8 max-w-sm w-full text-center relative animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                     <button
                        onClick={() => setShowProductQr(false)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-800 transition-colors"
                    >
                        <XIcon className="w-6 h-6"/>
                    </button>
                    
                    <h3 className="text-xl font-bold font-serif mb-2 text-[#00695C]">{product.name}</h3>
                    <p className="text-sm text-gray-500 mb-6">SKU: {product.sku}</p>
                    
                    <div className="flex justify-center mb-6 p-4 border-2 border-[#D4AF37] rounded-lg bg-white inline-block">
                         <QRCodeSVG 
                            value={productUrl}
                            size={200}
                            fgColor="#111827"
                         />
                    </div>
                    
                    <p className="text-sm font-medium text-gray-700">
                        Quét mã để xem thông tin hoặc mua nhanh
                    </p>
                    <p className="text-xs text-gray-400 mt-2 break-all">{productUrl}</p>
                </div>
            </div>
        )}

        <PaymentModal 
            isOpen={showQrModal} 
            onClose={() => setShowQrModal(false)}
            orderId={createdOrder?.id || ''}
            amount={createdOrder?.totalPrice || 0}
            onConfirmPayment={handleConfirmPayment}
        />
    </>
  );
};

export default ProductModal;