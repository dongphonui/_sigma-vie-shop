
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

    // 1. Khởi tạo và thiết lập phiên
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        // Hiện tooltip mời gọi sau 2 giây
        const timer = setTimeout(() => {
            if (!isOpen && messages.length === 0) {
                setShowTooltip(true);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    // 2. LẮNG NGHE SỰ KIỆN TỪ HEADER (Mở chat khi khách bấm Menu)
    useEffect(() => {
        const handleOpenChat = (e: any) => {
            console.log("Hệ thống Sigma Vie: Đang mở cửa sổ Live Chat...");
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
            // Đảm bảo cuộn xuống tin nhắn mới nhất
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        };

        window.addEventListener('sigma_vie_open_chat', handleOpenChat);
        return () => window.removeEventListener('sigma_vie_open_chat', handleOpenChat);
    }, []);

    // 3. Đồng bộ hóa tin nhắn
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
            console.error("Lỗi đồng bộ Chat:", e);
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
        /* Vị trí Fixed: Cách phải 112px (right-28) để không trùng với Bot AI Gemini */
        <div className="fixed bottom-6 right-6 sm:right-28 z-[100000] flex flex-col items-end font-sans pointer-events-none">
            
            {/* 1. Bong bóng mời gọi (Tooltip) */}
            {showTooltip && !isOpen && (
                <div className="bg-[#B4975A] text-white px-6 py-4 rounded-2xl shadow-2xl mb-4 animate-bounce-slow max-w-[280px] relative pointer-events-auto border border-white/20">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-[#111827] p-1 rounded-full text-white shadow-lg">
                        <XIcon className="w-3 h-3" />
                    </button>
                    <p className="text-[11px] font-black uppercase tracking-tighter leading-tight">
                        {user ? `Chào ${user.fullName.split(' ').pop()}, chúng tôi đang online. Bạn cần tư vấn size không?` : 'Sigma Vie xin chào! Chúng tôi đang online để hỗ trợ Quý khách.'}
                    </p>
                    <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#B4975A] border-r border-b border-white/10 rotate-45"></div>
                </div>
            )}

            {/* 2. Cửa sổ chat chính */}
            {isOpen && (
                <div className="bg-white w-[92vw] sm:w-[420px] h-[650px] max-h-[85vh] rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up pointer-events-auto ring-1 ring-black/5">
                    {/* Header */}
                    <div className="bg-[#111827] text-white p-7 flex justify-between items-center relative overflow-hidden">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 bg-[#B4975A] rounded-2xl flex items-center justify-center font-black text-white shadow-xl text-2xl border-b-4 border-black/20">Σ</div>
                            <div>
                                <h3 className="font-black text-sm tracking-widest uppercase">Cố vấn Sigma Vie</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,1)]"></span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Đang trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Vùng tin nhắn */}
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FDFDFD] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-20 px-10">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <MessageSquareIcon className="w-8 h-8 text-slate-200" />
                                </div>
                                <p className="text-sm text-slate-300 font-bold italic mb-4">Chào mừng Quý khách đến với dịch vụ tư vấn trực tiếp.</p>
                                <div className="h-[1px] w-12 bg-slate-100 mx-auto mb-4"></div>
                                <p className="text-[10px] text-[#B4975A] uppercase font-black tracking-[0.3em]">Sigma Vie hân hạnh phục vụ</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`max-w-[85%] px-6 py-4 rounded-3xl text-[13px] shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none shadow-amber-900/10' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none shadow-slate-200/50'
                                }`}>
                                    <p className="leading-relaxed font-bold">{msg.text}</p>
                                    <div className={`flex items-center gap-1.5 mt-2 opacity-40 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[8px] uppercase font-black tracking-tighter">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {msg.senderRole === 'customer' && <CheckIcon className="w-3 h-3" />}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Ô nhập liệu */}
                    <form onSubmit={handleSendMessage} className="p-7 bg-white border-t border-slate-50 flex items-center gap-4">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập yêu cầu của bạn..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold placeholder:text-slate-300"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputValue.trim()} 
                            className="bg-[#111827] text-white p-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20 group"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* 3. NÚT KÍCH HOẠT CHÍNH (FLOATING BUTTON) */}
            <button 
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                className={`group flex items-center gap-4 bg-[#B4975A] text-white pr-10 pl-6 py-6 rounded-full shadow-[0_30px_80px_rgba(180,151,90,0.4)] transition-all transform hover:scale-110 active:scale-90 border-4 border-white pointer-events-auto ${isOpen ? 'rotate-90 ring-4 ring-[#B4975A]/30' : 'animate-pulse-gold'}`}
                title="Live Chat hỗ trợ"
            >
                <div className="relative">
                    <MessageSquareIcon className="w-8 h-8" />
                    {/* Chấm đỏ báo tin nhắn mới */}
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-[#B4975A] animate-ping"></span>
                    )}
                </div>
                {!isOpen && <span className="text-[11px] font-black uppercase tracking-[0.3em] whitespace-nowrap">Live Chat</span>}
            </button>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
                
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }

                @keyframes pulse-gold {
                    0% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(180, 151, 90, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0); }
                }
                .animate-pulse-gold {
                    animation: pulse-gold 2s infinite;
                }

                .animate-float-up {
                    animation: floatUpChat 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes floatUpChat {
                    from { opacity: 0; transform: translateY(30px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
