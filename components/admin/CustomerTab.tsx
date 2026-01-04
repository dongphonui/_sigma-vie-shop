
import React, { useState, useEffect } from 'react';
import type { Customer } from '../../types';
import { getCustomers, updateCustomer, deleteCustomer, forceReloadCustomers } from '../../utils/customerStorage';
import { SearchIcon, EditIcon, Trash2Icon, UserIcon, RefreshIcon } from '../Icons';

const CustomerTab: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');

  useEffect(() => {
    handleRefresh();
    const handleUpdate = () => setCustomers(getCustomers());
    window.addEventListener('sigma_vie_customers_update', handleUpdate);
    return () => window.removeEventListener('sigma_vie_customers_update', handleUpdate);
  }, []);

  const handleRefresh = async () => {
      setIsLoading(true);
      try {
          // Chỉ lấy khách hàng chính thức từ cơ sở dữ liệu
          // Đã loại bỏ logic "khôi phục từ đơn hàng" vì nó gây nhầm lẫn dữ liệu sau khi reset
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
      setIsEditingCustomer(true);
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
      if(window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"?`)) {
          setIsProcessingAction(true);
          const success = await deleteCustomer(id);
          if (success) {
              setCustomerFeedback(`Đã xóa khách hàng ${name}.`);
              await handleRefresh(); 
          } else {
              setCustomerFeedback(`Lỗi: Không thể xóa trên Server.`);
          }
          setIsProcessingAction(false);
          setTimeout(() => setCustomerFeedback(''), 3000);
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
              address: editCustAddress
          };
          
          const success = await updateCustomer(updated);
          
          if (success) {
              setCustomerFeedback('✅ Cập nhật thành công.');
              await handleRefresh(); 
              setIsEditingCustomer(false);
              setEditingCustomer(null);
          } else {
              setCustomerFeedback('❌ Lỗi Server. Vui lòng thử lại.');
          }
          
          setIsProcessingAction(false);
          setTimeout(() => setCustomerFeedback(''), 4000);
      }
  }

  const filteredCustomers = customers.filter(c => 
      c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) || 
      (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
      (c.phoneNumber && c.phoneNumber.includes(customerSearch))
  );

  return (
      <div className="space-y-6 animate-fade-in-up">
          <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-auto">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm tên, email, sđt..." 
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-full md:w-64"
                  />
              </div>
              
              <button 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                  <RefreshIcon className={isLoading ? 'animate-spin' : ''} />
                  {isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}
              </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
               {isProcessingAction && (
                   <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                       <div className="bg-black/80 text-white px-4 py-2 rounded flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Đang xử lý...
                       </div>
                   </div>
               )}
               <div className="overflow-x-auto">
                   <table className="min-w-full text-sm text-left text-gray-500">
                      <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                          <tr>
                              <th className="px-4 py-3">Khách hàng</th>
                              <th className="px-4 py-3">Liên hệ</th>
                              <th className="px-4 py-3">Địa chỉ</th>
                              <th className="px-4 py-3">Ngày tham gia</th>
                              <th className="px-4 py-3 text-right">Thao tác</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                          {filteredCustomers.map((c) => (
                              <tr key={c.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                          <div className="bg-teal-50 p-1.5 rounded-full text-[#00695C]">
                                              <UserIcon className="w-4 h-4"/>
                                          </div>
                                          <div>
                                              <span className="font-bold text-gray-900 block">{c.fullName}</span>
                                              <span className="text-[10px] text-gray-400 font-mono">{c.id}</span>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-4 py-3">
                                      <div className="text-gray-900 font-medium">{c.phoneNumber || '-'}</div>
                                      <div className="text-xs text-gray-500">{c.email || ''}</div>
                                  </td>
                                  <td className="px-4 py-3 max-w-[200px] truncate">
                                      {c.address || '-'}
                                  </td>
                                  <td className="px-4 py-3">
                                      {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      <button onClick={() => handleEditCustomer(c)} className="text-blue-600 hover:text-blue-800 mr-3"><EditIcon className="w-4 h-4"/></button>
                                      <button onClick={() => handleDeleteCustomer(c.id, c.fullName)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                   </table>
               </div>
               
               {filteredCustomers.length === 0 && !isLoading && (
                  <div className="p-12 text-center text-gray-500 bg-gray-50">
                      <p className="font-medium">Không có dữ liệu khách hàng.</p>
                  </div>
               )}
          </div>

          {isEditingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white p-6 rounded-lg w-full max-w-md animate-fade-in-up">
                      <h3 className="text-lg font-bold mb-4">Sửa thông tin Khách hàng</h3>
                      <form onSubmit={handleSaveCustomer} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium mb-1">Họ tên</label>
                              <input type="text" value={editCustName} onChange={(e) => setEditCustName(e.target.value)} className="w-full border rounded px-3 py-2" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Email</label>
                              <input type="email" value={editCustEmail} onChange={(e) => setEditCustEmail(e.target.value)} className="w-full border rounded px-3 py-2" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                              <input type="tel" value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} className="w-full border rounded px-3 py-2" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                              <input type="text" value={editCustAddress} onChange={(e) => setEditCustAddress(e.target.value)} className="w-full border rounded px-3 py-2" />
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                              <button type="button" onClick={() => { setIsEditingCustomer(false); setEditingCustomer(null); }} className="bg-gray-200 text-gray-700 px-4 py-2 rounded">Hủy</button>
                              <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold">Lưu</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}
           
           {customerFeedback && (
             <div className="fixed bottom-4 right-4 bg-black/80 text-white px-4 py-2 rounded shadow-lg animate-fade-in-up z-50">
                 {customerFeedback}
             </div>
           )}
      </div>
  );
};

export default CustomerTab;
