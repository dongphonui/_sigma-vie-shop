
import React, { useState, useEffect } from 'react';
import type { AboutPageContent, AboutPageSettings } from '../../../types';
import { getAboutPageContent, updateAboutPageContent } from '../../../utils/aboutPageStorage';
import { getAboutPageSettings, updateAboutPageSettings } from '../../../utils/aboutPageSettingsStorage';
import { ImagePlus, RefreshIcon } from '../../Icons';

const AboutPageSettingsTab: React.FC = () => {
    const [aboutContent, setAboutContent] = useState<AboutPageContent | null>(null);
    const [aboutSettings, setAboutSettings] = useState<AboutPageSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setAboutContent(getAboutPageContent());
        setAboutSettings(getAboutPageSettings());
    }, []);

    const handleContentChange = (field: keyof AboutPageContent, value: string) => {
        if (aboutContent) {
            setAboutContent({ ...aboutContent, [field]: value });
        }
    };

    const handleSettingsChange = (field: keyof AboutPageSettings, value: string) => {
        if (aboutSettings) {
            setAboutSettings({ ...aboutSettings, [field]: value });
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof AboutPageContent) => {
        const file = e.target.files?.[0];
        if (file && aboutContent) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAboutContent({ ...aboutContent, [field]: reader.result as string });
                setFeedback({ msg: '✨ Ảnh đã được tải lên tạm thời. Nhấn Lưu để đẩy lên server.', type: 'success' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aboutContent || !aboutSettings) return;

        setIsSaving(true);
        setFeedback(null);

        try {
            // Đồng bộ cả nội dung và cài đặt giao diện
            const [resContent, resSettings] = await Promise.all([
                updateAboutPageContent(aboutContent),
                updateAboutPageSettings(aboutSettings)
            ]);

            if (resContent.success && resSettings.success) {
                setFeedback({ msg: '✅ Toàn bộ nội dung trang Giới thiệu đã được cập nhật trên Server!', type: 'success' });
            } else {
                setFeedback({ msg: '⚠️ Một số dữ liệu lỗi đồng bộ. Vui lòng kiểm tra kết nối.', type: 'error' });
            }
        } catch (error) {
            setFeedback({ msg: '❌ Lỗi chí mạng: Không thể đẩy dữ liệu lên máy chủ Sigma.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setFeedback(null), 5000);
        }
    };

    if (!aboutContent || !aboutSettings) return <div className="p-10 text-center">Đang kết nối Database...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Biên tập nội dung trang Giới thiệu</h3>
                {feedback && (
                    <div className={`text-[10px] font-bold px-4 py-2 rounded-full ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {feedback.msg}
                    </div>
                )}
            </div>

            {/* Hero Section Content */}
            <div className="border-b pb-8 space-y-6">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">1. Phần bìa trang (Hero)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Tiêu đề Hero</label>
                        <input type="text" value={aboutContent.heroTitle} onChange={(e) => handleContentChange('heroTitle', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Phụ đề Hero</label>
                        <input type="text" value={aboutContent.heroSubtitle} onChange={(e) => handleContentChange('heroSubtitle', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Ảnh nền Hero</label>
                        <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border-2 border-dashed">
                            <label className="w-16 h-16 bg-white border-2 border-slate-100 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#D4AF37]">
                                <ImagePlus className="w-5 h-5 text-slate-300" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'heroImageUrl')} />
                            </label>
                            <img src={aboutContent.heroImageUrl} alt="Hero" className="h-16 w-32 object-cover rounded shadow-sm border-2 border-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Welcome Section */}
            <div className="border-b pb-8 space-y-6">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">2. Phần nội dung chính</h4>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Tiêu đề chào mừng</label>
                        <input type="text" value={aboutContent.welcomeHeadline} onChange={(e) => handleContentChange('welcomeHeadline', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Đoạn giới thiệu ngắn</label>
                        <textarea rows={4} value={aboutContent.welcomeText} onChange={(e) => handleContentChange('welcomeText', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm leading-relaxed outline-none focus:border-[#D4AF37] resize-none" />
                    </div>
                </div>
            </div>

            {/* Styling Settings */}
            <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">3. Định dạng Giao diện (Styling)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu sắc Tiêu đề</label>
                        <input type="color" value={aboutSettings.headingColor} onChange={(e) => handleSettingsChange('headingColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Font chữ Tiêu đề</label>
                        <select value={aboutSettings.headingFont} onChange={(e) => handleSettingsChange('headingFont', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 text-xs font-bold outline-none">
                            <option value="Playfair Display">Playfair Display (Luxury)</option>
                            <option value="Poppins">Poppins (Modern)</option>
                            <option value="Montserrat">Montserrat (Strong)</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu nút hành động</label>
                        <input type="color" value={aboutSettings.buttonBgColor} onChange={(e) => handleSettingsChange('buttonBgColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                    </div>
                </div>
            </div>

            <div className="pt-10 flex flex-col items-center">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-[#111827] text-white px-24 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG LƯU DỮ LIỆU LÊN ĐÁM MÂY...' : 'HOÀN TẤT VÀ XUẤT BẢN TRANG'}
                </button>
            </div>
        </form>
    );
};

export default AboutPageSettingsTab;
