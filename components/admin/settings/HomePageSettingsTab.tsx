import React, { useState, useEffect, useRef } from 'react';
import type { HomePageSettings } from '../../../types';
import { getHomePageSettings, updateHomePageSettings } from '../../../utils/homePageSettingsStorage';
import { RefreshIcon, ImagePlus, Trash2Icon, XIcon } from '../../Icons';

const HomePageSettingsTab: React.FC = () => {
    const [homeSettings, setHomeSettings] = useState<HomePageSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [homeFeedback, setHomeFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    
    // Sử dụng ref để quản lý danh sách các input file ẩn
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        setHomeSettings(getHomePageSettings());
    }, []);

    const handleChange = (field: keyof HomePageSettings, value: any) => {
        if (homeSettings) {
            setHomeSettings({ ...homeSettings, [field]: value });
        }
    };

    // Hàm xử lý khi chọn file từ máy tính
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file && homeSettings) {
            // Kiểm tra dung lượng (giới hạn 5MB cho ảnh Base64)
            if (file.size > 5 * 1024 * 1024) {
                setHomeFeedback({ msg: '❌ Ảnh quá lớn (Tối đa 5MB)', type: 'error' });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                const newUrls = [...homeSettings.promoImageUrls];
                newUrls[index] = base64String;
                
                setHomeSettings({
                    ...homeSettings,
                    promoImageUrls: newUrls
                });
                
                setHomeFeedback({ msg: `✨ Đã tải ảnh lên vị trí #${index + 1}`, type: 'success' });
                if (e.target) e.target.value = '';
            };
            reader.onerror = () => {
                setHomeFeedback({ msg: '❌ Lỗi khi đọc file ảnh', type: 'error' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!homeSettings) return;

        setIsSaving(true);
        setHomeFeedback(null);

        try {
            const result = await updateHomePageSettings(homeSettings);
            if (result.success) {
                setHomeFeedback({ msg: '✅ Đã lưu cấu hình Trang Chủ thành công!', type: 'success' });
            } else {
                setHomeFeedback({ msg: `⚠️ Lỗi đồng bộ: ${result.message}`, type: 'error' });
            }
        } catch (error) {
            setHomeFeedback({ msg: '❌ Lỗi kết nối máy chủ.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setHomeFeedback(null), 5000);
        }
    };

    if (!homeSettings) return <div className="p-10 text-center text-slate-400">Đang tải cấu hình...</div>;

    const FONT_OPTIONS = [
        { value: 'Playfair Display', label: 'Playfair Display (Luxury)' },
        { value: 'Poppins', label: 'Poppins (Modern)' },
        { value: 'Montserrat', label: 'Montserrat (Bold)' },
        { value: 'Roboto', label: 'Roboto (Standard)' },
        { value: 'Dancing Script', label: 'Dancing Script (Art)' }
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up pb-32">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình Giao diện Trang Chủ</h3>
                {homeFeedback && (
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm border ${homeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {homeFeedback.msg}
                    </div>
                )}
            </div>
            
            {/* 1. Hero Headline */}
            <div className="border p-8 rounded-[2.5rem] bg-white shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">1</span>
                    Tiêu đề chính (Hero Headline)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nội dung văn bản</label>
                        <input type="text" value={homeSettings.headlineText} onChange={(e) => handleChange('headlineText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-3 focus:border-[#D4AF37] focus:bg-white outline-none font-bold transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Màu sắc tiêu đề</label>
                        <input type="color" value={homeSettings.headlineColor} onChange={(e) => handleChange('headlineColor', e.target.value)} className="w-full h-12 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Kiểu chữ (Font)</label>
                        <select value={homeSettings.headlineFont} onChange={(e) => handleChange('headlineFont', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-3 focus:border-[#D4AF37] focus:bg-white outline-none font-bold transition-all">
                            {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cỡ chữ (VD: 3rem hoặc 48px)</label>
                        <input type="text" value={homeSettings.headlineSize} onChange={(e) => handleChange('headlineSize', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-3 focus:border-[#D4AF37] focus:bg-white outline-none font-bold transition-all" placeholder="VD: 3rem" />
                    </div>
                </div>
            </div>

            {/* 2. Slider Promotion Section */}
            <div className="border p-8 rounded-[2.5rem] bg-white shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">2</span>
                    Banner Quảng Cáo (Slider Promotion)
                </h4>
                
                <div className="grid grid-cols-1 gap-4">
                    {homeSettings.promoImageUrls.map((url, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-5 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 group transition-all hover:border-[#D4AF37]/30 hover:shadow-lg">
                            <div className="relative w-full sm:w-40 h-28 bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shrink-0 flex items-center justify-center shadow-inner group-hover:border-[#D4AF37]/20 transition-all">
                                {url ? (
                                    <img src={url} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center gap-1 opacity-20">
                                        <ImagePlus className="w-7 h-7 text-slate-400" />
                                        <span className="text-[8px] font-black uppercase tracking-widest">Trống</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button type="button" onClick={() => fileInputRefs.current[idx]?.click()} className="p-3 bg-white rounded-full text-[#D4AF37] shadow-2xl transform hover:scale-110 active:scale-90 transition-all">
                                        <ImagePlus className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center gap-3">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input 
                                            type="text" 
                                            value={url && url.startsWith('data:') ? '[Dữ liệu ảnh từ PC]' : url} 
                                            onChange={(e) => {
                                                const newUrls = [...homeSettings.promoImageUrls];
                                                newUrls[idx] = e.target.value;
                                                handleChange('promoImageUrls', newUrls);
                                            }}
                                            readOnly={url && url.startsWith('data:')}
                                            className={`w-full border-2 rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all ${url && url.startsWith('data:') ? 'bg-slate-100 border-slate-100 text-slate-400 italic' : 'bg-white border-slate-100 focus:border-[#D4AF37]'}`} 
                                            placeholder="URL ảnh hoặc tải ảnh lên..."
                                        />
                                        {url && url.startsWith('data:') && (
                                            <button type="button" onClick={() => { const newUrls = [...homeSettings.promoImageUrls]; newUrls[idx] = ''; handleChange('promoImageUrls', newUrls); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1.5 bg-rose-50 rounded-lg">
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => fileInputRefs.current[idx]?.click()} className="px-5 bg-white border-2 border-slate-100 rounded-xl text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all"><ImagePlus className="w-5 h-5" /></button>
                                    <button type="button" onClick={() => { if(confirm('Xóa slide?')) { const n = homeSettings.promoImageUrls.filter((_, i) => i !== idx); handleChange('promoImageUrls', n); } }} className="px-5 bg-white border-2 border-slate-100 rounded-xl text-rose-300 hover:text-rose-500 hover:border-rose-100 transition-all"><Trash2Icon className="w-5 h-5" /></button>
                                </div>
                                <input type="file" ref={el => { fileInputRefs.current[idx] = el; }} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => handleChange('promoImageUrls', [...homeSettings.promoImageUrls, ''])} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] hover:border-[#00695C] hover:text-[#00695C] hover:bg-teal-50 transition-all flex items-center justify-center gap-3">
                        + THÊM BANNER MỚI
                    </button>
                </div>
            </div>

            {/* 3. Flash Sale Section */}
            <div className="border p-8 rounded-[2.5rem] bg-white shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">3</span>
                    Banner Flash Sale (Khu vực Đếm ngược)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tiêu đề vùng Flash Sale</label>
                        <input type="text" value={homeSettings.flashSaleTitleText} onChange={(e) => handleChange('flashSaleTitleText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-3 font-black outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Màu Gradient (Bắt đầu)</label>
                            <input type="color" value={homeSettings.flashSaleBgColorStart} onChange={(e) => handleChange('flashSaleBgColorStart', e.target.value)} className="w-full h-12 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Màu Gradient (Kết thúc)</label>
                            <input type="color" value={homeSettings.flashSaleBgColorEnd} onChange={(e) => handleChange('flashSaleBgColorEnd', e.target.value)} className="w-full h-12 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Membership Registration Section (The requested update) */}
            <div className="border p-8 rounded-[2.5rem] bg-white shadow-sm space-y-10">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">4</span>
                    Vùng Đăng Ký Thành Viên (Membership Registration)
                </h4>

                <div className="space-y-8">
                    {/* Background & Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 rounded-3xl">
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-[#D4AF37]/20 pb-2">Màu nền & Gradient</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Màu bắt đầu</label>
                                    <input type="color" value={homeSettings.regBgColorStart} onChange={(e) => handleChange('regBgColorStart', e.target.value)} className="w-full h-10 p-1 border-2 border-white bg-white rounded-xl cursor-pointer" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Màu kết thúc</label>
                                    <input type="color" value={homeSettings.regBgColorEnd} onChange={(e) => handleChange('regBgColorEnd', e.target.value)} className="w-full h-10 p-1 border-2 border-white bg-white rounded-xl cursor-pointer" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-[#D4AF37]/20 pb-2">Kích thước khối</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Độ dày (Padding)</label>
                                    <input type="text" value={homeSettings.regPadding} onChange={(e) => handleChange('regPadding', e.target.value)} className="w-full border-2 border-white bg-white rounded-xl px-3 py-2 text-xs font-bold" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Bo góc (Radius)</label>
                                    <input type="text" value={homeSettings.regBorderRadius} onChange={(e) => handleChange('regBorderRadius', e.target.value)} className="w-full border-2 border-white bg-white rounded-xl px-3 py-2 text-xs font-bold" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Headline Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Cấu hình Tiêu đề (Headline)</label>
                            <input type="text" value={homeSettings.regHeadlineText} onChange={(e) => handleChange('regHeadlineText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-3 font-bold" placeholder="VD: Trở thành thành viên..." />
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Màu</label>
                                    <input type="color" value={homeSettings.regHeadlineColor} onChange={(e) => handleChange('regHeadlineColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-100 bg-white rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Font</label>
                                    <select value={homeSettings.regHeadlineFont} onChange={(e) => handleChange('regHeadlineFont', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-2 py-2 text-[10px] font-bold">
                                        {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.value}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Size</label>
                                    <input type="text" value={homeSettings.regHeadlineSize} onChange={(e) => handleChange('regHeadlineSize', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-2 py-2 text-[10px] font-bold" />
                                </div>
                            </div>
                        </div>

                        {/* Description Config */}
                        <div className="space-y-4">
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Cấu hình Mô tả (Description)</label>
                            <textarea value={homeSettings.regDescriptionText} onChange={(e) => handleChange('regDescriptionText', e.target.value)} rows={3} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 text-xs font-medium resize-none" />
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Màu</label>
                                    <input type="color" value={homeSettings.regDescriptionColor} onChange={(e) => handleChange('regDescriptionColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-100 bg-white rounded-xl" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Font</label>
                                    <select value={homeSettings.regDescriptionFont} onChange={(e) => handleChange('regDescriptionFont', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-2 py-2 text-[10px] font-bold">
                                        {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.value}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase">Size</label>
                                    <input type="text" value={homeSettings.regDescriptionSize} onChange={(e) => handleChange('regDescriptionSize', e.target.value)} className="w-full border-2 border-slate-100 bg-white rounded-xl px-2 py-2 text-[10px] font-bold" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Button Config */}
                    <div className="p-8 border-2 border-[#D4AF37]/10 rounded-[2.5rem] bg-[#FAF9F7]/50">
                        <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.3em] text-center mb-6">Cấu hình Nút bấm (Call to Action)</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <div className="lg:col-span-2 space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Văn bản nút</label>
                                <input type="text" value={homeSettings.regButtonText} onChange={(e) => handleChange('regButtonText', e.target.value)} className="w-full border-2 border-white bg-white rounded-xl px-4 py-2 font-black uppercase tracking-tighter" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Màu nền nút</label>
                                <input type="color" value={homeSettings.regButtonBgColor} onChange={(e) => handleChange('regButtonBgColor', e.target.value)} className="w-full h-10 p-1 border-2 border-white bg-white rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Màu chữ nút</label>
                                <input type="color" value={homeSettings.regButtonTextColor} onChange={(e) => handleChange('regButtonTextColor', e.target.value)} className="w-full h-10 p-1 border-2 border-white bg-white rounded-xl" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Font nút</label>
                                <select value={homeSettings.regButtonFont} onChange={(e) => handleChange('regButtonFont', e.target.value)} className="w-full border-2 border-white bg-white rounded-xl px-2 py-2 text-[10px] font-bold">
                                    {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.value}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Publish Actions */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-6 z-50">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full bg-[#111827] text-white py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG CẬP NHẬT HỆ THỐNG...' : 'XÁC NHẬN LƯU VÀ XUẤT BẢN THAY ĐỔI'}
                </button>
            </div>
        </form>
    );
};

export default HomePageSettingsTab;