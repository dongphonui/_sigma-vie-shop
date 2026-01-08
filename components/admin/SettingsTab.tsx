
import React, { useState, useEffect, useRef } from 'react';
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
  const [socialSettings, setSocialSettings] = useState<SocialSettings | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings | null>(null);
  const [bankSettings, setBankSettings] = useState<BankSettings | null>(null);
  
  const [storeMsg, setStoreMsg] = useState('');
  const [shippingMsg, setShippingMsg] = useState('');
  const [bankMsg, setBankMsg] = useState('');
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
  const [newSubAdmin, setNewSubAdmin] = useState({ username: '', password: '', fullname: '', permissions: [] as string[] });
  const [editingSubAdminId, setEditingSubAdminId] = useState<string | null>(null);
  const [showSubAdminForm, setShowSubAdminForm] = useState(false);
  const [isSubmittingAdmin, setIsSubmittingAdmin] = useState(false);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  
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
      setSocialSettings(getSocialSettings());
      setTotpEnabled(isTotpEnabled());
      setBankSettings(getBankSettings());
      setStoreSettings(getStoreSettings());
      setShippingSettings(getShippingSettings());
      
      if (checkPermission('settings_logs')) refreshLogs();
      if (checkPermission('MASTER')) loadSubAdmins();
  }, [currentUser]);

  const checkPermission = (perm: string) => {
      if (!currentUser) return false;
      if (currentUser.role === 'MASTER' || currentUser.username === 'admin') return true;
      return currentUser.permissions?.includes(perm) || currentUser.permissions?.includes('ALL');
  }

  const refreshLogs = () => {
      fetchAdminLoginLogs().then(logs => { if (logs) setAdminLogs(logs); });
  };

  const loadSubAdmins = () => {
      fetchAdminUsers().then(users => { if (users) setSubAdmins(users); });
  };

  const handleBackup = () => {
      downloadBackup();
      setSettingsFeedback('📦 Đang đóng gói dữ liệu và tải về máy...');
      setTimeout(() => setSettingsFeedback(''), 4000);
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (confirm("⚠️ CẢNH BÁO: Phục hồi sẽ ghi đè toàn bộ dữ liệu hiện tại. Tiếp tục?")) {
          setIsBackupLoading(true);
          const result = await restoreBackup(file);
          setIsBackupLoading(false);
          alert(result.message);
          if (result.success) window.location.reload();
      }
      e.target.value = ''; 
  };

  const handleFactoryReset = async (scope: 'FULL' | 'ORDERS' | 'PRODUCTS') => {
      const message = scope === 'FULL' 
          ? "🧨 NGUY HIỂM: Bạn đang thực hiện XÓA TRẮNG HỆ THỐNG. Hành động này không thể hoàn tác. Bạn chắc chắn?"
          : (scope === 'ORDERS' ? "Xóa toàn bộ lịch sử đơn hàng và kho?" : "Xóa toàn bộ danh mục và sản phẩm?");
      
      if (confirm(message)) {
          if (scope === 'FULL') {
              const confirmText = prompt("Vui lòng nhập chữ 'SIGMA-DELETE' để xác nhận xóa vĩnh viễn:");
              if (confirmText !== 'SIGMA-DELETE') return;
          }
          setIsBackupLoading(true);
          const result = await performFactoryReset(scope);
          setIsBackupLoading(false);
          alert(result.message);
          if (result.success) window.location.reload();
      }
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (storeSettings) {
          const res = await updateStoreSettings(storeSettings);
          if (res.success) {
              setStoreMsg('Đã cập nhật thông tin cửa hàng.');
              setTimeout(() => setStoreMsg(''), 3000);
          } else {
              setStoreMsg(`Lỗi: ${res.message}`);
          }
      }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (shippingSettings) {
          const res = await updateShippingSettings(shippingSettings);
          if (res.success) {
              setShippingMsg('Đã cập nhật cấu hình vận chuyển.');
              setTimeout(() => setShippingMsg(''), 3000);
          } else {
              setShippingMsg(`Lỗi: ${res.message}`);
          }
      }
  };

  const executeBankUpdate = () => {
      if (bankSettings) {
          updateBankSettings(bankSettings);
          setBankMsg('Đã cập nhật thông tin Ngân hàng.');
          setTimeout(() => setBankMsg(''), 3000);
      }
  };

  const handleBankSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (isTotpEnabled()) {
          setShowBankSecurityModal(true);
          setSecurityCode('');
      } else {
          if(confirm('Cảnh báo: Bạn chưa bật bảo mật 2 lớp. Hành động này kém an toàn. Bạn có muốn tiếp tục lưu không?')) {
              executeBankUpdate();
          }
      }
  };

  const handleVerifyBankUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      if (verifyTotpToken(securityCode)) {
          executeBankUpdate();
          setShowBankSecurityModal(false);
          setSecurityCode('');
      } else {
          alert('Mã xác thực không đúng! Vui lòng thử lại.');
      }
  };

  const handleSocialSettingsSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (socialSettings) {
          updateSocialSettings(socialSettings);
          setSettingsFeedback('Đã cập nhật liên kết mạng xã hội!');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

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

  const handleRemoveEmail = (email: string) => {
      removeAdminEmail(email);
      setAdminEmails(getAdminEmails());
      setSettingsFeedback(`Đã xóa email ${email}.`);
      setTimeout(() => setSettingsFeedback(''), 3000);
  }

  const handleStartTotpSetup = () => {
      const secret = generateTotpSecret();
      setTempTotpSecret(secret);
      setTempTotpUri(getTotpUri(secret));
      setShowTotpSetup(true);
      setVerificationCode('');
  };

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

  const handleDisableTotp = () => {
      if (confirm('Tắt bảo mật 2 lớp?')) {
          disableTotp();
          setTotpEnabled(false);
          setSettingsFeedback('Đã tắt bảo mật 2 lớp.');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  const handleTestEmail = async () => {
      if (isTestingEmail) return;
      setIsTestingEmail(true);
      setSettingsFeedback('⏳ Đang gửi email kiểm tra...');
      
      const email = getPrimaryAdminEmail();
      try {
          const result = await sendEmail(
              email, 
              'Kiểm tra cấu hình Email Sigma Vie', 
              `
              <div style="font-family: sans-serif; border: 1px solid #e5e7eb; padding: 30px; border-radius: 20px; max-width: 500px;">
                <h1 style="color: #00695C; font-size: 24px;">Xin chào Quản trị viên!</h1>
                <p style="color: #374151; line-height: 1.6;">Đây là email tự động nhằm kiểm tra hệ thống thông báo của <strong>Sigma Vie Boutique</strong>.</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 12px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">Trạng thái: <strong>Hoạt động tốt</strong></p>
                    <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Thời gian: <strong>${new Date().toLocaleString('vi-VN')}</strong></p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #f3f4f6; padding-top: 20px;">Bạn nhận được email này vì địa chỉ này đã được đăng ký làm quản trị viên chính.</p>
              </div>
              `
          );
          
          if(result && result.success) {
              setSettingsFeedback('✅ Thành công: Email kiểm tra đã được gửi. Hãy check mục Hộp thư đến hoặc Thư rác.');
          } else {
              // Phản hồi chi tiết nếu server trả về lỗi cấu hình
              const errorMsg = result?.message || 'Không thể kết nối API.';
              setSettingsFeedback(`❌ Lỗi: ${errorMsg}`);
              if (errorMsg.includes('SMTP') || errorMsg.includes('EMAIL_USER')) {
                  alert("⚠️ CẤU HÌNH THIẾU:\nBạn chưa thiết lập EMAIL_USER và EMAIL_PASS (Mật khẩu ứng dụng) trên máy chủ (Render/Vercel). Hãy tạo 'App Password' trong tài khoản Google để hệ thống có thể gửi mail.");
              }
          }
      } catch (e) {
          setSettingsFeedback('❌ Lỗi: Hệ thống backend không phản hồi.');
      } finally {
          setIsTestingEmail(false);
          setTimeout(() => setSettingsFeedback(''), 10000);
      }
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
          setNewSubAdmin({ username: '', password: '', fullname: '', permissions: [] });
          setEditingSubAdminId(null);
          loadSubAdmins();
      } catch (e) {
          setSettingsFeedback('Lỗi lưu tài khoản.');
      }
      setIsSubmittingAdmin(false);
      setTimeout(() => setSettingsFeedback(''), 3000);
  };

  const handleEditAdmin = (admin: AdminUser) => {
      setEditingSubAdminId(admin.id);
      setNewSubAdmin({ 
          username: admin.username, 
          password: '', 
          fullname: admin.fullname, 
          permissions: admin.permissions || [] 
      });
      setShowSubAdminForm(true);
  };

  const handleDeleteAdmin = async (id: string) => {
      if(confirm('Xóa nhân viên này?')) {
          await deleteAdminUser(id);
          loadSubAdmins();
          setSettingsFeedback('Đã xóa tài khoản.');
          setTimeout(() => setSettingsFeedback(''), 3000);
      }
  };

  const togglePermission = (permId: string) => {
      setNewSubAdmin(prev => {
          const current = [...prev.permissions];
          if (current.includes(permId)) return { ...prev, permissions: current.filter(p => p !== permId) };
          return { ...prev, permissions: [...current, permId] };
      });
  };

  return (
      <div className="space-y-10 animate-fade-in-up pb-20">
          
          {/* A. DANGER ZONE - DATA MANAGEMENT */}
          {checkPermission('settings_data') && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-rose-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                      <AlertCircleIcon className="w-40 h-40 text-rose-500" />
                  </div>
                  <h4 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-6 flex items-center gap-3">
                      <ShieldCheckIcon className="w-6 h-6" />
                      Quản trị Dữ liệu cấp cao
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Lưu trữ an toàn</p>
                          <p className="text-xs text-slate-500 leading-relaxed">Tạo bản sao lưu toàn bộ cấu hình, sản phẩm và đơn hàng về máy tính cá nhân.</p>
                          <button onClick={handleBackup} className="mt-auto w-full bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                              <DownloadIcon className="w-4 h-4" /> Sao lưu JSON
                          </button>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Khôi phục dữ liệu</p>
                          <p className="text-xs text-slate-500 leading-relaxed">Sử dụng tệp tin sao lưu (.json) đã tải về trước đó để phục hồi trạng thái hệ thống.</p>
                          <button onClick={() => fileInputRef.current?.click()} className="mt-auto w-full border-2 border-slate-900 text-slate-900 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">
                              Tải lên bản sao
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                      </div>
                      <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex flex-col gap-4">
                          <p className="text-[11px] font-black text-rose-400 uppercase tracking-widest">Khôi phục cài đặt gốc</p>
                          <div className="flex flex-col gap-2">
                              <button onClick={() => handleFactoryReset('ORDERS')} className="w-full text-left p-3 bg-white rounded-xl text-[10px] font-black text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all uppercase tracking-tighter">1. Xóa toàn bộ đơn hàng</button>
                              <button onClick={() => handleFactoryReset('PRODUCTS')} className="w-full text-left p-3 bg-white rounded-xl text-[10px] font-black text-rose-600 border border-rose-100 hover:bg-rose-600 hover:text-white transition-all uppercase tracking-tighter">2. Xóa toàn bộ sản phẩm</button>
                              <button onClick={() => handleFactoryReset('FULL')} className="w-full text-left p-3 bg-rose-600 text-white rounded-xl text-[10px] font-black border border-rose-600 hover:bg-rose-700 transition-all uppercase tracking-tighter">3. Xóa trắng hệ thống (Wipe All)</button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* B. ACCOUNT & PERMISSIONS (MASTER ONLY) */}
          {currentUser?.role === 'MASTER' && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tài khoản & Phân quyền</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Quản lý nhân sự vận hành Sigma Vie</p>
                      </div>
                      <button onClick={() => { setShowSubAdminForm(true); setEditingSubAdminId(null); }} className="px-6 py-2.5 bg-[#B4975A] text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-black transition-all">+ Nhân viên mới</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {subAdmins.map(admin => (
                          <div key={admin.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group">
                               <div className="flex items-center gap-4 mb-4">
                                   <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[#B4975A] font-black">{admin.fullname.charAt(0)}</div>
                                   <div>
                                       <p className="font-black text-slate-800 text-sm uppercase">{admin.fullname}</p>
                                       <p className="text-[10px] text-slate-400 font-bold">@{admin.username}</p>
                                   </div>
                               </div>
                               <div className="flex flex-wrap gap-1 mb-4">
                                   {admin.permissions.includes('ALL') ? (
                                       <span className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black rounded-lg uppercase border border-rose-100">Toàn quyền (Master)</span>
                                   ) : (
                                       admin.permissions.map(p => (
                                           <span key={p} className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[8px] font-black rounded-lg uppercase border border-blue-100">{p}</span>
                                       ))
                                   )}
                               </div>
                               <div className="flex gap-2">
                                   <button onClick={() => handleEditAdmin(admin)} className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-[#B4975A] hover:border-[#B4975A] transition-all">Sửa</button>
                                   <button onClick={() => handleDeleteAdmin(admin.id)} className="px-4 py-2 bg-rose-50 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all"><Trash2Icon className="w-4 h-4"/></button>
                               </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* C. SYSTEM LOGS */}
          {checkPermission('settings_logs') && (
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Nhật ký truy cập hệ thống</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Lịch sử đăng nhập trang quản trị</p>
                      </div>
                      <button onClick={refreshLogs} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all">
                          <RefreshIcon className="w-5 h-5" />
                      </button>
                  </div>
                  <div className="overflow-x-auto rounded-[1.5rem] border border-slate-50 shadow-inner">
                      <table className="min-w-full text-xs text-left text-slate-500">
                          <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-[0.2em]">
                              <tr>
                                  <th className="px-6 py-4">Thời gian</th>
                                  <th className="px-6 py-4">Tài khoản</th>
                                  <th className="px-6 py-4">Phương thức</th>
                                  <th className="px-6 py-4">Địa chỉ IP</th>
                                  <th className="px-6 py-4">Trạng thái</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-bold">
                              {adminLogs.map((log) => (
                                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="px-6 py-4 text-slate-400">{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                                      <td className="px-6 py-4 text-slate-800">{log.username}</td>
                                      <td className="px-6 py-4">
                                          {log.method === 'GOOGLE_AUTH' ? 
                                            <span className="flex items-center gap-1.5 text-purple-600"><ShieldCheckIcon className="w-3.5 h-3.5" /> 2FA APP</span> : 
                                            <span className="flex items-center gap-1.5 text-blue-500">📧 EMAIL OTP</span>}
                                      </td>
                                      <td className="px-6 py-4 font-mono text-[10px]">{log.ip_address || '---'}</td>
                                      <td className="px-6 py-4">
                                          {log.status === 'SUCCESS' ? 
                                            <span className="text-emerald-500">THÀNH CÔNG</span> : 
                                            <span className="text-rose-500">BỊ TỪ CHỐI</span>}
                                      </td>
                                  </tr>
                              ))}
                              {adminLogs.length === 0 && <tr><td colSpan={5} className="py-20 text-center italic text-slate-300">Chưa có dữ liệu nhật ký.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* D. STORE CONFIGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {checkPermission('settings_info') && (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <PrinterIcon className="w-5 h-5 text-[#B4975A]" /> Thông tin liên hệ Shop
                      </h4>
                      {storeSettings && (
                          <form onSubmit={handleStoreSubmit} className="space-y-5 flex-1">
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Boutique</label>
                                  <input type="text" value={storeSettings.name} onChange={(e) => setStoreSettings({...storeSettings, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2.5 font-bold outline-none transition-all" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                                      <input type="text" value={storeSettings.phoneNumber} onChange={(e) => setStoreSettings({...storeSettings, phoneNumber: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2.5 font-bold outline-none transition-all" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                                      <input type="text" value={storeSettings.email || ''} onChange={(e) => setStoreSettings({...storeSettings, email: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2.5 font-bold outline-none transition-all" />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Địa chỉ (Hiện trên hóa đơn)</label>
                                  <input type="text" value={storeSettings.address} onChange={(e) => setStoreSettings({...storeSettings, address: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2.5 font-bold outline-none transition-all" />
                              </div>
                              <div className="pt-4 mt-auto">
                                  <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all">Cập nhật thông tin</button>
                                  {storeMsg && <p className="text-center text-[10px] font-black text-emerald-600 mt-2 animate-bounce">{storeMsg}</p>}
                              </div>
                          </form>
                      )}
                  </div>
              )}

              {checkPermission('settings_shipping') && (
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <TruckIcon className="w-5 h-5 text-[#B4975A]" /> Chính sách Vận chuyển
                      </h4>
                      {shippingSettings && (
                          <form onSubmit={handleShippingSubmit} className="space-y-6 flex-1">
                              <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái tính phí</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={shippingSettings.enabled} onChange={(e) => setShippingSettings({...shippingSettings, enabled: e.target.checked})} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B4975A]"></div>
                                  </label>
                              </div>
                              <div className={`space-y-5 transition-opacity duration-500 ${!shippingSettings.enabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phí vận chuyển mặc định (VNĐ)</label>
                                      <input type="number" value={shippingSettings.baseFee} onChange={(e) => setShippingSettings({...shippingSettings, baseFee: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-black text-teal-700 outline-none" />
                                  </div>
                                  <div>
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngưỡng MIỄN PHÍ SHIP (VNĐ)</label>
                                      <input type="number" value={shippingSettings.freeShipThreshold} onChange={(e) => setShippingSettings({...shippingSettings, freeShipThreshold: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-black text-teal-700 outline-none" />
                                  </div>
                              </div>
                              <div className="pt-4 mt-auto">
                                  <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all">Lưu chính sách ship</button>
                                  {shippingMsg && <p className="text-center text-[10px] font-black text-emerald-600 mt-2 animate-bounce">{shippingMsg}</p>}
                              </div>
                          </form>
                      )}
                  </div>
              )}
          </div>

          {/* E. BANK SETTINGS WITH QR PREVIEW */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2">
                   <CreditCardIcon className="w-5 h-5 text-[#B4975A]" /> Cấu hình Thanh toán Chuyển khoản (VietQR)
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {bankSettings && (
                       <form onSubmit={handleBankSettingsSubmit} className="space-y-5">
                           <div className="grid grid-cols-1 gap-5">
                               <div>
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chọn Ngân hàng</label>
                                   <select value={bankSettings.bankId} onChange={(e) => setBankSettings({...bankSettings, bankId: e.target.value})} className="mt-1 w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-bold outline-none focus:border-[#D4AF37]">
                                       <option value="">-- Chọn ngân hàng --</option>
                                       {VIET_QR_BANKS.map(bank => (<option key={bank.id} value={bank.id}>{bank.name} ({bank.id})</option>))}
                                   </select>
                               </div>
                               <div>
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tài khoản thụ hưởng</label>
                                   <input type="text" value={bankSettings.accountNumber} onChange={(e) => setBankSettings({...bankSettings, accountNumber: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-black text-teal-700 outline-none focus:border-[#D4AF37]" />
                               </div>
                               <div>
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chủ tài khoản (Không dấu)</label>
                                   <input type="text" value={bankSettings.accountName} onChange={(e) => setBankSettings({...bankSettings, accountName: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-black uppercase outline-none focus:border-[#D4AF37]" />
                               </div>
                           </div>
                           <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all">Lưu thông tin VietQR</button>
                           {bankMsg && <p className="text-center text-[10px] font-black text-emerald-600 mt-2">{bankMsg}</p>}
                       </form>
                   )}
                   <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] p-8 border-4 border-dashed border-white shadow-inner">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Mã QR Demo của Shop</p>
                        {bankSettings?.bankId && bankSettings?.accountNumber ? (
                            <div className="bg-white p-4 rounded-3xl shadow-2xl border-4 border-white transform hover:scale-105 transition-transform">
                                <img src={`https://img.vietqr.io/image/${bankSettings.bankId}-${bankSettings.accountNumber}-compact.png?amount=100000&addInfo=DemoShop&accountName=${encodeURIComponent(bankSettings.accountName)}`} className="w-48 h-48 object-contain" alt="QR Preview" />
                            </div>
                        ) : (
                            <div className="w-48 h-48 bg-slate-100 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center px-4">Điền thông tin để xem trước mã QR</p>
                            </div>
                        )}
                   </div>
               </div>
          </div>

          {/* F. SOCIAL LINKS */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
               <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Liên kết Mạng xã hội (Footer)</h4>
               {socialSettings && (
                   <form onSubmit={handleSocialSettingsSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-4">
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facebook</label>
                               <input type="text" value={socialSettings.facebook} onChange={(e) => setSocialSettings({...socialSettings, facebook: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-[#D4AF37]" />
                           </div>
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instagram</label>
                               <input type="text" value={socialSettings.instagram} onChange={(e) => setSocialSettings({...socialSettings, instagram: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-[#D4AF37]" />
                           </div>
                       </div>
                       <div className="space-y-4">
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">TikTok</label>
                               <input type="text" value={socialSettings.tiktok} onChange={(e) => setSocialSettings({...socialSettings, tiktok: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-[#D4AF37]" />
                           </div>
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Twitter / X</label>
                               <input type="text" value={socialSettings.twitter} onChange={(e) => setSocialSettings({...socialSettings, twitter: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2.5 font-medium outline-none focus:border-[#D4AF37]" />
                           </div>
                       </div>
                       <div className="md:col-span-2 pt-4">
                           <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all">Cập nhật liên kết</button>
                       </div>
                   </form>
               )}
          </div>

          {/* G. SECURITY & EMAILS */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-8">Bảo mật & Email hệ thống</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                      <div>
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Emails nhận thông báo</p>
                          <div className="space-y-3 mb-4">
                              {adminEmails.map(email => (
                                  <div key={email} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group">
                                      <span className="text-xs font-bold text-slate-700">{email}</span>
                                      <button onClick={() => handleRemoveEmail(email)} className="text-rose-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2Icon className="w-4 h-4"/></button>
                                  </div>
                              ))}
                          </div>
                          <form onSubmit={handleAddEmail} className="flex gap-2">
                              <input type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="Email quản trị mới..." className="flex-1 bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#D4AF37]" required />
                              <button type="submit" className="bg-[#00695C] text-white px-6 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest">Thêm</button>
                          </form>
                          <button 
                            type="button"
                            onClick={handleTestEmail} 
                            disabled={isTestingEmail}
                            className={`mt-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isTestingEmail ? 'text-slate-400 cursor-not-allowed' : 'text-[#D4AF37] hover:underline'}`}
                          >
                              {isTestingEmail ? <RefreshIcon className="w-3 h-3 animate-spin" /> : '📧'} Gửi email kiểm tra hệ thống
                          </button>
                      </div>
                  </div>

                  <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheckIcon className="w-20 h-20" /></div>
                      <h5 className="text-xs font-black uppercase tracking-[0.2em] mb-4">Bảo mật 2 lớp (2FA)</h5>
                      {totpEnabled ? (
                          <div className="space-y-4">
                              <div className="flex items-center gap-3 text-emerald-400">
                                  <CheckIcon className="w-5 h-5" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Đang kích hoạt</span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-relaxed">Tài khoản được bảo vệ bởi Google Authenticator. Bạn cần nhập mã 6 số khi đăng nhập.</p>
                              <button onClick={handleDisableTotp} className="text-rose-400 text-[10px] font-black uppercase tracking-widest hover:underline">Hủy kích hoạt 2FA</button>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              {!showTotpSetup ? (
                                  <>
                                      <p className="text-[11px] text-slate-400 leading-relaxed">Tăng cường bảo mật bằng ứng dụng Authenticator để bảo vệ tài khoản khỏi các truy cập trái phép.</p>
                                      <button onClick={handleStartTotpSetup} className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#b89b31] transition-all">Thiết lập 2FA</button>
                                  </>
                              ) : (
                                  <div className="space-y-6 animate-fade-in">
                                      <div className="bg-white p-2 rounded-2xl inline-block shadow-2xl"><QRCodeSVG value={tempTotpUri} size={150} /></div>
                                      <div className="space-y-3">
                                          <p className="text-[10px] text-slate-400 font-bold uppercase">Nhập mã 6 số từ app để xác nhận</p>
                                          <form onSubmit={handleVerifyAndEnableTotp} className="flex gap-2">
                                              <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="bg-white/10 border-2 border-white/10 rounded-xl px-4 py-2 text-center font-mono tracking-[0.5em] text-lg w-full outline-none focus:border-[#D4AF37]" maxLength={6} required />
                                              <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded-xl font-bold">Lưu</button>
                                          </form>
                                          <button onClick={() => setShowTotpSetup(false)} className="text-[9px] text-slate-500 uppercase font-black hover:text-white">Hủy bỏ</button>
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          {/* H. MODALS */}
          {showSubAdminForm && (
              <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4 backdrop-blur-xl">
                  <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 animate-float-up border border-slate-100 overflow-y-auto max-h-[90vh]">
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">{editingSubAdminId ? 'Sửa tài khoản' : 'Thêm nhân viên mới'}</h3>
                      <form onSubmit={handleAdminSubmit} className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Tên đăng nhập</label>
                                  <input type="text" value={newSubAdmin.username} onChange={e => setNewSubAdmin({...newSubAdmin, username: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none" required disabled={!!editingSubAdminId} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">{editingSubAdminId ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
                                  <input type="password" value={newSubAdmin.password} onChange={e => setNewSubAdmin({...newSubAdmin, password: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none" required={!editingSubAdminId} />
                              </div>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Họ và tên</label>
                              <input type="text" value={newSubAdmin.fullname} onChange={e => setNewSubAdmin({...newSubAdmin, fullname: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold focus:border-[#D4AF37] outline-none" required />
                          </div>
                          
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-3">Phân quyền chức năng (Permissions)</label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {PERMISSION_OPTIONS.map(opt => (
                                      <label key={opt.id} className="flex items-center gap-2 p-3 rounded-xl border-2 border-slate-50 hover:border-slate-200 cursor-pointer transition-all">
                                          <input type="checkbox" checked={newSubAdmin.permissions.includes(opt.id) || newSubAdmin.permissions.includes('ALL')} onChange={() => togglePermission(opt.id)} className="w-4 h-4 rounded border-slate-300 text-[#B4975A] focus:ring-[#B4975A]" />
                                          <span className="text-[10px] font-bold text-slate-600 uppercase">{opt.label}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>

                          <div className="flex gap-4 pt-6 border-t border-slate-100">
                              <button type="button" onClick={() => setShowSubAdminForm(false)} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Hủy bỏ</button>
                              <button type="submit" disabled={isSubmittingAdmin} className="flex-1 py-4 bg-[#111827] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all">
                                  {isSubmittingAdmin ? 'Đang lưu...' : (editingSubAdminId ? 'Lưu thay đổi' : 'Tạo tài khoản')}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {showBankSecurityModal && (
                <div className="fixed inset-0 bg-black/80 z-[250] flex items-center justify-center p-4 backdrop-blur-xl">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm p-10 animate-float-up text-center border border-slate-100">
                        <div className="bg-amber-100 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-600 shadow-inner">
                            <ShieldCheckIcon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Xác thực 2 lớp</h3>
                        <p className="text-xs font-medium text-slate-400 mb-8 leading-relaxed">Vui lòng nhập mã từ ứng dụng Google Authenticator để xác nhận thay đổi thông tin ngân hàng quan trọng.</p>
                        
                        <form onSubmit={handleVerifyBankUpdate}>
                            <input type="text" placeholder="000000" value={securityCode} onChange={(e) => setSecurityCode(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl py-4 text-center text-3xl font-mono tracking-[0.4em] mb-8 focus:bg-white focus:border-[#D4AF37] outline-none transition-all" maxLength={6} autoFocus required />
                            <div className="flex gap-4">
                                <button type="button" onClick={() => { setShowBankSecurityModal(false); setSecurityCode(''); }} className="flex-1 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-800 transition-colors">Bỏ qua</button>
                                <button type="submit" className="flex-1 py-4 bg-[#111827] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-black transition-all">Xác nhận</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {settingsFeedback && (
                 <div className="fixed bottom-10 right-10 z-[200] px-8 py-5 rounded-[2rem] bg-slate-900 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-700 animate-slide-in-right flex items-center gap-4">
                     <ActivityIcon className="w-6 h-6 text-[#D4AF37] animate-pulse" />
                     <span className="font-black text-xs uppercase tracking-widest">{settingsFeedback}</span>
                     <button onClick={() => setSettingsFeedback('')} className="p-2 hover:bg-white/10 rounded-full"><XIcon className="w-4 h-4" /></button>
                 </div>
            )}
      </div>
  );
};

export default SettingsTab;
