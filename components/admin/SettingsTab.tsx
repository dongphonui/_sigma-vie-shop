
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { SocialSettings, BankSettings, AdminLoginLog, AdminUser } from '../../types';
import { getBankSettings, updateBankSettings } from '../../utils/bankSettingsStorage';
import { getSocialSettings, updateSocialSettings } from '../../utils/socialSettingsStorage';
import { 
    getAdminEmails, addAdminEmail, removeAdminEmail, getPrimaryAdminEmail,
    isTotpEnabled, generateTotpSecret, getTotpUri, enableTotp, disableTotp, verifyTempTotpToken, verifyTotpToken
} from '../../utils/adminSettingsStorage';
import { sendEmail, fetchAdminLoginLogs, changeAdminPassword, fetchAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, syncShippingSettingsToDB, fetchShippingSettingsFromDB } from '../../utils/apiClient';
import { getShippingSettings, updateShippingSettings } from '../../utils/shippingSettingsStorage';
import { downloadBackup, restoreBackup, performFactoryReset } from '../../utils/backupHelper';
import { VIET_QR_BANKS } from '../../utils/constants';
import { ShieldCheckIcon, CheckIcon, CreditCardIcon, ActivityIcon } from '../Icons';

// Import newly separated components
import HomePageSettingsTab from './settings/HomePageSettingsTab';
import HeaderSettingsTab from './settings/HeaderSettingsTab';
import AboutPageSettingsTab from './settings/AboutPageSettingsTab';

interface SettingsTabProps {
    currentUser: AdminUser | null;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<'GENERAL' | 'HOME' | 'HEADER' | 'ABOUT'>('GENERAL');
  
  // -- General Settings State --
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const [settingsFeedback, setSettingsFeedback] = useState('');
  const [adminLogs, setAdminLogs] = useState<AdminLoginLog[]>([]);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  
  // -- Password --
  const [passwordData, setPasswordData] = useState({ old: '', new: '', confirm: '' });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // -- 2FA --
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [tempTotpSecret, setTempTotpSecret] = useState('');
  const [tempTotpUri, setTempTotpUri] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const [showBankSecurityModal, setShowBankSecurityModal] = useState(false);
  const [securityCode, setSecurityCode] = useState('');

  useEffect(() => {
      // Load all settings
      setAdminEmails(getAdminEmails());
      setSocialSettings(getSocialSettings());
      setTotpEnabled(isTotpEnabled());
      setBankSettings(getBankSettings());
      fetchAdminLoginLogs().then(logs => { if (logs) setAdminLogs(logs); });
  }, [currentUser]);

  // --- Handlers ---
  
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      if (passwordData.new !== passwordData.confirm) { setSettingsFeedback('Mật khẩu không khớp'); return; }
      const res = await changeAdminPassword({ id: currentUser.id, oldPassword: passwordData.old, newPassword: passwordData.new });
      if(res.success) { setSettingsFeedback('Đổi mật khẩu thành công'); setShowPasswordForm(false); } else { setSettingsFeedback(res.message); }
  };

  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(isTotpEnabled()) { setShowBankSecurityModal(true); setSecurityCode(''); } 
      else if(confirm('Lưu không 2FA?')) { if(bankSettings) updateBankSettings(bankSettings); }
  };

  const handleVerifyBankUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if(verifyTotpToken(securityCode)) { if(bankSettings) updateBankSettings(bankSettings); setShowBankSecurityModal(false); setSettingsFeedback('Đã lưu NH'); } else alert('Sai mã');
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminEmail) {
        addAdminEmail(newAdminEmail);
        setNewAdminEmail('');
        setAdminEmails(getAdminEmails());
        setSettingsFeedback('Đã thêm Email.');
    }
  };

  const handleRemoveEmail = (email: string) => {
      removeAdminEmail(email);
      setAdminEmails(getAdminEmails());
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
      if (verifyTempTotpToken(verificationCode.replace(/\s/g, ''), tempTotpSecret)) {
          enableTotp(tempTotpSecret);
          setTotpEnabled(true);
          setShowTotpSetup(false);
          setSettingsFeedback('Đã bật bảo mật 2 lớp.');
      } else {
          alert('Mã không đúng');
      }
  };

  const handleDisableTotp = () => {
      if(confirm('Tắt 2FA?')) {
          disableTotp();
          setTotpEnabled(false);
          setSettingsFeedback('Đã tắt bảo mật 2 lớp.');
      }
  };

  const handleSocialSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(socialSettings) {
          updateSocialSettings(socialSettings);
          setSettingsFeedback('Đã lưu Mạng xã hội.');
      }
  }

  return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
          <div className="flex border-b mb-6 overflow-x-auto">
              <button onClick={() => setSubTab('GENERAL')} className={`px-4 py-2 border-b-2 font-bold whitespace-nowrap ${subTab === 'GENERAL' ? 'border-[#00695C] text-[#00695C]' : 'border-transparent text-gray-500'}`}>Cài đặt Chung</button>
              <button onClick={() => setSubTab('HOME')} className={`px-4 py-2 border-b-2 font-bold whitespace-nowrap ${subTab === 'HOME' ? 'border-[#00695C] text-[#00695C]' : 'border-transparent text-gray-500'}`}>Trang Chủ</button>
              <button onClick={() => setSubTab('HEADER')} className={`px-4 py-2 border-b-2 font-bold whitespace-nowrap ${subTab === 'HEADER' ? 'border-[#00695C] text-[#00695C]' : 'border-transparent text-gray-500'}`}>Header & Logo</button>
              <button onClick={() => setSubTab('ABOUT')} className={`px-4 py-2 border-b-2 font-bold whitespace-nowrap ${subTab === 'ABOUT' ? 'border-[#00695C] text-[#00695C]' : 'border-transparent text-gray-500'}`}>Giới Thiệu</button>
          </div>

          {subTab === 'GENERAL' && (
              <div className="space-y-8">
                  {/* Password Change */}
                  <div>
                      <h4 className="font-bold text-gray-700 mb-4">Đổi mật khẩu</h4>
                      {!showPasswordForm ? (
                          <button onClick={() => setShowPasswordForm(true)} className="text-blue-600 text-sm hover:underline">Thay đổi mật khẩu đăng nhập</button>
                      ) : (
                          <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm bg-gray-50 p-4 rounded">
                              <input type="password" placeholder="Mật khẩu cũ" value={passwordData.old} onChange={e => setPasswordData({...passwordData, old: e.target.value})} className="w-full border p-2 rounded" required />
                              <input type="password" placeholder="Mật khẩu mới" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} className="w-full border p-2 rounded" required />
                              <input type="password" placeholder="Xác nhận" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} className="w-full border p-2 rounded" required />
                              <div className="flex gap-2">
                                  <button type="submit" className="bg-[#D4AF37] text-white px-4 py-1 rounded">Lưu</button>
                                  <button type="button" onClick={() => setShowPasswordForm(false)} className="text-gray-500 px-4 py-1">Hủy</button>
                              </div>
                          </form>
                      )}
                  </div>

                  {/* 2FA Section */}
                  <div className="border-t pt-6">
                      <h4 className="font-bold text-gray-700 mb-4">Bảo mật 2 lớp (Google Authenticator)</h4>
                      {totpEnabled ? (
                          <div className="flex items-center gap-4">
                              <span className="text-green-600 font-bold flex items-center gap-1"><CheckIcon className="w-4 h-4"/> Đã kích hoạt</span>
                              <button onClick={handleDisableTotp} className="text-red-500 text-sm underline">Tắt</button>
                          </div>
                      ) : (
                          !showTotpSetup ? (
                              <button onClick={handleStartTotpSetup} className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">Thiết lập ngay</button>
                          ) : (
                              <div className="bg-gray-50 p-4 rounded border">
                                  <div className="flex gap-4 mb-4">
                                      <div className="bg-white p-2 border"><QRCodeSVG value={tempTotpUri} size={120} /></div>
                                      <div className="text-sm">
                                          <p>1. Quét mã QR bằng Google Authenticator.</p>
                                          <p>2. Nhập mã 6 số:</p>
                                          <form onSubmit={handleVerifyAndEnableTotp} className="flex gap-2 mt-2">
                                              <input type="text" className="border p-1 w-24 text-center tracking-widest" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} />
                                              <button className="bg-[#00695C] text-white px-3 py-1 rounded">Bật</button>
                                          </form>
                                      </div>
                                  </div>
                                  <button onClick={() => setShowTotpSetup(false)} className="text-gray-500 text-sm underline">Hủy</button>
                              </div>
                          )
                      )}
                  </div>

                  {/* Bank Settings */}
                  <div className="border-t pt-6">
                      <h4 className="font-bold text-gray-700 mb-4">Thanh toán (VietQR)</h4>
                      {bankSettings && (
                          <form onSubmit={handleBankSettingsSubmit} className="space-y-4 max-w-lg">
                              <select value={bankSettings.bankId} onChange={e => setBankSettings({...bankSettings, bankId: e.target.value})} className="w-full border p-2 rounded">
                                  <option value="">-- Ngân hàng --</option>
                                  {VIET_QR_BANKS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                              <input type="text" placeholder="Số tài khoản" value={bankSettings.accountNumber} onChange={e => setBankSettings({...bankSettings, accountNumber: e.target.value})} className="w-full border p-2 rounded" />
                              <input type="text" placeholder="Tên chủ TK (Viết hoa)" value={bankSettings.accountName} onChange={e => setBankSettings({...bankSettings, accountName: e.target.value.toUpperCase()})} className="w-full border p-2 rounded" />
                              <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded">Lưu thông tin</button>
                          </form>
                      )}
                  </div>
                  
                  {/* Admin Emails */}
                  <div className="border-t pt-6">
                      <h4 className="font-bold text-gray-700 mb-4">Email Quản trị (Nhận thông báo)</h4>
                      <ul className="mb-2 space-y-1">
                          {adminEmails.map(email => (
                              <li key={email} className="flex justify-between max-w-sm bg-gray-50 p-2 rounded">
                                  <span>{email}</span>
                                  <button onClick={() => handleRemoveEmail(email)} className="text-red-500 text-xs">Xóa</button>
                              </li>
                          ))}
                      </ul>
                      <form onSubmit={handleAddEmail} className="flex gap-2 max-w-sm">
                          <input type="email" placeholder="Thêm email..." value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} className="border p-2 rounded flex-1" />
                          <button type="submit" className="bg-[#00695C] text-white px-3 rounded">Thêm</button>
                      </form>
                  </div>

                  {/* Social Media */}
                  <div className="border-t pt-6">
                        <h4 className="font-bold text-gray-700 mb-4">Mạng xã hội</h4>
                        {socialSettings && (
                            <form onSubmit={handleSocialSubmit} className="space-y-4 max-w-lg">
                                <input type="url" placeholder="Facebook URL" value={socialSettings.facebook} onChange={(e) => setSocialSettings({...socialSettings, facebook: e.target.value})} className="w-full border rounded px-3 py-2" />
                                <input type="url" placeholder="Instagram URL" value={socialSettings.instagram} onChange={(e) => setSocialSettings({...socialSettings, instagram: e.target.value})} className="w-full border rounded px-3 py-2" />
                                <input type="url" placeholder="TikTok URL" value={socialSettings.tiktok} onChange={(e) => setSocialSettings({...socialSettings, tiktok: e.target.value})} className="w-full border rounded px-3 py-2" />
                                <button type="submit" className="w-full bg-[#D4AF37] text-white font-bold py-2 rounded">Cập nhật</button>
                            </form>
                        )}
                  </div>

                  {/* Logs */}
                  <div className="border-t pt-6">
                        <h4 className="font-bold text-gray-700 mb-4">Nhật ký đăng nhập</h4>
                        <div className="max-h-40 overflow-y-auto border rounded bg-gray-50 text-xs">
                            <table className="w-full text-left">
                                <thead className="bg-gray-200">
                                    <tr><th className="p-2">Thời gian</th><th className="p-2">User</th><th className="p-2">IP</th></tr>
                                </thead>
                                <tbody>
                                    {adminLogs.map(log => (
                                        <tr key={log.id} className="border-b">
                                            <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-2">{log.username}</td>
                                            <td className="p-2">{log.ip_address}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                  </div>
              </div>
          )}

          {subTab === 'HOME' && <HomePageSettingsTab />}

          {subTab === 'HEADER' && <HeaderSettingsTab />}

          {subTab === 'ABOUT' && <AboutPageSettingsTab />}

          {settingsFeedback && (
                 <div className={`fixed bottom-4 right-4 z-50 p-3 rounded text-center font-medium animate-bounce shadow-lg ${settingsFeedback.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                     {settingsFeedback}
                 </div>
            )}

            {/* Bank Security Modal */}
            {showBankSecurityModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
                        <h3 className="text-lg font-bold text-gray-800 text-center mb-4">Xác thực 2FA</h3>
                        <form onSubmit={handleVerifyBankUpdate}>
                            <input type="text" placeholder="Nhập mã 6 số" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} className="w-full text-center text-xl tracking-widest font-mono border rounded px-3 py-3 mb-4" maxLength={6} autoFocus required />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => { setShowBankSecurityModal(false); setSecurityCode(''); }} className="flex-1 py-2 border rounded">Hủy</button>
                                <button type="submit" className="flex-1 py-2 bg-[#D4AF37] text-white rounded font-bold">Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
      </div>
  );
};

export default SettingsTab;
