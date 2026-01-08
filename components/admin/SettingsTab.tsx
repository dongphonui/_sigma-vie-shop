
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { SocialSettings, BankSettings, AdminLoginLog, AdminUser, StoreSettings, ShippingSettings } from '../../types';
import { getBankSettings, updateBankSettings } from '../../utils/bankSettingsStorage';
import { getSocialSettings, updateSocialSettings } from '../../utils/socialSettingsStorage';
import { getStoreSettings, updateStoreSettings } from '../../utils/storeSettingsStorage';
import { getShippingSettings, updateShippingSettings } from '../../utils/shippingSettingsStorage';
import { downloadBackup, restoreBackup, performFactoryReset } from '../../utils/backupHelper';
import { 
    getAdminEmails, addAdminEmail, removeAdminEmail, getPrimaryAdminEmail, getAdminPhone, updateAdminPhone,
    isTotpEnabled, generateTotpSecret, getTotpUri, enableTotp, disableTotp, verifyTempTotpToken, verifyTotpToken
} from '../../utils/adminSettingsStorage';
import { fetchAdminLoginLogs, changeAdminPassword, fetchAdminUsers, createAdminUser, deleteAdminUser, updateAdminUser, sendEmail } from '../../utils/apiClient';
import { VIET_QR_BANKS } from '../../utils/constants';
import { 
    ShieldCheckIcon, CheckIcon, ActivityIcon, TruckIcon, PrinterIcon, 
    UsersIcon, Trash2Icon, EditIcon, RefreshIcon, CreditCardIcon, DownloadIcon, AlertCircleIcon, XIcon, UserIcon
} from '../Icons';

interface SettingsTabProps {
    currentUser: AdminUser | null;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ currentUser }) => {
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState(''); 
  const [adminLogs, setAdminLogs] = useState<AdminLoginLog[]>([]);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [tempTotpSecret, setTempTotpSecret] = useState('');
  const [tempTotpUri, setTempTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [showBankSecurityModal, setShowBankSecurityModal] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [subAdmins, setSubAdmins] = useState<AdminUser[]>([]);
  const [newSubAdmin, setNewSubAdmin] = useState({ username: '', password: '', fullname: '', phoneNumber: '', permissions: [] as string[] });
  const [editingSubAdminId, setEditingSubAdminId] = useState<string | null>(null);
  const [showSubAdminForm, setShowSubAdminForm] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const PERMISSION_OPTIONS = [
      { id: 'dashboard', label: 'Xem Tổng quan', group: 'Module Chính' },
      { id: 'products', label: 'Quản lý Sản phẩm', group: 'Module Chính' },
      { id: 'orders', label: 'Quản lý Đơn hàng', group: 'Module Chính' },
      { id: 'chat', label: 'Trực Chat Hỗ trợ', group: 'Module Chính' },
      { id: 'inventory', label: 'Quản lý Kho', group: 'Module Chính' },
      { id: 'customers', label: 'Quản lý Khách hàng', group: 'Module Chính' },
      { id: 'customer_care', label: 'Chăm sóc Khách hàng', group: 'Module Chính' },
      { id: 'reports', label: 'Xem Báo cáo', group: 'Module Chính' },
      { id: 'settings_ui', label: 'Sửa Giao diện Web', group: 'Cài đặt' },
      { id: 'settings_info', label: 'Sửa Thông tin Shop', group: 'Cài đặt' },
      { id: 'settings_shipping', label: 'Cấu hình Vận chuyển', group: 'Cài đặt' },
      { id: 'settings_data', label: 'Quản lý Dữ liệu', group: 'Cài đặt' },
      { id: 'settings_logs', label: 'Xem Nhật ký', group: 'Cài đặt' },
  ];

  useEffect(() => {
      setAdminEmails(getAdminEmails());
      setAdminPhone(getAdminPhone());
      setSocialSettings(getSocialSettings());
      setTotpEnabled(isTotpEnabled());
      setBankSettings(getBankSettings());
      setStoreSettings(getStoreSettings());
      setShippingSettings(getShippingSettings());
      fetchAdminLoginLogs().then(l => l && setAdminLogs(l));
      if (currentUser?.role === 'MASTER') fetchAdminUsers().then(u => u && setSubAdmins(u));
  }, [currentUser]);

  const handleUpdatePhone = (e: React.FormEvent) => {
      e.preventDefault();
      updateAdminPhone(adminPhone);
      setSettingsFeedback('✅ Đã cập nhật số điện thoại nhận OTP.');
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmittingAdmin(true);
      try {
          if (editingSubAdminId) {
              await updateAdminUser(editingSubAdminId, newSubAdmin);
              setSettingsFeedback('Đã cập nhật nhân viên.');
          } else {
              await createAdminUser({ ...newSubAdmin, id: `ADMIN-${Date.now()}`, role: 'STAFF', created_at: Date.now() });
              setSettingsFeedback('Đã thêm nhân viên mới.');
          }
          setShowSubAdminForm(false);
          setNewSubAdmin({ username: '', password: '', fullname: '', phoneNumber: '', permissions: [] });
          setEditingSubAdminId(null);
          fetchAdminUsers().then(u => u && setSubAdmins(u));
      } catch (e) { setSettingsFeedback('Lỗi lưu.'); }
      setIsSubmittingAdmin(false);
  };

  const handleEditAdmin = (admin: AdminUser) => {
      setEditingSubAdminId(admin.id);
      setNewSubAdmin({ username: admin.username, password: '', fullname: admin.fullname, phoneNumber: admin.phoneNumber || '', permissions: admin.permissions || [] });
      setShowSubAdminForm(true);
  };

  const togglePermission = (permId: string) => {
      setNewSubAdmin(prev => {
          const current = [...prev.permissions];
          if (current.includes(permId)) return { ...prev, permissions: current.filter(p => p !== permId) };
          return { ...prev, permissions: [...current, permId] };
      });
  };

  // Fixed: Added handleAddEmail to resolve name not found error
  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminEmail) {
        addAdminEmail(newAdminEmail);
        setNewAdminEmail('');
        setAdminEmails(getAdminEmails());
        setSettingsFeedback(`Đã thêm email ${newAdminEmail} thành công!`);
        setTimeout(() => setSettingsFeedback(''), 3000);
    }
  };

  // Fixed: Added handleRemoveEmail to resolve usage in JSX
  const handleRemoveEmail = (email: string) => {
      removeAdminEmail(email);
      setAdminEmails(getAdminEmails());
      setSettingsFeedback(`Đã xóa email ${email}.`);
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  // Fixed: Added handleStartTotpSetup to resolve name not found error
  const handleStartTotpSetup = () => {
      const secret = generateTotpSecret();
      setTempTotpSecret(secret);
      setTempTotpUri(getTotpUri(secret));
      setShowTotpSetup(true);
      setVerificationCode('');
  };

  // Fixed: Added handleVerifyAndEnableTotp to resolve name not found error
  const handleVerifyAndEnableTotp = (e: React.FormEvent) => {
      e.preventDefault();
      const cleanCode = verificationCode.replace(/\s/g, '');
      if (verifyTempTotpToken(cleanCode, tempTotpSecret)) {
          enableTotp(tempTotpSecret);
          setTotpEnabled(true);
          setShowTotpSetup(false);
          setSettingsFeedback('✅ Đã bật bảo mật 2 lớp thành công!');
      } else {
          setSettingsFeedback('❌ Mã xác nhận không đúng.');
      }
      setTimeout(() => setSettingsFeedback(''), 6000);
  };

  // Fixed: Added handleDisableTotp to resolve usage in JSX
  const handleDisableTotp = () => {
      if (window.confirm('Bạn có chắc chắn muốn tắt bảo mật 2 lớp không?')) {
          disableTotp();
          setTotpEnabled(false);
          setSettingsFeedback('Đã tắt bảo mật 2 lớp.');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  // Fixed: Added handleBankSettingsSubmit to resolve usage in JSX
  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isTotpEnabled()) {
          setShowBankSecurityModal(true);
          setSecurityCode('');
      } else {
          if(confirm('Cảnh báo: Bạn chưa bật bảo mật 2 lớp. Bạn có muốn tiếp tục?')) {
              executeBankUpdate();
          }
      }
  };

  // Fixed: Added internal helper executeBankUpdate
  const executeBankUpdate = () => {
      if (bankSettings) {
          updateBankSettings(bankSettings);
          setSettingsFeedback('Đã cập nhật thông tin Ngân hàng!');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  // Fixed: Added handleVerifyBankUpdate to resolve usage in JSX
  const handleVerifyBankUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (verifyTotpToken(securityCode)) {
          executeBankUpdate();
          setShowBankSecurityModal(false);
          setSecurityCode('');
      } else {
          alert('Mã xác thực không đúng!');
      }
  };

  // Fixed: Added handleBankSettingsChange to resolve usage in JSX
  const handleBankSettingsChange = (field: keyof BankSettings, value: string) => {
      if (bankSettings) {
          setBankSettings({ ...bankSettings, [field]: value });
      }
  };

  // Fixed: Added handleSocialSettingsChange to resolve usage in JSX
  const handleSocialSettingsChange = (field: keyof SocialSettings, value: string) => {
      if (socialSettings) {
          setSocialSettings({ ...socialSettings, [field]: value });
      }
  };

  // Fixed: Added handleSocialSettingsSubmit to resolve usage in JSX
  const handleSocialSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (socialSettings) {
          updateSocialSettings(socialSettings);
          setSettingsFeedback('Đã cập nhật liên kết mạng xã hội!');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  // Fixed: Added handleTestEmail to resolve usage in JSX
  const handleTestEmail = async () => {
      const email = getPrimaryAdminEmail();
      const result = await sendEmail(
          email, 
          'Kiểm tra cấu hình Email Sigma Vie', 
          '<h1>Xin chào!</h1><p>Hệ thống gửi mail đang hoạt động tốt.</p>'
      );
      if(result && result.success) {
          setSettingsFeedback('Thành công: Email kiểm tra đã được gửi.');
      } else {
          setSettingsFeedback('Lỗi: Không thể gửi email.');
      }
      setTimeout(() => setSettingsFeedback(''), 5000);
  };

  return (
      <div className="space-y-10 animate-fade-in-up pb-20">
          {/* SECURITY & EMAILS */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Bảo mật & Email hệ thống</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                      <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Nhận OTP SMS (Điện thoại)</p>
                          <form onSubmit={handleUpdatePhone} className="flex gap-2 mb-6">
                              <input type="text" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="09xxxxxxx..." className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" required />
                              <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest">Lưu SĐT</button>
                          </form>
                          
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Emails nhận thông báo</p>
                          <div className="space-y-3 mb-4">
                              {adminEmails.map(email => (
                                  <div key={email} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                      <span className="text-xs font-bold text-slate-700">{email}</span>
                                      <button onClick={() => handleRemoveEmail(email)} className="text-rose-300 hover:text-rose-500"><Trash2Icon className="w-4 h-4"/></button>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleAddEmail} className="flex gap-2">
                              <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="Email quản trị mới..." className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" required />
                              <button type="submit" className="bg-[#00695C] text-white px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest">Thêm</button>
                          </form>
                      </div>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheckIcon className="w-20 h-20" /></div>
                      <h5 className="text-xs font-black uppercase tracking-[0.2em] mb-4">Bảo mật 2 lớp (2FA App)</h5>
                      {totpEnabled ? (
                          <div className="space-y-4">
                              <div className="flex items-center gap-3 text-emerald-400"><CheckIcon className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest">Đang kích hoạt</span></div>
                              <button onClick={handleDisableTotp} className="text-rose-400 text-[10px] font-black uppercase tracking-widest hover:underline">Hủy kích hoạt 2FA</button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {!showTotpSetup ? (
                                  <button onClick={handleStartTotpSetup} className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Thiết lập 2FA App</button>
                              ) : (
                                  <div className="space-y-6 animate-fade-in">
                                      <div className="bg-white p-2 rounded-2xl inline-block shadow-2xl"><QRCodeSVG value={tempTotpUri} size={150} /></div>
                                      <form onSubmit={handleVerifyAndEnableTotp} className="flex gap-2">
                                          <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="bg-white/10 border-2 border-white/10 rounded-xl px-4 py-2 text-center font-mono tracking-[0.5em] text-lg w-full outline-none focus:border-[#D4AF37]" maxLength={6} required />
                                          <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded-xl font-bold">Lưu</button>
                                      </form>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* Bank Settings Section */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <CreditCardIcon className="w-5 h-5" /> Cấu hình Thanh toán (VietQR)
              </h4>
              {bankSettings && (
                  <form onSubmit={handleBankSettingsSubmit} className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Ngân hàng</label>
                              <select 
                                  value={bankSettings.bankId} 
                                  onChange={(e) => handleBankSettingsChange('bankId', e.target.value)} 
                                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none"
                                  required
                              >
                                  <option value="">-- Chọn ngân hàng --</option>
                                  {VIET_QR_BANKS.map(bank => (
                                      <option key={bank.id} value={bank.id}>{bank.name} ({bank.id})</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Số tài khoản</label>
                              <input 
                                  type="text" 
                                  value={bankSettings.accountNumber} 
                                  onChange={(e) => handleBankSettingsChange('accountNumber', e.target.value)} 
                                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none"
                                  required 
                              />
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tên chủ tài khoản (Viết hoa không dấu)</label>
                              <input 
                                  type="text" 
                                  value={bankSettings.accountName} 
                                  onChange={(e) => handleBankSettingsChange('accountName', e.target.value.toUpperCase())} 
                                  className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none uppercase"
                                  required 
                              />
                          </div>
                      </div>
                      <button type="submit" className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg">
                          Lưu thông tin Ngân hàng
                      </button>
                  </form>
              )}
          </div>

          {/* Social Media Links */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Liên kết Mạng xã hội (Footer)</h4>
              {socialSettings && (
                  <form onSubmit={handleSocialSettingsSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Facebook URL</label>
                              <input type="url" value={socialSettings.facebook} onChange={(e) => handleSocialSettingsChange('facebook', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Instagram URL</label>
                              <input type="url" value={socialSettings.instagram} onChange={(e) => handleSocialSettingsChange('instagram', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">TikTok URL</label>
                              <input type="url" value={socialSettings.tiktok} onChange={(e) => handleSocialSettingsChange('tiktok', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" />
                          </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Twitter/X URL</label>
                              <input type="url" value={socialSettings.twitter} onChange={(e) => handleSocialSettingsChange('twitter', e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" />
                          </div>
                      </div>
                      <button type="submit" className="bg-[#D4AF37] text-white font-bold py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest shadow-lg">
                          Cập nhật Liên kết
                      </button>
                  </form>
              )}
          </div>

          {/* Test Tools */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Công cụ kiểm tra</h4>
              <button onClick={handleTestEmail} className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors">📧 Gửi Email kiểm tra</button>
          </div>

          {/* Bank Security Modal */}
          {showBankSecurityModal && (
              <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 animate-fade-in-up">
                      <div className="text-center mb-6">
                          <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
                              <ShieldCheckIcon className="w-8 h-8 text-amber-500" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Xác thực bảo mật</h3>
                          <p className="text-xs text-slate-400 mt-2 font-medium">Nhập mã 6 số từ Google Authenticator để xác nhận thay đổi.</p>
                      </div>
                      <form onSubmit={handleVerifyBankUpdate}>
                          <input type="text" placeholder="Mã 6 số" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} className="w-full text-center text-2xl tracking-[0.5em] font-mono border-2 border-slate-100 rounded-xl px-4 py-3 mb-6 focus:border-[#D4AF37] outline-none" maxLength={6} autoFocus required />
                          <div className="flex gap-3">
                              <button type="button" onClick={() => { setShowBankSecurityModal(false); setSecurityCode(''); }} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Hủy</button>
                              <button type="submit" className="flex-1 py-3 bg-[#D4AF37] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Xác nhận</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {settingsFeedback && (
                 <div className="fixed bottom-10 right-10 z-[200] px-8 py-5 rounded-[2rem] bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-4">
                     <span className="font-black text-xs uppercase tracking-widest">{settingsFeedback}</span>
                     <button onClick={() => setSettingsFeedback('')} className="p-2 hover:bg-white/10 rounded-full"><XIcon className="w-4 h-4" /></button>
                 </div>
            )}
      </div>
  );
};

export default SettingsTab;
