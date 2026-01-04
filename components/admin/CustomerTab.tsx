
import React, { useState, useEffect } from 'react';
import type { Customer } from '../../types';
import { getCustomers, updateCustomer, deleteCustomer, forceReloadCustomers } from '../../utils/customerStorage';
import { SearchIcon, EditIcon, Trash2Icon, UserIcon, RefreshIcon, XIcon } from '../Icons';

const CustomerTab: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  
  // Edit Form Fields
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [editCustCCCD, setEditCustCCCD] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    handleRefresh();
    const handleUpdate = () => setCustomers(getCustomers());
    window.addEventListener('sigma_vie_customers_update', handleUpdate);
    return () => window.removeEventListener('sigma_vie_customers_update', handleUpdate);
  }, []);

  const handleRefresh = async () => {
      setIsLoading(true);
      try {
          const dbCustomers = await forceReloadCustomers();
          setCustomers(dbCustomers.sort((a, b) => b.createdAt - a.createdAt));
      } catch (e) {
          console.error("Refresh failed:", e);
      } finally {
          setIsLoading(false);
      }
  };

  const handleEditCustomer = (customer: Customer) => {
      setEditingCustomer(customer);
      setEditCustName(customer.fullName);
      setEditCustEmail(customer.email || '');
      setEditCustPhone(customer.phoneNumber || '');
      setEditCustAddress(customer.address || '');
      setEditCustCCCD(customer.cccdNumber || '');
      setIsEditingCustomer(true);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
      if(window.confirm(`Bạn có chắc muốn xóa vĩnh viễn khách hàng "${name}"?`)) {
          setIsProcessingAction(true);
          const success = await deleteCustomer(id);
          if (success) {
              setCustomerFeedback({ msg: `Đã xóa khách hàng ${name}.`, type: 'success' });
              await handleRefresh(); 
          } else {
              setCustomerFeedback({ msg: `Lỗi: Không thể xóa trên Server.`, type: 'error' });
          }
          setIsProcessingAction(false);
          setTimeout(() => setCustomerFeedback(null), 3000);
      }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
      e.preventDefault();
      if(editingCustomer) {
          setIsProcessingAction(true);
          const updated: Customer = {
              ...editingCustomer,
              fullName: editCustName,
              email: editCustEmail || undefined,
              phoneNumber: editCustPhone || undefined,
              address: editCustAddress,
              cccdNumber: editCustCCCD
          };
          
          const success = await updateCustomer(updated);
          
          if (success) {
              setCustomerFeedback({ msg: '✅ Cập nhật thông tin thành công.', type: 'success' });
              await handleRefresh(); 
              setIsEditingCustomer(false);
              setEditingCustomer(null);
          } else {
              setCustomerFeedback({ msg: '❌ Lỗi đồng bộ Server. Vui lòng thử lại.', type: 'error' });
          }
          
          setIsProcessingAction(false);
          setTimeout(() => setCustomerFeedback(null), 4000);
      }
  }

  const filteredCustomers = customers.filter(c => 
      c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
      (c.phoneNumber && c.phoneNumber.includes(customerSearch)) ||
      (c.cccdNumber && c.cccdNumber.includes(customerSearch))
  );

  return (
      <div className="space-y-6 animate-fade-in-up">
          <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-100">
              <div className="relative w-full md:w-auto">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm tên, email, sđt, CCCD..." 
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-lg focus:ring-[#D4AF37] focus:border-[#D4AF37] w-full md:w-80 outline-none"
                  />
              </div>
              
              <button 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-slate-50 text-slate-700 px-5 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors disabled:opacity-50 font-bold text-xs uppercase tracking-widest"
              >
                  <RefreshIcon className={isLoading ? 'animate-spin' : ''} />
                  {isLoading ? 'Đang tải...' : 'Làm mới'}
              </button>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden relative border border-slate-100">
               {isProcessingAction && (
                   <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[1px]">
                       <div className="bg-slate-900 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl animate-pulse">
                           <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           <span className="font-bold text-xs uppercase tracking-widest">Hệ thống đang xử lý...</span>
                       </div>
                   </div>
               )}
               <div className="overflow-x-auto">
                   <table className="min-w-full text-sm text-left text-gray-500">
                      <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-widest">
                          <tr>
                              <th className="px-6 py-4">Khách hàng / CCCD</th>
                              <th className="px-6 py-4">Thông tin liên hệ</th>
                              <th className="px-6 py-4">Địa chỉ thường trú</th>
                              <th className="px-6 py-4">Ngày tham gia</th>
                              <th className="px-6 py-4 text-right">Hành động</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredCustomers.map((c) => (
                              <tr key={c.id} className="hover:bg-teal-50/30 transition-colors group">
                                  <td className="px-6 py-4">
                                      <div className="flex items-center gap-3">
                                          <div className="bg-[#00695C]/10 p-2 rounded-full text-[#00695C] group-hover:scale-110 transition-transform">
                                              <UserIcon className="w-5 h-5"/>
                                          </div>
                                          <div>
                                              <span className="font-black text-gray-900 block leading-tight">{c.fullName}</span>
                                              <span className="text-[10px] text-gray-400 font-mono tracking-tighter">CCCD: {c.cccdNumber || 'N/A'}</span>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="text-gray-900 font-bold">{c.phoneNumber || '-'}</div>
                                      <div className="text-[11px] text-gray-500 lowercase">{c.email || ''}</div>
                                  </td>
                                  <td className="px-6 py-4 max-w-[250px] truncate italic text-xs">
                                      {c.address || 'Chưa cập nhật'}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-medium text-gray-400">
                                      {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1">
                                          <button onClick={() => handleEditCustomer(c)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa thông tin"><EditIcon className="w-4 h-4"/></button>
                                          <button onClick={() => handleDeleteCustomer(c.id, c.fullName)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition-colors" title="Xóa khách hàng"><Trash2Icon className="w-4 h-4"/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                   </table>
               </div>
               
               {filteredCustomers.length === 0 && !isLoading && (
                  <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-sm">
                      Không tìm thấy khách hàng nào.
                  </div>
               )}
          </div>

          {isEditingCustomer && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4 backdrop-blur-sm">
                  <div className="bg-white p-8 rounded-3xl w-full max-w-lg shadow-2xl animate-fade-in-up border border-slate-100">
                      <div className="flex justify-between items-center mb-6 border-b pb-4">
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Sửa thông tin khách hàng</h3>
                          <button onClick={() => setIsEditingCustomer(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6"/></button>
                      </div>
                      <form onSubmit={handleSaveCustomer} className="space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Họ tên *</label>
                                  <input type="text" value={editCustName} onChange={(e) => setEditCustName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#D4AF37]" required />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số CCCD</label>
                                  <input type="text" value={editCustCCCD} onChange={(e) => setEditCustCCCD(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 outline-none focus:border-[#D4AF37]" />
                              </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</label>
                                  <input type="email" value={editCustEmail} onChange={(e) => setEditCustEmail(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 outline-none focus:border-[#D4AF37]" />
                              </div>
                               <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số điện thoại</label>
                                  <input type="tel" value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 font-bold outline-none focus:border-[#D4AF37]" />
                              </div>
                          </div>
                           <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Địa chỉ thường trú</label>
                              <textarea value={editCustAddress} onChange={(e) => setEditCustAddress(e.target.value)} rows={2} className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-2 outline-none focus:border-[#D4AF37] resize-none" />
                          </div>
                          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                              <button type="button" onClick={() => { setIsEditingCustomer(false); setEditingCustomer(null); }} className="px-6 py-2 text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-800 transition-colors">Bỏ qua</button>
                              <button type="submit" className="bg-[#00695C] text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:bg-[#004d40] hover:-translate-y-0.5 transition-all">Lưu thay đổi</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

           {customerFeedback && (
             <div className={`fixed bottom-10 right-10 z-[200] px-6 py-4 rounded-2xl shadow-2xl border-l-8 animate-slide-in-right flex items-center gap-3
                ${customerFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-rose-50 border-rose-500 text-rose-800'}`}>
                 <span className="font-bold text-sm tracking-tight">{customerFeedback.msg}</span>
                 <button onClick={() => setCustomerFeedback(null)} className="p-1 hover:bg-black/5 rounded-full"><XIcon className="w-3 h-3 opacity-50"/></button>
             </div>
           )}

           <style>{`
                @keyframes slide-in-right {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
           `}</style>
      </div>
  );
};

export default CustomerTab;
