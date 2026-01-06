
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

    // 1. Khởi tạo session và âm thanh
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        // Hiện tooltip gợi ý sau 4 giây nếu khách chưa mở chat
        const timer = setTimeout(() => {
            if (!isOpen) setShowTooltip(true);
        }, 4000);

        return () => clearTimeout(timer);
    }, [isOpen]);

    // 2. Lắng nghe sự kiện click từ Header
    useEffect(() => {
        const handleOpenEvent = (e: any) => {
            console.log("Sigma Vie: Trigger mở Live Chat từ Header...");
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
            // Đợi UI render rồi cuộn xuống cuối
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        };

        window.addEventListener('sigma_vie_open_chat', handleOpenEvent);
        return () => window.removeEventListener('sigma_vie_open_chat', handleOpenEvent);
    }, []);

    // 3. Đồng bộ tin nhắn
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
                
                // Nếu có tin nhắn mới từ Admin
                if (formatted.length > messages.length && formatted[formatted.length-1].senderRole === 'admin') {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                    if (!isOpen) setShowTooltip(true);
                }
                setMessages(formatted);
            }
        } catch (e) {
            console.error("Chat sync failed");
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
        /* CONTAINER TỐI THƯỢNG - CĂN GIỮA CHÍNH XÁC */
        <div 
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100000000] flex flex-col items-center pointer-events-none w-full max-w-[95vw] sm:max-w-[450px]"
            id="sigma-live-chat-root"
        >
            {/* Tooltip Gợi ý */}
            {showTooltip && !isOpen && (
                <div className="bg-[#B4975A] text-white px-6 py-3 rounded-full shadow-2xl mb-6 animate-bounce pointer-events-auto border-2 border-white/30 whitespace-nowrap relative">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full text-[8px]">
                        <XIcon className="w-2.5 h-2.5" />
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-widest">Sigma Vie đang đợi bạn!</p>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#B4975A] rotate-45"></div>
                </div>
            )}

            {/* Hộp thoại Chat (Xuất hiện phía trên nút) */}
            {isOpen && (
                <div className="bg-white w-full h-[580px] max-h-[75vh] rounded-[2.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.4)] flex flex-col mb-6 overflow-hidden border border-slate-100 animate-slide-up-luxury pointer-events-auto ring-1 ring-black/5">
                    {/* Header Sang Trọng */}
                    <div className="bg-[#111827] text-white p-7 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-[#B4975A] to-[#D4AF37] rounded-2xl flex items-center justify-center font-black text-white shadow-xl text-2xl">Σ</div>
                            <div>
                                <h3 className="font-black text-[11px] tracking-[0.2em] uppercase">Sigma Vie Concierge</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500/20 text-white p-3 rounded-full transition-all">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Vùng Tin nhắn */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-7 bg-[#FDFDFD] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-16 opacity-30">
                                <MessageSquareIcon className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Khởi đầu trải nghiệm mua sắm</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[13px] shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <p className="font-bold leading-relaxed">{msg.text}</p>
                                    <div className={`flex items-center gap-2 mt-2 opacity-40 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[8px] font-black uppercase tracking-tighter">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Ô nhập liệu */}
                    <form onSubmit={handleSendMessage} className="p-7 bg-white border-t border-slate-50 flex items-center gap-4 shrink-0">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập yêu cầu tư vấn..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-6 py-4 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputValue.trim()} 
                            className="bg-[#111827] text-white p-4 rounded-xl shadow-lg disabled:opacity-20 active:scale-90 transition-all group"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT BẤM KÍCH HOẠT - CĂN GIỮA TUYỆT ĐỐI */}
            <div className="relative pointer-events-auto">
                <button 
                    onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                    className={`group flex items-center justify-center w-20 h-20 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white overflow-hidden relative
                        ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-[#111827] animate-pulse-aura'}`}
                    title="Live Chat hỗ trợ"
                >
                    {isOpen ? <XIcon className="w-8 h-8 text-white" /> : <MessageSquareIcon className="w-8 h-8 text-[#B4975A]" />}
                    
                    {/* Badge tin nhắn mới */}
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute top-4 right-4 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#111827] animate-ping"></span>
                    )}
                </button>
                
                {/* Nhãn văn bản dưới nút */}
                {!isOpen && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] whitespace-nowrap opacity-60">
                        Chat hỗ trợ
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                
                @keyframes pulse-aura {
                    0% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0.5), 0 20px 50px rgba(0,0,0,0.4); }
                    70% { box-shadow: 0 0 0 30px rgba(180, 151, 90, 0), 0 20px 50px rgba(0,0,0,0.4); }
                    100% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0), 0 20px 50px rgba(0,0,0,0.4); }
                }
                .animate-pulse-aura {
                    animation: pulse-aura 2.5s infinite;
                }

                @keyframes slideUpLuxury {
                    from { opacity: 0; transform: translateY(60px) scale(0.85); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-slide-up-luxury {
                    animation: slideUpLuxury 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
