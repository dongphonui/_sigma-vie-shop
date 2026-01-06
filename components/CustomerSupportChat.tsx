
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
    /* // Fix: Added hasUnreadChat state to track if there are new admin messages while chat is closed */
    const [hasUnreadChat, setHasUnreadChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 1. Khởi tạo
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

    // 2. Sự kiện mở từ ngoài (Header)
    useEffect(() => {
        const handleForceOpen = (e: any) => {
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) setInputValue(e.detail.message);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 400);
        };
        window.addEventListener('sigma_vie_open_chat', handleForceOpen);
        return () => window.removeEventListener('sigma_vie_open_chat', handleForceOpen);
    }, []);

    // 3. Đồng bộ tin nhắn
    useEffect(() => {
        const currentUser = getCurrentCustomer();
        setUser(currentUser);

        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            /* // Fix: Reset unread notification when chat box is opened */
            setHasUnreadChat(false);
            interval = setInterval(() => loadMessages(sessionId), 4000);
        } else {
            interval = setInterval(() => loadMessages(sessionId), 15000);
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
                    if (!isOpen) {
                        setShowTooltip(true);
                        /* // Fix: Enable unread badge when a new message arrives from admin while chat is closed */
                        setHasUnreadChat(true);
                    }
                }
                setMessages(formatted);
            }
        } catch (e) {}
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
        /* VỊ TRÍ TUYỆT ĐỐI CHÍNH GIỮA MÀN HÌNH - BOTTOM 12 ĐỂ KHÔNG BỊ CHE KHUẤT */
        <div 
            className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[999999999] flex flex-col items-center pointer-events-none w-full max-w-[95vw] sm:max-w-[450px]"
            id="sigma-support-container"
        >
            {/* Tooltip */}
            {showTooltip && !isOpen && (
                <div className="bg-[#111827] text-white px-6 py-3 rounded-2xl shadow-2xl mb-6 animate-bounce pointer-events-auto border-2 border-[#D4AF37] whitespace-nowrap relative">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sigma Vie Concierge đang online ✨</p>
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111827] rotate-45 border-r-2 border-b-2 border-[#D4AF37]"></div>
                </div>
            )}

            {/* Box Chat */}
            {isOpen && (
                <div className="bg-white w-full h-[600px] max-h-[75vh] rounded-[3rem] shadow-[0_60px_150px_-20px_rgba(0,0,0,0.5)] flex flex-col mb-6 overflow-hidden border border-slate-100 animate-slide-up-luxury pointer-events-auto ring-1 ring-black/5">
                    <div className="bg-[#111827] text-white p-8 flex justify-between items-center shrink-0 border-b border-white/5">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-gradient-to-tr from-[#B4975A] to-[#D4AF37] rounded-2xl flex items-center justify-center font-black text-white shadow-2xl text-2xl">Σ</div>
                            <div>
                                <h3 className="font-black text-[12px] tracking-[0.3em] uppercase">Sigma Concierge</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Chuyên viên trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500/20 text-white p-3 rounded-full transition-all">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#FAFAFA] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-20 opacity-20">
                                <MessageSquareIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Chào mừng quý khách đến với Sigma Vie</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] px-6 py-4 rounded-[1.8rem] text-[13px] shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <p className="font-bold leading-relaxed">{msg.text}</p>
                                    <p className={`text-[8px] font-black uppercase mt-2 opacity-40 ${msg.senderRole === 'customer' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-slate-50 flex items-center gap-4 shrink-0">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Gửi yêu cầu của quý khách..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-7 py-4 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white p-5 rounded-2xl shadow-xl disabled:opacity-20 active:scale-90 transition-all">
                            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT KÍCH HOẠT - CĂN GIỮA - TO HƠN */}
            <div className="relative pointer-events-auto group">
                <button 
                    onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                    className={`flex items-center justify-center w-24 h-24 rounded-full shadow-[0_25px_60px_-10px_rgba(0,0,0,0.5)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white overflow-hidden relative
                        ${isOpen ? 'bg-rose-500 rotate-90 shadow-rose-200' : 'bg-[#111827] animate-pulse-luxury'}`}
                >
                    {isOpen ? <XIcon className="w-10 h-10 text-white" /> : <MessageSquareIcon className="w-10 h-10 text-[#B4975A]" />}
                    
                    {/* Notification Badge Giả định */}
                    {!isOpen && hasUnreadChat && (
                         <span className="absolute top-5 right-5 w-5 h-5 bg-rose-500 rounded-full border-2 border-white shadow-lg animate-bounce flex items-center justify-center text-[10px] font-black text-white">1</span>
                    )}
                </button>
                
                {!isOpen && (
                    <div className="absolute top-full mt-4 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] whitespace-nowrap opacity-40 group-hover:opacity-100 transition-opacity">
                        Hỗ trợ VIP
                    </div>
                )}
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                
                @keyframes pulse-luxury {
                    0% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0.6), 0 25px 60px -10px rgba(0,0,0,0.5); }
                    70% { box-shadow: 0 0 0 40px rgba(180, 151, 90, 0), 0 25px 60px -10px rgba(0,0,0,0.5); }
                    100% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0), 0 25px 60px -10px rgba(0,0,0,0.5); }
                }
                .animate-pulse-luxury {
                    animation: pulse-luxury 2s infinite;
                }

                @keyframes slideUpLuxury {
                    from { opacity: 0; transform: translateY(80px) scale(0.8); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-slide-up-luxury {
                    animation: slideUpLuxury 0.7s cubic-bezier(0.19, 1, 0.22, 1) forwards;
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
