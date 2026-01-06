
import React, { useState, useEffect } from 'react';
import type { HeaderSettings } from '../../../types';
import { getHeaderSettings, updateHeaderSettings } from '../../../utils/headerSettingsStorage';
import { ImagePlus, RefreshIcon } from '../../Icons';

const HeaderSettingsTab: React.FC = () => {
    const [headerSettings, setHeaderSettings] = useState<HeaderSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [headerFeedback, setHeaderFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setHeaderSettings(getHeaderSettings());
    }, []);

    const handleChange = (field: keyof HeaderSettings, value: string) => {
        if (headerSettings) {
            setHeaderSettings({ ...headerSettings, [field]: value });
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && headerSettings) {
            if (file.size > 2 * 1024 * 1024) {
                setHeaderFeedback({ msg: '❌ Logo quá lớn (Tối đa 2MB)', type: 'error' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setHeaderSettings({ ...headerSettings, logoUrl: reader.result as string });
                setHeaderFeedback({ msg: '✨ Đã nhận diện Logo mới', type: 'success' });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!headerSettings) return;

        setIsSaving(true);
        setHeaderFeedback(null);

        try {
            const result = await updateHeaderSettings(headerSettings);
            if (result.success) {
                setHeaderFeedback({ msg: '✅ Header & Logo đã được đẩy lên server!', type: 'success' });
            } else {
                setHeaderFeedback({ msg: '⚠️ Lưu local thành công nhưng server từ chối.', type: 'error' });
            }
        } catch (error) {
            setHeaderFeedback({ msg: '❌ Lỗi hệ thống: Không thể kết nối database.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setHeaderFeedback(null), 5000);
        }
    };

    if (!headerSettings) return <div className="p-10 text-center text-slate-400">Đang tải...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình Header & Logo</h3>
                {headerFeedback && (
                    <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${headerFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {headerFeedback.msg}
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên thương hiệu (Text Logo)</label>
                        <input type="text" value={headerSettings.brandName} onChange={(e) => handleChange('brandName', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2.5 font-bold outline-none transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu chủ đạo</label>
                            <input type="color" value={headerSettings.brandColor} onChange={(e) => handleChange('brandColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Màu nền Header</label>
                            <input type="text" value={headerSettings.brandBackgroundColor} onChange={(e) => handleChange('brandBackgroundColor', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-bold" placeholder="rgba(255,255,255,0.9)" />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo hình ảnh (Graphic Logo)</label>
                    <div className="flex items-center gap-6 p-5 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <label className="w-20 h-20 bg-white border-2 border-slate-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] transition-all shrink-0">
                            <ImagePlus className="w-6 h-6 text-slate-300" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                        {headerSettings.logoUrl ? (
                            <div className="relative group">
                                <img src={headerSettings.logoUrl} alt="Logo Preview" className="h-20 object-contain border-2 border-white rounded-lg shadow-md bg-white" />
                                <button type="button" onClick={() => handleChange('logoUrl', '')} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                </button>
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Chưa tải Logo lên</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Font chữ Menu</label>
                    <select value={headerSettings.navFont} onChange={(e) => handleChange('navFont', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none">
                        <option value="Poppins">Poppins</option>
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Montserrat">Montserrat</option>
                        <option value="Roboto">Roboto</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Màu chữ Menu</label>
                    <input type="color" value={headerSettings.navColor} onChange={(e) => handleChange('navColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Màu Hover Menu</label>
                    <input type="color" value={headerSettings.navHoverColor} onChange={(e) => handleChange('navHoverColor', e.target.value)} className="w-full h-10 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                </div>
            </div>

            <div className="pt-8 flex justify-center">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-[#00695C] text-white px-16 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-[#004d40] transition-all disabled:opacity-50 flex items-center gap-3"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG SYNC CLOUD...' : 'LƯU CẤU HÌNH HEADER'}
                </button>
            </div>
        </form>
    );
};

export default HeaderSettingsTab;
