
import React, { useState, useEffect } from 'react';
import type { ProductPageSettings } from '../../../types';
import { getProductPageSettings, updateProductPageSettings } from '../../../utils/productPageSettingsStorage';
import { RefreshIcon, AlertCircleIcon } from '../../Icons';

const ProductPageSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<ProductPageSettings | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null);

    useEffect(() => {
        setSettings(getProductPageSettings());
    }, []);

    const handleChange = (field: keyof ProductPageSettings, value: any) => {
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
            const result = await updateProductPageSettings(settings);
            if (result.success) {
                setFeedback({ msg: '✅ Giao diện sản phẩm đã được đẩy lên server!', type: 'success' });
            } else {
                setFeedback({ 
                    msg: `⚠️ Lỗi: ${result.message || 'Server không phản hồi.'}`, 
                    type: 'warning' 
                });
            }
        } catch (error: any) {
            console.error("Submit Error:", error);
            setFeedback({ 
                msg: '❌ Thất bại: Không thể kết nối máy chủ. Vui lòng kiểm tra cấu hình Backend.', 
                type: 'error' 
            });
        } finally {
            setIsSaving(false);
            setTimeout(() => setFeedback(null), 8000);
        }
    };

    if (!settings) return <div className="p-10 text-center text-slate-400">Đang tải dữ liệu...</div>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Giao diện chi tiết sản phẩm</h3>
                {feedback && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold animate-pulse shadow-sm border ${
                        feedback.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                        feedback.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                        'bg-rose-50 border-rose-100 text-rose-600'
                    }`}>
                        {feedback.type !== 'success' && <AlertCircleIcon className="w-4 h-4" />}
                        {feedback.msg}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Typography Section */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">1. Tiêu đề sản phẩm</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu sắc</label>
                                <input type="color" value={settings.titleColor} onChange={e => handleChange('titleColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Cỡ chữ</label>
                                <input type="text" value={settings.titleSize} onChange={e => handleChange('titleSize', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-black" placeholder="24px" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">2. Hiển thị Giá tiền</h4>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu sắc giá</label>
                                <input type="color" value={settings.priceColor} onChange={e => handleChange('priceColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl cursor-pointer" />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Cỡ chữ giá</label>
                                <input type="text" value={settings.priceSize} onChange={e => handleChange('priceSize', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-black" placeholder="20px" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-12 h-6 rounded-full transition-all relative ${settings.qrIconVisible ? 'bg-slate-900' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.qrIconVisible ? 'left-7' : 'left-1'}`}></div>
                            </div>
                            <input type="checkbox" className="hidden" checked={settings.qrIconVisible} onChange={e => handleChange('qrIconVisible', e.target.checked)} />
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Hiện mã QR trên ảnh SP</span>
                        </label>
                    </div>
                </div>

                {/* Labels & Buttons Section */}
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">3. Nhãn Mã hiệu (Badge)</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Tên nhãn hiển thị</label>
                                <input type="text" value={settings.badgeLabel} onChange={e => handleChange('badgeLabel', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-bold" placeholder="Mã hiệu / SKU" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu nền nhãn</label>
                                    <input type="color" value={settings.badgeBgColor} onChange={e => handleChange('badgeBgColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu chữ nhãn</label>
                                    <input type="color" value={settings.badgeTextColor} onChange={e => handleChange('badgeTextColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] border-b pb-2">4. Nút bấm Mua hàng</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Nội dung nút</label>
                                <input type="text" value={settings.buyBtnText} onChange={e => handleChange('buyBtnText', e.target.value)} className="w-full border-2 border-slate-50 bg-slate-50 rounded-xl px-4 py-2.5 text-sm font-black" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu nền nút</label>
                                    <input type="color" value={settings.buyBtnBgColor} onChange={e => handleChange('buyBtnBgColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Màu chữ nút</label>
                                    <input type="color" value={settings.buyBtnTextColor} onChange={e => handleChange('buyBtnTextColor', e.target.value)} className="w-full h-11 p-1 border-2 border-slate-50 bg-slate-50 rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-10 border-t border-slate-50 flex flex-col items-center gap-4">
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="bg-[#111827] text-white px-20 py-5 rounded-full font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                    {isSaving && <RefreshIcon className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'ĐANG ĐỒNG BỘ MÁY CHỦ...' : 'XÁC NHẬN LƯU THAY ĐỔI'}
                </button>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic text-center">
                    Gợi ý: Nếu vẫn lỗi kết nối, hãy kiểm tra xem bạn đã cấu hình <code className="bg-slate-100 px-1">VITE_API_URL</code> trong trang quản lý của Render chưa.
                </p>
            </div>
        </form>
    );
};

export default ProductPageSettingsTab;
