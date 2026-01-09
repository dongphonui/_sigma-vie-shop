import React, { useState, useEffect } from 'react';
import { verifyCredentials, isTotpEnabled } from '../utils/adminSettingsStorage';
import { sendOtpRequest } from '../utils/api';
import { loginAdminUser } from '../utils/apiClient';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRescueHint, setShowRescueHint] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('pendingAdminUser');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const isRescueMode = (e.nativeEvent as any).shiftKey; 

    setError('');
    setIsLoading(true);

    try {
        // 1. CHẾ ĐỘ CỨU HỘ (SHIFT + CLICK)
        if (isRescueMode && username === 'admin' && password === 'admin') {
            if (confirm("Kích hoạt chế độ CỨU HỘ: Bỏ qua OTP để vào Admin?")) {
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.hash = '/admin';
                return;
            }
        }

        // 2. KIỂM TRA THÔNG TIN (LOCAL TRƯỚC)
        const isLocalValid = verifyCredentials(username, password);
        
        // 3. ĐĂNG NHẬP SERVER
        let serverAuth = null;
        try {
            serverAuth = await loginAdminUser({ username, password });
        } catch (serverErr) {
            console.warn("Server DB is likely over quota, using fallback logic.");
        }
        
        if ((serverAuth && serverAuth.success) || isLocalValid) {
            const user = serverAuth?.user || { id: 'admin', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER' };
            
            // Lưu thông tin user tạm thời
            sessionStorage.setItem('pendingAdminUser', JSON.stringify(user));

            if (user.is_totp_enabled || isTotpEnabled()) {
                sessionStorage.setItem('authMethod', 'TOTP');
                window.location.hash = '/otp';
            } else {
                sessionStorage.setItem('authMethod', 'SMS_EMAIL');
                
                // GỬI YÊU CẦU OTP
                // Ngay cả khi gửi thất bại, ta vẫn sang trang OTP để user dùng mã cứu hộ nếu cần
                try {
                    await sendOtpRequest();
                } catch (otpErr) {
                    console.error("OTP Delivery failed:", otpErr);
                }
                
                window.location.hash = '/otp';
            }
            return;
        }

        setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        setShowRescueHint(true);
    } catch (e) {
        console.error("Login fatal error", e);
        setError("Lỗi kết nối hệ thống. Hãy thử giữ phím Shift và bấm Tiếp tục.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5F2] px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-float-up">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-[#D4AF37] mx-auto mb-6 shadow-xl rotate-3">
             <span className="text-3xl font-black">Σ</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Sigma Admin</h1>
          <p className="text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest leading-relaxed">Hệ thống Quản trị Luxury<br/>Bảo mật 2 lớp SpeedSMS</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Tên đăng nhập</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-6 py-4 font-bold outline-none transition-all" required autoFocus />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Mật khẩu</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-6 py-4 font-bold outline-none transition-all" required />
          </div>
          
          {error && (
            <div className="space-y-2">
                <p className="text-rose-500 text-[10px] font-black uppercase text-center bg-rose-50 py-3 rounded-xl border border-rose-100">{error}</p>
                {showRescueHint && <p className="text-amber-600 text-[8px] font-black uppercase text-center animate-pulse">💡 Giữ phím Shift khi bấm để cứu hộ</p>}
            </div>
          )}
          
          <button type="submit" disabled={isLoading} className="w-full bg-[#111827] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
            {isLoading ? 'ĐANG KIỂM TRA...' : 'TIẾP TỤC TRUY CẬP'}
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