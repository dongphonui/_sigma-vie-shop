
import React, { useState, useEffect } from 'react';
import type { LiveChatSettings } from '../../../types';
import { getLiveChatSettings, updateLiveChatSettings } from '../../../utils/liveChatSettingsStorage';
import { RefreshIcon } from '../../Icons';

const LiveChatSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<LiveChatSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setSettings(getLiveChatSettings());
    }, []);

    const handleChange = (field: keyof LiveChatSettings, value: string) => {
        if (settings) {
            setSettings({ ...settings, [field]: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;

        setIsSaving(true);
        setFeedback(null);

        try {
            const result = await updateLiveChatSettings(settings);
            if (result.success) {
                setFeedback({ msg: '✅ Cấu hình Live Chat đã được lưu thành công!', type: 'success' });
            } else {
                setFeedback({ msg: `⚠️ ${result.message}`, type: 'error' });
            }
        } catch (error) {
            setFeedback({ msg: '❌ Lỗi kết nối server.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setFeedback(null), 5000);
        }
    };

    if (!settings) return <div className="p-10 text-center">Đang tải...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình Live Chat</h3>
                {feedback && (
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {feedback.msg}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Nội dung và Header */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">1. Nội dung & Header</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Tiêu đề khung Chat</label>
                            <input type="text" value={settings.chatTitle} onChange={e => handleChange('chatTitle', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#D4AF37]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Màu nền Header</label>
                                <input type="color" value={settings.headerBgColor} onChange={e => handleChange('headerBgColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Màu chữ Header</label>
                                <input type="color" value={settings.headerTextColor} onChange={e => handleChange('headerTextColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Lời chào (Khi chưa có tin nhắn)</label>
                            <input type="text" value={settings.welcomeMsg} onChange={e => handleChange('welcomeMsg', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold outline-none" />
                        </div>
                    </div>
                </div>

                {/* Bong bóng Chat */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">2. Bong bóng tin nhắn</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nền tin KH</label>
                                <input type="color" value={settings.bubbleBgCustomer} onChange={e => handleChange('bubbleBgCustomer', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Chữ tin KH</label>
                                <input type="color" value={settings.bubbleTextCustomer} onChange={e => handleChange('bubbleTextCustomer', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Nền tin Admin</label>
                                <input type="color" value={settings.bubbleBgAdmin} onChange={e => handleChange('bubbleBgAdmin', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Chữ tin Admin</label>
                                <input type="color" value={settings.bubbleTextAdmin} onChange={e => handleChange('bubbleTextAdmin', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kiểu chữ & Nút bấm */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">3. Font & Nút bấm</h4>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Font chữ</label>
                                <select value={settings.fontFamily} onChange={e => handleChange('fontFamily', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none">
                                    <option value="Roboto">Roboto (Chuẩn)</option>
                                    <option value="Poppins">Poppins (Hiện đại)</option>
                                    <option value="Playfair Display">Playfair Display (Luxury)</option>
                                    <option value="Montserrat">Montserrat</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Cỡ chữ</label>
                                <input type="text" value={settings.fontSize} onChange={e => handleChange('fontSize', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold outline-none" placeholder="13px" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Màu nút bong bóng (Nút mở Chat)</label>
                            <input type="color" value={settings.floatingBtnColor} onChange={e => handleChange('floatingBtnColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 rounded-xl cursor-pointer" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-slate-50 flex justify-center">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-[#111827] text-white px-20 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG ĐỒNG BỘ...' : 'LƯU TẤT CẢ THAY ĐỔI'}
                </button>
            </div>
        </form>
    );
};

export default LiveChatSettingsTab;
