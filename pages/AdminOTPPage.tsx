import React, { useState, useEffect } from 'react';
import { verifyTotpToken } from '../utils/adminSettingsStorage';
import { recordAdminLogin } from '../utils/apiClient';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'SMS_EMAIL' | 'TOTP'>('SMS_EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const method = sessionStorage.getItem('authMethod') as any;
    if (method) setAuthMethod(method);
    
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (otpDataString) {
        const otpData = JSON.parse(otpDataString);
        setEmergencyCode(otpData.otp);
    }

    // Sau 6 giây hiện gợi ý mã khẩn cấp
    const timer = setTimeout(() => setShowHint(true), 6000);
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
            if (otpData && otp === otpData.otp) isSuccess = true;
        }

        if (isSuccess) {
            // Hoàn tất đăng nhập
            const pendingUser = sessionStorage.getItem('pendingAdminUser');
            if (pendingUser) sessionStorage.setItem('adminUser', pendingUser);
            
            sessionStorage.setItem('isAuthenticated', 'true');
            sessionStorage.removeItem('otpVerification');
            sessionStorage.removeItem('pendingAdminUser');
            
            await recordAdminLogin(authMethod, 'SUCCESS', 'admin');
            window.location.hash = '/admin';
        } else {
            setError('Mã xác thực không chính xác.');
            await recordAdminLogin(authMethod, 'FAILED', 'admin');
        }
    } catch (err) {
        setError('Lỗi hệ thống xác thực.');
    } finally {
        setIsLoading(false);
    }
  };

  const showRescueCode = () => {
      if (emergencyCode) {
          alert(`HỆ THỐNG CỨU HỘ SIGMA VIE\n\nMã OTP của bạn là: ${emergencyCode}`);
      } else {
          alert("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-float-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#D4AF37] shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Xác minh danh tính</h1>
          <p className="text-gray-400 mt-2 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
             {authMethod === 'TOTP' ? 'Nhập mã từ ứng dụng Authenticator' : 'Kiểm tra tin nhắn điện thoại hoặc Email'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="......"
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-center text-3xl font-black tracking-[0.5em] focus:border-[#D4AF37] focus:bg-white outline-none transition-all shadow-inner"
            required
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-rose-500 text-[10px] font-black uppercase text-center bg-rose-50 py-2 rounded-lg border border-rose-100">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#111827] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-black transition-all shadow-xl active:scale-95"
          >
            {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN TRUY CẬP'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-4">
             {showHint && authMethod !== 'TOTP' && (
                 <button onClick={showRescueCode} className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline animate-pulse">
                    ⚠️ KHÔNG NHẬN ĐƯỢC SMS? BẤM ĐỂ LẤY MÃ KHẨN CẤP
                 </button>
             )}
            <br/>
            <a href="#/login" className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-800">← Quay lại đăng nhập</a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;