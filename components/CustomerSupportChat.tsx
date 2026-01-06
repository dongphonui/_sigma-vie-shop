
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

    // 1. Khởi tạo phiên và âm thanh thông báo
    useEffect(() => {
        // Âm thanh thông báo tin nhắn mới
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        // Tự động hiện gợi ý sau 3 giây nếu chưa mở chat
        const timer = setTimeout(() => {
            if (!isOpen && messages.length === 0) {
                setShowTooltip(true);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // 2. LẮNG NGHE SỰ KIỆN TỪ MENU HEADER HOẶC MODAL SẢN PHẨM
    useEffect(() => {
        const handleForceOpen = (e: any) => {
            console.log("Sigma Vie Event: Kích hoạt hiển thị hộp thoại Live Chat...");
            setIsOpen(true);
            setShowTooltip(false);
            
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
            
            // Đảm bảo giao diện cuộn xuống cuối cùng
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        };

        window.addEventListener('sigma_vie_open_chat', handleForceOpen);
        return () => window.removeEventListener('sigma_vie_open_chat', handleForceOpen);
    }, []);

    // 3. Theo dõi tin nhắn và đồng bộ người dùng
    useEffect(() => {
        const currentUser = getCurrentCustomer();
        setUser(currentUser);

        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            interval = setInterval(() => loadMessages(sessionId), 4000);
        } else {
            // Check tin nhắn mới định kỳ khi đang đóng
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
                
                // Nếu có tin nhắn mới từ ADMIN, phát âm thanh và hiện thông báo
                if (formatted.length > messages.length && formatted[formatted.length-1].senderRole === 'admin') {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                    if (!isOpen) setShowTooltip(true);
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
        /* Vị trí Fixed với z-index cực cao (99999) để đảm bảo luôn hiển thị trên cùng */
        <div className="fixed bottom-8 right-6 sm:right-32 z-[99999] flex flex-col items-end font-sans pointer-events-none">
            
            {/* Tooltip Chào mừng */}
            {showTooltip && !isOpen && (
                <div className="bg-[#111827] text-white px-6 py-4 rounded-2xl shadow-2xl mb-4 animate-float-up max-w-[280px] relative pointer-events-auto border border-white/10">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-rose-500 p-1 rounded-full text-white shadow-lg">
                        <XIcon className="w-3 h-3" />
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tư vấn trực tuyến</span>
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed">
                        {user ? `Chào ${user.fullName.split(' ').pop()}! Sigma Vie đang online, Quý khách cần hỗ trợ gì không?` : 'Kính chào Quý khách! Đội ngũ cố vấn Sigma Vie đã sẵn sàng hỗ trợ bạn.'}
                    </p>
                    <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#111827] border-r border-b border-white/10 rotate-45"></div>
                </div>
            )}

            {/* Cửa sổ Chat chính */}
            {isOpen && (
                <div className="bg-white w-[92vw] sm:w-[420px] h-[650px] max-h-[85vh] rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up pointer-events-auto ring-1 ring-black/5">
                    {/* Header sang trọng */}
                    <div className="bg-[#111827] text-white p-7 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                            <svg width="100%" height="100%"><pattern id="pattern-chat" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" /></pattern><rect width="100%" height="100%" fill="url(#pattern-chat)" /></svg>
                        </div>
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
                                <p className="text-sm text-slate-300 font-bold italic mb-4">"Phong cách là cách để nói bạn là ai mà không cần phải lên tiếng."</p>
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
                            className="bg-[#111827] text-white p-5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20 disabled:scale-100 group"
                        >
                            <svg className="w-6 h-6 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* Nút Floating đặc trưng */}
            <button 
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                className={`group flex items-center gap-3 bg-[#111827] text-white pr-10 pl-6 py-6 rounded-full shadow-[0_30px_80px_rgba(0,0,0,0.5)] transition-all transform hover:scale-110 active:scale-90 border-4 border-white pointer-events-auto ${isOpen ? 'rotate-90 ring-4 ring-[#B4975A]/30' : ''}`}
            >
                <div className="relative">
                    <MessageSquareIcon className="w-7 h-7" />
                    {/* Đèn báo đỏ nhấp nháy khi có tin nhắn mới hoặc khách mới đăng nhập */}
                    {((messages.some(m => m.senderRole === 'admin' && !m.isRead)) || (user && messages.length === 0)) && !isOpen && (
                         <>
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-[#111827] animate-ping"></span>
                            <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 rounded-full border-2 border-[#111827]"></span>
                         </>
                    )}
                </div>
                {!isOpen && <span className="text-xs font-black uppercase tracking-[0.3em]">{user ? 'Live Chat' : 'Hỗ trợ'}</span>}
            </button>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
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
