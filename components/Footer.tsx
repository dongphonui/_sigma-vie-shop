
import React, { useState, useEffect } from 'react';
import { getSocialSettings } from '../utils/socialSettingsStorage';
import type { SocialSettings } from '../types';

interface FooterProps {
  isAdminLinkVisible: boolean;
}

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
);

const TwitterIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
);

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const Footer: React.FC<FooterProps> = ({ isAdminLinkVisible }) => {
  const [socials, setSocials] = useState<SocialSettings | null>(null);

  useEffect(() => {
    setSocials(getSocialSettings());
  }, []);

  const handleNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    window.location.hash = path;
  };

  return (
    <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200 mt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500">
        <p>&copy; {new Date().getFullYear()} Sigma Vie. Đã đăng ký bản quyền.</p>
        
        {socials && (
          <div className="flex justify-center space-x-6 mt-6">
            {socials.facebook && (
              <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors" title="Facebook">
                <FacebookIcon className="w-5 h-5" />
              </a>
            )}
            {socials.instagram && (
              <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors" title="Instagram">
                <InstagramIcon className="w-5 h-5" />
              </a>
            )}
            {socials.twitter && (
              <a href={socials.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors" title="Twitter">
                <TwitterIcon className="w-5 h-5" />
              </a>
            )}
            {socials.tiktok && (
              <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-[#D4AF37] transition-colors" title="TikTok">
                <TikTokIcon className="w-5 h-5" />
              </a>
            )}
          </div>
        )}

        <div className="mt-6 border-t border-gray-200 pt-6 flex justify-center space-x-6">
           <a href="#/about" onClick={(e) => handleNavigate(e, '/about')} className="text-sm hover:text-[#D4AF37] transition-colors">Về Chúng Tôi</a>
          {isAdminLinkVisible && (
            <a href="#/admin" onClick={(e) => handleNavigate(e, '/admin')} className="text-sm hover:text-[#D4AF37] transition-colors">Trang Quản Trị</a>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
