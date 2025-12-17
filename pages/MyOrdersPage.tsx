
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getOrdersByCustomerId, forceReloadOrders } from '../utils/orderStorage';
import type { Customer, Order } from '../types';

interface MyOrdersPageProps {
    currentUser: Customer | null;
    isAdminLinkVisible: boolean;
    cartItemCount?: number;
    onOpenCart?: () => void;
}

const PackageIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
);

const RefreshIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
);

const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ currentUser, isAdminLinkVisible, cartItemCount, onOpenCart }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadOrders = async (force: boolean = false) => {
        if (!currentUser) return;
        
        if (force) {
            setIsLoading(true);
            try {
                // Ép buộc tải lại từ Server và ghi đè Local nếu Server có dữ liệu mới
                await forceReloadOrders();
            } finally {
                setIsLoading(false);
            }
        }
        // Lấy dữ liệu đã được merge
        setOrders(getOrdersByCustomerId(currentUser.id));
    };

    useEffect(() => {
        // Initial load
        loadOrders(true);

        // Listen for background updates
        const handleOrderUpdate = () => {
            if (currentUser) {
                setOrders(getOrdersByCustomerId(currentUser.id));
            }
        };

        window.addEventListener('sigma_vie_orders_update', handleOrderUpdate);
        return () => window.removeEventListener('sigma_vie_orders_update', handleOrderUpdate);
    }, [currentUser]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-[#F7F5F2] flex flex-col">
                 <Header cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                     <p className="text-xl text-gray-600 mb-4">Vui lòng đăng nhập để xem đơn hàng của bạn.</p>
                 </div>
                 <Footer isAdminLinkVisible={isAdminLinkVisible} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F5F2] flex flex-col">
            <Header currentUser={currentUser} cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold font-serif text-gray-900">Đơn hàng của tôi</h1>
                    <button 
                        onClick={() => loadOrders(true)} 
                        className="text-sm bg-white border border-gray-300 px-4 py-2 rounded-lg shadow-sm text-[#00695C] flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"
                        disabled={isLoading}
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
                    </button>
                </div>
                
                <div className="space-y-6">
                    {orders.length === 0 ? (
                        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                            {isLoading ? (
                                <p className="text-gray-500">Đang tải dữ liệu từ máy chủ...</p>
                            ) : (
                                <>
                                    <p className="text-gray-500">Bạn chưa có đơn hàng nào.</p>
                                    <a href="#/" className="text-[#D4AF37] hover:underline mt-2 inline-block">Mua sắm ngay</a>
                                </>
                            )}
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="bg-white p-6 rounded-lg shadow-sm animate-fade-in-up">
                                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
                                    <div>
                                        <p className="font-bold text-gray-800">Đơn hàng #{order.id}</p>
                                        <p className="text-sm text-gray-500">{new Date(order.timestamp).toLocaleString('vi-VN')}</p>
                                        {/* SHOW RECIPIENT INFO */}
                                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded border border-gray-100">
                                            <p className="font-medium text-gray-700">Người nhận:</p>
                                            <p className="text-gray-600">{order.shippingName} - {order.shippingPhone}</p>
                                            <p className="text-gray-500 text-xs italic">{order.shippingAddress}</p>
                                            {order.note && <p className="text-gray-500 text-xs mt-1">Ghi chú: {order.note}</p>}
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold 
                                        ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                          order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : 
                                          order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {order.status === 'PENDING' ? 'Chờ xử lý' : 
                                         order.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                         order.status === 'SHIPPED' ? 'Đã giao' : 'Đã hủy'}
                                    </span>
                                </div>

                                <div className="border-t border-b border-gray-100 py-4 my-4">
                                    <div className="flex items-center gap-4 mb-2">
                                        <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                                            <PackageIcon className="w-8 h-8 text-gray-400"/>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-800">{order.productName}</h4>
                                            <div className="flex gap-2 mt-1">
                                                {order.productSize && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Size: {order.productSize}</span>
                                                )}
                                                {order.productColor && (
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Màu: {order.productColor}</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">Số lượng: x{order.quantity}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Breakdown */}
                                    <div className="flex flex-col items-end text-sm space-y-1">
                                        <div className="text-gray-500">
                                            Tạm tính: {new Intl.NumberFormat('vi-VN').format(order.totalPrice - (order.shippingFee || 0))}đ
                                        </div>
                                        <div className="text-gray-500">
                                            Phí ship: {(order.shippingFee || 0) === 0 ? <span className="text-green-600">Miễn phí</span> : `${new Intl.NumberFormat('vi-VN').format(order.shippingFee || 0)}đ`}
                                        </div>
                                        <div className="font-bold text-[#00695C] text-lg border-t pt-1 mt-1">
                                            Tổng: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm text-gray-500">
                                    <p>Thanh toán: {order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt (COD)'}</p>
                                    {order.status === 'SHIPPED' && (
                                        <button className="text-[#D4AF37] hover:underline">Đánh giá</button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
            <Footer isAdminLinkVisible={isAdminLinkVisible} />
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default MyOrdersPage;
