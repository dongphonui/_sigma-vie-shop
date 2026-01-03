
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
      cccd: `f_id_${Math.random().toString(36).substring(7)}`,
      dob: `f_dob_${Math.random().toString(36).substring(7)}`,
      issueDate: `f_iss_${Math.random().toString(36).substring(7)}`,
      address: `f_adr_${Math.random().toString(36).substring(7)}`,
      gender: `f_gen_${Math.random().toString(36).substring(7)}`
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
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
          // Convert DD/MM/YYYY to YYYY-MM-DD for input[type="date"]
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
          setSuccessMsg(`Đã nhận diện CCCD thành công!`);
          setTimeout(() => setSuccessMsg(''), 4000);
      } else alert("Mã QR không đúng định dạng CCCD.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMsg(''); setIsProcessing(true);

    if (mode === 'REGISTER') {
        if (formData.password !== formData.confirmPassword) { setError('Mật khẩu không khớp.'); setIsProcessing(false); return; }
        const result = await registerCustomer(formData as any);
        if (result.success && result.customer) {
            setSuccessMsg('Đăng ký thành công!');
            setTimeout(() => { onLoginSuccess(result.customer!); onClose(); }, 2000);
        } else {
            setError(result.message);
        }
        setIsProcessing(false);
    } else if (mode === 'LOGIN') {
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
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up max-h-[95vh] overflow-y-auto">
        {(mode === 'LOGIN' || mode === 'REGISTER') && (
            <div className="flex border-b">
                <button onClick={() => setMode('LOGIN')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${mode === 'LOGIN' ? 'text-[#00695C] border-b-2 border-[#00695C] bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}>Đăng Nhập</button>
                <button onClick={() => setMode('REGISTER')} className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider ${mode === 'REGISTER' ? 'text-[#00695C] border-b-2 border-[#00695C] bg-teal-50' : 'text-gray-500 hover:bg-gray-50'}`}>Đăng Ký</button>
            </div>
        )}

        <div className="p-6">
            <h2 className="text-2xl font-serif font-bold text-center mb-6 text-gray-800">
                {mode === 'LOGIN' ? 'Chào mừng trở lại' : 'Tạo tài khoản thành viên'}
            </h2>

            {mode === 'REGISTER' && (
                <button type="button" onClick={() => setShowScanner(true)} className="w-full mb-6 bg-[#00695C] text-white py-3 rounded-lg font-bold shadow hover:bg-[#004d40] flex items-center justify-center gap-2"><ScanIcon className="w-5 h-5" /> Quét CCCD để nhập nhanh</button>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                {mode === 'REGISTER' && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Email *</label><input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-[#D4AF37]" /></div>
                             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Số điện thoại *</label><input type="tel" name="phoneNumber" required value={formData.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-[#D4AF37]" /></div>
                        </div>
                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Họ và tên *</label><input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-[#D4AF37]" /></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Số CCCD *</label><input type="text" name={randomNames.cccd} required value={formData.cccdNumber} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-[#D4AF37]" /></div>
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Giới tính *</label>
                                <select name={randomNames.gender} value={formData.gender} onChange={handleChange} required className="w-full px-3 py-2 border rounded-md text-sm bg-white">
                                    <option value="">-- Chọn --</option>
                                    <option value="Nam">Nam</option>
                                    <option value="Nữ">Nữ</option>
                                    <option value="Khác">Khác</option>
                                </select>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Ngày sinh *</label><input type="date" name={randomNames.dob} required value={formData.dob} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                             <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Ngày cấp CCCD *</label><input type="date" name={randomNames.issueDate} required value={formData.issueDate} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                        </div>

                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Địa chỉ thường trú *</label><input type="text" name={randomNames.address} required value={formData.address} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm focus:ring-[#D4AF37]" placeholder="Số nhà, đường, phường/xã..." /></div>
                    </>
                )}
                
                {mode === 'LOGIN' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tài khoản (SĐT/Email)</label>
                        <input type="text" name="identifier" required value={formData.identifier} onChange={handleChange} placeholder="Nhập số điện thoại hoặc email" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Mật khẩu *</label><input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>
                    {mode === 'REGISTER' && <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nhập lại mật khẩu *</label><input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 border rounded-md text-sm" /></div>}
                </div>

                {error && <p className="text-sm text-red-600 text-center bg-red-50 p-2 rounded border border-red-100">{error}</p>}
                {successMsg && <p className="text-sm text-green-600 text-center bg-green-50 p-2 rounded border border-green-100">{successMsg}</p>}

                <button type="submit" disabled={isProcessing} className="w-full py-3 bg-[#D4AF37] text-white rounded-lg font-bold shadow-lg hover:bg-[#b89b31] transition-all flex items-center justify-center gap-2">
                    {isProcessing && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    {mode === 'LOGIN' ? 'Đăng Nhập' : 'Hoàn tất Đăng Ký'}
                </button>
            </form>

            <button onClick={onClose} className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600" disabled={isProcessing}>Đóng</button>
        </div>
      </div>
    </div>
    {showScanner && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setShowScanner(false)} />}
    </>
  );
};

export default AuthModal;
