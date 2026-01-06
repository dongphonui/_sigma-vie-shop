
import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, Customer } from '../types';
import { sendChatMessage, fetchChatMessages, markChatAsRead } from '../utils/apiClient';
import { getCurrentCustomer } from '../utils/customerStorage';
import { MessageSquareIcon, XIcon } from './Icons';

const CustomerSupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [user, setUser] = useState<Customer | null>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [hasUnreadChat, setHasUnreadChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Khởi tạo & Cấu hình session
    useEffect(() => {
        console.log("Sigma Vie Support Chat: Mounting...");
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        // Hiển thị lời chào sau 2 giây
        const timer = setTimeout(() => {
            if (!isOpen) setShowTooltip(true);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // 2. Lắng nghe sự kiện "Mở Chat" từ bất kỳ đâu (Ví dụ từ Header hoặc Modal Sản phẩm)
    useEffect(() => {
        const handleForceOpen = (e: any) => {
            console.log("Sigma Vie Support Chat: Trigger Open Event received!");
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) setInputValue(e.detail.message);
            
            // Cuộn xuống tin nhắn mới nhất
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        };

        window.addEventListener('sigma_vie_open_chat', handleForceOpen);
        return () => window.removeEventListener('sigma_vie_open_chat', handleForceOpen);
    }, []);

    // 3. Đồng bộ tin nhắn liên tục
    useEffect(() => {
        const currentUser = getCurrentCustomer();
        setUser(currentUser);

        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            setHasUnreadChat(false);
            interval = setInterval(() => loadMessages(sessionId), 4000);
        } else {
            // Khi đóng vẫn check tin nhắn mới để hiện Badge đỏ
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
                
                // Nếu có tin nhắn mới từ Admin mà chat đang đóng
                if (formatted.length > messages.length) {
                    const lastMsg = formatted[formatted.length-1];
                    if (lastMsg.senderRole === 'admin') {
                        if (audioRef.current) audioRef.current.play().catch(() => {});
                        if (!isOpen) {
                            setHasUnreadChat(true);
                            setShowTooltip(true);
                        }
                    }
                }
                setMessages(formatted);
            }
        } catch (e) {
            console.error("Chat Sync Error:", e);
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
        /* VỊ TRÍ MỚI: GÓC PHẢI DƯỚI (PHÍA TRÊN BOT AI) - ĐẢM BẢO KHÔNG BỊ CHE KHUẤT */
        <div 
            className="fixed bottom-24 right-6 sm:right-10 z-[2147483647] flex flex-col items-end pointer-events-none"
            id="sigma-support-v2-root"
        >
            {/* Tooltip Gợi Ý */}
            {showTooltip && !isOpen && (
                <div className="bg-[#111827] text-white px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] mb-4 animate-bounce pointer-events-auto border-2 border-[#D4AF37] max-w-[280px] relative">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full text-[8px] border border-white">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">
                        Sigma Vie đã sẵn sàng hỗ trợ quý khách! ✨
                    </p>
                    <div className="absolute -bottom-1.5 right-8 w-4 h-4 bg-[#111827] rotate-45 border-r-2 border-b-2 border-[#D4AF37]"></div>
                </div>
            )}

            {/* Hộp thoại Chat */}
            {isOpen && (
                <div className="bg-white w-[90vw] sm:w-[400px] h-[550px] max-h-[70vh] rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-slide-up-luxury pointer-events-auto ring-1 ring-black/5">
                    {/* Header Sang Trọng */}
                    <div className="bg-[#111827] text-white p-6 flex justify-between items-center shrink-0 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#B4975A] to-[#D4AF37] rounded-xl flex items-center justify-center font-black text-white shadow-xl text-xl">Σ</div>
                            <div>
                                <h3 className="font-black text-[11px] tracking-[0.3em] uppercase">Sigma Concierge</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Trực tuyến hỗ trợ</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500/20 text-white p-2.5 rounded-full transition-all">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Vùng Tin nhắn */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAFA] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-20 opacity-30">
                                <MessageSquareIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] leading-loose">Quý khách cần tư vấn về size<br/>hoặc chất liệu?</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-[13px] shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <p className="font-bold leading-relaxed">{msg.text}</p>
                                    <p className={`text-[8px] font-black uppercase mt-1.5 opacity-40 ${msg.senderRole === 'customer' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Ô nhập liệu */}
                    <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập yêu cầu của quý khách..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-5 py-3.5 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white p-4 rounded-xl shadow-lg disabled:opacity-20 active:scale-90 transition-all">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT BẤM KÍCH HOẠT - GÓC PHẢI - RỰC RỠ NHẤT */}
            <div className="relative pointer-events-auto group">
                <button 
                    onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); setHasUnreadChat(false); }} 
                    className={`flex items-center justify-center w-20 h-20 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white overflow-hidden relative
                        ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-[#111827] animate-pulse-luxury'}`}
                >
                    {isOpen ? <XIcon className="w-9 h-9 text-white" /> : <MessageSquareIcon className="w-9 h-9 text-[#B4975A]" />}
                    
                    {/* Badge tin nhắn chưa đọc thực tế */}
                    {!isOpen && hasUnreadChat && (
                         <span className="absolute top-4 right-4 w-5 h-5 bg-rose-500 rounded-full border-2 border-white shadow-lg animate-bounce flex items-center justify-center text-[10px] font-black text-white">1</span>
                    )}
                </button>
                
                {!isOpen && (
                    <div className="absolute top-1/2 -left-32 -translate-y-1/2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        <div className="bg-white/90 backdrop-blur-md border border-slate-100 px-4 py-2 rounded-xl shadow-xl text-[10px] font-black text-[#111827] uppercase tracking-[0.2em] whitespace-nowrap">
                            Trò chuyện với Admin
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                
                @keyframes pulse-luxury {
                    0% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0.7), 0 20px 50px rgba(0,0,0,0.4); }
                    70% { box-shadow: 0 0 0 35px rgba(180, 151, 90, 0), 0 20px 50px rgba(0,0,0,0.4); }
                    100% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0), 0 20px 50px rgba(0,0,0,0.4); }
                }
                .animate-pulse-luxury {
                    animation: pulse-luxury 2s infinite;
                }

                @keyframes slideUpLuxury {
                    from { opacity: 0; transform: translateY(50px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-slide-up-luxury {
                    animation: slideUpLuxury 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
