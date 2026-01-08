
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
    const isRescueMode = (e.nativeEvent as any).shiftKey; // Kiểm tra phím Shift

    setError('');
    setIsLoading(true);

    try {
        // Bypass cho admin trong trường hợp khẩn cấp nếu phím Shift được nhấn
        if (isRescueMode && username === 'admin' && password === 'admin') {
            if (confirm("Kích hoạt chế độ CỨU HỘ: Bỏ qua OTP để vào Admin?")) {
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.hash = '/admin';
                return;
            }
        }

        const serverAuth = await loginAdminUser({ username, password });
        
        if (serverAuth && serverAuth.success) {
            const user = serverAuth.user;
            if (user.is_totp_enabled) {
                sessionStorage.setItem('pendingUser', JSON.stringify(user));
                window.location.hash = '/otp';
                return;
            }
            sessionStorage.setItem('adminUser', JSON.stringify(user));
            sessionStorage.setItem('isAuthenticated', 'true');
            window.location.hash = '/admin';
            return;
        }

        // Local Fallback
        if (verifyCredentials(username, password)) {
            if (isTotpEnabled()) {
                sessionStorage.setItem('authMethod', 'TOTP');
                window.location.hash = '/otp';
                return;
            }

            sessionStorage.setItem('authMethod', 'EMAIL');
            await sendOtpRequest();
            window.location.hash = '/otp';
        } else {
            setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        }
    } catch (e) {
        console.error("Login logic error", e);
        setError("Lỗi hệ thống. Thử giữ SHIFT + Bấm Tiếp tục để cứu hộ.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-[#D4AF37] mx-auto mb-6 shadow-xl rotate-3">
             <span className="text-3xl font-black">Σ</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sigma Admin</h1>
          <p className="text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest">Hệ thống Quản trị Luxury</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Tên đăng nhập</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-6 py-4 font-bold outline-none transition-all" required />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-6 py-4 font-bold outline-none transition-all" required />
          </div>
          
          {error && <p className="text-rose-500 text-xs font-bold text-center bg-rose-50 py-3 rounded-xl border border-rose-100">{error}</p>}
          
          <button type="submit" disabled={isLoading} className="w-full bg-[#111827] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all active:scale-95">
            {isLoading ? 'ĐANG XỬ LÝ...' : 'TIẾP TỤC'}
          </button>
        </form>
        
        <div className="mt-10 text-center">
            <a href="#/" className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-800 transition-colors">← Quay lại cửa hàng</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
