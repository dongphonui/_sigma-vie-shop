
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
          setSuccessMsg(`Đã quét CCCD thành công! Xin chào ${cccdData.fullName}`);
          setTimeout(() => setSuccessMsg(''), 5000);
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
                    <button 
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="w-full mb-6 bg-blue-600 text-white py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
                    >
                        <ScanIcon className="w-5 h-5" />
                        Quét QR Căn cước công dân
                    </button>

                    <div className="flex justify-center mb-6 space-x-4">
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="radio" 
                                name="regMethod" 
                                className="mr-2 text-[#00695C] focus:ring-[#00695C]"
                                checked={registerMethod === 'EMAIL'}
                                onChange={() => { setRegisterMethod('EMAIL'); }}
                            />
                            <span className="text-sm font-medium text-gray-700">Dùng Email</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="radio" 
                                name="regMethod" 
                                className="mr-2 text-[#00695C] focus:ring-[#00695C]"
                                checked={registerMethod === 'PHONE'}
                                onChange={() => { setRegisterMethod('PHONE'); }}
                            />
                            <span className="text-sm font-medium text-gray-700">Dùng Số ĐT</span>
                        </label>
                    </div>
                </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'REGISTER' && (
                    <>
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
                        {formData.cccdNumber && (
                            <div className="bg-gray-50 p-3 rounded border text-xs text-gray-600 space-y-1">
                                <p><strong>Số CCCD:</strong> {formData.cccdNumber}</p>
                                <p><strong>Ngày sinh:</strong> {formData.dob}</p>
                                <p><strong>Giới tính:</strong> {formData.gender}</p>
                            </div>
                        )}
                    </>
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

                {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                {successMsg && <p className="text-sm text-green-600 text-center">{successMsg}</p>}

                <button 
                    type="submit" 
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#00695C] hover:bg-[#004d40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00695C] transition-colors"
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
