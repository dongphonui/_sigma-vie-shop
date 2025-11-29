
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getAboutPageContent } from '../utils/aboutPageStorage';
import { getAboutPageSettings } from '../utils/aboutPageSettingsStorage';
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
        setContent(getAboutPageContent());
        setSettings(getAboutPageSettings());
    }, []);

    const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        e.preventDefault();
        window.location.hash = path;
    };

    if (!content || !settings) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2]">
                <p className="text-gray-700">Đang tải...</p>
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
            <main>
                <div className="relative h-96 bg-gray-800 flex items-center justify-center text-white">
                    <img 
                        src={content.heroImageUrl} 
                        alt="Fashion workshop" 
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                    <div className="relative z-10 text-center px-4">
                        <h1 className="text-5xl md:text-7xl font-bold font-serif tracking-wider">{content.heroTitle}</h1>
                        <p className="mt-4 text-xl">{content.heroSubtitle}</p>
                    </div>
                </div>

                <div className="bg-white py-20">
                    <div className="container mx-auto px-6 lg:px-8 max-w-4xl">
                        <div className="text-center">
                             <h2 className="text-4xl font-serif" style={headingStyle}>{content.welcomeHeadline}</h2>
                             <p className="mt-4 text-lg leading-relaxed" style={paragraphStyle}>
                                {content.welcomeText}
                            </p>
                        </div>

                        <div className="mt-20 grid md:grid-cols-2 gap-16 items-center">
                            <div>
                                <h3 className="text-3xl font-serif mb-4" style={headingStyle}>{content.philosophyTitle}</h3>
                                <p className="leading-relaxed mb-4" style={paragraphStyle}>
                                    {content.philosophyText1}
                                </p>
                                <p className="leading-relaxed" style={paragraphStyle}>
                                    {content.philosophyText2}
                                </p>
                            </div>
                            <div>
                                <img src={content.philosophyImageUrl} alt="Detailed fabric" className="rounded-lg shadow-xl" />
                            </div>
                        </div>

                        <div className="mt-20 text-center">
                             <h2 className="text-4xl font-serif" style={headingStyle}>{content.journeyTitle}</h2>
                            <p className="mt-4 text-lg leading-relaxed max-w-2xl mx-auto" style={paragraphStyle}>
                                {content.journeyText}
                            </p>
                            <a 
                                href="#/" 
                                onClick={(e) => handleNavigate(e, '/')}
                                className="mt-8 inline-block font-bold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity duration-300"
                                style={buttonStyle}
                            >
                                Khám phá Bộ sưu tập
                            </a>
                        </div>
                    </div>
                </div>
            </main>
            <Footer isAdminLinkVisible={isAdminLinkVisible} />
        </>
    );
};

export default AboutPage;
