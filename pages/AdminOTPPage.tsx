
import React, { useState, useEffect } from 'react';
import { getAdminEmails } from '../utils/adminSettingsStorage';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  
  // State để lưu mã OTP thực (để hiển thị khẩn cấp)
  const [emergencyOtp, setEmergencyOtp] = useState<string | null>(null);

  useEffect(() => {
    setAdminEmails(getAdminEmails());
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (!otpDataString) {
      setError("Không tìm thấy yêu cầu xác thực. Vui lòng đăng nhập lại để nhận mã OTP mới.");
      return;
    }
    const otpData = JSON.parse(otpDataString);
    if (Date.now() > otpData.expiry) {
        setError('Mã OTP đã hết hạn. Vui lòng thử đăng nhập lại.');
        sessionStorage.removeItem('otpVerification');
        return;
    }
    // Lưu mã OTP vào state để dùng cho nút khẩn cấp
    setEmergencyOtp(otpData.otp);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
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
      sessionStorage.removeItem('otpVerification');
      sessionStorage.setItem('isAuthenticated', 'true');
      window.location.hash = '/admin';
    } else {
      setError('Mã OTP không hợp lệ.');
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
             Mã xác thực đã được gửi đến email: <strong>{adminEmails[0]}</strong>
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Mã OTP</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] text-center text-2xl tracking-widest"
              required
              maxLength={6}
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
             <button 
                type="button"
                onClick={handleRevealOtp}
                className="text-sm text-red-500 hover:text-red-700 font-medium hover:underline"
            >
                Không nhận được mã? Bấm vào đây để lấy mã khẩn cấp
            </button>

            <a href="#/login" onClick={(e) => { e.preventDefault(); window.location.hash = '/login'; }} className="text-sm text-[#D4AF37] hover:underline">
                Quay lại trang Đăng nhập
            </a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;
