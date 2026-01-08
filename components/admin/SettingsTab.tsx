
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
    getSmsSenderId, updateSmsSenderId,
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
  const [smsSenderId, setSmsSenderId] = useState('');
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setAdminEmails(getAdminEmails());
      setAdminPhone(getAdminPhone());
      setSmsSenderId(getSmsSenderId());
      setSocialSettings(getSocialSettings());
      setTotpEnabled(isTotpEnabled());
      setBankSettings(getBankSettings());
      setStoreSettings(getStoreSettings());
      setShippingSettings(getShippingSettings());
      fetchAdminLoginLogs().then(l => l && setAdminLogs(l));
  }, []);

  const handleUpdateSmsConfig = (e: React.FormEvent) => {
      e.preventDefault();
      updateAdminPhone(adminPhone);
      updateSmsSenderId(smsSenderId);
      setSettingsFeedback('✅ Đã cập nhật cấu hình OTP.');
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminEmail) {
        addAdminEmail(newAdminEmail);
        setNewAdminEmail('');
        setAdminEmails(getAdminEmails());
        setSettingsFeedback(`Đã thêm email thông báo!`);
        setTimeout(() => setSettingsFeedback(''), 3000);
    }
  };

  const handleRemoveEmail = (email: string) => {
      removeAdminEmail(email);
      setAdminEmails(getAdminEmails());
      setSettingsFeedback(`Đã xóa email thông báo.`);
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleStartTotpSetup = () => {
      const secret = generateTotpSecret();
      setTempTotpSecret(secret);
      setTempTotpUri(getTotpUri(secret));
      setShowTotpSetup(true);
      setVerificationCode('');
  };

  const handleVerifyAndEnableTotp = (e: React.FormEvent) => {
      e.preventDefault();
      if (verifyTempTotpToken(verificationCode, tempTotpSecret)) {
          enableTotp(tempTotpSecret);
          setTotpEnabled(true);
          setShowTotpSetup(false);
          setSettingsFeedback('✅ Đã bật 2FA App!');
      } else {
          setSettingsFeedback('❌ Mã không đúng.');
      }
      setTimeout(() => setSettingsFeedback(''), 5000);
  };

  const handleDisableTotp = () => {
      if (window.confirm('Hủy bảo mật 2FA?')) {
          disableTotp();
          setTotpEnabled(false);
          setSettingsFeedback('Đã tắt 2FA.');
      }
  };

  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isTotpEnabled()) setShowBankSecurityModal(true);
      else if(confirm('Lưu thông tin ngân hàng?')) executeBankUpdate();
  };

  const executeBankUpdate = () => {
      if (bankSettings) {
          updateBankSettings(bankSettings);
          setSettingsFeedback('Đã lưu Ngân hàng!');
      }
  };

  const handleVerifyBankUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (verifyTotpToken(securityCode)) {
          executeBankUpdate();
          setShowBankSecurityModal(false);
      } else alert('Mã sai!');
  };

  return (
      <div className="space-y-10 animate-fade-in-up pb-20">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Bảo mật & Cấu hình OTP</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                      <div>
                          <p className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest mb-4">Cấu hình SMS (SpeedSMS)</p>
                          <form onSubmit={handleUpdateSmsConfig} className="space-y-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Số điện thoại nhận OTP (VD: 0912345678)</label>
                                  <input type="text" value={adminPhone} onChange={e => setAdminPhone(e.target.value)} placeholder="09xxxxxxxx" className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" required />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Brandname (Tên người gửi)</label>
                                  <input type="text" value={smsSenderId} onChange={e => setSmsSenderId(e.target.value)} placeholder="Bỏ trống nếu chưa có Brandname riêng" className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" />
                                  <div className="bg-amber-100/50 p-3 rounded-lg mt-2 border border-amber-200">
                                      <p className="text-[9px] text-amber-700 font-bold leading-relaxed italic">
                                          ⚠️ QUAN TRỌNG: Nếu bạn chưa đăng ký Brandname chính thức với SpeedSMS (có hồ sơ duyệt), hãy <b>ĐỂ TRỐNG</b> ô này để dùng đầu số mặc định. Nếu điền sai, OTP sẽ không bao giờ tới.
                                      </p>
                                  </div>
                              </div>
                              <button type="submit" className="w-full bg-[#111827] text-white py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all">Lưu cấu hình SMS</button>
                          </form>
                          
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Emails nhận thông báo</p>
                          <div className="space-y-2 mb-4">
                              {adminEmails.map(email => (
                                  <div key={email} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                      <span className="text-xs font-bold text-slate-700">{email}</span>
                                      <button onClick={() => handleRemoveEmail(email)} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2Icon className="w-4 h-4"/></button>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleAddEmail} className="flex gap-2">
                              <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="Email mới..." className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" required />
                              <button type="submit" className="bg-[#00695C] text-white px-5 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#004d40]">Thêm</button>
                          </form>
                      </div>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl h-fit">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheckIcon className="w-20 h-20" /></div>
                      <h5 className="text-xs font-black uppercase tracking-[0.2em] mb-4">Google Authenticator (2FA)</h5>
                      {totpEnabled ? (
                          <div className="space-y-4">
                              <div className="flex items-center gap-3 text-emerald-400"><CheckIcon className="w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest">Đang kích hoạt</span></div>
                              <button onClick={handleDisableTotp} className="text-rose-400 text-[10px] font-black uppercase tracking-widest hover:underline transition-all">Tắt bảo mật 2FA</button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {!showTotpSetup ? (
                                  <button onClick={handleStartTotpSetup} className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#b89b31] transition-all">Thiết lập 2FA App</button>
                              ) : (
                                  <div className="space-y-6 animate-fade-in">
                                      <div className="bg-white p-2 rounded-2xl inline-block shadow-2xl"><QRCodeSVG value={tempTotpUri} size={150} /></div>
                                      <form onSubmit={handleVerifyAndEnableTotp} className="flex gap-2">
                                          <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="bg-white/10 border-2 border-white/10 rounded-xl px-4 py-2 text-center tracking-[0.5em] text-lg w-full outline-none focus:border-[#D4AF37] font-mono" maxLength={6} required />
                                          <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded-xl font-bold">Lưu</button>
                                      </form>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Thanh toán VietQR</h4>
              {bankSettings && (
                  <form onSubmit={handleBankSettingsSubmit} className="space-y-4 bg-slate-50 p-6 rounded-3xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Ngân hàng</label>
                              <select value={bankSettings.bankId} onChange={(e) => setBankSettings({...bankSettings, bankId: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none">
                                  <option value="">-- Chọn ngân hàng --</option>
                                  {VIET_QR_BANKS.map(bank => <option key={bank.id} value={bank.id}>{bank.name}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Số tài khoản</label>
                              <input type="text" value={bankSettings.accountNumber} onChange={(e) => setBankSettings({...bankSettings, accountNumber: e.target.value})} className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none" required />
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Chủ tài khoản (Viết hoa không dấu)</label>
                              <input type="text" value={bankSettings.accountName} onChange={(e) => setBankSettings({...bankSettings, accountName: e.target.value.toUpperCase()})} className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none uppercase" required />
                          </div>
                      </div>
                      <button type="submit" className="bg-[#D4AF37] text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#b89b31] transition-all">Cập nhật Ngân hàng</button>
                  </form>
              )}
          </div>

          {showBankSecurityModal && (
              <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 animate-fade-in-up text-center">
                      <ShieldCheckIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                      <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Xác thực bảo mật</h3>
                      <p className="text-xs text-slate-400 mb-6 font-medium">Nhập mã 6 số từ Google Authenticator để xác nhận thay đổi thông tin ngân hàng.</p>
                      <form onSubmit={handleVerifyBankUpdate}>
                          <input type="text" placeholder="Mã 6 số" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} className="w-full text-center text-2xl tracking-[0.5em] font-mono border-2 border-slate-100 rounded-xl px-4 py-3 mb-6 focus:border-[#D4AF37] outline-none" maxLength={6} required autoFocus />
                          <div className="flex gap-3">
                              <button type="button" onClick={() => setShowBankSecurityModal(false)} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Hủy</button>
                              <button type="submit" className="flex-1 py-3 bg-[#D4AF37] text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Xác nhận</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {settingsFeedback && (
                 <div className="fixed bottom-10 right-10 z-[200] px-8 py-5 rounded-[2rem] bg-slate-900 text-white shadow-2xl border border-slate-700">
                     <span className="font-black text-xs uppercase tracking-widest">{settingsFeedback}</span>
                 </div>
            )}
      </div>
  );
};

export default SettingsTab;
