
import React, { useState, useEffect } from 'react';
import type { Customer } from '../../types';
import { getCustomers, updateCustomer, deleteCustomer, forceReloadCustomers } from '../../utils/customerStorage';
import { getOrders } from '../../utils/orderStorage';
import { SearchIcon, EditIcon, Trash2Icon, UserIcon, RefreshIcon } from '../Icons';

const CustomerTab: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false); // New loading state for actions
  
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustName, setEditCustName] = useState('');
  const [editCustEmail, setEditCustEmail] = useState('');
  const [editCustPhone, setEditCustPhone] = useState('');
  const [editCustAddress, setEditCustAddress] = useState('');
  const [customerFeedback, setCustomerFeedback] = useState('');

  // Initial Load
  useEffect(() => {
    handleRefresh();

    // Listen for background updates
    const handleUpdate = () => {
        setCustomers(getCustomers());
    };
    window.addEventListener('sigma_vie_customers_update', handleUpdate);
    return () => window.removeEventListener('sigma_vie_customers_update', handleUpdate);
  }, []);

  const handleRefresh = async () => {
      setIsLoading(true);
      try {
          const dbCustomers = await forceReloadCustomers();
          
          // Merge logic similar to before
          const orders = getOrders();
          const customerMap = new Map<string, Customer>();
          dbCustomers.forEach(c => customerMap.set(c.id, c));

          orders.forEach(order => {
              if (!customerMap.has(order.customerId)) {
                  const isEmail = order.customerContact.includes('@');
                  const recoveredCustomer: Customer = {
                      id: order.customerId,
                      fullName: order.customerName,
                      email: isEmail ? order.customerContact : undefined,
                      phoneNumber: !isEmail ? order.customerContact : undefined,
                      address: order.shippingAddress || order.customerAddress,
                      passwordHash: 'recovered_from_order',
                      createdAt: order.timestamp,
                  };
                  customerMap.set(order.customerId, recoveredCustomer);
              }
          });

          const mergedList = Array.from(customerMap.values()).sort((a, b) => b.createdAt - a.createdAt);
          setCustomers(mergedList);

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
      if(window.confirm(`Bạn có chắc muốn xóa khách hàng "${name}"? Hành động này sẽ xóa dữ liệu trên Server.`)) {
          setIsProcessingAction(true);
          setCustomerFeedback(`Đang xóa ${name}...`);
          
          // Await the server deletion
          const success = await deleteCustomer(id);
          
          if (success) {
              setCustomerFeedback(`Đã xóa khách hàng ${name}.`);
              await handleRefresh(); // Sync from server to be sure
          } else {
              setCustomerFeedback(`Lỗi: Không thể xóa ${name} trên Server.`);
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
          
          // Await server update
          const success = await updateCustomer(updated);
          
          if (success) {
              setCustomerFeedback('Cập nhật thành công trên Server.');
              await handleRefresh(); // Re-fetch to ensure data integrity
              setIsEditingCustomer(false);
              setEditingCustomer(null);
          } else {
              setCustomerFeedback('Lỗi: Server từ chối cập nhật (Kiểm tra lại dữ liệu đầu vào hoặc kết nối).');
              setIsEditingCustomer(false);
              setEditingCustomer(null);
          }
          
          setIsProcessingAction(false);
          setTimeout(() => setCustomerFeedback(''), 3000);
      }
  }

  // Filter logic
  const filteredCustomers = customers.filter(c => 
      c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phoneNumber?.includes(customerSearch) ||
      c.cccdNumber?.includes(customerSearch)
  );

  return (
      <div className="space-y-6 animate-fade-in-up">
          <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-auto">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm tên, email, sđt, cccd..." 
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-full md:w-64"
                  />
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                  <button 
                      onClick={handleRefresh}
                      disabled={isLoading || isProcessingAction}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 disabled:opacity-70 flex-1 md:flex-none transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isLoading ? 'animate-spin' : ''}><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                      {isLoading ? 'Đang đồng bộ...' : 'Làm mới & Quét lại'}
                  </button>
              </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
               {isProcessingAction && (
                   <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
                       <div className="bg-black/80 text-white px-4 py-2 rounded flex items-center gap-2">
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                           Đang xử lý trên Server...
                       </div>
                   </div>
               )}
               <div className="overflow-x-auto">
                   <table className="min-w-full text-sm text-left text-gray-500">
                      <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                          <tr>
                              <th className="px-4 py-3">ID</th>
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
                                  <td className="px-4 py-3 font-mono text-xs text-gray-400" title={c.id}>
                                      {c.id.startsWith('CUST') ? c.id.substring(0, 10) : 'Guest/Recovered'}
                                  </td>
                                  <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                          <div className="bg-teal-50 p-1.5 rounded-full text-[#00695C]">
                                              <UserIcon className="w-4 h-4"/>
                                          </div>
                                          <div>
                                              <span className="font-bold text-gray-900 block">{c.fullName}</span>
                                              {c.cccdNumber && <span className="text-[10px] text-gray-500 bg-gray-100 px-1 rounded">CCCD: {c.cccdNumber}</span>}
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-4 py-3">
                                      <div className="text-gray-900 font-medium">{c.phoneNumber || '-'}</div>
                                      <div className="text-xs text-gray-500">{c.email || ''}</div>
                                  </td>
                                  <td className="px-4 py-3 max-w-[200px] truncate" title={c.address}>
                                      {c.address || '-'}
                                  </td>
                                  <td className="px-4 py-3">
                                      {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      <button onClick={() => handleEditCustomer(c)} className="text-blue-600 hover:text-blue-800 mr-3" title="Sửa"><EditIcon className="w-4 h-4"/></button>
                                      <button onClick={() => handleDeleteCustomer(c.id, c.fullName)} className="text-red-600 hover:text-red-800" title="Xóa"><Trash2Icon className="w-4 h-4"/></button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                   </table>
               </div>
               
               {filteredCustomers.length === 0 && (
                  <div className="p-12 text-center text-gray-500 bg-gray-50 flex flex-col items-center">
                      {isLoading ? (
                          <>
                              <div className="w-8 h-8 border-4 border-[#00695C] border-t-transparent rounded-full animate-spin mb-4"></div>
                              <p>Đang tải dữ liệu từ máy chủ...</p>
                          </>
                      ) : (
                          <>
                              <div className="bg-gray-100 p-4 rounded-full mb-3">
                                  <UserIcon className="w-8 h-8 text-gray-400" />
                              </div>
                              <p className="font-medium text-lg">Chưa tìm thấy khách hàng.</p>
                              <p className="text-sm mt-1 max-w-xs">
                                  Nếu bạn thấy đơn hàng nhưng không thấy khách, hãy nhấn nút <strong>"Làm mới & Quét lại"</strong> để hệ thống tự động đồng bộ từ đơn hàng.
                              </p>
                          </>
                      )}
                  </div>
               )}
          </div>

          {/* Edit Modal */}
          {isEditingCustomer && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white p-6 rounded-lg w-full max-w-md animate-fade-in-up">
                      <h3 className="text-lg font-bold mb-4 text-[#00695C]">Sửa thông tin Khách hàng</h3>
                      <form onSubmit={handleSaveCustomer} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium mb-1">Họ tên</label>
                              <input type="text" value={editCustName} onChange={(e) => setEditCustName(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#00695C]" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium mb-1">Email</label>
                              <input type="email" value={editCustEmail} onChange={(e) => setEditCustEmail(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#00695C]" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Số điện thoại</label>
                              <input type="tel" value={editCustPhone} onChange={(e) => setEditCustPhone(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#00695C]" />
                          </div>
                           <div>
                              <label className="block text-sm font-medium mb-1">Địa chỉ</label>
                              <input type="text" value={editCustAddress} onChange={(e) => setEditCustAddress(e.target.value)} className="w-full border rounded px-3 py-2 focus:ring-[#00695C]" />
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                              <button 
                                type="button" 
                                onClick={() => { setIsEditingCustomer(false); setEditingCustomer(null); }} 
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                                disabled={isProcessingAction}
                              >
                                Hủy
                              </button>
                              <button 
                                type="submit" 
                                disabled={isProcessingAction}
                                className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31] disabled:opacity-70 flex items-center gap-2"
                              >
                                {isProcessingAction ? 'Đang lưu...' : 'Lưu thay đổi'}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          )}
           
           {customerFeedback && (
             <div className="fixed bottom-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded shadow-lg animate-fade-in-up z-50 border border-green-200">
                 {customerFeedback}
             </div>
           )}
      </div>
  );
};

export default CustomerTab;
