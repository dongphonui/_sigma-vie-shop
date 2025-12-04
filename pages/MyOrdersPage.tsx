
import React, { useState, useEffect } from 'react';
import type { Customer, Order } from '../types';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getOrdersByCustomerId, updateOrderStatus } from '../utils/orderStorage';

interface MyOrdersPageProps {
  currentUser: Customer | null;
  isAdminLinkVisible: boolean;
  cartItemCount?: number;
  onOpenCart?: () => void;
}

const PackageIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
);

const ClockIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);

const TruckIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
);

const XCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
);

const CreditCardIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
);

const DollarSignIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ currentUser, isAdminLinkVisible, cartItemCount, onOpenCart }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
        const customerOrders = getOrdersByCustomerId(currentUser.id);
        setOrders(customerOrders.sort((a, b) => b.timestamp - a.timestamp));
    }
    setLoading(false);
  }, [currentUser]);

  const handleCancelOrder = (orderId: string) => {
      if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
          updateOrderStatus(orderId, 'CANCELLED');
          if (currentUser) {
              const customerOrders = getOrdersByCustomerId(currentUser.id);
              setOrders(customerOrders.sort((a, b) => b.timestamp - a.timestamp));
          }
      }
  };

  const getStatusBadge = (status: Order['status']) => {
      switch (status) {
          case 'PENDING':
              return <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold"><ClockIcon className="w-4 h-4"/> Chờ xử lý</span>;
          case 'CONFIRMED':
              return <span className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold"><CheckCircleIcon className="w-4 h-4"/> Đã xác nhận</span>;
          case 'SHIPPED':
              return <span className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold"><TruckIcon className="w-4 h-4"/> Đã giao hàng</span>;
          case 'CANCELLED':
              return <span className="flex items-center gap-1 bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold"><XCircleIcon className="w-4 h-4"/> Đã hủy</span>;
          default:
              return null;
      }
  };

  const handleNavigate = (path: string) => {
      window.location.hash = path;
  };

  if (!currentUser) {
      return (
          <>
            <Header cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F5F2] px-4">
                <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Vui lòng đăng nhập</h2>
                    <p className="text-gray-600 mb-6">Bạn cần đăng nhập để xem lịch sử đơn hàng của mình.</p>
                    <button 
                        onClick={() => handleNavigate('/')}
                        className="bg-[#D4AF37] text-white px-6 py-2 rounded-full font-bold hover:bg-[#b89b31] transition-colors"
                    >
                        Quay về Trang chủ
                    </button>
                </div>
            </div>
            <Footer isAdminLinkVisible={isAdminLinkVisible} />
          </>
      );
  }

  return (
    <>
      <Header 
        currentUser={currentUser} 
        cartItemCount={cartItemCount} 
        onOpenCart={onOpenCart} 
      />
      <main className="min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">Đơn hàng của tôi</h1>
            <p className="text-gray-600 mb-8">Theo dõi trạng thái và lịch sử mua sắm của bạn.</p>

            {loading ? (
                <div className="text-center py-12">Đang tải dữ liệu...</div>
            ) : orders.length === 0 ? (
                <div className="bg-white p-12 rounded-lg shadow-md text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <PackageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Bạn chưa có đơn hàng nào</h3>
                    <p className="text-gray-500 mb-6">Hãy khám phá bộ sưu tập mới nhất của chúng tôi và đặt hàng ngay.</p>
                    <button 
                        onClick={() => handleNavigate('/')}
                        className="bg-[#00695C] text-white px-8 py-3 rounded-full font-bold hover:bg-[#004d40] transition-transform transform hover:-translate-y-1"
                    >
                        Bắt đầu mua sắm
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Mã đơn hàng: <span className="font-mono font-bold text-gray-800">{order.id}</span></p>
                                        <p className="text-sm text-gray-500">Ngày đặt: {new Date(order.timestamp).toLocaleDateString('vi-VN')} {new Date(order.timestamp).toLocaleTimeString('vi-VN')}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {getStatusBadge(order.status)}
                                        {order.paymentMethod === 'BANK_TRANSFER' ? (
                                            <span className="text-xs text-[#00695C] font-bold flex items-center gap-1 border border-[#00695C] px-2 py-0.5 rounded">
                                                <CreditCardIcon className="w-3 h-3" /> Chuyển khoản
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-600 font-bold flex items-center gap-1 border border-gray-300 px-2 py-0.5 rounded">
                                                <DollarSignIcon className="w-3 h-3" /> Tiền mặt (COD)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="border-t border-b border-gray-100 py-4 my-4 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                                        <PackageIcon className="w-8 h-8 text-gray-400"/>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800">{order.productName}</h4>
                                        <p className="text-sm text-gray-600">Số lượng: x{order.quantity}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-[#00695C] text-lg">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        Địa chỉ nhận: <span className="text-gray-700">{order.customerAddress}</span>
                                    </div>
                                    
                                    {order.status === 'PENDING' && (
                                        <button 
                                            onClick={() => handleCancelOrder(order.id)}
                                            className="text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                                        >
                                            Hủy đơn hàng
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </main>
      <Footer isAdminLinkVisible={isAdminLinkVisible} />
    </>
  );
};

export default MyOrdersPage;
