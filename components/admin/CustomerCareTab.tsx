
import React, { useState, useEffect, useMemo } from 'react';
import type { Customer, Order } from '../../types';
import { getCustomers } from '../../utils/customerStorage';
import { getOrders } from '../../utils/orderStorage';
import { GiftIcon, UserIcon, MessageSquareIcon, SparklesIcon, SearchIcon } from '../Icons';

interface BirthdayCustomer extends Customer {
    segment: 'Premium' | 'Potential' | 'Regular';
    totalSpending: number;
}

const CustomerCareTab: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setCustomers(getCustomers());
        setOrders(getOrders());
    }, []);

    // Phân khúc khách hàng dựa trên chi tiêu (Giống ReportsTab)
    const birthdayData = useMemo(() => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        // 1. Tính chi tiêu của từng khách hàng
        const spendingMap = new Map<string, number>();
        orders.forEach(o => {
            if (o.status !== 'CANCELLED') {
                const current = spendingMap.get(o.customerId) || 0;
                spendingMap.set(o.customerId, current + o.totalPrice);
            }
        });

        // 2. Lọc khách hàng có sinh nhật hôm nay
        return customers.filter(c => {
            if (!c.dob) return false;
            // dob format yyyy-mm-dd hoặc dd/mm/yyyy
            let birthMonth, birthDay;
            if (c.dob.includes('-')) {
                const parts = c.dob.split('-');
                birthMonth = parseInt(parts[1]);
                birthDay = parseInt(parts[2]);
            } else if (c.dob.includes('/')) {
                const parts = c.dob.split('/');
                birthMonth = parseInt(parts[1]);
                birthDay = parseInt(parts[0]);
            }
            return birthMonth === currentMonth && birthDay === currentDay;
        }).map(c => {
            const spending = spendingMap.get(c.id) || 0;
            let segment: 'Premium' | 'Potential' | 'Regular' = 'Regular';
            if (spending > 5000000) segment = 'Premium';
            else if (spending >= 1000000) segment = 'Potential';

            return {
                ...c,
                totalSpending: spending,
                segment
            } as BirthdayCustomer;
        });
    }, [customers, orders]);

    const filteredBirthdayData = birthdayData.filter(c => 
        c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phoneNumber?.includes(searchQuery)
    );

    const getPolicySuggestion = (segment: string) => {
        switch(segment) {
            case 'Premium': return {
                badge: 'VVIP Policy',
                text: 'Tặng Voucher 1.000.000đ + Giao hoa tận nhà + Giảm 20% đơn kế tiếp.',
                color: 'bg-amber-100 text-amber-700 border-amber-200'
            };
            case 'Potential': return {
                badge: 'Silver Policy',
                text: 'Tặng Voucher 500.000đ + Miễn phí vận chuyển trọn đời tháng sinh nhật.',
                color: 'bg-blue-100 text-blue-700 border-blue-200'
            };
            default: return {
                badge: 'Member Policy',
                text: 'Giảm giá 15% toàn bộ sản phẩm + Tặng 1 phụ kiện Sigma Vie.',
                color: 'bg-slate-100 text-slate-700 border-slate-200'
            };
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header Thống kê nhanh */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6 group hover:shadow-lg transition-all">
                    <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                        <GiftIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sinh nhật hôm nay</p>
                        <p className="text-3xl font-black text-[#111827]">{birthdayData.length}</p>
                    </div>
                </div>

                <div className="bg-[#111827] p-8 rounded-[2rem] shadow-xl text-white flex items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <SparklesIcon className="w-16 h-16" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Lời nhắc quan trọng</p>
                        <p className="text-sm font-bold text-slate-300 leading-relaxed">Đừng quên gửi lời chúc đến các khách hàng Premium để duy trì sự gắn kết thương hiệu.</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
                        <ActivityIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tháng này còn lại</p>
                        <p className="text-3xl font-black text-[#111827]">
                            {customers.filter(c => {
                                if (!c.dob) return false;
                                const month = parseInt(c.dob.includes('-') ? c.dob.split('-')[1] : c.dob.split('/')[1]);
                                return month === (new Date().getMonth() + 1);
                            }).length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bảng danh sách sinh nhật */}
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Danh sách sinh nhật hôm nay</h3>
                        <p className="text-xs text-slate-400 font-medium">Hệ thống tự động cập nhật dựa trên dữ liệu thành viên</p>
                    </div>
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm khách hàng..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-3 bg-slate-50 border-2 border-slate-50 rounded-full text-sm font-bold focus:border-[#D4AF37] focus:bg-white outline-none transition-all w-full md:w-80"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Khách hàng</th>
                                <th className="px-8 py-5">Phân khúc</th>
                                <th className="px-8 py-5">Chi tiêu lũy kế</th>
                                <th className="px-8 py-5">Gợi ý chính sách ưu đãi</th>
                                <th className="px-8 py-5 text-right">Tương tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredBirthdayData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="opacity-20 mb-4">
                                            <GiftIcon className="w-16 h-16 mx-auto" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Hôm nay không có sinh nhật nào</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredBirthdayData.map(cust => {
                                    const policy = getPolicySuggestion(cust.segment);
                                    return (
                                        <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex-shrink-0">
                                                        {cust.avatarUrl ? (
                                                            <img src={cust.avatarUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-[#111827] flex items-center justify-center text-white text-xs font-black">
                                                                {cust.fullName.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{cust.fullName}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{cust.phoneNumber}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border 
                                                    ${cust.segment === 'Premium' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                                      cust.segment === 'Potential' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                                                      'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                    {cust.segment}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <p className="font-black text-slate-700">{new Intl.NumberFormat('vi-VN').format(cust.totalSpending)}₫</p>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`p-4 rounded-2xl border text-xs leading-relaxed max-w-sm ${policy.color}`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <SparklesIcon className="w-3 h-3" />
                                                        <span className="font-black uppercase tracking-tighter">{policy.badge}</span>
                                                    </div>
                                                    <p className="font-medium">{policy.text}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-[#D4AF37] hover:text-white transition-all shadow-sm" title="Chat hỗ trợ">
                                                        <MessageSquareIcon className="w-4 h-4" />
                                                    </button>
                                                    <button className="bg-[#111827] text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95">
                                                        Gửi quà tặng
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// Re-use icon missing locally
const ActivityIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
);

export default CustomerCareTab;
