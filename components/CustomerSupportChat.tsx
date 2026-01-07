
import React, { useState, useEffect, useRef } from 'react';
import { SupportMessage, Customer, LiveChatSettings } from '../types';
import { sendChatMessage, fetchChatMessages, markChatAsRead, deleteChatMessages, updateMessageReaction } from '../utils/apiClient';
import { getCurrentCustomer } from '../utils/customerStorage';
import { getLiveChatSettings, LIVECHAT_SETTINGS_EVENT } from '../utils/liveChatSettingsStorage';
import { MessageSquareIcon, XIcon, ImagePlus, RefreshIcon, SmileIcon } from './Icons';

const REACTION_LIST = ['❤️', '👍', '🔥', '😍', '👏'];
const QUICK_EMOJIS = ['👋', '😊', '🙏', '✨', '💖', '👗', '👠', '🛍️', '🔥', '👍'];

const CustomerSupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [ui, setUi] = useState<LiveChatSettings>(getLiveChatSettings());
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [user, setUser] = useState<Customer | null>(null);
    const [hasUnreadChat, setHasUnreadChat] = useState(false);
    const [shouldShake, setShouldShake] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
    const [showEmojiBar, setShowEmojiBar] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
        
        let sid = localStorage.getItem('sigma_vie_support_sid');
        if (!sid) {
            sid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', sid);
        }
        setSessionId(sid);

        const timer = setTimeout(() => setShouldShake(true), 3000);
        
        const handleUiUpdate = () => setUi(getLiveChatSettings());
        window.addEventListener(LIVECHAT_SETTINGS_EVENT, handleUiUpdate);

        return () => {
            clearTimeout(timer);
            window.removeEventListener(LIVECHAT_SETTINGS_EVENT, handleUiUpdate);
        };
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
        if (isOpen && !isClearing) {
            loadMessages(sessionId);
            markChatAsRead(sessionId);
            setHasUnreadChat(false);
            interval = setInterval(() => loadMessages(sessionId), 4000);
        } else if (!isClearing) {
            interval = setInterval(() => loadMessages(sessionId), 10000);
        }
        return () => clearInterval(interval);
    }, [isOpen, sessionId, isClearing]);

    const loadMessages = async (sid: string) => {
        if (!sid || isClearing) return;
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
                    imageUrl: m.image_url,
                    timestamp: Number(m.timestamp),
                    isRead: m.is_read,
                    reactions: m.reactions || {}
                }));
                
                if (formatted.length > messages.length && formatted[formatted.length-1].senderRole === 'admin') {
                    if (audioRef.current) audioRef.current.play().catch(() => {});
                    if (!isOpen) setHasUnreadChat(true);
                }
                setMessages(formatted);
            }
        } catch (e) {}
    };

    const handleClearChat = async () => {
        if (!confirm("Bạn có muốn làm mới hội thoại và xóa hết lịch sử chat không?")) return;
        
        setIsClearing(true);
        try {
            await deleteChatMessages(sessionId);
            const newSid = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            localStorage.setItem('sigma_vie_support_sid', newSid);
            setSessionId(newSid);
            setMessages([]);
            setInputValue('');
            setPreviewImage(null);
        } catch (e) {
            alert("Lỗi khi xóa hội thoại.");
        } finally {
            setIsClearing(false);
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

    const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
        if (e) e.preventDefault();
        
        const finalContent = customText || inputValue;
        if ((!finalContent.trim() && !previewImage) || !sessionId || isSending) return;

        setIsSending(true);
        const newMessage: SupportMessage = {
            id: `MSG-${Date.now()}`,
            sessionId: sessionId,
            customerId: user?.id,
            customerName: user?.fullName || 'Khách vãng lai',
            senderRole: 'customer',
            text: finalContent,
            imageUrl: previewImage || undefined,
            timestamp: Date.now(),
            isRead: false,
            reactions: {}
        };

        const res = await sendChatMessage(newMessage);
        if (res && res.success) {
            setMessages(prev => [...prev, newMessage]);
            if (!customText) setInputValue('');
            setPreviewImage(null);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        setIsSending(false);
    };

    const handleQuickEmojiSend = (emoji: string) => {
        handleSendMessage(undefined, emoji);
        setShowEmojiBar(false);
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
        <div 
            id="sigma-concierge-chat-v4"
            style={{
                position: 'fixed',
                bottom: '160px',
                right: '24px',
                zIndex: 2147483647,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                pointerEvents: 'none',
                fontFamily: ui.fontFamily
            }}
        >
            {isOpen && (
                <div 
                    className="bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col mb-4 overflow-hidden border border-slate-100 animate-float-up"
                    style={{ 
                        width: '380px', 
                        height: '550px', 
                        maxHeight: '80vh', 
                        maxWidth: '90vw',
                        pointerEvents: 'auto' 
                    }}
                >
                    <div 
                        className="p-6 flex justify-between items-center shrink-0 transition-colors"
                        style={{ backgroundColor: ui.headerBgColor, color: ui.headerTextColor }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center font-black text-white">Σ</div>
                            <div>
                                <h3 className="font-black text-[11px] tracking-widest uppercase">{ui.chatTitle}</h3>
                                <p className="text-[8px] text-emerald-400 font-bold uppercase animate-pulse">Nhân viên đang online</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleClearChat} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all" title="Làm mới hội thoại"><RefreshIcon className="w-4 h-4" /></button>
                            <button onClick={() => setIsOpen(false)} className="bg-white/10 hover:bg-rose-500/20 p-2 rounded-full transition-all"><XIcon className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#FAFAFA] custom-scrollbar">
                        {isClearing ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                                <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-[10px] font-black uppercase tracking-widest">Đang dọn dẹp...</p>
                            </div>
                        ) : (
                            <>
                                {messages.length === 0 && (
                                    <div className="text-center py-20 opacity-30">
                                        <MessageSquareIcon className="w-10 h-10 mx-auto mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">{ui.welcomeMsg}</p>
                                    </div>
                                )}
                                {messages.map((msg) => (
                                    <div 
                                        key={msg.id} 
                                        className={`flex flex-col group/msg ${msg.senderRole === 'customer' ? 'items-end' : 'items-start'}`}
                                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                                        onMouseLeave={() => setHoveredMsgId(null)}
                                    >
                                        <div className="relative">
                                            {hoveredMsgId === msg.id && (
                                                <div className={`absolute -top-10 flex gap-2 bg-white p-2 rounded-full shadow-2xl border border-slate-100 z-[100] animate-float-up ${msg.senderRole === 'customer' ? 'right-0' : 'left-0'}`}>
                                                    {REACTION_LIST.map(emoji => (
                                                        <button key={emoji} onClick={() => handleReact(msg.id, emoji)} className="hover:scale-150 transition-transform px-0.5 text-base">{emoji}</button>
                                                    ))}
                                                </div>
                                            )}

                                            <div 
                                                className={`max-w-[280px] rounded-2xl overflow-hidden shadow-sm flex flex-col ${msg.senderRole === 'customer' ? 'rounded-br-none' : 'rounded-tl-none border border-slate-100'}`}
                                                style={{ 
                                                    backgroundColor: msg.senderRole === 'customer' ? ui.bubbleBgCustomer : ui.bubbleBgAdmin,
                                                    color: msg.senderRole === 'customer' ? ui.bubbleTextCustomer : ui.bubbleTextAdmin,
                                                    fontSize: ui.fontSize
                                                }}
                                            >
                                                {msg.imageUrl && <img src={msg.imageUrl} alt="Chat attachment" className="w-full h-auto max-h-60 object-cover" />}
                                                {msg.text && <p className="px-4 py-2.5 font-bold leading-relaxed">{msg.text}</p>}
                                            </div>

                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                <div className={`flex gap-1 mt-1 ${msg.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}>
                                                    {Object.keys(msg.reactions).map(emoji => (
                                                        <div key={emoji} className="bg-white border border-slate-100 shadow-sm rounded-full px-1.5 py-0.5 text-[10px] animate-bounce-slow flex items-center justify-center cursor-pointer hover:bg-slate-50" onClick={() => handleReact(msg.id, emoji)}>{emoji}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </>
                        )}
                    </div>

                    {previewImage && (
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-3">
                            <div className="relative">
                                <img src={previewImage} className="w-12 h-12 object-cover rounded-lg border-2 border-white shadow-md" />
                                <button onClick={() => setPreviewImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-0.5 rounded-full shadow-lg"><XIcon className="w-3 h-3" /></button>
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase">Sẵn sàng gửi...</p>
                        </div>
                    )}

                    {showEmojiBar && (
                        <div className="px-4 py-2.5 bg-white border-t border-slate-50 flex items-center gap-3 overflow-x-auto custom-scrollbar animate-float-up shrink-0">
                            {QUICK_EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => handleQuickEmojiSend(emoji)} className="text-xl hover:scale-125 transition-transform shrink-0 p-1">{emoji}</button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={(e) => handleSendMessage(e)} className="p-4 bg-white border-t border-slate-50 flex items-center gap-2 pointer-events-auto shrink-0">
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setShowEmojiBar(!showEmojiBar)} className={`p-2 rounded-lg transition-colors ${showEmojiBar ? 'text-[#D4AF37] bg-amber-50' : 'text-slate-400 hover:text-[#D4AF37]'}`}><SmileIcon className="w-5 h-5" /></button>
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-[#D4AF37] transition-colors"><ImagePlus className="w-5 h-5" /></button>
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={ui.placeholderText} className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-[#D4AF37] transition-all" />
                        <button type="submit" disabled={(!inputValue.trim() && !previewImage) || isSending} className="text-white p-3 rounded-xl active:scale-90 transition-all shadow-lg disabled:opacity-20" style={{ backgroundColor: ui.floatingBtnColor }}>
                            {isSending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>}
                        </button>
                    </form>
                </div>
            )}

            <div className={`flex flex-col items-end gap-3 pointer-events-auto ${shouldShake && !isOpen ? 'animate-shake' : ''}`}>
                {!isOpen && (
                    <div 
                        className="text-white px-4 py-2 rounded-2xl shadow-2xl border border-[#D4AF37] animate-bounce-slow"
                        style={{ backgroundColor: ui.floatingBtnColor }}
                    >
                        <p className="text-[10px] font-black uppercase tracking-widest">Chat với chúng tôi ✨</p>
                    </div>
                )}
                <button 
                    onClick={() => { setIsOpen(!isOpen); setHasUnreadChat(false); }} 
                    className={`group flex items-center justify-center w-20 h-20 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all transform hover:scale-110 active:scale-95 border-4 border-white relative ${isOpen ? 'bg-rose-500 rotate-90' : 'hover:bg-black'}`}
                    style={{ backgroundColor: isOpen ? undefined : ui.floatingBtnColor }}
                >
                    {isOpen ? <XIcon className="w-10 h-10 text-white" /> : <MessageSquareIcon className="w-10 h-10 text-[#D4AF37]" />}
                    {!isOpen && hasUnreadChat && <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full border-4 border-white shadow-lg animate-ping"></span>}
                </button>
            </div>
        </div>
    );
};

export default CustomerSupportChat;
