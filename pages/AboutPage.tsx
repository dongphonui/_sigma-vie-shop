
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getAboutPageContent, ABOUT_CONTENT_EVENT } from '../utils/aboutPageStorage';
import { getAboutPageSettings, ABOUT_SETTINGS_EVENT } from '../utils/aboutPageSettingsStorage';
import type { AboutPageContent, AboutPageSettings } from '../types';

interface AboutPageProps {
    isAdminLinkVisible: boolean;
    cartItemCount?: number;
    onOpenCart?: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ isAdminLinkVisible, cartItemCount, onOpenCart }) => {
    const [content, setContent] = useState<AboutPageContent | null>(null);
    const [settings, setSettings] = useState<AboutPageSettings | null>(null);

    useEffect(() => {
        // Initial load
        setContent(getAboutPageContent());
        setSettings(getAboutPageSettings());

        // Event Listeners for Live Updates
        const handleContentUpdate = () => setContent(getAboutPageContent());
        const handleSettingsUpdate = () => setSettings(getAboutPageSettings());

        window.addEventListener(ABOUT_CONTENT_EVENT, handleContentUpdate);
        window.addEventListener(ABOUT_SETTINGS_EVENT, handleSettingsUpdate);

        return () => {
            window.removeEventListener(ABOUT_CONTENT_EVENT, handleContentUpdate);
            window.removeEventListener(ABOUT_SETTINGS_EVENT, handleSettingsUpdate);
        };
    }, []);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.location.hash = path;
    };

    if (!content || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
                <p className="text-gray-700">Đang tải dữ liệu...</p>
            </div>
        );
    }

    const headingStyle = {
        color: settings.headingColor,
        fontFamily: `'${settings.headingFont}', serif`,
    };

    const paragraphStyle = {
        color: settings.paragraphColor,
        fontFamily: `'${settings.paragraphFont}', sans-serif`,
    };

    const buttonStyle = {
        backgroundColor: settings.buttonBgColor,
        color: settings.buttonTextColor,
        fontFamily: `'Poppins', sans-serif`,
    };

    return (
        <>
            <Header cartItemCount={cartItemCount} onOpenCart={onOpenCart} />
            <main className="animate-fade-in-up">
                <div className="relative h-96 bg-gray-800 flex items-center justify-center text-white overflow-hidden">
                    <img 
                        src={content.heroImageUrl} 
                        alt="Hero Background" 
                        className="absolute inset-0 w-full h-full object-cover opacity-40 transform scale-105"
                    />
                    <div className="relative z-10 text-center px-4 max-w-4xl">
                        <h1 className="text-5xl md:text-7xl font-bold font-serif tracking-wider drop-shadow-md">{content.heroTitle}</h1>
                        <p className="mt-4 text-xl md:text-2xl font-light opacity-90">{content.heroSubtitle}</p>
                    </div>
                </div>

                <div className="bg-white py-20">
                    <div className="container mx-auto px-6 lg:px-8 max-w-5xl">
                        <div className="text-center mb-20">
                             <h2 className="text-4xl font-serif font-bold mb-6 relative inline-block pb-4" style={headingStyle}>
                                {content.welcomeHeadline}
                                <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-[#D4AF37] rounded-full"></span>
                             </h2>
                             <p className="text-lg leading-relaxed text-gray-600 max-w-3xl mx-auto" style={paragraphStyle}>
                                {content.welcomeText}
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
                            <div className="order-2 md:order-1">
                                <h3 className="text-3xl font-serif font-bold mb-6" style={headingStyle}>{content.philosophyTitle}</h3>
                                <p className="leading-relaxed mb-6 text-lg" style={paragraphStyle}>
                                    {content.philosophyText1}
                                </p>
                                <p className="leading-relaxed text-lg" style={paragraphStyle}>
                                    {content.philosophyText2}
                                </p>
                            </div>
                            <div className="order-1 md:order-2">
                                <div className="relative rounded-lg overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-500">
                                    <img src={content.philosophyImageUrl} alt="Our Philosophy" className="w-full h-auto" />
                                    <div className="absolute inset-0 border-8 border-white/20"></div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center bg-[#F7F5F2] p-12 rounded-2xl shadow-inner">
                             <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6" style={headingStyle}>{content.journeyTitle}</h2>
                            <p className="text-lg leading-relaxed max-w-2xl mx-auto mb-8" style={paragraphStyle}>
                                {content.journeyText}
                            </p>
                            <a 
                                href="#/" 
                                onClick={(e) => handleNavigate(e, '/')}
                                className="inline-block font-bold py-4 px-10 rounded-full hover:shadow-lg hover:transform hover:-translate-y-1 transition-all duration-300"
                                style={buttonStyle}
                            >
                                Khám phá Bộ sưu tập
                            </a>
                        </div>
                    </div>
                </div>
            </main>
            <Footer isAdminLinkVisible={isAdminLinkVisible} />
            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.6s ease-out forwards;
                }
            `}</style>
        </>
    );
};

export default AboutPage;
