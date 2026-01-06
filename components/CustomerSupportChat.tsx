
import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, Customer } from '../types';
import { sendChatMessage, fetchChatMessages, markChatAsRead } from '../utils/apiClient';
import { getCurrentCustomer } from '../utils/customerStorage';
import { MessageSquareIcon, XIcon, CheckIcon } from './Icons';

const CustomerSupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [user, setUser] = useState<Customer | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Khởi tạo phiên chat và âm thanh thông báo
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        // Hiển thị bóng bóng lời chào sau 4 giây nếu chưa mở chat
        const timer = setTimeout(() => {
            if (!isOpen && messages.length === 0) {
                setShowTooltip(true);
            }
        }, 4000);

        return () => clearTimeout(timer);
    }, []);

    // 2. LẮNG NGHE SỰ KIỆN MỞ CHAT TỪ CÁC COMPONENT KHÁC (MENU HEADER)
    useEffect(() => {
        const handleOpenChatEvent = (e: any) => {
            console.log("Hệ thống Sigma Vie: Đang mở Live Chat hỗ trợ...");
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
            // Ép buộc cuộn xuống sau khi UI render xong
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        };

        window.addEventListener('sigma_vie_open_chat', handleOpenChatEvent);
        return () => window.removeEventListener('sigma_vie_open_chat', handleOpenChatEvent);
    }, []);

    // 3. Quản lý tin nhắn và đồng bộ người dùng
    useEffect(() => {
        const currentUser = getCurrentCustomer();
        setUser(currentUser);

        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            interval = setInterval(() => loadMessages(sessionId), 4000);
        } else {
            interval = setInterval(() => loadMessages(sessionId), 12000);
        }
        return () => clearInterval(interval);
    }, [isOpen, sessionId]);

    const loadMessages = async (sid: string) => {
        if (!sid) return;
        try {
            const data = await fetchChatMessages(sid);
            if (data && Array.isArray(data)) {
                const formatted = data.map((m: any) => ({
                    id: m.id,
                    sessionId: m.session_id,
                    customerId: m.customer_id,
                    customerName: m.customer_name,
                    senderRole: m.sender_role,
                    text: m.text,
                    timestamp: Number(m.timestamp),
                    isRead: m.is_read
                }));
                
                // Phát âm thanh nếu có tin nhắn mới từ Admin
                if (formatted.length > messages.length && formatted[formatted.length-1].senderRole === 'admin') {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                    if (!isOpen) setShowTooltip(true);
                }
                
                setMessages(formatted);
            }
        } catch (e) {
            console.error("Lỗi tải tin nhắn chat:", e);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !sessionId) return;

        const newMessage: SupportMessage = {
            id: `MSG-${Date.now()}`,
            sessionId: sessionId,
            customerId: user?.id,
            customerName: user?.fullName || 'Khách vãng lai',
            senderRole: 'customer',
            text: inputValue,
            timestamp: Date.now(),
            isRead: false
        };

        const res = await sendChatMessage(newMessage);
        if (res && res.success) {
            setMessages(prev => [...prev, newMessage]);
            setInputValue('');
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    };

    return (
        /* Thay đổi: Dùng right-28 để lệch sang trái, tránh đè lên AI Bot ở right-6 */
        <div className="fixed bottom-6 right-6 sm:right-28 z-[9999] flex flex-col items-end font-sans pointer-events-none">
            {/* 1. Lời chào (Tooltip) */}
            {showTooltip && !isOpen && (
                <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-100 mb-4 animate-float-up max-w-[280px] relative pointer-events-auto">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-slate-100 p-1.5 rounded-full text-slate-400 hover:text-black shadow-md">
                        <XIcon className="w-3 h-3" />
                    </button>
                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                        {user ? `Chào ${user.fullName.split(' ').pop()}! Cố vấn Sigma Vie đang trực tuyến. Bạn cần tư vấn thêm về sản phẩm không?` : 'Kính chào Quý khách! Đội ngũ tư vấn Sigma Vie đã sẵn sàng hỗ trợ bạn.'}
                    </p>
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-slate-100 rotate-45"></div>
                </div>
            )}

            {/* 2. Cửa sổ chat chính */}
            {isOpen && (
                <div className="bg-white w-[92vw] sm:w-[400px] h-[600px] max-h-[85vh] rounded-[2.5rem] shadow-[0_40px_120px_rgba(0,0,0,0.4)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up pointer-events-auto">
                    {/* Header */}
                    <div className="bg-[#111827] text-white p-6 flex justify-between items-center relative">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#B4975A] rounded-2xl flex items-center justify-center font-black text-white shadow-lg border border-white/10 text-xl">Σ</div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight uppercase">Hỗ trợ Trực tuyến</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Tư vấn viên sẵn sàng</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F9F9F8] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-12 px-6">
                                <p className="text-sm text-slate-400 font-medium mb-3 italic">Chào mừng Quý khách đến với dịch vụ hỗ trợ ưu tiên.</p>
                                <div className="h-[1px] w-12 bg-slate-200 mx-auto mb-3"></div>
                                <p className="text-[10px] text-[#B4975A] uppercase font-black tracking-[0.2em]">Sigma Vie hân hạnh phục vụ</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none shadow-amber-900/10' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-slate-200/50'
                                }`}>
                                    <p className="leading-relaxed font-medium">{msg.text}</p>
                                    <div className={`flex items-center gap-1 mt-1.5 opacity-40 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[8px] uppercase font-black tracking-tighter">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.senderRole === 'customer' && <CheckIcon className="w-2.5 h-2.5" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Field */}
                    <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex items-center gap-3">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập yêu cầu tư vấn..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold placeholder:text-slate-300"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputValue.trim()} 
                            className="bg-[#111827] text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20 disabled:scale-100"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* 3. Nút kích hoạt nổi (Floating Button) */}
            <button 
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                className={`group flex items-center gap-3 bg-[#111827] text-white pr-8 pl-5 py-5 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.4)] transition-all transform hover:scale-110 active:scale-90 border-4 border-white pointer-events-auto ${isOpen ? 'rotate-90 ring-4 ring-[#B4975A]/20' : 'animate-bounce-subtle'}`}
            >
                <div className="relative">
                    <MessageSquareIcon className="w-6 h-6" />
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#111827] animate-ping"></span>
                    )}
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#111827]"></span>
                    )}
                </div>
                {!isOpen && <span className="text-[11px] font-black uppercase tracking-[0.3em]">{user ? 'Live Chat' : 'Hỗ trợ'}</span>}
            </button>

            <style>{`
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s infinite ease-in-out;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
