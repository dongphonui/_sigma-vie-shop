
import React, { useState, useEffect } from 'react';
import type { HeaderSettings } from '../../../types';
import { getHeaderSettings, updateHeaderSettings } from '../../../utils/headerSettingsStorage';
import { ImagePlus } from '../../Icons';

const HeaderSettingsTab: React.FC = () => {
    const [headerSettings, setHeaderSettings] = useState<HeaderSettings | null>(null);
    const [headerFeedback, setHeaderFeedback] = useState('');

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
            const reader = new FileReader();
            reader.onloadend = () => {
                setHeaderSettings({ ...headerSettings, logoUrl: reader.result as string });
            };
            reader.onerror = () => {
                setHeaderFeedback('Lỗi: Không thể đọc file logo.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (headerSettings) {
            updateHeaderSettings(headerSettings);
            setHeaderFeedback('Cập nhật Header thành công!');
            setTimeout(() => setHeaderFeedback(''), 3000);
        }
    };

    if (!headerSettings) return <p>Đang tải...</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-800 mb-6">Cấu hình Header & Logo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tên thương hiệu (Brand Name)</label>
                        <input type="text" value={headerSettings.brandName} onChange={(e) => handleChange('brandName', e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu thương hiệu</label>
                        <input type="color" value={headerSettings.brandColor} onChange={(e) => handleChange('brandColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                </div>
                <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Logo (Hình ảnh)</label>
                        <div className="flex items-center gap-4">
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded inline-flex items-center">
                            <ImagePlus className="w-4 h-4 mr-2" />
                            <span>Tải Logo lên</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                        </label>
                        {headerSettings.logoUrl && (
                            <img src={headerSettings.logoUrl} alt="Logo Preview" className="h-12 object-contain border rounded p-1 bg-gray-50" />
                        )}
                    </div>
                </div>
                
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu nền Header</label>
                        <input type="text" value={headerSettings.brandBackgroundColor} onChange={(e) => handleChange('brandBackgroundColor', e.target.value)} className="w-full border rounded px-3 py-2" placeholder="VD: rgba(255, 255, 255, 0.9)" />
                </div>
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font chữ Menu</label>
                        <select value={headerSettings.navFont} onChange={(e) => handleChange('navFont', e.target.value)} className="w-full border rounded px-3 py-2">
                        <option value="Poppins">Poppins</option>
                        <option value="Playfair Display">Playfair Display</option>
                        </select>
                </div>
                <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu chữ Menu</label>
                        <input type="color" value={headerSettings.navColor} onChange={(e) => handleChange('navColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu Hover Menu</label>
                        <input type="color" value={headerSettings.navHoverColor} onChange={(e) => handleChange('navHoverColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                </div>
            </div>

            <button type="submit" className="w-full bg-[#D4AF37] text-white py-3 rounded font-bold hover:bg-[#b89b31]">Lưu Cấu Hình Header</button>
            {headerFeedback && <p className="text-center text-green-600 mt-2 font-medium animate-pulse">{headerFeedback}</p>}
        </form>
    );
};

export default HeaderSettingsTab;
