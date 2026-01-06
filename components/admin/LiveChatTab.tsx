import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, ChatSession } from '../../types';
import { fetchChatSessions, fetchChatMessages, sendChatMessage, markChatAsRead } from '../../utils/apiClient';
import { UserIcon, RefreshIcon, CheckIcon } from '../Icons';

const LiveChatTab: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Khởi tạo audio để báo tin nhắn mới
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
    }, []);

    useEffect(() => {
        loadSessions();
        const interval = setInterval(loadSessions, 8000); 
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let interval: any;
        if (activeSession) {
            loadMessages(activeSession.sessionId);
            markChatAsRead(activeSession.sessionId);
            interval = setInterval(() => loadMessages(activeSession.sessionId), 3000);
        }
        return () => clearInterval(interval);
    }, [activeSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadSessions = async () => {
        setIsLoadingSessions(true);
        const data = await fetchChatSessions();
        if (data) {
            // Kiểm tra xem có tin nhắn mới nào không để phát âm thanh
            const hasNewMessages = data.some((s: any) => {
                const oldSession = sessions.find(os => os.sessionId === s.sessionId);
                return s.unreadCount > (oldSession?.unreadCount || 0);
            });
            
            if (hasNewMessages && audioRef.current) {
                audioRef.current.play().catch(e => console.log('Audio error', e));
            }
            
            setSessions(data);
        }
        setIsLoadingSessions(false);
    };

    const loadMessages = async (sid: string) => {
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
            setMessages(formatted);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !activeSession) return;

        const newMessage: SupportMessage = {
            id: `MSG-${Date.now()}`,
            sessionId: activeSession.sessionId,
            customerName: activeSession.customerName,
            senderRole: 'admin',
            text: inputValue,
            timestamp: Date.now(),
            isRead: true
        };

        const res = await sendChatMessage(newMessage);
        if (res && res.success) {
            setMessages(prev => [...prev, newMessage]);
            setInputValue('');
        }
    };

    return (
        <div className="flex bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 h-[750px] overflow-hidden animate-fade-in-up">
            {/* Sidebar Sessions */}
            <div className="w-80 border-r border-slate-100 flex flex-col bg-[#F9F9F8]">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Hội thoại</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Hỗ trợ khách hàng</p>
                    </div>
                    <button onClick={loadSessions} className={`p-2 hover:bg-slate-100 rounded-xl transition-all ${isLoadingSessions ? 'animate-spin' : ''}`}>
                        <RefreshIcon className="w-4 h-4 text-slate-400"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {sessions.length === 0 ? (
                        <div className="p-10 text-center text-slate-300 italic text-xs">Chưa có tin nhắn mới.</div>
                    ) : (
                        sessions.map(s => (
                            <button 
                                key={s.sessionId}
                                onClick={() => setActiveSession(s)}
                                className={`w-full p-6 text-left border-b border-slate-50 transition-all hover:bg-white flex gap-4 items-center relative ${activeSession?.sessionId === s.sessionId ? 'bg-white shadow-inner' : ''}`}
                            >
                                {activeSession?.sessionId === s.sessionId && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]"></div>
                                )}
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-sm uppercase shadow-md shrink-0">
                                    {s.customerName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <p className={`text-xs truncate uppercase tracking-tight ${s.unreadCount > 0 ? 'font-black text-black' : 'font-bold text-slate-600'}`}>{s.customerName}</p>
                                        <span className="text-[8px] text-slate-400 font-bold">{new Date(s.lastTimestamp).toLocaleDateString('vi-VN')}</span>
                                    </div>
                                    <p className={`text-[10px] truncate ${s.unreadCount > 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>{s.lastMessage}</p>
                                </div>
                                {s.unreadCount > 0 && (
                                    <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-black shadow-lg animate-bounce">
                                        {s.unreadCount}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Box Area */}
            <div className="flex-1 flex flex-col bg-white">
                {activeSession ? (
                    <>
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-[#B4975A] rounded-2xl flex items-center justify-center text-white font-black shadow-xl text-xl">Σ</div>
                                <div>
                                    <h4 className="font-black text-slate-900 uppercase tracking-tighter text-xl">{activeSession.customerName}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Đang tư vấn trực tiếp</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {activeSession.customerId && (
                                    <span className="bg-emerald-50 text-emerald-600 text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-widest border border-emerald-100">Thành viên</span>
                                )}
                                <button onClick={() => setActiveSession(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#FCFCFB] custom-scrollbar">
                            {messages.map((m, idx) => {
                                const showTime = idx === 0 || m.timestamp - messages[idx-1].timestamp > 300000; // 5 mins
                                return (
                                    <div key={m.id}>
                                        {showTime && (
                                            <div className="text-center my-6">
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] bg-white px-4 py-1 rounded-full border border-slate-50">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                            </div>
                                        )}
                                        <div className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] p-5 rounded-[2rem] shadow-sm relative group ${m.senderRole === 'admin' ? 'bg-[#111827] text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                                                <p className="text-sm leading-relaxed font-medium">{m.text}</p>
                                                <div className="flex items-center justify-between mt-2 opacity-30 group-hover:opacity-60 transition-opacity">
                                                    <span className="text-[8px] font-black uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    {m.senderRole === 'admin' && <CheckIcon className="w-3 h-3 text-[#D4AF37]"/>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-slate-100 flex items-center gap-4">
                            <input 
                                type="text" 
                                value={inputValue} 
                                onChange={e => setInputValue(e.target.value)} 
                                placeholder="Gửi phản hồi cho quý khách..." 
                                className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-8 py-5 text-sm font-bold focus:border-[#D4AF37] focus:bg-white transition-all outline-none"
                            />
                            <button type="submit" disabled={!inputValue.trim()} className="bg-[#111827] text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl active:scale-95 disabled:opacity-20">Gửi</button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-200 p-20 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                            <UserIcon className="w-12 h-12 text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-300 uppercase tracking-[0.4em]">Hệ thống Chat Tư vấn</h3>
                        <p className="text-xs font-medium text-slate-400 mt-3 max-w-sm">Chọn một hội thoại ở danh sách bên trái để bắt đầu hỗ trợ khách hàng Sigma Vie.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveChatTab;