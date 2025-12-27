
import React, { useState, useEffect, useMemo } from 'react';
import { loginCustomer, registerCustomer, forgotPassword, resetPassword } from '../utils/customerStorage';
import { parseCCCDQrCode } from '../utils/cccdHelper';
import QRScanner from './QRScanner';
import type { Customer } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (customer: Customer) => void;
  initialMode?: 'LOGIN' | 'REGISTER';
}

const ScanIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2-2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="10" x="7" y="7" rx="2"/><path d="M7 17v4"/><path d="M17 17v4"/><path d="M17 7V3"/><path d="M7 7V3"/></svg>
);

const UserCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'RESET'>(initialMode);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Recovery State
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [receivedOtp, setReceivedOtp] = useState('');
  const [inputOtp, setInputOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Generate random field names for registration safety
  const randomNames = useMemo(() => ({
      cccd: `f_${Math.random().toString(36).substring(7)}`,
      dob: `f_${Math.random().toString(36).substring(7)}`,
      issueDate: `f_${Math.random().toString(36).substring(7)}`,
      address: `f_${Math.random().toString(36).substring(7)}`,
      gender: `f_${Math.random().toString(36).substring(7)}`
  }), [isOpen]);

  const [formData, setFormData] = useState({
    fullName: '', identifier: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
    address: '', cccdNumber: '', gender: '', dob: '', issueDate: ''
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError(''); setSuccessMsg('');
    setFormData({
        fullName: '', identifier: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
        address: '', cccdNumber: '', gender: '', dob: '', issueDate: ''
    });
    setRecoveryIdentifier(''); setInputOtp(''); setNewPassword(''); setConfirmNewPassword('');
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === randomNames.cccd) setFormData(prev => ({ ...prev, cccdNumber: value }));
    else if (name === randomNames.dob) setFormData(prev => ({ ...prev, dob: value }));
    else if (name === randomNames.issueDate) setFormData(prev => ({ ...prev, issueDate: value }));
    else if (name === randomNames.address) setFormData(prev => ({ ...prev, address: value }));
    else if (name === randomNames.gender) setFormData(prev => ({ ...prev, gender: value }));
    else setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScanSuccess = (decodedText: string) => {
      const cccdData = parseCCCDQrCode(decodedText);
      if (cccdData) {
          setFormData(prev => ({
              ...prev, fullName: cccdData.fullName, cccdNumber: cccdData.cccdNumber,
              address: cccdData.address, gender: cccdData.gender, dob: cccdData.dob, issueDate: cccdData.issueDate
          }));
          setShowScanner(false);
          setSuccessMsg(`Đã xác thực CCCD thành công! Vui lòng điền thêm Email & SĐT.`);
          setTimeout(() => setSuccessMsg(''), 4000);
      } else alert("Mã QR không đúng định dạng CCCD.");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(''); setSuccessMsg('');
      if (!recoveryIdentifier) return;
      setIsProcessing(true);
      try {
          const res = await forgotPassword(recoveryIdentifier);
          if (res && res.success) {
              setReceivedOtp(res.otp);
              setSuccessMsg('Mã OTP đã được tạo. Vui lòng nhập mã để đặt lại mật khẩu.');
              // Fallback Alert
              setTimeout(() => alert(`MÃ KHÔI PHỤC CỦA BẠN LÀ: ${res.otp}`), 500);
              setMode('RESET');
          } else {
              setError(res?.message || 'Không tìm thấy tài khoản.');
          }
      } catch (err) { setError('Lỗi kết nối.'); }
      setIsProcessing(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(''); setSuccessMsg('');
      if (inputOtp !== receivedOtp) { setError('Mã OTP không đúng.'); return; }
      if (newPassword !== confirmNewPassword) { setError('Mật khẩu không khớp.'); return; }
      if (newPassword.length < 6) { setError('Mật khẩu phải từ 6 ký tự.'); return; }
      
      setIsProcessing(true);
      try {
          const res = await resetPassword(recoveryIdentifier, newPassword);
          if (res && res.success) {
              setSuccessMsg('Đã đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
              setTimeout(() => {
                  setMode('LOGIN');
                  setFormData(prev => ({ ...prev, identifier: recoveryIdentifier }));
              }, 2000);
          } else {
              setError(res?.message || 'Lỗi xử lý.');
          }
      } catch (err) { setError('Lỗi kết nối.'); }
      setIsProcessing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'FORGOT') { handleForgotPassword(e); return; }
    if (mode === 'RESET') { handleResetPassword(e); return; }

    setError(''); setSuccessMsg(''); setIsProcessing(true);

    if (mode === 'REGISTER') {
        if (formData.password !== formData.confirmPassword) { setError('Mật khẩu không khớp.'); setIsProcessing(false); return; }
        const result = await registerCustomer(formData as any);
        if (result.success && result.customer) {
            setSuccessMsg('Đăng ký thành công!');
            setTimeout(() => { onLoginSuccess(result.customer!); onClose(); }, 2000);
        } else setError(result.message);
        setIsProcessing(false);
    } else {
        try {
            const result = await loginCustomer(formData.identifier, formData.password);
            if (result.success && result.customer) { onLoginSuccess(result.customer); onClose(); }
            else setError(result.message);
        } catch (err) { setError("Lỗi đăng nhập."); }
        finally { setIsProcessing(false); }
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
            <div className="flex border-b">
                <button onClick={() => setMode('LOGIN')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${mode === 'LOGIN' ? 'text-[#00695C] border-b-2 border-[#00695C] bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}>Đăng Nhập</button>
                <button onClick={() => setMode('REGISTER')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${mode === 'REGISTER' ? 'text-[#00695C] border-b-2 border-[#00695C] bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}>Đăng Ký</button>
            </div>
        )}

        <div className="p-6">
            <h2 className="text-2xl font-serif font-bold text-center mb-6 text-gray-800">
                {mode === 'LOGIN' ? 'Chào mừng trở lại' : mode === 'REGISTER' ? 'Tạo tài khoản mới' : mode === 'FORGOT' ? 'Khôi phục mật khẩu' : 'Đặt lại mật khẩu mới'}
            </h2>

            {mode === 'REGISTER' && (
                <>
                    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}><input type="text"/><input type="password"/></div>
                    {formData.cccdNumber && (
                        <div className="mb-6 relative overflow-hidden rounded-xl shadow-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4">
                            <div className="relative z-10 flex gap-4 items-start">
                                <div className="w-16 h-20 bg-gray-100 rounded-lg border border-gray-300 shadow-sm flex items-center justify-center overflow-hidden shrink-0"><UserCircleIcon className="w-10 h-10 text-gray-400" /></div>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <h4 className="text-[#00695C] font-bold text-xs uppercase tracking-wide border-b border-gray-200 pb-1 mb-1">Căn cước công dân</h4>
                                    <p className="text-sm truncate"><span className="font-mono font-bold text-gray-800">{formData.cccdNumber}</span></p>
                                    <p className="text-sm truncate"><span className="font-bold text-gray-900 uppercase">{formData.fullName}</span></p>
                                </div>
                            </div>
                        </div>
                    )}
                    <button type="button" onClick={() => setShowScanner(true)} className="w-full mb-6 bg-[#00695C] text-white py-2.5 rounded-lg font-bold shadow hover:bg-[#004d40] flex items-center justify-center gap-2"><ScanIcon className="w-5 h-5" /> Quét CCCD</button>
                </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {mode === 'REGISTER' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block text-xs font-bold text-gray-500 uppercase">Email</label><input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                             <div><label className="block text-xs font-bold text-gray-500 uppercase">Số điện thoại</label><input type="tel" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div><label className="block text-xs font-bold text-gray-500 uppercase">Họ và tên</label><input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                             <div><label className="block text-xs font-bold text-gray-500 uppercase">Số CCCD</label><input type="number" name={randomNames.cccd} required value={formData.cccdNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                        </div>
                    </>
                )}
                
                {mode === 'LOGIN' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tài khoản (SĐT/Email)</label>
                            <input type="text" name="identifier" required value={formData.identifier} onChange={handleChange} placeholder="Nhập số điện thoại hoặc email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                        </div>
                        <div className="flex justify-end mt-[-10px]"><button type="button" onClick={() => setMode('FORGOT')} className="text-xs text-[#D4AF37] hover:underline">Quên mật khẩu?</button></div>
                    </>
                )}

                {mode === 'FORGOT' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nhập SĐT hoặc Email tài khoản</label>
                        <input type="text" value={recoveryIdentifier} onChange={(e) => setRecoveryIdentifier(e.target.value)} required placeholder="SĐT hoặc Email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                        <button type="button" onClick={() => setMode('LOGIN')} className="mt-2 text-xs text-gray-500 hover:underline">Quay lại đăng nhập</button>
                    </div>
                )}

                {mode === 'RESET' && (
                    <>
                        <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 mb-4">Hệ thống đã gửi mã OTP xác thực (Vui lòng kiểm tra màn hình/Email).</div>
                        <div><label className="block text-sm font-medium">Mã OTP (6 số)</label><input type="text" maxLength={6} required value={inputOtp} onChange={e => setInputOtp(e.target.value)} className="w-full border p-2 rounded text-center text-xl tracking-widest" /></div>
                        <div><label className="block text-sm font-medium">Mật khẩu mới</label><input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border p-2 rounded" /></div>
                        <div><label className="block text-sm font-medium">Nhập lại mật khẩu</label><input type="password" required value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className="w-full border p-2 rounded" /></div>
                    </>
                )}

                {(mode === 'LOGIN' || mode === 'REGISTER' || mode === 'RESET') && (
                    <div className="grid grid-cols-1 gap-4">
                        {mode !== 'RESET' && (
                            <div className={mode === 'REGISTER' ? 'grid grid-cols-2 gap-4' : ''}>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase">Mật khẩu</label><input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>
                                {mode === 'REGISTER' && <div><label className="block text-xs font-bold text-gray-500 uppercase">Nhập lại MK</label><input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" /></div>}
                            </div>
                        )}
                    </div>
                )}

                {error && <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">{error}</p>}
                {successMsg && <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded">{successMsg}</p>}

                <button type="submit" disabled={isProcessing} className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] transition-colors font-bold uppercase disabled:opacity-70 flex items-center justify-center gap-2">
                    {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {mode === 'LOGIN' ? 'Đăng Nhập' : mode === 'REGISTER' ? 'Hoàn tất Đăng Ký' : mode === 'FORGOT' ? 'Gửi mã khôi phục' : 'Xác nhận đổi mật khẩu'}
                </button>
            </form>

            <button onClick={onClose} className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700" disabled={isProcessing}>Đóng</button>
        </div>
      </div>
    </div>
    {showScanner && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}
    </>
  );
};

export default AuthModal;
