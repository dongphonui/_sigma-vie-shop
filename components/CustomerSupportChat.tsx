
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

        // Lắng nghe sự kiện mở chat từ Header hoặc Menu
        const handleOpenExternal = (e: any) => {
            setIsOpen(true);
            setShowTooltip(false);
            if (e.detail?.message && messages.length === 0) {
                setInputValue(e.detail.message);
            }
        };
        window.addEventListener('sigma_vie_open_chat', handleOpenExternal);
        
        // Hiện tooltip lời chào sau 5s nếu user đã login nhưng chưa mở chat
        const timer = setTimeout(() => {
            if (getCurrentCustomer() && !isOpen && messages.length === 0) {
                setShowTooltip(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener('sigma_vie_open_chat', handleOpenExternal);
            clearTimeout(timer);
        };
    }, [messages.length, isOpen]);

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

    useEffect(() => {
        if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

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
                if (!isOpen) setShowTooltip(true);
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
            {/* Tooltip lời chào bồng bềnh */}
            {showTooltip && !isOpen && (
                <div className="bg-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-100 mb-4 animate-float-up max-w-[240px] relative">
                    <button onClick={() => setShowTooltip(false)} className="absolute -top-2 -right-2 bg-slate-100 p-1 rounded-full text-slate-400 hover:text-black">
                        <XIcon className="w-3 h-3" />
                    </button>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">
                        {user ? `Chào ${user.fullName.split(' ').pop()}! Sigma Vie đang online, bạn cần tư vấn thêm về sản phẩm không?` : 'Kính chào quý khách! Chúng tôi có thể giúp gì cho bạn?'}
                    </p>
                    <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-r border-b border-slate-100 rotate-45"></div>
                </div>
            )}

            {isOpen && (
                <div className="bg-white w-[340px] sm:w-[400px] h-[550px] rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up">
                    {/* Header Chat */}
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
                            <XIcon className="w-6 h-6" />
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
                                    <div className={`flex items-center gap-1 mt-1 opacity-40 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
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

                    {/* Input Chat */}
                    <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-50 flex items-center gap-3">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)} 
                            placeholder="Nhập nội dung cần hỗ trợ..." 
                            className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 text-sm focus:border-[#B4975A] focus:bg-white transition-all outline-none font-bold placeholder:text-slate-300"
                        />
                        <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white p-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                </div>
            )}

            <button 
                onClick={() => { setIsOpen(!isOpen); setShowTooltip(false); }} 
                className={`group flex items-center gap-3 bg-[#111827] text-white pr-8 pl-5 py-5 rounded-full shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition-all transform hover:scale-105 active:scale-95 border-4 border-white ${isOpen ? 'rotate-90 ring-4 ring-[#B4975A]/20' : ''} ${user ? 'ring-4 ring-[#D4AF37]/20' : ''}`}
            >
                <div className="relative">
                    <MessageSquareIcon className="w-6 h-6" />
                    {(messages.some(m => m.senderRole === 'admin' && !m.isRead) || (user && messages.length === 0)) && !isOpen && (
                         <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-[#111827] animate-pulse"></span>
                    )}
                </div>
                {!isOpen && <span className="text-[11px] font-black uppercase tracking-[0.3em]">{user ? 'Tư vấn ngay' : 'Hỗ trợ'}</span>}
            </button>
        </div>
    );
};

export default CustomerSupportChat;
