
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
    const [hasUnreadChat, setHasUnreadChat] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Log để kiểm tra trong Console (F12)
        console.log("%c[Sigma Support] Component đã được nạp!", "color: gold; font-weight: bold; font-size: 16px;");
        
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        // Hiệu ứng lắc sau 3 giây để khách chú ý
        const timer = setTimeout(() => setShouldShake(true), 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const handleForceOpen = (e: any) => {
            setIsOpen(true);
            if (e.detail?.message) setInputValue(e.detail.message);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
        };
        window.addEventListener('sigma_vie_open_chat', handleForceOpen);
        return () => window.removeEventListener('sigma_vie_open_chat', handleForceOpen);
    }, []);

    useEffect(() => {
        setUser(getCurrentCustomer());
        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            setHasUnreadChat(false);
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
                    if (!isOpen) setHasUnreadChat(true);
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
        <div 
            id="sigma-concierge-chat-v3"
            style={{
                position: 'fixed',
                bottom: '160px', // Cao hơn Chat AI cũ
                right: '24px',
                zIndex: 2147483647,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                pointerEvents: 'none'
            }}
        >
            {/* Box Chat */}
            {isOpen && (
                <div 
                    className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up"
                    style={{ 
                        width: '380px', 
                        height: '500px', 
                        maxHeight: '70vh', 
                        maxWidth: '90vw',
                        pointerEvents: 'auto' 
                    }}
                >
                    <div className="bg-[#111827] text-white p-6 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center font-black">Σ</div>
                            <div>
                                <h3 className="font-black text-[11px] tracking-widest uppercase">Hỗ trợ Sigma Vie</h3>
                                <p className="text-[8px] text-emerald-400 font-bold uppercase animate-pulse">Nhân viên đang online</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500/20 p-2 rounded-full transition-all">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAFAFA] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-20 opacity-30">
                                <MessageSquareIcon className="w-10 h-10 mx-auto mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Quý khách cần tư vấn<br/>về sản phẩm hoặc đơn hàng?</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id || idx} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#D4AF37] text-white rounded-tr-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <p className="font-bold leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-50 flex items-center gap-2 pointer-events-auto">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập lời nhắn..." 
                            className="flex-1 bg-slate-50 border-none rounded-xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white p-3.5 rounded-xl active:scale-90 transition-all shadow-lg disabled:opacity-20">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                        </button>
                    </form>
                </div>
            )}

            {/* NÚT KÍCH HOẠT CHÍNH */}
            <div 
                className={`flex flex-col items-end gap-3 pointer-events-auto ${shouldShake && !isOpen ? 'animate-shake' : ''}`}
                onMouseEnter={() => setShouldShake(false)}
            >
                {!isOpen && (
                    <div className="bg-[#111827] text-white px-4 py-2 rounded-2xl shadow-2xl border border-[#D4AF37] animate-bounce-slow">
                        <p className="text-[10px] font-black uppercase tracking-widest">Chat với chúng tôi ✨</p>
                    </div>
                )}
                
                <button 
                    onClick={() => { setIsOpen(!isOpen); setHasUnreadChat(false); }} 
                    className={`group flex items-center justify-center w-20 h-20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white relative
                        ${isOpen ? 'bg-rose-500 rotate-90' : 'bg-[#111827] hover:bg-black'}`}
                >
                    {isOpen ? (
                        <XIcon className="w-10 h-10 text-white" />
                    ) : (
                        <MessageSquareIcon className="w-10 h-10 text-[#D4AF37]" />
                    )}
                    
                    {!isOpen && hasUnreadChat && (
                         <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full border-4 border-white shadow-lg animate-ping"></span>
                    )}
                </button>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
                
                @keyframes floatUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                    animation-delay: 5s;
                    animation-iteration-count: 2;
                }

                @keyframes bounceSlow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-bounce-slow {
                    animation: bounceSlow 3s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default CustomerSupportChat;
