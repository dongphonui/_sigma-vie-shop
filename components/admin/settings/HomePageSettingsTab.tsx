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
                // Reset input để có thể chọn lại cùng 1 file nếu cần
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
                setHomeFeedback({ msg: '✅ Đã lưu và đồng bộ lên máy chủ thành công!', type: 'success' });
            } else {
                setHomeFeedback({ msg: `⚠️ Đã lưu tại máy nhưng lỗi đồng bộ Server: ${result.message}`, type: 'error' });
            }
        } catch (error) {
            setHomeFeedback({ msg: '❌ Lỗi kết nối khi gửi dữ liệu lên máy chủ.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setHomeFeedback(null), 5000);
        }
    };

    if (!homeSettings) return <div className="p-10 text-center text-slate-400">Đang tải cấu hình...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình Trang Chủ</h3>
                {homeFeedback && (
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse shadow-sm border ${homeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                        {homeFeedback.msg}
                    </div>
                )}
            </div>
            
            {/* 1. Hero Headline */}
            <div className="border p-6 rounded-3xl bg-white shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">1</span>
                    Tiêu đề chính (Hero Headline)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nội dung văn bản</label>
                        <input type="text" value={homeSettings.headlineText} onChange={(e) => handleChange('headlineText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 focus:border-[#D4AF37] focus:bg-white outline-none font-bold transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Màu sắc tiêu đề</label>
                        <input type="color" value={homeSettings.headlineColor} onChange={(e) => handleChange('headlineColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" title="Chọn màu tiêu đề" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Kiểu chữ (Font)</label>
                        <select value={homeSettings.headlineFont} onChange={(e) => handleChange('headlineFont', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 focus:border-[#D4AF37] focus:bg-white outline-none font-bold transition-all">
                            <option value="Playfair Display">Playfair Display (Serif)</option>
                            <option value="Poppins">Poppins (Sans-serif)</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Dancing Script">Dancing Script (Cursive)</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cỡ chữ (VD: 3rem hoặc 48px)</label>
                        <input type="text" value={homeSettings.headlineSize} onChange={(e) => handleChange('headlineSize', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 focus:border-[#D4AF37] focus:bg-white outline-none font-bold transition-all" placeholder="VD: 3rem" />
                    </div>
                </div>
            </div>

            {/* 2. Featured Promotion Section */}
            <div className="border p-6 rounded-3xl bg-white shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">2</span>
                    Banner Quảng Cáo (Slider Promotion)
                </h4>
                
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Danh sách Slide Banner</label>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Hỗ trợ URL hoặc Tải ảnh từ PC</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {homeSettings.promoImageUrls.map((url, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row gap-5 bg-slate-50 p-5 rounded-[2rem] border border-slate-100 group transition-all hover:border-[#D4AF37]/30 hover:shadow-lg">
                                {/* Preview Thumbnail */}
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
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRefs.current[idx]?.click()}
                                            className="p-3 bg-white rounded-full text-[#D4AF37] shadow-2xl transform hover:scale-110 active:scale-90 transition-all"
                                            title="Thay đổi ảnh từ máy"
                                        >
                                            <ImagePlus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* URL Input & Local Upload Buttons */}
                                <div className="flex-1 flex flex-col justify-center gap-3">
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input 
                                                type="text" 
                                                value={url && url.startsWith('data:') ? '[Dữ liệu ảnh từ máy tính]' : url} 
                                                onChange={(e) => {
                                                    const newUrls = [...homeSettings.promoImageUrls];
                                                    newUrls[idx] = e.target.value;
                                                    handleChange('promoImageUrls', newUrls);
                                                }}
                                                readOnly={url && url.startsWith('data:') ? true : false}
                                                className={`w-full border-2 rounded-xl px-4 py-3 text-xs font-bold outline-none transition-all ${url && url.startsWith('data:') ? 'bg-slate-100 border-slate-100 text-slate-400 italic' : 'bg-white border-slate-100 focus:border-[#D4AF37]'}`} 
                                                placeholder="Dán liên kết ảnh (URL) tại đây..."
                                            />
                                            {url && url.startsWith('data:') && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newUrls = [...homeSettings.promoImageUrls];
                                                        newUrls[idx] = '';
                                                        handleChange('promoImageUrls', newUrls);
                                                    }}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 hover:text-rose-600 p-1.5 bg-rose-50 rounded-lg transition-colors"
                                                    title="Gỡ ảnh để nhập URL"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => fileInputRefs.current[idx]?.click()}
                                            className="px-5 bg-white border-2 border-slate-100 rounded-xl text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-all flex items-center justify-center shadow-sm"
                                            title="Tải ảnh lên từ PC"
                                        >
                                            <ImagePlus className="w-5 h-5" />
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                if (window.confirm(`Xóa Banner tại vị trí #${idx + 1}?`)) {
                                                    const newUrls = homeSettings.promoImageUrls.filter((_, i) => i !== idx);
                                                    handleChange('promoImageUrls', newUrls);
                                                }
                                            }} 
                                            className="px-5 bg-white border-2 border-slate-100 rounded-xl text-rose-300 hover:text-rose-500 hover:border-rose-100 transition-all flex items-center justify-center shadow-sm"
                                            title="Gỡ bỏ Slide này"
                                        >
                                            <Trash2Icon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    {/* Hidden Input File */}
                                    <input 
                                        type="file" 
                                        /* // Fix: Wrapped assignment in braces to ensure it returns void to satisfy TypeScript Ref requirements. */
                                        ref={el => { fileInputRefs.current[idx] = el; }}
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={(e) => handleImageUpload(e, idx)} 
                                    />
                                    
                                    <div className="flex items-center justify-between px-1">
                                        <p className="text-[8px] text-slate-400 uppercase font-black tracking-[0.2em]">Cấu hình Slide #{idx + 1}</p>
                                        {url && url.startsWith('data:') && (
                                            <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                                Ảnh cục bộ sẵn sàng lưu
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <button 
                        type="button" 
                        onClick={() => handleChange('promoImageUrls', [...homeSettings.promoImageUrls, ''])} 
                        className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] hover:border-[#00695C] hover:text-[#00695C] hover:bg-teal-50/50 transition-all group flex items-center justify-center gap-3"
                    >
                        <ImagePlus className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                        THÊM BANNER MỚI VÀO SLIDER
                    </button>
                </div>
                
                {/* Promo Text Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Màu nền Banner dự phòng</label>
                        <input type="color" value={homeSettings.promoBackgroundColor} onChange={(e) => handleChange('promoBackgroundColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" title="Màu nền banner" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Màu nhấn chủ đạo (Nút/Thẻ)</label>
                        <input type="color" value={homeSettings.promoAccentColor} onChange={(e) => handleChange('promoAccentColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" title="Màu nhấn" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tiêu đề (Dòng 1)</label>
                        <input type="text" value={homeSettings.promoTitle1} onChange={(e) => handleChange('promoTitle1', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 font-bold outline-none focus:border-[#D4AF37]" placeholder="VD: Tuyển tập" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Từ khóa nổi bật (Màu nhấn)</label>
                        <input type="text" value={homeSettings.promoTitleHighlight} onChange={(e) => handleChange('promoTitleHighlight', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 font-bold outline-none text-[#D4AF37] focus:border-[#D4AF37]" placeholder="VD: Giao mùa" />
                    </div>
                </div>
            </div>

            {/* 3. Flash Sale Banner Section */}
            <div className="border p-6 rounded-3xl bg-white shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px] text-slate-500 font-black">3</span>
                    Banner Flash Sale (Khu vực Đếm ngược)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Tiêu đề vùng Flash Sale</label>
                        <input type="text" value={homeSettings.flashSaleTitleText} onChange={(e) => handleChange('flashSaleTitleText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 font-black outline-none focus:border-[#D4AF37]" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Màu Gradient (Bắt đầu)</label>
                            <input type="color" value={homeSettings.flashSaleBgColorStart} onChange={(e) => handleChange('flashSaleBgColorStart', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" title="Màu bắt đầu" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest">Màu Gradient (Kết thúc)</label>
                            <input type="color" value={homeSettings.flashSaleBgColorEnd} onChange={(e) => handleChange('flashSaleBgColorEnd', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" title="Màu kết thúc" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-8 sticky bottom-0 bg-[#F7F5F2]/90 backdrop-blur-xl pb-10 z-20 border-t border-slate-100 mt-10">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full bg-[#111827] text-white py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG ĐỒNG BỘ DỮ LIỆU LÊN MÁY CHỦ...' : 'XÁC NHẬN LƯU VÀ XUẤT BẢN THAY ĐỔI'}
                </button>
                <p className="text-[9px] text-center text-slate-400 font-black uppercase tracking-[0.3em] mt-4 italic opacity-70">
                    Hệ thống sẽ đồng bộ tự động tới cơ sở dữ liệu Cloud Sigma Vie
                </p>
            </div>
        </form>
    );
};

export default HomePageSettingsTab;