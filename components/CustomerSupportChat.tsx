
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

    // 1. Khởi tạo phiên và âm thanh
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        const timer = setTimeout(() => {
            if (!isOpen) setShowTooltip(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // 2. Lắng nghe sự kiện mở chat từ Header (SỬA LỖI KHÔNG PHẢN HỒI)
    useEffect(() => {
        const handleOpenChat = (e: any) => {
            console.log("Sigma Vie Event: Mở Live Chat trung tâm...");
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
            // Đợi UI render xong rồi mới scroll
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        };

        window.addEventListener('sigma_vie_open_chat', handleOpenChat);
        return () => window.removeEventListener('sigma_vie_open_chat', handleOpenChat);
    }, []);

    // 3. Tự động cập nhật tin nhắn
    useEffect(() => {
        const currentUser = getCurrentCustomer();
        setUser(currentUser);

        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            interval = setInterval(() => loadMessages(sessionId), 4000);
        } else {
            interval = setInterval(() => loadMessages(sessionId), 10000);
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
                
                if (formatted.length > messages.length && formatted[formatted.length-1].senderRole === 'admin') {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                    if (!isOpen) setShowTooltip(true);
                }
                setMessages(formatted);
            }
        } catch (e) {
            console.error("Chat sync error:", e);
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
        /* VỊ TRÍ CHIẾN LƯỢC: CHÍNH GIỮA CUỐI MÀN HÌNH */
        <div className="fixed bottom-0 left-0 right-0 z-[9999999] flex flex-col items-center pointer-events-none pb-10">
            
            {/* Cửa sổ chat (Xuất hiện phía trên nút) */}
            {isOpen && (
                <div className="bg-white w-[95vw] sm:w-[450px] h-[550px] max-h-[70vh] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex flex-col mb-6 overflow-hidden border border-slate-200 animate-slide-up-center pointer-events-auto">
                    {/* Header Chat */}
                    <div className="bg-[#111827] text-white p-6 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#B4975A] rounded-xl flex items-center justify-center font-black text-white shadow-lg text-xl">Σ</div>
                            <div>
                                <h3 className="font-black text-xs tracking-widest uppercase">Sigma Vie Support</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Đang Online</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500/20 text-white p-2 rounded-full transition-all">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Tin nhắn */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FAFAFA] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-10 opacity-20">
                                <MessageSquareIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Bắt đầu trò chuyện với chúng tôi</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[13px] shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                }`}>
                                    <p className="font-bold leading-relaxed">{msg.text}</p>
                                    <div className={`flex items-center gap-1.5 mt-1.5 opacity-40 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[8px] font-black uppercase">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập tin nhắn..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-5 py-3 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white p-4 rounded-xl shadow-lg disabled:opacity-20 active:scale-90 transition-all">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT KÍCH HOẠT CHÍNH - LUÔN NẰM GIỮA ĐÁY */}
            <div className="relative pointer-events-auto group">
                {showTooltip && !isOpen && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 bg-[#B4975A] text-white px-6 py-3 rounded-full shadow-2xl animate-bounce border-2 border-white/50 whitespace-nowrap">
                        <p className="text-[10px] font-black uppercase tracking-widest">Sigma Vie đang trực tuyến. Chat ngay?</p>
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#B4975A] rotate-45"></div>
                    </div>
                )}
                
                <button 
                    onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                    className={`flex items-center justify-center w-20 h-20 rounded-full shadow-[0_15px_50px_rgba(0,0,0,0.4)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white overflow-hidden relative
                        ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-[#111827] animate-pulse-glow'}`}
                >
                    {isOpen ? <XIcon className="w-8 h-8 text-white" /> : <MessageSquareIcon className="w-8 h-8 text-[#B4975A]" />}
                    
                    {/* Thông báo tin nhắn chưa đọc */}
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute top-4 right-4 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#111827] animate-ping"></span>
                    )}
                </button>
                
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-opacity">Hỗ trợ trực tiếp</span>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0.4), 0 15px 50px rgba(0,0,0,0.4); }
                    70% { box-shadow: 0 0 0 25px rgba(180, 151, 90, 0), 0 15px 50px rgba(0,0,0,0.4); }
                    100% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0), 0 15px 50px rgba(0,0,0,0.4); }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 2.5s infinite;
                }

                .animate-slide-up-center {
                    animation: slideUpCenter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideUpCenter {
                    from { opacity: 0; transform: translateY(40px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fadeInUpMsg 0.4s ease-out forwards;
                }
                @keyframes fadeInUpMsg {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
