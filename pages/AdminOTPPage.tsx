
import React, { useState, useEffect } from 'react';
import { getAdminEmails, verifyTotpToken, verifyTempTotpToken } from '../utils/adminSettingsStorage';
import { recordAdminLogin } from '../utils/apiClient';
import { sendOtpRequest } from '../utils/api';
import type { AdminUser } from '../types';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'TOTP' | 'DB_TOTP'>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState<AdminUser | null>(null);
  const [emergencyOtp, setEmergencyOtp] = useState<string | null>(null);

  useEffect(() => {
    setAdminEmails(getAdminEmails());
    const pendingUserStr = sessionStorage.getItem('pendingUser');
    if (pendingUserStr) {
        setAuthMethod('DB_TOTP');
        setPendingUser(JSON.parse(pendingUserStr));
        return;
    }
    const method = sessionStorage.getItem('authMethod') as 'EMAIL' | 'TOTP';
    setAuthMethod(method || 'EMAIL');
    checkEmailOtpSession();
  }, []);

  const checkEmailOtpSession = () => {
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (!otpDataString) return;
    const otpData = JSON.parse(otpDataString);
    if (Date.now() > otpData.expiry) {
        setError('Mã OTP đã hết hạn.');
        return;
    }
    setEmergencyOtp(otpData.otp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const otpDataString = sessionStorage.getItem('otpVerification');
    const otpData = otpDataString ? JSON.parse(otpDataString) : null;

    if (otpData && otp === otpData.otp) {
        await recordAdminLogin('SMS_EMAIL_OTP', 'SUCCESS', 'admin');
        sessionStorage.removeItem('otpVerification');
        sessionStorage.setItem('isAuthenticated', 'true');
        window.location.hash = '/admin';
    } else {
        setError('Mã xác thực không chính xác.');
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 text-teal-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Xác minh bảo mật</h1>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
             Hệ thống đã gửi mã OTP đến <strong>SMS</strong> và <strong>Email</strong> của quản trị viên. Vui lòng kiểm tra điện thoại hoặc hộp thư.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4 text-center text-3xl font-black tracking-[0.5em] focus:border-teal-500 outline-none transition-all"
            required
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-rose-500 text-xs font-bold text-center animate-bounce">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50"
          >
            {isLoading ? 'ĐANG XÁC THỰC...' : 'XÁC NHẬN ĐĂNG NHẬP'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-4">
             <button 
                onClick={() => { if(emergencyOtp) alert(`MÃ OTP CỦA BẠN: ${emergencyOtp}`); }}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
                Không nhận được tin nhắn? Hiện mã khẩn cấp
            </button>
            <br/>
            <a href="#/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">← Quay lại đăng nhập</a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;
