
import React, { useState, useEffect } from 'react';
import { getAdminEmails, verifyTotpToken } from '../utils/adminSettingsStorage';
import { recordAdminLogin } from '../utils/apiClient';
import type { AdminUser } from '../types';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'TOTP' | 'DB_TOTP'>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [emergencyCode, setEmergencyCode] = useState<string | null>(null);

  useEffect(() => {
    const pendingUserStr = sessionStorage.getItem('pendingUser');
    if (pendingUserStr) {
        setAuthMethod('DB_TOTP');
    } else {
        const method = sessionStorage.getItem('authMethod') as any;
        setAuthMethod(method || 'EMAIL');
    }
    
    // Lấy mã từ storage để hiển thị nếu cần khẩn cấp
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (otpDataString) {
        const otpData = JSON.parse(otpDataString);
        setEmergencyCode(otpData.otp);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const otpDataString = sessionStorage.getItem('otpVerification');
    const otpData = otpDataString ? JSON.parse(otpDataString) : null;

    // Kiểm tra mã OTP (local backup)
    if (otpData && otp === otpData.otp) {
        await recordAdminLogin('EMERGENCY_OR_LOCAL_OTP', 'SUCCESS', 'admin');
        sessionStorage.removeItem('otpVerification');
        sessionStorage.setItem('isAuthenticated', 'true');
        window.location.hash = '/admin';
    } else {
        setError('Mã xác thực không chính xác.');
        setIsLoading(false);
    }
  };

  const showRescueCode = () => {
      if (emergencyCode) {
          alert(`MÃ OTP KHẨN CẤP CỦA BẠN: ${emergencyCode}\n\nLưu ý: Bạn nên cấu hình lại SMS/Email sau khi vào được Admin.`);
      } else {
          alert("Không tìm thấy mã trong phiên làm việc. Vui lòng quay lại đăng nhập.");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Xác minh Quản trị</h1>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
             Vui lòng nhập mã OTP được gửi tới thiết bị của bạn.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="......"
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl py-4 text-center text-3xl font-black tracking-[0.5em] focus:border-[#D4AF37] outline-none transition-all"
            required
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-rose-500 text-xs font-bold text-center animate-bounce">{error}</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#111827] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg"
          >
            {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center space-y-4">
             <button 
                onClick={showRescueCode}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
                ⚠️ KHÔNG NHẬN ĐƯỢC MÃ? HIỆN MÃ KHẨN CẤP
            </button>
            <br/>
            <a href="#/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800">← Quay lại đăng nhập</a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;
