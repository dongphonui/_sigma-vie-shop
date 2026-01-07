
import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, ChatSession } from '../../types';
import { fetchChatSessions, fetchChatMessages, sendChatMessage, markChatAsRead, deleteChatMessages, updateMessageReaction } from '../../utils/apiClient';
import { UserIcon, RefreshIcon, CheckIcon, ImagePlus, XIcon, Trash2Icon } from '../Icons';

const REACTION_LIST = ['❤️', '👍', '🔥', '😍', '👏'];

const LiveChatTab: React.FC = () => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            interval = setInterval(() => loadMessages(activeSession.sessionId), 4000);
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
                imageUrl: m.image_url,
                timestamp: Number(m.timestamp),
                isRead: m.is_read,
                reactions: m.reactions || {}
            }));
            setMessages(formatted);
        }
    };

    const handleDeleteConversation = async () => {
        if (!activeSession) return;
        if (!confirm(`Bạn có chắc muốn xóa hội thoại?`)) return;
        try {
            await deleteChatMessages(activeSession.sessionId);
            setActiveSession(null);
            setMessages([]);
            loadSessions();
        } catch (e) {
            alert("Lỗi khi xóa.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Ảnh quá lớn! Vui lòng gửi ảnh dưới 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!inputValue.trim() && !previewImage) || !activeSession || isSending) return;

        setIsSending(true);
        const newMessage: SupportMessage = {
            id: `MSG-${Date.now()}`,
            sessionId: activeSession.sessionId,
            customerName: activeSession.customerName,
            senderRole: 'admin',
            text: inputValue,
            imageUrl: previewImage || undefined,
            timestamp: Date.now(),
            isRead: true,
            reactions: {}
        };

        const res = await sendChatMessage(newMessage);
        if (res && res.success) {
            setMessages(prev => [...prev, newMessage]);
            setInputValue('');
            setPreviewImage(null);
        }
        setIsSending(false);
    };

    const handleReact = async (msgId: string, emoji: string) => {
        const msgIndex = messages.findIndex(m => m.id === msgId);
        if (msgIndex === -1) return;

        const updatedMessages = [...messages];
        const msg = updatedMessages[msgIndex];
        const newReactions = { ...(msg.reactions || {}) };
        
        if (newReactions[emoji]) {
            delete newReactions[emoji];
        } else {
            newReactions[emoji] = 1;
        }

        msg.reactions = newReactions;
        setMessages(updatedMessages);
        setHoveredMsgId(null);
        await updateMessageReaction(msgId, newReactions);
    };

    return (
        <div className="flex bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 h-[750px] overflow-hidden animate-fade-in-up">
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
                    {sessions.map(s => (
                        <button 
                            key={s.sessionId}
                            onClick={() => setActiveSession(s)}
                            className={`w-full p-6 text-left border-b border-slate-50 transition-all hover:bg-white flex gap-4 items-center relative ${activeSession?.sessionId === s.sessionId ? 'bg-white shadow-inner' : ''}`}
                        >
                            {activeSession?.sessionId === s.sessionId && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#D4AF37]"></div>}
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-sm uppercase shadow-md shrink-0">{s.customerName.charAt(0)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <p className={`text-xs truncate uppercase tracking-tight ${s.unreadCount > 0 ? 'font-black text-black' : 'font-bold text-slate-600'}`}>{s.customerName}</p>
                                    <span className="text-[8px] text-slate-400 font-bold">{new Date(s.lastTimestamp).toLocaleDateString('vi-VN')}</span>
                                </div>
                                <p className={`text-[10px] truncate ${s.unreadCount > 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-400'}`}>{s.lastMessage}</p>
                            </div>
                            {s.unreadCount > 0 && <div className="w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[8px] text-white font-black shadow-lg animate-bounce">{s.unreadCount}</div>}
                        </button>
                    ))}
                </div>
            </div>

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
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Đang tư vấn</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleDeleteConversation} className="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2Icon className="w-5 h-5" /></button>
                                <button onClick={() => setActiveSession(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300"><XIcon className="w-5 h-5"/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10 bg-[#FCFCFB] custom-scrollbar">
                            {messages.map((m) => (
                                <div 
                                    key={m.id} 
                                    className={`flex flex-col ${m.senderRole === 'admin' ? 'items-end' : 'items-start'}`}
                                    onMouseEnter={() => setHoveredMsgId(m.id)}
                                    onMouseLeave={() => setHoveredMsgId(null)}
                                >
                                    <div className="relative group/msg">
                                        {hoveredMsgId === m.id && (
                                            <div className={`absolute -top-10 flex gap-2 bg-white p-2 rounded-full shadow-2xl border border-slate-100 z-[100] animate-float-up ${m.senderRole === 'admin' ? 'right-0' : 'left-0'}`}>
                                                {REACTION_LIST.map(emoji => (
                                                    <button key={emoji} onClick={() => handleReact(m.id, emoji)} className="hover:scale-150 transition-transform px-0.5 text-base">{emoji}</button>
                                                ))}
                                            </div>
                                        )}
                                        <div className={`max-w-[450px] overflow-hidden rounded-[2rem] shadow-sm relative group ${m.senderRole === 'admin' ? 'bg-[#111827] text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                                            {m.imageUrl && (
                                                <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                                                    <img src={m.imageUrl} alt="Attachment" className="w-full h-auto max-h-80 object-cover cursor-zoom-in" />
                                                </a>
                                            )}
                                            {m.text && <p className="p-5 text-sm leading-relaxed font-medium">{m.text}</p>}
                                            <div className="flex items-center justify-between px-5 pb-3 opacity-30">
                                                <span className="text-[8px] font-black uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {m.senderRole === 'admin' && <CheckIcon className="w-3 h-3 text-[#D4AF37]"/>}
                                            </div>
                                        </div>
                                        {m.reactions && Object.keys(m.reactions).length > 0 && (
                                            <div className={`flex gap-1 mt-1 ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                                {Object.keys(m.reactions).map(emoji => (
                                                    <div key={emoji} className="bg-white border border-slate-100 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] animate-bounce-slow flex items-center justify-center cursor-pointer hover:bg-slate-50" onClick={() => handleReact(m.id, emoji)}>{emoji}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {previewImage && (
                            <div className="px-8 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-4">
                                <div className="relative">
                                    <img src={previewImage} className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-lg" />
                                    <button onClick={() => setPreviewImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"><XIcon className="w-3 h-3" /></button>
                                </div>
                                <p className="text-[11px] font-black text-slate-400 uppercase">Đang đính kèm...</p>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="p-8 bg-white border-t border-slate-100 flex items-center gap-4">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-4 text-slate-400 hover:text-[#D4AF37] transition-colors bg-slate-50 rounded-2xl border-2 border-slate-50"><ImagePlus className="w-6 h-6" /></button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Gửi phản hồi..." className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-2xl px-8 py-5 text-sm font-bold focus:border-[#D4AF37] focus:bg-white transition-all outline-none" />
                            <button type="submit" disabled={(!inputValue.trim() && !previewImage) || isSending} className="bg-[#111827] text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-2xl">
                                {isSending ? '...' : 'Gửi'}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-200 p-20 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100"><UserIcon className="w-12 h-12 text-slate-200" /></div>
                        <h3 className="text-2xl font-black text-slate-300 uppercase tracking-[0.4em]">Hệ thống Tư vấn</h3>
                        <p className="text-xs font-medium text-slate-400 mt-3 max-w-sm">Chọn một hội thoại để bắt đầu hỗ trợ khách hàng Sigma Vie.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LiveChatTab;
