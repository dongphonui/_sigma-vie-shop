
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
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="10" x="7" y="7" rx="2"/><path d="M7 17v4"/><path d="M17 17v4"/><path d="M17 7V3"/><path d="M7 7V3"/></svg>
);

const UserCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  
  // Register specific state
  const [registerMethod, setRegisterMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    identifier: '', // Used for Login (Email or Phone or CCCD) or Register (Specific value based on method)
    password: '',
    confirmPassword: '',
    address: '',
    cccdNumber: '',
    gender: '',
    dob: ''
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccessMsg('');
    setRegisterMethod('EMAIL');
    setFormData({
        fullName: '',
        identifier: '',
        password: '',
        confirmPassword: '',
        address: '',
        cccdNumber: '',
        gender: '',
        dob: ''
    });
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleScanSuccess = (decodedText: string) => {
      const cccdData = parseCCCDQrCode(decodedText);
      if (cccdData) {
          setFormData(prev => ({
              ...prev,
              fullName: cccdData.fullName,
              cccdNumber: cccdData.cccdNumber,
              address: cccdData.address,
              gender: cccdData.gender,
              dob: cccdData.dob
          }));
          setShowScanner(false);
          setSuccessMsg(`Đã xác thực CCCD thành công!`);
          setTimeout(() => setSuccessMsg(''), 3000);
      } else {
          alert("Mã QR không đúng định dạng CCCD hoặc không đọc được. Vui lòng thử lại.");
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (mode === 'REGISTER') {
        if (formData.password !== formData.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        const registrationData = {
            fullName: formData.fullName,
            password: formData.password,
            address: formData.address,
            // Dynamically assign email or phone based on method
            email: registerMethod === 'EMAIL' ? formData.identifier : undefined,
            phoneNumber: registerMethod === 'PHONE' ? formData.identifier : undefined,
            cccdNumber: formData.cccdNumber || undefined,
            gender: formData.gender || undefined,
            dob: formData.dob || undefined
        };

        const result = registerCustomer(registrationData);

        if (result.success && result.customer) {
            setSuccessMsg('Đăng ký thành công! Đang đăng nhập...');
            setTimeout(() => {
                onLoginSuccess(result.customer!);
                onClose();
            }, 1000);
        } else {
            setError(result.message);
        }
    } else {
        // Login Logic
        const result = loginCustomer(formData.identifier, formData.password);
        if (result.success && result.customer) {
            onLoginSuccess(result.customer);
            onClose();
        } else {
            setError(result.message);
        }
    }
  };

  return (
    <>
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
        {/* Header Tabs */}
        <div className="flex border-b">
            <button 
                onClick={() => setMode('LOGIN')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'LOGIN' ? 'text-[#00695C] border-b-2 border-[#00695C] bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Đăng Nhập
            </button>
            <button 
                onClick={() => setMode('REGISTER')}
                className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${mode === 'REGISTER' ? 'text-[#00695C] border-b-2 border-[#00695C] bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}
            >
                Đăng Ký
            </button>
        </div>

        <div className="p-8">
            <h2 className="text-2xl font-serif font-bold text-center mb-6 text-gray-800">
                {mode === 'LOGIN' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </h2>

            {/* Registration Method Toggles */}
            {mode === 'REGISTER' && (
                <>
                    {/* Digital ID Card Display */}
                    {formData.cccdNumber && (
                        <div className="mb-6 relative overflow-hidden rounded-xl shadow-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-4">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-100 rounded-full opacity-50"></div>
                            
                            <div className="relative z-10 flex gap-4 items-start">
                                <div className="w-16 h-20 bg-gray-100 rounded-lg border border-gray-300 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                                    <UserCircleIcon className="w-10 h-10 text-gray-400" />
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <h4 className="text-[#00695C] font-bold text-xs uppercase tracking-wide border-b border-gray-200 pb-1 mb-1">Căn cước công dân</h4>
                                    <p className="text-sm truncate"><span className="text-gray-500 text-[10px] uppercase mr-1">Số:</span> <span className="font-mono font-bold text-gray-800">{formData.cccdNumber}</span></p>
                                    <p className="text-sm truncate"><span className="text-gray-500 text-[10px] uppercase mr-1">Tên:</span> <span className="font-bold text-gray-900 uppercase">{formData.fullName}</span></p>
                                    <div className="flex gap-3">
                                        <p className="text-xs"><span className="text-gray-500 text-[10px] uppercase mr-1">Sinh:</span> <span className="font-medium">{formData.dob}</span></p>
                                        <p className="text-xs"><span className="text-gray-500 text-[10px] uppercase mr-1">Giới tính:</span> <span className="font-medium">{formData.gender}</span></p>
                                    </div>
                                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5"><span className="text-gray-500 text-[10px] uppercase mr-1">Đ/C:</span> {formData.address}</p>
                                </div>
                            </div>
                            
                            {/* Smart Fill Badge */}
                            <div className="absolute bottom-2 right-2 bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Đã xác thực Chip
                            </div>
                        </div>
                    )}

                    <button 
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="w-full mb-6 bg-[#00695C] text-white py-2.5 rounded-lg font-bold shadow hover:bg-[#004d40] flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                    >
                        <ScanIcon className="w-5 h-5" />
                        {formData.cccdNumber ? 'Quét lại CCCD' : 'Quét QR Căn cước công dân'}
                    </button>

                    <div className="flex justify-center mb-6 space-x-4">
                        <label className="flex items-center cursor-pointer group">
                            <input 
                                type="radio" 
                                name="regMethod" 
                                className="mr-2 text-[#00695C] focus:ring-[#00695C]"
                                checked={registerMethod === 'EMAIL'}
                                onChange={() => { setRegisterMethod('EMAIL'); }}
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-[#00695C]">Dùng Email</span>
                        </label>
                        <label className="flex items-center cursor-pointer group">
                            <input 
                                type="radio" 
                                name="regMethod" 
                                className="mr-2 text-[#00695C] focus:ring-[#00695C]"
                                checked={registerMethod === 'PHONE'}
                                onChange={() => { setRegisterMethod('PHONE'); }}
                            />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-[#00695C]">Dùng Số ĐT</span>
                        </label>
                    </div>
                </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'REGISTER' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                        <input 
                            type="text" 
                            name="fullName"
                            required
                            value={formData.fullName}
                            onChange={handleChange}
                            placeholder="Nhập họ tên hoặc quét CCCD"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]" 
                        />
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        {mode === 'LOGIN' 
                            ? 'Email / SĐT / Số CCCD' 
                            : (registerMethod === 'EMAIL' ? 'Email' : 'Số điện thoại')
                        }
                    </label>
                    <input 
                        type={registerMethod === 'EMAIL' || mode === 'LOGIN' ? 'text' : 'tel'} 
                        name="identifier"
                        required
                        value={formData.identifier}
                        onChange={handleChange}
                        placeholder={mode === 'LOGIN' ? 'nhap@email.com hoặc 09...' : (registerMethod === 'EMAIL' ? 'vidu@email.com' : '0912345678')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]" 
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                    <input 
                        type="password" 
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]" 
                    />
                </div>

                {mode === 'REGISTER' && (
                    <>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Nhập lại mật khẩu</label>
                            <input 
                                type="password" 
                                name="confirmPassword"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Địa chỉ (Tùy chọn)</label>
                            <input 
                                type="text" 
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                placeholder="Nhập địa chỉ hoặc quét CCCD"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]" 
                            />
                        </div>
                    </>
                )}

                {error && <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">{error}</p>}
                {successMsg && <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded">{successMsg}</p>}

                <button 
                    type="submit" 
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors font-bold uppercase"
                >
                    {mode === 'LOGIN' ? 'Đăng Nhập' : 'Đăng Ký'}
                </button>
            </form>

            <button 
                onClick={onClose}
                className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
                Đóng
            </button>
        </div>
      </div>
    </div>

    {showScanner && (
        <QRScanner 
            onScanSuccess={handleScanSuccess} 
            onClose={() => setShowScanner(false)} 
        />
    )}
    </>
  );
};

export default AuthModal;
