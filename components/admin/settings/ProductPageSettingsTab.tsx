
import React, { useState, useEffect } from 'react';
import type { ProductPageSettings } from '../../../types';
import { getProductPageSettings, updateProductPageSettings } from '../../../utils/productPageSettingsStorage';

const ProductPageSettingsTab: React.FC = () => {
    const [settings, setSettings] = useState<ProductPageSettings | null>(null);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        setSettings(getProductPageSettings());
    }, []);

    const handleChange = (field: keyof ProductPageSettings, value: any) => {
        if (settings) {
            setSettings({ ...settings, [field]: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (settings) {
            updateProductPageSettings(settings);
            setFeedback('✅ Đã lưu cấu hình giao diện sản phẩm!');
            setTimeout(() => setFeedback(''), 3000);
        }
    };

    if (!settings) return <p>Đang tải...</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in-up bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Typography Section */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2">1. Tiêu đề sản phẩm</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Màu sắc</label>
                            <input type="color" value={settings.titleColor} onChange={e => handleChange('titleColor', e.target.value)} className="w-full h-10 p-1 border rounded cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kích thước</label>
                            <input type="text" value={settings.titleSize} onChange={e => handleChange('titleSize', e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-bold" placeholder="24px" />
                        </div>
                    </div>
                    
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2 pt-4">2. Hiển thị Giá tiền</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Màu sắc giá</label>
                            <input type="color" value={settings.priceColor} onChange={e => handleChange('priceColor', e.target.value)} className="w-full h-10 p-1 border rounded cursor-pointer" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Kích thước giá</label>
                            <input type="text" value={settings.priceSize} onChange={e => handleChange('priceSize', e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-bold" placeholder="20px" />
                        </div>
                    </div>

                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2 pt-4">3. QR Code & Biểu tượng</h4>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={settings.qrIconVisible} onChange={e => handleChange('qrIconVisible', e.target.checked)} className="w-4 h-4 text-black rounded" />
                            <span className="text-sm font-bold text-slate-700">Hiển thị Icon QR trên ảnh sản phẩm</span>
                        </label>
                    </div>
                </div>

                {/* Labels & Buttons Section */}
                <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2">4. Nhãn Mã hiệu (Badge)</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nội dung nhãn</label>
                            <input type="text" value={settings.badgeLabel} onChange={e => handleChange('badgeLabel', e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-bold" placeholder="Mã hiệu / SKU" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Màu nền nhãn</label>
                                <input type="color" value={settings.badgeBgColor} onChange={e => handleChange('badgeBgColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Màu chữ nhãn</label>
                                <input type="color" value={settings.badgeTextColor} onChange={e => handleChange('badgeTextColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                            </div>
                        </div>
                    </div>

                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-2 pt-4">5. Nút bấm mua hàng</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Chữ trên nút</label>
                            <input type="text" value={settings.buyBtnText} onChange={e => handleChange('buyBtnText', e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-bold" placeholder="XÁC NHẬN SỞ HỮU" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Màu nền nút</label>
                                <input type="color" value={settings.buyBtnBgColor} onChange={e => handleChange('buyBtnBgColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Màu chữ nút</label>
                                <input type="color" value={settings.buyBtnTextColor} onChange={e => handleChange('buyBtnTextColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="pt-8 border-t flex flex-col items-center gap-4">
                <button type="submit" className="bg-black text-white px-16 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-slate-800 transition-all active:scale-95">
                    Lưu Thay Đổi Giao Diện
                </button>
                {feedback && <p className="text-green-600 font-bold animate-pulse text-sm">{feedback}</p>}
            </div>
        </form>
    );
};

export default ProductPageSettingsTab;
