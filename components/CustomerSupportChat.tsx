
import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, Customer } from '../types';
import { sendChatMessage, fetchChatMessages } from '../utils/apiClient';
import { getCurrentCustomer } from '../utils/customerStorage';
/* // Fix: Added missing MessageSquareIcon to imports from ./Icons to resolve usage error */
import { MessageSquareIcon } from './Icons';

const CustomerSupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [user, setUser] = useState<Customer | null>(null);
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

        // Lắng nghe sự kiện mở chat từ Product Modal
        const handleOpenExternal = (e: any) => {
            setIsOpen(true);
            if (e.detail?.message) {
                setInputValue(e.detail.message);
            }
        };
        window.addEventListener('sigma_vie_open_chat', handleOpenExternal);
        return () => window.removeEventListener('sigma_vie_open_chat', handleOpenExternal);
    }, []);

    useEffect(() => {
        const currentUser = getCurrentCustomer();
        setUser(currentUser);

        let interval: any;
        if (isOpen) {
            loadMessages(sessionId);
            interval = setInterval(() => loadMessages(sessionId), 3000);
        }
        return () => clearInterval(interval);
    }, [isOpen, sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMessages = async (sid: string) => {
        if (!sid) return;
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
            
            // Phát âm thanh nếu có tin mới từ admin
            if (formatted.length > messages.length && formatted[formatted.length-1].senderRole === 'admin' && audioRef.current) {
                audioRef.current.play().catch(() => {});
            }
            
            setMessages(formatted);
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
        }
    };

    return (
        <div className="fixed bottom-6 right-32 z-[200] flex flex-col items-end font-sans">
            {isOpen && (
                <div className="bg-white w-[340px] sm:w-[400px] h-[550px] rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up">
                    {/* Header */}
                    <div className="bg-[#111827] text-white p-6 flex justify-between items-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                            <svg width="100%" height="100%"><pattern id="pattern-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="white" /></pattern><rect width="100%" height="100%" fill="url(#pattern-dots)" /></svg>
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-[#B4975A] rounded-2xl flex items-center justify-center font-black text-white shadow-lg border border-white/10 text-lg">Σ</div>
                            <div>
                                <h3 className="font-bold text-sm tracking-tight uppercase">Cố vấn Sigma Vie</h3>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Trực tuyến</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-2 transition-colors relative z-10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#F9F9F8] custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-12 px-6">
                                <p className="text-sm text-slate-400 font-medium mb-2 italic">Kính chào Quý khách {user?.fullName || ''} đến với Sigma Vie.</p>
                                <p className="text-[10px] text-[#B4975A] uppercase font-black tracking-[0.2em]">Đội ngũ tư vấn sẵn sàng hỗ trợ bạn.</p>
                            </div>
                        )}
                        {messages.map((msg, idx) => (
                            <div key={msg.id} className={`flex ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                <div className={`max-w-[85%] px-5 py-4 rounded-3xl text-sm shadow-sm ${
                                    msg.senderRole === 'customer' 
                                        ? 'bg-[#B4975A] text-white rounded-tr-none shadow-amber-900/10' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                                }`}>
                                    <p className="leading-relaxed font-medium">{msg.text}</p>
                                    <span className={`text-[8px] block mt-1 uppercase font-black tracking-tighter opacity-40 ${msg.senderRole === 'customer' ? 'text-right' : 'text-left'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-50 flex items-center gap-3">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập nội dung tư vấn..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold placeholder:text-slate-300"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`group flex items-center gap-3 bg-[#111827] text-white pr-8 pl-5 py-5 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all transform hover:scale-105 active:scale-95 border-4 border-white ${isOpen ? 'rotate-90 ring-4 ring-[#B4975A]/20' : ''}`}
            >
                <div className="relative">
                    <MessageSquareIcon className="w-6 h-6" />
                    {messages.some(m => m.senderRole === 'admin' && !m.isRead) && !isOpen && (
                         <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#111827] animate-pulse"></span>
                    )}
                </div>
                {!isOpen && <span className="text-[11px] font-black uppercase tracking-[0.3em]">Hỗ trợ</span>}
            </button>
        </div>
    );
};

export default CustomerSupportChat;
