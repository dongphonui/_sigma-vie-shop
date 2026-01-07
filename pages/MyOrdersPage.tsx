
import React, { useEffect, useState, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getOrdersByCustomerId, forceReloadOrders } from '../utils/orderStorage';
import { updateCustomer, syncWithServer } from '../utils/customerStorage';
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

const CameraIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);

const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ currentUser, isAdminLinkVisible, cartItemCount, onOpenCart }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadOrders = async (force: boolean = false) => {
        if (!currentUser) return;
        
        setIsLoading(true);
        try {
            if (force) {
                // Tải trực tiếp từ server để đồng bộ thiết bị
                const allOrders = await forceReloadOrders();
                setOrders(allOrders.filter(o => String(o.customerId) === String(currentUser.id)));
            } else {
                const localOrders = getOrdersByCustomerId(currentUser.id);
                setOrders(localOrders);
            }
        } catch (e) {
            console.error("Lỗi khi tải đơn hàng:", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Luôn force sync khi vào trang lần đầu hoặc khi đổi user
        if (currentUser) {
            loadOrders(true);
        }

        const handleOrderUpdate = () => {
            if (currentUser) {
                setOrders(getOrdersByCustomerId(currentUser.id));
            }
        };
        window.addEventListener('sigma_vie_orders_update', handleOrderUpdate);
        return () => window.removeEventListener('sigma_vie_orders_update', handleOrderUpdate);
    }, [currentUser?.id]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && currentUser) {
            if (file.size > 3 * 1024 * 1024) {
                alert("Ảnh quá lớn! Vui lòng chọn ảnh dưới 3MB.");
                return;
            }

            setIsUpdatingAvatar(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                const updatedUser = { ...currentUser, avatarUrl: base64 };
                
                const success = await updateCustomer(updatedUser);
                
                if (success) {
                    await syncWithServer();
                    setIsUpdatingAvatar(false);
                } else {
                    alert("Có lỗi khi lưu ảnh.");
                    setIsUpdatingAvatar(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-[#F7F5F2] flex flex-col">
                 <Header cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
                 <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                     <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 max-w-md">
                        <UserIcon className="w-16 h-16 mx-auto mb-6 text-slate-200" />
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">Khu vực dành cho Thành viên</h2>
                        <p className="text-slate-500 text-sm mb-8 leading-relaxed">Vui lòng đăng nhập tài khoản Sigma Vie để quản lý lịch sử đơn hàng và thông tin cá nhân của quý khách.</p>
                        <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('sigma_vie_open_auth'))}
                            className="bg-[#111827] text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                        >
                            Đăng nhập ngay
                        </button>
                     </div>
                 </div>
                 <Footer isAdminLinkVisible={isAdminLinkVisible} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F7F5F2] flex flex-col">
            <Header currentUser={currentUser} cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
            
            <main className="flex-1 container mx-auto px-4 py-12 max-w-5xl">
                <section className="bg-white rounded-[2.5rem] shadow-xl border border-[#064E3B]/5 p-8 md:p-12 mb-12 animate-fade-in-up">
                    <div className="flex flex-col md:flex-row items-center gap-10">
                        <div className="relative group">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl relative bg-slate-50">
                                {currentUser.avatarUrl ? (
                                    <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#111827] text-white text-3xl font-black">
                                        {currentUser.fullName.charAt(0)}
                                    </div>
                                )}
                                {isUpdatingAvatar && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 bg-white p-3 rounded-full shadow-lg border border-slate-100 hover:bg-[#D4AF37] hover:text-white transition-all transform active:scale-90"
                                title="Thay đổi ảnh đại diện"
                                disabled={isUpdatingAvatar}
                            >
                                <CameraIcon className="w-5 h-5" />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-4">
                                <h1 className="text-3xl font-black text-[#111827] uppercase tracking-tighter">{currentUser.fullName}</h1>
                                <span className="bg-[#064E3B] text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest self-center md:self-baseline">Thành viên Sigma Vie</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-medium text-slate-500">
                                <p className="flex items-center gap-2 justify-center md:justify-start">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                    {currentUser.phoneNumber || 'Chưa cập nhật số điện thoại'}
                                </p>
                                <p className="flex items-center gap-2 justify-center md:justify-start">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    {currentUser.email || 'Chưa cập nhật email'}
                                </p>
                                <p className="flex items-center gap-2 justify-center md:justify-start md:col-span-2 italic">
                                    <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                                    {currentUser.address || 'Chưa cập nhật địa chỉ giao hàng'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-row md:flex-col gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl text-center min-w-[120px] border border-slate-100 shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đơn hàng</p>
                                <p className="text-2xl font-black text-[#111827]">{isLoading ? '...' : orders.length}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl text-center min-w-[120px] border border-slate-100 shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tham gia</p>
                                <p className="text-xs font-black text-[#111827]">{new Date(currentUser.createdAt).getFullYear()}</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="flex justify-between items-center mb-8 px-4">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Lịch sử mua sắm</h2>
                    <button 
                        onClick={() => loadOrders(true)} 
                        className="text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 px-5 py-2.5 rounded-xl shadow-sm text-slate-600 flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
                        disabled={isLoading}
                    >
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Đang cập nhật...' : 'Đồng bộ đơn hàng'}
                    </button>
                </div>
                
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="bg-white p-20 rounded-[2.5rem] shadow-sm text-center border border-slate-100">
                             <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#D4AF37] rounded-full animate-spin"></div>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Đang tải đơn hàng từ đám mây...</p>
                            </div>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="bg-white p-16 rounded-[2.5rem] shadow-sm text-center border border-slate-100 italic">
                            <PackageIcon className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                            <p className="text-slate-400 mb-6">Quý khách chưa có đơn hàng nào tại Sigma Vie.</p>
                            <a href="#/" className="btn-luxury-main inline-block">Khám phá bộ sưu tập</a>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 animate-fade-in-up hover:shadow-lg transition-all duration-500">
                                <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-6 pb-6 border-b border-slate-50">
                                    <div className="flex-1 w-full">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <p className="font-black text-slate-900 uppercase text-sm tracking-tight">Đơn hàng #{order.id}</p>
                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest 
                                                ${order.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 
                                                order.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 
                                                order.status === 'SHIPPED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                {order.status === 'PENDING' ? 'Chờ xử lý' : 
                                                order.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                                order.status === 'SHIPPED' ? 'Đã giao' : 'Đã hủy'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 font-bold mb-4 uppercase tracking-tighter">{new Date(order.timestamp).toLocaleString('vi-VN')}</p>
                                        
                                        <div className="text-sm bg-[#FAFAFA] p-6 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Người nhận hàng</p>
                                                <p className="text-slate-800 font-bold">{order.shippingName}</p>
                                                <p className="text-slate-500 text-xs font-medium">{order.shippingPhone}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Địa chỉ giao hàng</p>
                                                <p className="text-slate-500 text-xs leading-relaxed font-medium">{order.shippingAddress}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full lg:w-48 text-left lg:text-right shrink-0">
                                         <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Phương thức</p>
                                         <p className="text-xs font-black text-slate-700 mb-4">{order.paymentMethod === 'BANK_TRANSFER' ? 'CHUYỂN KHOẢN QR' : 'TIỀN MẶT (COD)'}</p>
                                         <button className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest border border-[#D4AF37]/20 px-4 py-2 rounded-xl hover:bg-[#D4AF37] hover:text-white transition-all">Chi tiết hoá đơn</button>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row items-center gap-8">
                                    <div className="w-32 h-40 bg-slate-50 rounded-2xl overflow-hidden shadow-inner flex-shrink-0 border border-slate-100 flex items-center justify-center">
                                        <PackageIcon className="w-12 h-12 text-slate-100"/>
                                    </div>
                                    <div className="flex-1 text-center md:text-left w-full">
                                        <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-3">{order.productName}</h4>
                                        <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                                            {order.productSize && (
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-1 rounded-lg uppercase">S: {order.productSize}</span>
                                            )}
                                            {order.productColor && (
                                                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-1 rounded-lg uppercase">M: {order.productColor}</span>
                                            )}
                                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-1 rounded-lg uppercase">SL: x{order.quantity}</span>
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8 justify-center md:justify-start">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tạm tính</span>
                                                <span className="text-slate-600 font-bold">{new Intl.NumberFormat('vi-VN').format(order.totalPrice - (order.shippingFee || 0))}₫</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phí vận chuyển</span>
                                                <span className="text-emerald-600 font-bold">{(order.shippingFee || 0) === 0 ? 'FREE' : new Intl.NumberFormat('vi-VN').format(order.shippingFee || 0) + '₫'}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Tổng thanh toán</span>
                                                <span className="text-3xl font-black text-[#111827] tracking-tighter">{new Intl.NumberFormat('vi-VN').format(order.totalPrice)}₫</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>

            <Footer isAdminLinkVisible={isAdminLinkVisible} />
            
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(15px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

// Re-import icon to avoid usage error
const UserIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default MyOrdersPage;
