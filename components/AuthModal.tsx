
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

const UserCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
);

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess, initialMode = 'LOGIN' }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>(initialMode);
  const [showScanner, setShowScanner] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    identifier: '', // Used for Login
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    address: '',
    cccdNumber: '',
    gender: '',
    dob: '',
    issueDate: ''
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
    setSuccessMsg('');
    setFormData({
        fullName: '',
        identifier: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        address: '',
        cccdNumber: '',
        gender: '',
        dob: '',
        issueDate: ''
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
              dob: cccdData.dob,
              issueDate: cccdData.issueDate
          }));
          setShowScanner(false);
          setSuccessMsg(`Đã xác thực CCCD thành công! Vui lòng điền thêm Email & SĐT.`);
          setTimeout(() => setSuccessMsg(''), 4000);
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
        
        // Validate required fields manually before sending
        if (!formData.email || !formData.phoneNumber || !formData.cccdNumber || !formData.issueDate) {
             setError('Vui lòng nhập đầy đủ thông tin (Quét CCCD để tự động điền).');
             return;
        }

        const result = registerCustomer({
            fullName: formData.fullName,
            password: formData.password,
            email: formData.email,
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            cccdNumber: formData.cccdNumber,
            gender: formData.gender,
            dob: formData.dob,
            issueDate: formData.issueDate
        });

        if (result.success && result.customer) {
            setSuccessMsg('Đăng ký thành công! Hãy dùng Số điện thoại để đăng nhập.');
            setTimeout(() => {
                onLoginSuccess(result.customer!);
                onClose();
            }, 2000);
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

        <div className="p-6">
            <h2 className="text-2xl font-serif font-bold text-center mb-6 text-gray-800">
                {mode === 'LOGIN' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </h2>

            {/* Registration: CCCD Display & Scan Button */}
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
                                    <p className="text-xs"><span className="text-gray-500 text-[10px] uppercase mr-1">Ngày cấp:</span> <span className="font-medium">{formData.issueDate}</span></p>
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
                        {formData.cccdNumber ? 'Quét lại CCCD' : 'Quét CCCD để điền tự động'}
                    </button>
                </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'REGISTER' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Họ và tên</label>
                                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số CCCD</label>
                                <input type="text" name="cccdNumber" required value={formData.cccdNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày sinh</label>
                                <input type="text" name="dob" required value={formData.dob} onChange={handleChange} placeholder="DD/MM/YYYY" className="w-full px-3 py-2 border rounded-md text-sm" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Giới tính</label>
                                <input type="text" name="gender" required value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" />
                            </div>
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Số điện thoại</label>
                                <input type="tel" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" />
                                <p className="text-[10px] text-[#D4AF37] mt-1 italic">SĐT này sẽ là tên đăng nhập chính thức của bạn.</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ngày cấp CCCD</label>
                            <input type="text" name="issueDate" required value={formData.issueDate} onChange={handleChange} placeholder="DD/MM/YYYY" className="w-full px-3 py-2 border rounded-md text-sm" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nơi thường trú</label>
                            <input type="text" name="address" required value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" />
                        </div>
                    </>
                )}
                
                {mode === 'LOGIN' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tài khoản đăng nhập</label>
                        <input 
                            type="text" 
                            name="identifier"
                            required
                            value={formData.identifier}
                            onChange={handleChange}
                            placeholder="Nhập số điện thoại"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-[#D4AF37] focus:border-[#D4AF37]" 
                        />
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mật khẩu</label>
                        <input 
                            type="password" 
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" 
                        />
                    </div>
                    {mode === 'REGISTER' && (
                         <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nhập lại MK</label>
                            <input 
                                type="password" 
                                name="confirmPassword"
                                required
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" 
                            />
                        </div>
                    )}
                </div>

                {error && <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded">{error}</p>}
                {successMsg && <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded">{successMsg}</p>}

                <button 
                    type="submit" 
                    className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#D4AF37] hover:bg-[#b89b31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors font-bold uppercase"
                >
                    {mode === 'LOGIN' ? 'Đăng Nhập' : 'Hoàn tất Đăng Ký'}
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
