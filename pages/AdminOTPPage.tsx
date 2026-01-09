import React, { useState, useEffect } from 'react';
import { verifyTotpToken } from '../utils/adminSettingsStorage';
import { recordAdminLogin } from '../utils/apiClient';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'SMS_EMAIL' | 'TOTP'>('SMS_EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState<string | null>(null);
  const [showRescueButton, setShowRescueButton] = useState(false);

  useEffect(() => {
    const method = sessionStorage.getItem('authMethod') as any;
    if (method) setAuthMethod(method);
    
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (otpDataString) {
        try {
            const otpData = JSON.parse(otpDataString);
            setEmergencyCode(otpData.otp);
        } catch (e) {}
    }

    // Sau 10 giây, nếu user chưa nhập xong, hiện gợi ý mã khẩn cấp (vì có thể SMS bị nghẽn)
    const timer = setTimeout(() => setShowRescueButton(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
        let isSuccess = false;

        if (authMethod === 'TOTP') {
            if (verifyTotpToken(otp)) isSuccess = true;
        } else {
            const otpDataString = sessionStorage.getItem('otpVerification');
            const otpData = otpDataString ? JSON.parse(otpDataString) : null;
            
            // Kiểm tra mã OTP và thời hạn
            if (otpData && otp === otpData.otp) {
                if (Date.now() <= otpData.expiry) {
                    isSuccess = true;
                } else {
                    setError('Mã OTP đã hết hạn. Vui lòng đăng nhập lại.');
                    setIsLoading(false);
                    return;
                }
            }
        }

        if (isSuccess) {
            // Hoàn tất đăng nhập: chuyển từ pendingAdminUser sang adminUser chính thức
            const pendingUser = sessionStorage.getItem('pendingAdminUser');
            if (pendingUser) {
                sessionStorage.setItem('adminUser', pendingUser);
                sessionStorage.removeItem('pendingAdminUser');
            }
            
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.removeItem('otpVerification');
            
            console.log("[OTP] ✅ Verification successful.");
            await recordAdminLogin(authMethod, 'SUCCESS', 'admin');
            window.location.hash = '/admin';
        } else {
            setError('Mã xác thực không chính xác.');
            await recordAdminLogin(authMethod, 'FAILED', 'admin');
        }
    } catch (err) {
        console.error("[OTP] Error:", err);
        setError('Lỗi hệ thống xác thực.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleShowRescueCode = () => {
      if (emergencyCode) {
          alert(`MÃ CỨU HỘ KHẨN CẤP\n\nNếu tin nhắn SMS chưa tới, hãy sử dụng mã này để đăng nhập:\n\n👉 ${emergencyCode}`);
      } else {
          alert("Phiên làm việc đã hết hạn hoặc không tìm thấy mã OTP. Vui lòng quay lại trang Đăng nhập.");
          window.location.hash = '/login';
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-float-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#D4AF37] shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Xác minh bảo mật</h1>
          <p className="text-gray-400 mt-2 text-[10px] font-bold uppercase tracking-widest leading-relaxed px-4">
             {authMethod === 'TOTP' 
                ? 'Mở ứng dụng Google Authenticator trên điện thoại để lấy mã 6 số' 
                : 'Chúng tôi đã gửi mã xác thực đến điện thoại và email của bạn'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 text-center text-3xl font-black tracking-[0.5em] focus:border-[#D4AF37] focus:bg-white outline-none transition-all shadow-inner"
                required
                maxLength={6}
                autoFocus
            />
          </div>
          
          {error && (
            <p className="text-rose-500 text-[10px] font-black uppercase text-center bg-rose-50 py-2 rounded-lg border border-rose-100">
                {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#111827] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'ĐANG KIỂM TRA...' : 'XÁC NHẬN TRUY CẬP'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-4">
            {showRescueButton && authMethod === 'SMS_EMAIL' && (
                <button 
                    onClick={handleShowRescueCode}
                    className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline animate-pulse bg-rose-50 px-4 py-2 rounded-full border border-rose-100"
                >
                    ⚠️ Không nhận được mã? Nhấn để lấy mã cứu hộ
                </button>
            )}
            <br/>
            <a href="#/login" className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-800 transition-colors">
                ← Quay lại trang đăng nhập
            </a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;