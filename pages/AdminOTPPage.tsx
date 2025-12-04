
import React, { useState, useEffect } from 'react';
import { getAdminEmails, verifyTotpToken } from '../utils/adminSettingsStorage';
import { recordAdminLogin } from '../utils/apiClient';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'TOTP'>('EMAIL');
  
  // State để lưu mã OTP thực (để hiển thị khẩn cấp - chỉ dùng cho Email)
  const [emergencyOtp, setEmergencyOtp] = useState<string | null>(null);

  useEffect(() => {
    setAdminEmails(getAdminEmails());
    const method = sessionStorage.getItem('authMethod') as 'EMAIL' | 'TOTP';
    setAuthMethod(method || 'EMAIL');

    if (method === 'TOTP') {
        // Nếu dùng Google Auth thì không cần check session OTP
        return;
    }

    // Nếu dùng Email thì check session
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (!otpDataString) {
      setError("Không tìm thấy yêu cầu xác thực. Vui lòng đăng nhập lại.");
      return;
    }
    const otpData = JSON.parse(otpDataString);
    if (Date.now() > otpData.expiry) {
        setError('Mã OTP đã hết hạn. Vui lòng thử đăng nhập lại.');
        sessionStorage.removeItem('otpVerification');
        return;
    }
    setEmergencyOtp(otpData.otp);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (authMethod === 'TOTP') {
        // Validate Google Authenticator Code
        if (verifyTotpToken(otp)) {
            recordAdminLogin('GOOGLE_AUTH', 'SUCCESS');
            sessionStorage.removeItem('authMethod');
            sessionStorage.setItem('isAuthenticated', 'true');
            window.location.hash = '/admin';
        } else {
            // recordAdminLogin('GOOGLE_AUTH', 'FAILED'); // Optional: Record failed attempts
            setError('Mã xác thực không đúng. Vui lòng kiểm tra lại ứng dụng Google Authenticator.');
        }
    } else {
        // Validate Email OTP
        const otpDataString = sessionStorage.getItem('otpVerification');
        if (!otpDataString) {
            setError('Phiên đã hết hạn. Vui lòng đăng nhập lại.');
            return;
        }

        const otpData = JSON.parse(otpDataString);

        if (Date.now() > otpData.expiry) {
            setError('Mã OTP đã hết hạn. Vui lòng thử đăng nhập lại.');
            sessionStorage.removeItem('otpVerification');
            return;
        }

        if (otp === otpData.otp) {
            recordAdminLogin('EMAIL_OTP', 'SUCCESS');
            sessionStorage.removeItem('otpVerification');
            sessionStorage.removeItem('authMethod');
            sessionStorage.setItem('isAuthenticated', 'true');
            window.location.hash = '/admin';
        } else {
            setError('Mã OTP không hợp lệ.');
        }
    }
  };

  const handleRevealOtp = () => {
      if (emergencyOtp) {
          alert(`MÃ OTP KHẨN CẤP CỦA BẠN LÀ: ${emergencyOtp}\n\nHãy sử dụng mã này để đăng nhập.`);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900">Xác thực hai yếu tố</h1>
          <p className="text-gray-600 mt-2">
             {authMethod === 'TOTP' 
                ? 'Vui lòng nhập mã từ ứng dụng Google Authenticator.' 
                : <span>Mã xác thực đã được gửi đến email: <strong>{adminEmails[0]}</strong></span>
             }
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Mã Xác Thực (6 số)</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] text-center text-2xl tracking-widest"
              required
              maxLength={6}
              autoFocus
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors"
            >
              Xác thực
            </button>
          </div>
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
             {authMethod === 'EMAIL' && (
                 <button 
                    type="button"
                    onClick={handleRevealOtp}
                    className="text-sm text-red-500 hover:text-red-700 font-medium hover:underline"
                >
                    Không nhận được mã? Bấm vào đây để lấy mã khẩn cấp
                </button>
             )}

            <a href="#/login" onClick={(e) => { e.preventDefault(); window.location.hash = '/login'; }} className="text-sm text-[#D4AF37] hover:underline">
                Quay lại trang Đăng nhập
            </a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;
