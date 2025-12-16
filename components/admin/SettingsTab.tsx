
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { SocialSettings, BankSettings, AdminLoginLog, AdminUser, StoreSettings, ShippingSettings } from '../../types';
import { getBankSettings, updateBankSettings } from '../../utils/bankSettingsStorage';
import { getSocialSettings, updateSocialSettings } from '../../utils/socialSettingsStorage';
import { getStoreSettings, updateStoreSettings } from '../../utils/storeSettingsStorage';
import { getShippingSettings, updateShippingSettings } from '../../utils/shippingSettingsStorage';
import { downloadBackup, restoreBackup, performFactoryReset } from '../../utils/backupHelper';
import { 
    getAdminEmails, addAdminEmail, removeAdminEmail, getPrimaryAdminEmail,
    isTotpEnabled, generateTotpSecret, getTotpUri, enableTotp, disableTotp, verifyTempTotpToken, verifyTotpToken
} from '../../utils/adminSettingsStorage';
import { fetchAdminLoginLogs, changeAdminPassword, fetchAdminUsers, createAdminUser, deleteAdminUser, updateAdminUser } from '../../utils/apiClient';
import { VIET_QR_BANKS } from '../../utils/constants';
import { ShieldCheckIcon, CheckIcon, ActivityIcon, TruckIcon, PrinterIcon, UsersIcon, Trash2Icon, EditIcon } from '../Icons';

interface SettingsTabProps {
    currentUser: AdminUser | null;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ currentUser }) => {
  
  // -- General Settings State --
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
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

  // -- Sub-Admin Management --
  const [subAdmins, setSubAdmins] = useState<AdminUser[]>([]);
  const [newSubAdmin, setNewSubAdmin] = useState({ username: '', password: '', fullname: '', permissions: [] as string[] });
  const [editingSubAdminId, setEditingSubAdminId] = useState<string | null>(null);
  const [showSubAdminForm, setShowSubAdminForm] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [createAdminFeedback, setCreateAdminFeedback] = useState(''); // NEW: Local feedback

  // -- Backup Loading --
  const [isBackupLoading, setIsBackupLoading] = useState(false);

  // GRANULAR PERMISSIONS LIST
  const PERMISSION_OPTIONS = [
      { id: 'dashboard', label: 'Xem Tổng quan', group: 'Module Chính' },
      { id: 'products', label: 'Quản lý Sản phẩm', group: 'Module Chính' },
      { id: 'orders', label: 'Quản lý Đơn hàng', group: 'Module Chính' },
      { id: 'inventory', label: 'Quản lý Kho', group: 'Module Chính' },
      { id: 'customers', label: 'Quản lý Khách hàng', group: 'Module Chính' },
      
      { id: 'settings_ui', label: 'Sửa Giao diện Web (Home, About, Header)', group: 'Cài đặt' },
      { id: 'settings_info', label: 'Sửa Thông tin Shop (In bill)', group: 'Cài đặt' },
      { id: 'settings_shipping', label: 'Cấu hình Vận chuyển', group: 'Cài đặt' },
      { id: 'settings_data', label: 'Quản lý Dữ liệu (Backup/Reset)', group: 'Cài đặt' },
      { id: 'settings_logs', label: 'Xem Nhật ký hoạt động', group: 'Cài đặt' },
  ];

  useEffect(() => {
      // Load all settings
      setAdminEmails(getAdminEmails());
      setSocialSettings(getSocialSettings());
      setTotpEnabled(isTotpEnabled());
      setBankSettings(getBankSettings());
      setStoreSettings(getStoreSettings());
      setShippingSettings(getShippingSettings());
      
      if (checkPermission('settings_logs')) {
          fetchAdminLoginLogs().then(logs => { if (logs) setAdminLogs(logs); });
      }

      // Load Sub-Admins only if Master or has specific account permission
      if (checkPermission('MASTER')) {
          loadSubAdmins();
      }
  }, [currentUser]);

  const checkPermission = (perm: string) => {
      if (!currentUser) return false;
      if (currentUser.role === 'MASTER' || currentUser.username === 'admin') return true;
      if (perm === 'MASTER') return false; // Explicit Master check
      return currentUser.permissions?.includes(perm) || currentUser.permissions?.includes('ALL');
  }

  const loadSubAdmins = () => {
      fetchAdminUsers().then(users => {
          if (users) {
              setSubAdmins(users);
          } else {
              // Handle case where server returns null/error
              console.warn("Could not fetch sub-admins (Offline or Error)");
          }
      });
  };

  // --- Handlers ---
  
  const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      if (passwordData.new !== passwordData.confirm) { setSettingsFeedback('Mật khẩu không khớp'); return; }
      const res = await changeAdminPassword({ id: currentUser.id, oldPassword: passwordData.old, newPassword: passwordData.new });
      if(res.success) { setSettingsFeedback('Đổi mật khẩu thành công'); setShowPasswordForm(false); } else { setSettingsFeedback(res.message); }
  };

  // ... Sub Admin Handlers ...
  const handleEditSubAdmin = (user: AdminUser) => {
      setEditingSubAdminId(user.id);
      setNewSubAdmin({
          username: user.username,
          password: '', // Reset password field
          fullname: user.fullname,
          permissions: user.permissions || []
      });
      setShowSubAdminForm(true);
      setCreateAdminFeedback('');
      // Scroll to form
      const formElement = document.getElementById('sub-admin-form');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveSubAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setCreateAdminFeedback('');
      
      if (!newSubAdmin.username || !newSubAdmin.fullname) {
          setCreateAdminFeedback('Vui lòng điền đầy đủ thông tin.');
          return;
      }
      
      // Password validation: Required for Create, Optional for Update
      if (!editingSubAdminId && !newSubAdmin.password) {
          setCreateAdminFeedback('Vui lòng nhập mật khẩu cho tài khoản mới.');
          return;
      }

      if (newSubAdmin.permissions.length === 0) {
          setCreateAdminFeedback('Vui lòng chọn ít nhất một quyền hạn.');
          return;
      }

      setIsSubmittingAdmin(true);
      try {
          let res;
          if (editingSubAdminId) {
              // Update
              res = await updateAdminUser(editingSubAdminId, {
                  fullname: newSubAdmin.fullname,
                  permissions: newSubAdmin.permissions,
                  ...(newSubAdmin.password ? { password: newSubAdmin.password } : {})
              });
          } else {
              // Create
              res = await createAdminUser(newSubAdmin);
          }

          if (res && res.success) {
              setCreateAdminFeedback(editingSubAdminId ? '✅ Cập nhật thành công!' : '✅ Tạo tài khoản thành công!');
              setTimeout(() => {
                  setNewSubAdmin({ username: '', password: '', fullname: '', permissions: [] });
                  setEditingSubAdminId(null);
                  setShowSubAdminForm(false);
                  setCreateAdminFeedback('');
              }, 1500);
              loadSubAdmins();
          } else {
              setCreateAdminFeedback(`❌ ${res.message || 'Lỗi xử lý.'}`);
          }
      } catch (err) {
          setCreateAdminFeedback('❌ Lỗi kết nối Server.');
      }
      setIsSubmittingAdmin(false);
  };

  const resetSubAdminForm = () => {
      setNewSubAdmin({ username: '', password: '', fullname: '', permissions: [] });
      setEditingSubAdminId(null);
      setShowSubAdminForm(false);
      setCreateAdminFeedback('');
  };

  const handleDeleteSubAdmin = async (id: string, username: string) => {
      if (confirm(`Bạn có chắc muốn xóa tài khoản "${username}"?`)) {
          const res = await deleteAdminUser(id);
          if (res && res.success) {
              loadSubAdmins();
              if (editingSubAdminId === id) resetSubAdminForm();
          } else {
              alert('Lỗi khi xóa tài khoản.');
          }
      }
  };

  const togglePermission = (permId: string) => {
      setNewSubAdmin(prev => {
          const exists = prev.permissions.includes(permId);
          return {
              ...prev,
              permissions: exists 
                  ? prev.permissions.filter(p => p !== permId)
                  : [...prev.permissions, permId]
          };
      });
  };

  const handleStoreSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (storeSettings) {
          updateStoreSettings(storeSettings);
          setSettingsFeedback('Đã lưu thông tin cửa hàng.');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (shippingSettings) {
          updateShippingSettings(shippingSettings);
          setSettingsFeedback('Đã lưu cấu hình vận chuyển.');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
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

  // --- Backup & Restore Handlers ---
  const handleBackup = () => {
      downloadBackup();
      setSettingsFeedback('Đang tải xuống file sao lưu...');
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (confirm("CẢNH BÁO: Việc khôi phục sẽ ghi đè dữ liệu hiện tại. Bạn có chắc chắn không?")) {
          setIsBackupLoading(true);
          const result = await restoreBackup(file);
          setIsBackupLoading(false);
          alert(result.message);
          if (result.success) {
              window.location.reload();
          }
      }
      e.target.value = ''; // Reset input
  };

  const handleFactoryReset = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
      const message = scope === 'FULL' 
          ? "CẢNH BÁO NGUY HIỂM: Bạn đang thực hiện khôi phục cài đặt gốc. TOÀN BỘ SẢN PHẨM, ĐƠN HÀNG, KHÁCH HÀNG sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác."
          : (scope === 'ORDERS' 
              ? "Bạn có chắc chắn muốn xóa TOÀN BỘ ĐƠN HÀNG và lịch sử kho không?" 
              : "Bạn có chắc chắn muốn xóa TOÀN BỘ SẢN PHẨM không?");
      
      if (confirm(message)) {
          // Double confirm for full reset
          if (scope === 'FULL') {
              const confirmText = prompt("Để xác nhận xóa toàn bộ, hãy nhập chữ 'DELETE' vào ô bên dưới:");
              if (confirmText !== 'DELETE') return;
          }

          setIsBackupLoading(true);
          const result = await performFactoryReset(scope);
          setIsBackupLoading(false);
          
          alert(result.message);
          if (result.success) {
              window.location.reload();
          }
      }
  };

  return (
      <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in-up">
          <div className="space-y-8">
              
              {/* 1. STORE INFORMATION - Permission: settings_info */}
              {checkPermission('settings_info') && (
                  <div>
                      <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <PrinterIcon className="w-5 h-5 text-gray-600" />
                          Thông tin Cửa hàng (In hóa đơn)
                      </h4>
                      {storeSettings && (
                          <form onSubmit={handleStoreSubmit} className="space-y-4 max-w-lg">
                              <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">Tên cửa hàng</label>
                                  <input type="text" value={storeSettings.name} onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})} className="w-full border rounded px-3 py-2" required />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-gray-600 mb-1">Hotline</label>
                                      <input type="text" value={storeSettings.phoneNumber} onChange={(e) => setStoreSettings({...storeSettings, phoneNumber: e.target.value})} className="w-full border rounded px-3 py-2" required />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-600 mb-1">Email liên hệ</label>
                                      <input type="text" value={storeSettings.email || ''} onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})} className="w-full border rounded px-3 py-2" />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-600 mb-1">Địa chỉ</label>
                                  <input type="text" value={storeSettings.address} onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})} className="w-full border rounded px-3 py-2" required />
                              </div>
                              <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31]">Lưu thông tin</button>
                          </form>
                      )}
                  </div>
              )}

              {/* 2. SHIPPING SETTINGS - Permission: settings_shipping */}
              {checkPermission('settings_shipping') && (
                  <div className="border-t pt-6">
                      <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <TruckIcon className="w-5 h-5 text-gray-600" />
                          Cấu hình Vận chuyển
                      </h4>
                      {shippingSettings && (
                          <form onSubmit={handleShippingSubmit} className="space-y-4 max-w-lg">
                              <div className="flex items-center gap-2 mb-2">
                                  <input 
                                    type="checkbox" 
                                    id="shippingEnabled" 
                                    checked={shippingSettings.enabled} 
                                    onChange={(e) => setShippingSettings({...shippingSettings, enabled: e.target.checked})} 
                                    className="w-4 h-4 text-[#D4AF37] rounded" 
                                  />
                                  <label htmlFor="shippingEnabled" className="text-sm font-medium text-gray-700">Bật tính phí vận chuyển</label>
                              </div>
                              
                              <div className={`grid grid-cols-2 gap-4 ${!shippingSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-600 mb-1">Phí ship cơ bản</label>
                                      <input type="number" value={shippingSettings.baseFee} onChange={(e) => setShippingSettings({...shippingSettings, baseFee: parseInt(e.target.value) || 0})} className="w-full border rounded px-3 py-2" />
                                  </div>
                                  <div>
                                      <label className="block text-sm font-medium text-gray-600 mb-1">Freeship cho đơn từ</label>
                                      <input type="number" value={shippingSettings.freeShipThreshold} onChange={(e) => setShippingSettings({...shippingSettings, freeShipThreshold: parseInt(e.target.value) || 0})} className="w-full border rounded px-3 py-2" />
                                  </div>
                              </div>
                              <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded font-bold hover:bg-[#004d40]">Lưu cấu hình</button>
                          </form>
                      )}
                  </div>
              )}

              {/* 3. PASSWORD CHANGE - Available to ALL logged in admins */}
              <div className="border-t pt-6">
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

              {/* 4. ACCOUNT MANAGEMENT (SUB-ADMINS) - ONLY FOR MASTER */}
              {checkPermission('MASTER') && (
                  <div className="border-t pt-6">
                      <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-gray-700 flex items-center gap-2">
                              <UsersIcon className="w-5 h-5 text-gray-600" />
                              Quản lý Tài khoản & Phân quyền
                          </h4>
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => loadSubAdmins()}
                                  className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1"
                              >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                                  Làm mới danh sách
                              </button>
                              <button 
                                  onClick={() => {
                                      if(showSubAdminForm) resetSubAdminForm();
                                      else setShowSubAdminForm(true);
                                  }}
                                  className="text-sm bg-[#D4AF37] text-white px-3 py-1 rounded hover:bg-[#b89b31]"
                              >
                                  {showSubAdminForm ? 'Hủy' : '+ Thêm nhân viên'}
                              </button>
                          </div>
                      </div>

                      {showSubAdminForm && (
                          <form id="sub-admin-form" onSubmit={handleSaveSubAdmin} className="bg-gray-50 p-4 rounded border mb-6 animate-fade-in-up">
                              <h5 className="font-bold text-sm mb-3 text-[#00695C] uppercase">
                                  {editingSubAdminId ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <input 
                                    type="text" 
                                    placeholder="Tên đăng nhập" 
                                    value={newSubAdmin.username} 
                                    onChange={e => setNewSubAdmin({...newSubAdmin, username: e.target.value})} 
                                    className="border p-2 rounded disabled:bg-gray-200 disabled:text-gray-500" 
                                    required 
                                    disabled={!!editingSubAdminId} 
                                  />
                                  <input 
                                    type="password" 
                                    placeholder={editingSubAdminId ? "Mật khẩu (để trống nếu không đổi)" : "Mật khẩu"} 
                                    value={newSubAdmin.password} 
                                    onChange={e => setNewSubAdmin({...newSubAdmin, password: e.target.value})} 
                                    className="border p-2 rounded" 
                                    required={!editingSubAdminId}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Họ và tên nhân viên" 
                                    value={newSubAdmin.fullname} 
                                    onChange={e => setNewSubAdmin({...newSubAdmin, fullname: e.target.value})} 
                                    className="border p-2 rounded" 
                                    required 
                                  />
                              </div>
                              <div className="mb-4">
                                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Phân quyền chi tiết:</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {/* Grouping Permissions */}
                                      {['Module Chính', 'Cài đặt'].map(groupName => (
                                          <div key={groupName} className="bg-white p-3 rounded border">
                                              <p className="text-xs font-bold text-[#00695C] mb-2 uppercase border-b pb-1">{groupName}</p>
                                              <div className="space-y-2">
                                                  {PERMISSION_OPTIONS.filter(opt => opt.group === groupName).map(opt => (
                                                      <label key={opt.id} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-gray-50">
                                                          <input 
                                                              type="checkbox" 
                                                              checked={newSubAdmin.permissions.includes(opt.id)}
                                                              onChange={() => togglePermission(opt.id)}
                                                              className="rounded text-[#00695C] focus:ring-[#00695C] mt-0.5"
                                                          />
                                                          <span>{opt.label}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-3 border-t pt-3">
                                  <button 
                                    type="button"
                                    onClick={resetSubAdminForm}
                                    className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
                                  >
                                      Hủy
                                  </button>
                                  <button 
                                    type="submit" 
                                    disabled={isSubmittingAdmin}
                                    className="bg-[#00695C] text-white px-6 py-2 rounded text-sm font-bold disabled:opacity-50 hover:bg-[#004d40]"
                                  >
                                      {isSubmittingAdmin ? 'Đang xử lý...' : (editingSubAdminId ? 'Lưu thay đổi' : 'Tạo tài khoản')}
                                  </button>
                                  
                                  {createAdminFeedback && (
                                      <span className={`text-sm font-medium animate-pulse ${createAdminFeedback.includes('Lỗi') ? 'text-red-600' : 'text-green-600'}`}>
                                          {createAdminFeedback}
                                      </span>
                                  )}
                              </div>
                          </form>
                      )}

                      <div className="bg-white border rounded-lg overflow-hidden">
                          <table className="min-w-full text-sm text-left">
                              <thead className="bg-gray-100">
                                  <tr>
                                      <th className="px-4 py-2">Tên đăng nhập</th>
                                      <th className="px-4 py-2">Họ tên</th>
                                      <th className="px-4 py-2">Vai trò</th>
                                      <th className="px-4 py-2">Quyền hạn</th>
                                      <th className="px-4 py-2 text-right">Thao tác</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {subAdmins.map(user => (
                                      <tr key={user.id}>
                                          <td className="px-4 py-2 font-medium">{user.username}</td>
                                          <td className="px-4 py-2">{user.fullname}</td>
                                          <td className="px-4 py-2">
                                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${user.role === 'MASTER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                  {user.role}
                                              </span>
                                          </td>
                                          <td className="px-4 py-2 text-gray-500 text-xs">
                                              {user.role === 'MASTER' || (Array.isArray(user.permissions) && user.permissions.includes('ALL'))
                                                  ? 'Toàn quyền' 
                                                  : <div className="flex flex-wrap gap-1">
                                                      {Array.isArray(user.permissions) ? user.permissions.map(p => (
                                                          <span key={p} className="bg-gray-100 px-1 rounded border border-gray-200">
                                                              {PERMISSION_OPTIONS.find(opt => opt.id === p)?.label || p}
                                                          </span>
                                                      )) : <span>Lỗi định dạng quyền</span>}
                                                    </div>
                                              }
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                              {user.role !== 'MASTER' && (
                                                  <div className="flex justify-end gap-1">
                                                      <button onClick={() => handleEditSubAdmin(user)} className="text-blue-500 hover:bg-blue-50 p-1 rounded" title="Sửa quyền">
                                                          <EditIcon className="w-4 h-4" />
                                                      </button>
                                                      <button onClick={() => handleDeleteSubAdmin(user.id, user.username)} className="text-red-500 hover:bg-red-50 p-1 rounded" title="Xóa">
                                                          <Trash2Icon className="w-4 h-4" />
                                                      </button>
                                                  </div>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                                  {subAdmins.length === 0 && (
                                      <tr>
                                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Chưa có nhân viên nào.</td>
                                      </tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {/* 5. 2FA (GOOGLE AUTHENTICATOR) */}
              <div className="border-t pt-6">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <ShieldCheckIcon className="w-5 h-5 text-gray-600" />
                      Bảo mật 2 lớp (Google Authenticator)
                  </h4>
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

              {/* 6. BANK SETTINGS - Permission: settings_info (Treat as info) or MASTER */}
              {checkPermission('MASTER') && (
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
              )}
              
              {/* 7. ADMIN EMAILS - Permission: MASTER */}
              {checkPermission('MASTER') && (
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
              )}

              {/* 8. SOCIAL MEDIA - Permission: settings_info */}
              {checkPermission('settings_info') && (
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
              )}

              {/* 9. DATA MANAGEMENT (BACKUP / RESET) - Permission: settings_data */}
              {checkPermission('settings_data') && (
                  <div className="border-t pt-6">
                      <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                          <ActivityIcon className="w-5 h-5 text-gray-600" />
                          Quản lý Dữ liệu
                      </h4>
                      {isBackupLoading ? (
                          <p className="text-sm text-gray-500 animate-pulse">Đang xử lý dữ liệu...</p>
                      ) : (
                          <div className="space-y-4 max-w-2xl">
                              <div className="flex flex-col md:flex-row gap-4">
                                  <div className="flex-1 bg-gray-50 p-4 rounded border">
                                      <h5 className="font-bold text-sm text-gray-700 mb-2">Sao lưu & Khôi phục</h5>
                                      <button onClick={handleBackup} className="w-full mb-3 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                                          Tải xuống file Backup (.json)
                                      </button>
                                      <label className="block w-full text-center bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm cursor-pointer hover:bg-gray-100">
                                          Khôi phục từ file...
                                          <input type="file" accept=".json" className="hidden" onChange={handleRestore} />
                                      </label>
                                  </div>
                                  <div className="flex-1 bg-red-50 p-4 rounded border border-red-200">
                                      <h5 className="font-bold text-sm text-red-800 mb-2">Vùng Nguy hiểm (Reset)</h5>
                                      <div className="space-y-2">
                                          <button onClick={() => handleFactoryReset('ORDERS')} className="w-full bg-white border border-red-300 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-50 font-medium">
                                              Xóa tất cả Đơn hàng
                                          </button>
                                          <button onClick={() => handleFactoryReset('PRODUCTS')} className="w-full bg-white border border-red-300 text-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-50 font-medium">
                                              Xóa tất cả Sản phẩm
                                          </button>
                                          {/* Only Master can do Full Factory Reset */}
                                          {checkPermission('MASTER') && (
                                              <button onClick={() => handleFactoryReset('FULL')} className="w-full bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 font-bold">
                                                  Factory Reset (Xóa trắng)
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {/* 10. LOGS (MOVED TO BOTTOM) - Permission: settings_logs */}
              {checkPermission('settings_logs') && (
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
              )}
          </div>

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
