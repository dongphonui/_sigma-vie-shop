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
    // Reset login state on mount
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
                console.log("[Login] 🛡️ Rescue mode activated.");
                sessionStorage.setItem('isAuthenticated', 'true');
                window.location.hash = '/admin';
                return;
            }
        }

        // 2. KIỂM TRA THÔNG TIN (LOCAL TRƯỚC ĐỂ NHANH)
        const isLocalValid = verifyCredentials(username, password);
        console.log(`[Login] Local check: ${isLocalValid}`);

        // 3. ĐĂNG NHẬP SERVER
        let serverAuth = null;
        try {
            serverAuth = await loginAdminUser({ username, password });
        } catch (serverErr) {
            console.warn("[Login] Server unreachable, using local fallback if valid.");
        }
        
        if ((serverAuth && serverAuth.success) || isLocalValid) {
            const user = serverAuth?.user || { id: 'admin', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER' };
            console.log("[Login] Credentials valid. Proceeding to second factor...");

            // Lưu thông tin user tạm thời (chờ OTP)
            sessionStorage.setItem('pendingAdminUser', JSON.stringify(user));

            if (user.is_totp_enabled || isTotpEnabled()) {
                sessionStorage.setItem('authMethod', 'TOTP');
                console.log("[Login] Redirecting to OTP (TOTP App)...");
                window.location.hash = '/otp';
            } else {
                sessionStorage.setItem('authMethod', 'SMS_EMAIL');
                console.log("[Login] Requesting OTP delivery...");
                
                // Chúng ta gọi gửi OTP nhưng KHÔNG chờ nó hoàn thành (vì có thể SMS gửi chậm)
                // Chuyển trang ngay để người dùng thấy màn hình nhập liệu
                sendOtpRequest()
                    .then(res => console.log("[Login] OTP Request result:", res))
                    .catch(err => console.error("[Login] OTP Request failed:", err));
                
                // Đợi một chút để đảm bảo sessionStorage kịp lưu rồi nhảy trang
                setTimeout(() => {
                    console.log("[Login] Redirecting to OTP (SMS/Email)...");
                    window.location.hash = '/otp';
                }, 100);
            }
            return;
        }

        setError('Tên đăng nhập hoặc mật khẩu không đúng.');
        setShowRescueHint(true);
    } catch (e) {
        console.error("[Login] Fatal error:", e);
        setError("Lỗi kết nối hệ thống. Vui lòng thử lại sau.");
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
          <p className="text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest leading-relaxed">
            Hệ thống Quản trị Luxury<br/>
            Bảo mật 2 lớp <span className="text-[#D4AF37]">SpeedSMS</span>
          </p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Tên đăng nhập</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
              required 
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Mật khẩu</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-6 py-4 font-bold outline-none transition-all" 
              required 
            />
          </div>
          
          {error && (
            <div className="space-y-2">
                <p className="text-rose-500 text-[10px] font-black uppercase text-center bg-rose-50 py-3 rounded-xl border border-rose-100">
                    {error}
                </p>
                {showRescueHint && (
                    <p className="text-amber-600 text-[8px] font-black uppercase text-center animate-pulse">
                        💡 Mẹo: Giữ phím SHIFT khi bấm nút để vào chế độ cứu hộ.
                    </p>
                )}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-[#111827] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? 'ĐANG XÁC THỰC...' : 'TIẾP TỤC TRUY CẬP'}
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