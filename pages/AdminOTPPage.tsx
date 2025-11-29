
import React, { useState, useEffect } from 'react';
import { getAdminEmails } from '../utils/adminSettingsStorage';

const AdminOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [demoOtp, setDemoOtp] = useState('');

  useEffect(() => {
    setAdminEmails(getAdminEmails());
    const otpDataString = sessionStorage.getItem('otpVerification');
    if (!otpDataString) {
      setError("Không tìm thấy yêu cầu xác thực. Vui lòng đăng nhập lại để nhận mã OTP mới.");
      // Clear any potential stale demo OTP
      setDemoOtp('');
      return;
    }
    const otpData = JSON.parse(otpDataString);
    if (Date.now() > otpData.expiry) {
        setError('Mã OTP đã hết hạn. Vui lòng thử đăng nhập lại.');
        sessionStorage.removeItem('otpVerification');
        setDemoOtp('');
        return;
    }
    setDemoOtp(otpData.otp);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900">Xác thực hai yếu tố</h1>
          <p className="text-gray-600 mt-2">Nhập mã được "gửi" đến email của bạn.</p>
        </div>
        
        {demoOtp && (
          <div className="bg-amber-50 border-l-4 border-[#D4AF37] text-amber-800 p-4 rounded-md mb-6" role="alert">
            <p className="font-bold">Mô phỏng gửi Email</p>
            <p>Một mã OTP đã được "gửi" đến: <br/> <strong className="break-all">{adminEmails.join(', ')}</strong>.</p>
            <p className="mt-2">Vì đây là bản demo, mã của bạn là: <strong className="text-2xl tracking-widest">{demoOtp}</strong></p>
          </div>
        )}

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
              disabled={!demoOtp}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors disabled:bg-gray-400"
              disabled={!demoOtp}
            >
              Xác thực
            </button>
          </div>
        </form>
         <div className="text-center mt-4">
            <a href="#/login" onClick={(e) => { e.preventDefault(); window.location.hash = '/login'; }} className="text-sm text-[#D4AF37] hover:underline">
                Thử lại đăng nhập
            </a>
        </div>
      </div>
    </div>
  );
};

export default AdminOTPPage;