
import React, { useState, useEffect } from 'react';
import type { Customer } from '../../types';
import { getCustomers, updateCustomer, deleteCustomer, forceReloadCustomers } from '../../utils/customerStorage';
import { SearchIcon, EditIcon, Trash2Icon } from '../Icons';

const CustomerTab: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');

  // Hàm tải dữ liệu (Local)
  const loadCustomers = () => {
      setCustomers(getCustomers());
  };

  // Hàm ép tải lại từ Server (Async)
  const handleRefresh = async () => {
      setIsLoading(true);
      await forceReloadCustomers();
      setIsLoading(false);
  };

  useEffect(() => {
    // 1. Tải lần đầu
    loadCustomers();
    
    // 2. Tự động refresh nhẹ khi vào tab này
    handleRefresh();

    // 3. Lắng nghe sự kiện cập nhật
    const handleUpdate = () => loadCustomers();
    window.addEventListener('sigma_vie_customers_update', handleUpdate);
    
    return () => window.removeEventListener('sigma_vie_customers_update', handleUpdate);
  }, []);

  const handleEditCustomer = (customer: Customer) => {
      setEditingCustomer(customer);
      setEditCustName(customer.fullName);
      setEditCustEmail(customer.email || '');
      setEditCustPhone(customer.phoneNumber || '');
      setEditCustAddress(customer.address || '');
      setIsEditingCustomer(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
      if(window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"? Hành động này không thể hoàn tác.`)) {
          deleteCustomer(id);
          setCustomerFeedback(`Đã xóa khách hàng ${name}.`);
          setTimeout(() => setCustomerFeedback(''), 3000);
      }
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
      e.preventDefault();
      if(editingCustomer) {
          updateCustomer({
              ...editingCustomer,
              fullName: editCustName,
              email: editCustEmail || undefined,
              phoneNumber: editCustPhone || undefined,
              address: editCustAddress
          });
          setCustomerFeedback('Cập nhật thông tin khách hàng thành công.');
          setIsEditingCustomer(false);
          setEditingCustomer(null);
          setTimeout(() => setCustomerFeedback(''), 3000);
      }
  }

  return (
      <div className="space-y-6 animate-fade-in-up">
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm khách hàng..." 
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-64"
                  />
              </div>
              <button 
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center gap-2 disabled:opacity-70"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'animate-spin' : ''}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                  {isLoading ? 'Đang tải...' : 'Làm mới'}
              </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
               <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                      <tr>
                          <th className="px-4 py-3">ID</th>
                          <th className="px-4 py-3">Họ tên</th>
                          <th className="px-4 py-3">Email</th>
                          <th className="px-4 py-3">SĐT</th>
                          <th className="px-4 py-3">Ngày tham gia</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                      {customers
                        .filter(c => 
                            c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) || 
                            c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            c.phoneNumber?.includes(customerSearch)
                        )
                        .map((c) => (
                          <tr key={c.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                              <td className="px-4 py-3 font-medium text-gray-900">{c.fullName}</td>
                              <td className="px-4 py-3">{c.email || '-'}</td>
                              <td className="px-4 py-3">{c.phoneNumber || '-'}</td>
                              <td className="px-4 py-3">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                              <td className="px-4 py-3 text-right">
                                  <button onClick={() => handleEditCustomer(c)} className="text-blue-600 hover:text-blue-800 mr-2"><EditIcon className="w-4 h-4"/></button>
                                  <button onClick={() => handleDeleteCustomer(c.id, c.fullName)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                              </td>
                          </tr>
                      ))}
                      {customers.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                  {isLoading ? 'Đang đồng bộ dữ liệu...' : 'Chưa có khách hàng nào.'}
                              </td>
                          </tr>
                      )}
                  </tbody>
               </table>
          </div>

          {isEditingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
             <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded shadow-lg animate-fade-in-up">
                 {customerFeedback}
             </div>
           )}
      </div>
  );
};

export default CustomerTab;
