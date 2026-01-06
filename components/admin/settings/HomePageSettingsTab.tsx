
import React, { useState, useEffect } from 'react';
import type { HomePageSettings } from '../../../types';
import { getHomePageSettings, updateHomePageSettings } from '../../../utils/homePageSettingsStorage';
import { RefreshIcon } from '../../Icons';

const HomePageSettingsTab: React.FC = () => {
    const [homeSettings, setHomeSettings] = useState<HomePageSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [homeFeedback, setHomeFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setHomeSettings(getHomePageSettings());
    }, []);

    const handleChange = (field: keyof HomePageSettings, value: any) => {
        if (homeSettings) {
            setHomeSettings({ ...homeSettings, [field]: value });
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
                <h3 className="text-xl font-bold text-gray-800">Cấu hình Trang Chủ</h3>
                {homeFeedback && (
                    <div className={`px-4 py-2 rounded-lg text-xs font-bold animate-pulse ${homeFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {homeFeedback.msg}
                    </div>
                )}
            </div>
            
            {/* Hero Headline */}
            <div className="border p-6 rounded-2xl bg-white shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Tiêu đề chính (Headline)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Nội dung</label>
                        <input type="text" value={homeSettings.headlineText} onChange={(e) => handleChange('headlineText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 focus:border-[#D4AF37] outline-none font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Màu chữ</label>
                        <input type="color" value={homeSettings.headlineColor} onChange={(e) => handleChange('headlineColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Font chữ</label>
                        <select value={homeSettings.headlineFont} onChange={(e) => handleChange('headlineFont', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 focus:border-[#D4AF37] outline-none font-bold">
                            <option value="Playfair Display">Playfair Display (Serif)</option>
                            <option value="Poppins">Poppins (Sans-serif)</option>
                            <option value="Montserrat">Montserrat</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Kích thước (px/rem)</label>
                        <input type="text" value={homeSettings.headlineSize} onChange={(e) => handleChange('headlineSize', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 focus:border-[#D4AF37] outline-none font-bold" placeholder="VD: 3rem" />
                    </div>
                </div>
            </div>

            {/* Promotion Section */}
            <div className="border p-6 rounded-2xl bg-white shadow-sm space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Banner Quảng Cáo (Featured Promotion)</h4>
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Danh sách Hình ảnh (URL)</label>
                    {homeSettings.promoImageUrls.map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input 
                                type="text" 
                                value={url} 
                                onChange={(e) => {
                                    const newUrls = [...homeSettings.promoImageUrls];
                                    newUrls[idx] = e.target.value;
                                    handleChange('promoImageUrls', newUrls);
                                }}
                                className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 text-sm focus:border-[#D4AF37] outline-none" 
                                placeholder="https://..."
                            />
                            <button type="button" onClick={() => {
                                const newUrls = homeSettings.promoImageUrls.filter((_, i) => i !== idx);
                                handleChange('promoImageUrls', newUrls);
                            }} className="text-rose-400 hover:text-rose-600 px-2 font-bold text-xs">Xóa</button>
                        </div>
                    ))}
                    <button type="button" onClick={() => handleChange('promoImageUrls', [...homeSettings.promoImageUrls, ''])} className="text-[#00695C] text-xs font-black uppercase tracking-widest hover:underline">+ Thêm ảnh vào Slider</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Màu nền Banner</label>
                        <input type="color" value={homeSettings.promoBackgroundColor} onChange={(e) => handleChange('promoBackgroundColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Màu nhấn (Nút/Tag)</label>
                        <input type="color" value={homeSettings.promoAccentColor} onChange={(e) => handleChange('promoAccentColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Tiêu đề dòng 1</label>
                        <input type="text" value={homeSettings.promoTitle1} onChange={(e) => handleChange('promoTitle1', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Từ khóa nổi bật</label>
                        <input type="text" value={homeSettings.promoTitleHighlight} onChange={(e) => handleChange('promoTitleHighlight', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 font-bold outline-none text-[#D4AF37]" />
                    </div>
                </div>
            </div>

            {/* Flash Sale Section */}
            <div className="border p-6 rounded-2xl bg-white shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3. Cấu hình Banner Flash Sale</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Tiêu đề Flash Sale</label>
                        <input type="text" value={homeSettings.flashSaleTitleText} onChange={(e) => handleChange('flashSaleTitleText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2 font-black outline-none" />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Màu bắt đầu</label>
                            <input type="color" value={homeSettings.flashSaleBgColorStart} onChange={(e) => handleChange('flashSaleBgColorStart', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Màu kết thúc</label>
                            <input type="color" value={homeSettings.flashSaleBgColorEnd} onChange={(e) => handleChange('flashSaleBgColorEnd', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 sticky bottom-0 bg-[#F7F5F2]/80 backdrop-blur-sm pb-6 z-10">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full bg-[#111827] text-white py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG ĐẨY DỮ LIỆU LÊN SERVER...' : 'LƯU VÀ CẬP NHẬT TRANG CHỦ'}
                </button>
            </div>
        </form>
    );
};

export default HomePageSettingsTab;
