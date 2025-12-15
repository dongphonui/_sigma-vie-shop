
import React, { useState, useEffect } from 'react';
import type { HomePageSettings } from '../../../types';
import { getHomePageSettings, updateHomePageSettings } from '../../../utils/homePageSettingsStorage';

const HomePageSettingsTab: React.FC = () => {
    const [homeSettings, setHomeSettings] = useState<HomePageSettings | null>(null);
    const [homeFeedback, setHomeFeedback] = useState('');

    useEffect(() => {
        setHomeSettings(getHomePageSettings());
    }, []);

    const handleChange = (field: keyof HomePageSettings, value: any) => {
        if (homeSettings) {
            setHomeSettings({ ...homeSettings, [field]: value });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (homeSettings) {
            updateHomePageSettings(homeSettings);
            setHomeFeedback('Cập nhật Trang chủ thành công!');
            setTimeout(() => setHomeFeedback(''), 3000);
        }
    };

    if (!homeSettings) return <p>Đang tải dữ liệu...</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Cấu hình Trang Chủ</h3>
            
            {/* Hero Headline */}
            <div className="border p-4 rounded-lg bg-gray-50">
                <h4 className="font-bold text-gray-700 mb-3">Tiêu đề chính (Headline)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={homeSettings.headlineText} onChange={(e) => handleChange('headlineText', e.target.value)} className="border rounded px-3 py-2" placeholder="Nội dung tiêu đề" />
                    <input type="color" value={homeSettings.headlineColor} onChange={(e) => handleChange('headlineColor', e.target.value)} className="w-full h-10 p-1 border rounded" title="Màu chữ" />
                    <select value={homeSettings.headlineFont} onChange={(e) => handleChange('headlineFont', e.target.value)} className="border rounded px-3 py-2">
                        <option value="Playfair Display">Playfair Display</option>
                        <option value="Poppins">Poppins</option>
                    </select>
                    <input type="text" value={homeSettings.headlineSize} onChange={(e) => handleChange('headlineSize', e.target.value)} className="border rounded px-3 py-2" placeholder="Kích thước (VD: 3rem)" />
                </div>
            </div>

            {/* Promotion Section */}
            <div className="border p-4 rounded-lg bg-gray-50">
                <h4 className="font-bold text-gray-700 mb-3">Banner Quảng Cáo (Featured)</h4>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase">Hình ảnh (URL)</label>
                        {homeSettings.promoImageUrls.map((url, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input 
                                    type="text" 
                                    value={url} 
                                    onChange={(e) => {
                                        const newUrls = [...homeSettings.promoImageUrls];
                                        newUrls[idx] = e.target.value;
                                        handleChange('promoImageUrls', newUrls);
                                    }}
                                    className="border rounded px-3 py-2 flex-1 text-sm" 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        const newUrls = homeSettings.promoImageUrls.filter((_, i) => i !== idx);
                                        handleChange('promoImageUrls', newUrls);
                                    }}
                                    className="text-red-500 text-xs hover:underline"
                                >
                                    Xóa
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={() => handleChange('promoImageUrls', [...homeSettings.promoImageUrls, ''])}
                            className="text-blue-600 text-sm hover:underline"
                        >
                            + Thêm ảnh
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" value={homeSettings.promoTitle1} onChange={(e) => handleChange('promoTitle1', e.target.value)} className="border rounded px-3 py-2" placeholder="Dòng 1" />
                        <input type="text" value={homeSettings.promoTitle2} onChange={(e) => handleChange('promoTitle2', e.target.value)} className="border rounded px-3 py-2" placeholder="Dòng 2" />
                        <input type="text" value={homeSettings.promoTitleHighlight} onChange={(e) => handleChange('promoTitleHighlight', e.target.value)} className="border rounded px-3 py-2" placeholder="Từ khóa nổi bật" />
                        <input type="color" value={homeSettings.promoBackgroundColor} onChange={(e) => handleChange('promoBackgroundColor', e.target.value)} className="w-full h-10 p-1 border rounded" title="Màu nền" />
                    </div>
                </div>
            </div>

            {/* Flash Sale Section */}
            <div className="border p-4 rounded-lg bg-gray-50">
                <h4 className="font-bold text-gray-700 mb-3">Banner Flash Sale</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={homeSettings.flashSaleTitleText} onChange={(e) => handleChange('flashSaleTitleText', e.target.value)} className="border rounded px-3 py-2" placeholder="Tiêu đề Flash Sale" />
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 block">Màu bắt đầu (Gradient)</label>
                            <input type="color" value={homeSettings.flashSaleBgColorStart} onChange={(e) => handleChange('flashSaleBgColorStart', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 block">Màu kết thúc</label>
                            <input type="color" value={homeSettings.flashSaleBgColorEnd} onChange={(e) => handleChange('flashSaleBgColorEnd', e.target.value)} className="w-full h-10 p-1 border rounded" />
                        </div>
                    </div>
                </div>
            </div>

            <button type="submit" className="w-full bg-[#D4AF37] text-white py-3 rounded font-bold hover:bg-[#b89b31]">Lưu Cấu Hình Trang Chủ</button>
            {homeFeedback && <p className="text-center text-green-600 mt-2 font-medium animate-pulse">{homeFeedback}</p>}
        </form>
    );
};

export default HomePageSettingsTab;
