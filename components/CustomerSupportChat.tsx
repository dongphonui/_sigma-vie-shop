
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

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        const timer = setTimeout(() => {
            if (!isOpen && messages.length === 0) {
                setShowTooltip(true);
            }
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleOpenChat = (e: any) => {
            console.log("Kích hoạt Live Chat Sigma Vie từ Hệ thống...");
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 600);
        };

        window.addEventListener('sigma_vie_open_chat', handleOpenChat);
        return () => window.removeEventListener('sigma_vie_open_chat', handleOpenChat);
    }, []);

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
            console.error("Chat Error:", e);
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
        /* VỊ TRÍ MỚI: CHÍNH GIỮA CUỐI MÀN HÌNH */
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[999999] flex flex-col items-center font-sans pointer-events-none w-full max-w-lg">
            
            {/* Tooltip Gợi ý (Nằm trên nút giữa) */}
            {showTooltip && !isOpen && (
                <div className="bg-[#B4975A] text-white px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(180,151,90,0.5)] mb-6 animate-bounce-slow relative pointer-events-auto border-2 border-white/30 whitespace-nowrap">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-[#111827] p-1 rounded-full text-white shadow-lg">
                        <XIcon className="w-3 h-3" />
                    </button>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">
                        {user ? `Chào ${user.fullName.split(' ').pop()}, Sigma Vie đang đợi bạn!` : 'Quý khách cần tư vấn trực tiếp ngay bây giờ?'}
                    </p>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#B4975A] border-r border-b border-white/10 rotate-45"></div>
                </div>
            )}

            {/* Cửa sổ chat (Căn giữa) */}
            {isOpen && (
                <div className="bg-white w-[94vw] sm:w-[450px] h-[600px] max-h-[75vh] rounded-[3rem] shadow-[0_50px_120px_rgba(0,0,0,0.6)] flex flex-col mb-6 overflow-hidden border border-slate-100 animate-slide-up-center pointer-events-auto ring-1 ring-black/5">
                    {/* Header Sang Trọng */}
                    <div className="bg-[#111827] text-white p-8 flex justify-between items-center relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-[#B4975A] rounded-2xl flex items-center justify-center font-black text-white shadow-2xl text-3xl border-b-4 border-black/20">Σ</div>
                            <div>
                                <h3 className="font-black text-sm tracking-[0.3em] uppercase">Sigma Vie Care</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(52,211,153,1)]"></span>
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Đang trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/5 hover:bg-rose-500/20 text-white p-4 rounded-full transition-all group">
                            <XIcon className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                        </button>
                    </div>

                    {/* Vùng tin nhắn */}
                    <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#FDFDFD] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-16 opacity-30">
                                <MessageSquareIcon className="w-16 h-16 mx-auto mb-6 text-slate-200" />
                                <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 leading-loose">Khởi đầu trải nghiệm<br/>mua sắm đẳng cấp</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`max-w-[85%] px-7 py-5 rounded-[2rem] text-sm shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <p className="leading-relaxed font-bold">{msg.text}</p>
                                    <div className={`flex items-center gap-2 mt-3 opacity-40 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[9px] uppercase font-black tracking-widest">
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
                    <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-slate-50 flex items-center gap-5 shrink-0">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Gửi yêu cầu hỗ trợ..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-8 py-5 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold shadow-inner"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputValue.trim()} 
                            className="bg-[#111827] text-white p-6 rounded-2xl hover:scale-110 active:scale-90 transition-all shadow-2xl disabled:opacity-20 group"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT KÍCH HOẠT CHÍNH - ĐẶT GIỮA MÀN HÌNH */}
            <button 
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                className={`group flex items-center justify-center bg-[#111827] text-white w-20 h-20 rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.6)] transition-all transform hover:scale-110 active:scale-95 border-[6px] border-white pointer-events-auto relative ${isOpen ? 'rotate-90' : 'animate-pulse-gold'}`}
                title="Live Chat hỗ trợ"
            >
                <div className="relative">
                    {isOpen ? <XIcon className="w-8 h-8" /> : <MessageSquareIcon className="w-8 h-8 text-[#B4975A]" />}
                    
                    {/* Badge thông báo màu đỏ */}
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute -top-3 -right-3 w-7 h-7 bg-rose-500 rounded-full border-4 border-[#111827] flex items-center justify-center text-[10px] font-black animate-bounce shadow-xl">!</span>
                    )}
                </div>
                
                {/* Text nhãn ẩn hiện khi hover */}
                {!isOpen && (
                    <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full whitespace-nowrap shadow-2xl">Live Chat</span>
                )}
            </button>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 20px; }
                
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-15px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s infinite ease-in-out;
                }

                @keyframes pulse-gold {
                    0% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0.6); transform: scale(1); }
                    70% { box-shadow: 0 0 0 30px rgba(180, 151, 90, 0); transform: scale(1.05); }
                    100% { box-shadow: 0 0 0 0 rgba(180, 151, 90, 0); transform: scale(1); }
                }
                .animate-pulse-gold {
                    animation: pulse-gold 2.5s infinite;
                }

                .animate-slide-up-center {
                    animation: slideUpCenter 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideUpCenter {
                    from { opacity: 0; transform: translateY(50px) scale(0.8); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up {
                    animation: fadeInUpMsg 0.5s ease-out forwards;
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
