import React, { useState, useEffect } from 'react';
import { verifyTotpToken } from '../utils/adminSettingsStorage';
import { recordAdminLogin } from '../utils/apiClient';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'TOTP' | 'DB_TOTP'>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const pendingUserStr = sessionStorage.getItem('pendingUser');
    const method = sessionStorage.getItem('authMethod') as any;
    
    if (pendingUserStr) {
        setAuthMethod('DB_TOTP');
    } else {
        setAuthMethod(method || 'EMAIL');
    }
    
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (otpDataString) {
        const otpData = JSON.parse(otpDataString);
        setEmergencyCode(otpData.otp);
    }

    // Sau 5 giây nếu chưa nhập mã, hiện gợi ý khẩn cấp
    const timer = setTimeout(() => setShowHint(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
        // TRƯỜNG HỢP 1: XÁC THỰC BẰNG GOOGLE AUTHENTICATOR (LOCAL)
        if (authMethod === 'TOTP') {
            if (verifyTotpToken(otp)) {
                await recordAdminLogin('GOOGLE_AUTH', 'SUCCESS', 'admin');
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.hash = '/admin';
                return;
            } else {
                setError('Mã bảo mật 2 lớp không chính xác.');
            }
        } 
        // TRƯỜNG HỢP 2: XÁC THỰC BẰNG OTP (EMAIL/SMS)
        else {
            const otpDataString = sessionStorage.getItem('otpVerification');
            const otpData = otpDataString ? JSON.parse(otpDataString) : null;

            if (otpData && otp === otpData.otp) {
                await recordAdminLogin('EMAIL_OR_SMS_OTP', 'SUCCESS', 'admin');
                sessionStorage.removeItem('otpVerification');
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.hash = '/admin';
                return;
            } else {
                setError('Mã xác thực OTP không chính xác.');
            }
        }
    } catch (err) {
        setError('Đã xảy ra lỗi trong quá trình xác thực.');
    } finally {
        setIsLoading(false);
    }
  };

  const showRescueCode = () => {
      if (emergencyCode) {
          alert(`HỆ THỐNG CỨU HỘ SIGMA VIE\n\nMã xác thực của bạn là: ${emergencyCode}\n\nVui lòng nhập mã này vào ô xác minh.`);
      } else {
          alert("Không tìm thấy mã OTP trong phiên này. Vui lòng quay lại đăng nhập.");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-float-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#D4AF37] shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Xác minh Quản trị</h1>
          <p className="text-gray-400 mt-2 text-xs font-bold uppercase tracking-widest leading-relaxed">
             {authMethod === 'TOTP' ? 'Mở app Google Authenticator để lấy mã' : 'Nhập mã được gửi tới thiết bị của bạn'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="......"
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 text-center text-3xl font-black tracking-[0.5em] focus:border-[#D4AF37] focus:bg-white outline-none transition-all"
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
            {isLoading ? 'ĐANG KIỂM TRA...' : 'XÁC NHẬN'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-4">
             {showHint && authMethod !== 'TOTP' && (
                 <button 
                    onClick={showRescueCode}
                    className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline animate-pulse"
                >
                    ⚠️ KHÔNG NHẬN ĐƯỢC MÃ? BẤM ĐỂ HIỆN MÃ KHẨN CẤP
                </button>
             )}
            <br/>
            <a href="#/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">← Quay lại đăng nhập</a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;