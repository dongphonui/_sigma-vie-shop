
import React, { useState } from 'react';
import { verifyCredentials, isTotpEnabled } from '../utils/adminSettingsStorage';
import { sendOtpRequest } from '../utils/api';
import { loginAdminUser } from '../utils/apiClient';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        // 1. Try Server Auth (DB Users including Master and Sub-admins)
        const serverAuth = await loginAdminUser({ username, password });
        
        if (serverAuth && serverAuth.success) {
            // Logged in via DB
            const user = serverAuth.user;
            
            // Check ANY user (Master or Staff) for 2FA
            if (user.is_totp_enabled) {
                // If user has 2FA enabled, redirect to OTP page
                // Store temp user info to verify later
                sessionStorage.setItem('pendingUser', JSON.stringify(user));
                window.location.hash = '/otp';
                setIsLoading(false);
                return;
            }

            // Normal success (No 2FA or not enabled yet)
            sessionStorage.setItem('adminUser', JSON.stringify(user));
            sessionStorage.setItem('isAuthenticated', 'true');
            
            // Backup check: Only Legacy Local Master needs strict 2FA from localStorage if DB auth didn't catch it
            // (This usually happens if "admin" exists in LocalStorage but not DB, or DB has different settings)
            if (user.role === 'MASTER' && isTotpEnabled() && !user.is_totp_enabled) {
                 sessionStorage.setItem('authMethod', 'TOTP');
                 window.location.hash = '/otp';
                 setIsLoading(false);
                 return;
            }
            window.location.hash = '/admin';
            setIsLoading(false);
            return;
        }

        // 2. Fallback to LocalStorage Auth (For recovery Master Admin if DB fails)
        if (verifyCredentials(username, password)) {
            // Check if 2FA (TOTP) is enabled in LocalStorage
            if (isTotpEnabled()) {
                sessionStorage.setItem('authMethod', 'TOTP');
                window.location.hash = '/otp';
                setIsLoading(false);
                return;
            }

            // Default: Fallback to Email OTP
            sessionStorage.setItem('authMethod', 'EMAIL');
            try {
                const response = await sendOtpRequest();
                if (response.success) {
                    window.location.hash = '/otp';
                } else {
                    setError('Không thể gửi mã OTP. Vui lòng thử lại.');
                }
            } catch (apiError) {
                setError('Đã xảy ra lỗi khi cố gắng gửi OTP.');
                console.error(apiError);
            }
        } else {
            setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        }

    } catch (e) {
        console.error("Login logic error", e);
        setError("Lỗi kết nối Server.");
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900">Đăng nhập Quản trị</h1>
          <p className="text-gray-600 mt-2">Truy cập vào bảng điều khiển của bạn.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="password"className="block text-sm font-medium text-gray-700">Mật khẩu</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37]"
              required
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : 'Tiếp tục'}
            </button>
          </div>
        </form>
         <div className="text-center mt-4">
            <a href="#/" onClick={(e) => { e.preventDefault(); window.location.hash = '/'; }} className="text-sm text-[#D4AF37] hover:underline">
                ← Quay lại Cửa hàng
            </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
