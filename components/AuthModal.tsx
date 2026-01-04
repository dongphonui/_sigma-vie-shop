
import React, { useState, useEffect } from 'react';
import { loginCustomer, registerCustomer } from '../utils/customerStorage';
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

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '', 
    email: '', 
    phoneNumber: '', 
    password: '', 
    confirmPassword: '',
    cccdNumber: '',
    gender: '',
    dob: '',
    issueDate: '',
    address: '',
    identifier: '' 
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError(''); setSuccessMsg('');
    setFormData({
        fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '',
        cccdNumber: '', gender: '', dob: '', issueDate: '', address: '', identifier: ''
    });
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScanSuccess = (decodedText: string) => {
      const cccdData = parseCCCDQrCode(decodedText);
      if (cccdData) {
          const toInputDate = (d: string) => {
              if (d.includes('/')) {
                  const [day, month, year] = d.split('/');
                  return `${year}-${month}-${day}`;
              }
              return d;
          };

          setFormData(prev => ({
              ...prev, 
              fullName: cccdData.fullName, 
              cccdNumber: cccdData.cccdNumber,
              address: cccdData.address, 
              gender: cccdData.gender, 
              dob: toInputDate(cccdData.dob), 
              issueDate: toInputDate(cccdData.issueDate)
          }));
          setShowScanner(false);
          setSuccessMsg(`Nhận diện CCCD thành công: ${cccdData.fullName}`);
          setTimeout(() => setSuccessMsg(''), 4000);
      } else alert("Mã QR không đúng định dạng CCCD.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsProcessing(true);

    if (mode === 'REGISTER') {
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu không khớp.');
            setIsProcessing(false);
            return;
        }
        
        try {
            const result = await registerCustomer(formData as any);
            if (result.success && result.customer) {
                setSuccessMsg('Đăng ký thành công!');
                setTimeout(() => {
                    onLoginSuccess(result.customer!);
                    onClose();
                }, 1500);
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Đã có lỗi xảy ra trong quá trình đăng ký.');
        }
    } else {
        try {
            const result = await loginCustomer(formData.identifier, formData.password);
            if (result.success && result.customer) {
                onLoginSuccess(result.customer);
                onClose();
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError('Lỗi đăng nhập.');
        }
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[95vh] flex flex-col relative">
        {isProcessing && (
            <div className="absolute inset-0 bg-white/80 z-[60] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-[#00695C] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-[#00695C] animate-pulse">Hệ thống đang xử lý...</p>
                <p className="text-xs text-gray-500 mt-2">Vui lòng chờ trong giây lát, máy chủ đang ghi nhận thông tin của bạn.</p>
            </div>
        )}

        <div className="flex border-b">
            <button onClick={() => setMode('LOGIN')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${mode === 'LOGIN' ? 'text-[#00695C] border-b-4 border-[#00695C] bg-teal-50/50' : 'text-gray-400 hover:text-gray-600'}`}>Đăng Nhập</button>
            <button onClick={() => setMode('REGISTER')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${mode === 'REGISTER' ? 'text-[#00695C] border-b-4 border-[#00695C] bg-teal-50/50' : 'text-gray-400 hover:text-gray-600'}`}>Đăng Ký</button>
        </div>

        <div className="p-8 overflow-y-auto">
            <h2 className="text-2xl font-serif font-bold text-center mb-6 text-gray-800">
                {mode === 'LOGIN' ? 'Chào mừng trở lại' : 'Tạo tài khoản Sigma Vie'}
            </h2>

            {mode === 'REGISTER' && (
                <button type="button" onClick={() => setShowScanner(true)} className="w-full mb-6 bg-[#00695C] text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-900/20 hover:bg-[#004d40] flex items-center justify-center gap-2 transition-all active:scale-95">
                    <ScanIcon className="w-5 h-5" /> Quét mã QR trên CCCD
                </button>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'REGISTER' ? (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số điện thoại *</label>
                                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:border-[#D4AF37] outline-none" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email *</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:border-[#D4AF37] outline-none" required />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Họ và tên *</label>
                            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:border-[#D4AF37] outline-none" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số CCCD *</label>
                                <input type="text" name="cccdNumber" value={formData.cccdNumber} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:border-[#D4AF37] outline-none" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Giới tính *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none focus:border-[#D4AF37]" required>
                                    <option value="">Chọn...</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ngày sinh *</label>
                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none" required />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ngày cấp CCCD *</label>
                                <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Địa chỉ thường trú *</label>
                            <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:border-[#D4AF37] outline-none" placeholder="Số nhà, đường, phường/xã..." required />
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Số điện thoại hoặc Email</label>
                        <input type="text" name="identifier" value={formData.identifier} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm focus:border-[#D4AF37] outline-none" required />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mật khẩu *</label>
                        <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none" required />
                    </div>
                    {mode === 'REGISTER' && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Xác nhận mật khẩu *</label>
                            <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-sm outline-none" required />
                        </div>
                    )}
                </div>

                {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 font-bold">{error}</p>}
                {successMsg && <p className="text-xs text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 font-bold">{successMsg}</p>}

                <button type="submit" disabled={isProcessing} className="w-full py-4 bg-[#D4AF37] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-amber-900/20 hover:bg-[#b89b31] transition-all flex items-center justify-center gap-2">
                    {mode === 'LOGIN' ? 'Đăng Nhập' : 'Hoàn tất Đăng Ký'}
                </button>
            </form>

            <button onClick={onClose} className="mt-6 w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600" disabled={isProcessing}>Quay lại cửa hàng</button>
        </div>
      </div>
      {showScanner && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}
    </div>
  );
};

export default AuthModal;
