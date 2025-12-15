
import React, { useState, useEffect } from 'react';
import type { AboutPageContent, AboutPageSettings } from '../../../types';
import { getAboutPageContent, updateAboutPageContent } from '../../../utils/aboutPageStorage';
import { getAboutPageSettings, updateAboutPageSettings } from '../../../utils/aboutPageSettingsStorage';
import { ImagePlus } from '../../Icons';

const AboutPageSettingsTab: React.FC = () => {
    const [aboutContent, setAboutContent] = useState<AboutPageContent | null>(null);
    const [aboutSettings, setAboutSettings] = useState<AboutPageSettings | null>(null);
    const [aboutFeedback, setAboutFeedback] = useState('');

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
            };
            reader.onerror = () => {
                setAboutFeedback('Lỗi: Không thể đọc file.');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (aboutContent && aboutSettings) {
            updateAboutPageContent(aboutContent);
            updateAboutPageSettings(aboutSettings);
            setAboutFeedback('Đã lưu cài đặt trang Giới thiệu thành công!');
            setTimeout(() => setAboutFeedback(''), 3000);
        }
    };

    if (!aboutContent || !aboutSettings) return <p>Đang tải dữ liệu...</p>;

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
            {/* Hero Section */}
            <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Phần Hero (Đầu trang)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề chính</label>
                        <input type="text" value={aboutContent.heroTitle} onChange={(e) => handleContentChange('heroTitle', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phụ đề</label>
                        <input type="text" value={aboutContent.heroSubtitle} onChange={(e) => handleContentChange('heroSubtitle', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh nền Hero</label>
                            <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded inline-flex items-center">
                                <ImagePlus className="w-4 h-4 mr-2" />
                                <span>Tải ảnh lên</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'heroImageUrl')} />
                            </label>
                            <img src={aboutContent.heroImageUrl} alt="Hero" className="h-20 w-32 object-cover rounded border" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Welcome Section */}
            <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Phần Chào mừng</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
                        <input type="text" value={aboutContent.welcomeHeadline} onChange={(e) => handleContentChange('welcomeHeadline', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                        <textarea rows={3} value={aboutContent.welcomeText} onChange={(e) => handleContentChange('welcomeText', e.target.value)} className="w-full border rounded px-3 py-2" />
                    </div>
                </div>
            </div>

            {/* Styling Settings */}
            <div className="border-b pb-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Cài đặt Giao diện</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu tiêu đề</label>
                        <input type="color" value={aboutSettings.headingColor} onChange={(e) => handleSettingsChange('headingColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Font tiêu đề</label>
                        <select value={aboutSettings.headingFont} onChange={(e) => handleSettingsChange('headingFont', e.target.value)} className="w-full border rounded px-3 py-2">
                            <option value="Playfair Display">Playfair Display (Serif)</option>
                            <option value="Poppins">Poppins (Sans-serif)</option>
                        </select>
                    </div>
                        <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu nút bấm</label>
                        <input type="color" value={aboutSettings.buttonBgColor} onChange={(e) => handleSettingsChange('buttonBgColor', e.target.value)} className="w-full h-10 p-1 border rounded" />
                    </div>
                </div>
            </div>

            <button type="submit" className="w-full bg-[#D4AF37] text-white py-3 rounded font-bold hover:bg-[#b89b31]">Lưu Cấu Hình Trang</button>
                {aboutFeedback && (
                    <div className="mt-4 text-center text-green-600 font-medium animate-pulse">{aboutFeedback}</div>
                )}
        </form>
    );
};

export default AboutPageSettingsTab;
