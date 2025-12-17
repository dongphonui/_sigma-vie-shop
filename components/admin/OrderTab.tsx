
import React, { useState, useEffect } from 'react';
import type { Order } from '../../types';
import { getOrders, updateOrderStatus } from '../../utils/orderStorage';
import { getProducts } from '../../utils/productStorage';
import { getTransactions } from '../../utils/inventoryStorage';
import { 
    SearchIcon, PrinterIcon, CheckIcon, TruckIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon 
} from '../Icons';

const OrderTab: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderCurrentPage, setOrderCurrentPage] = useState(1);
  const ordersPerPage = 10;

  useEffect(() => {
    setOrders(getOrders());
  }, []);

  useEffect(() => {
    setOrderCurrentPage(1);
  }, [orderSearch, orderFilterStatus]);

  const handleOrderStatusChange = (orderId: string, newStatus: Order['status']) => {
      updateOrderStatus(orderId, newStatus);
      setOrders(getOrders());
      // Trigger updates for other components
      window.dispatchEvent(new Event('sigma_vie_products_update'));
  };

  const handlePrintOrder = (order: Order) => {
      const printWindow = window.open('', '', 'width=800,height=600');
      if (!printWindow) return;

      const storeName = 'Sigma Vie Store'; 
      const storePhone = '0912.345.678';
      const storeAddress = 'Hà Nội, Việt Nam';
      const productUrl = `${window.location.origin}/?product=${order.productId}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(productUrl)}`;
      const shippingFee = order.shippingFee || 0;
      const subtotal = order.totalPrice - shippingFee;

      const html = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8">
            <title>Hóa đơn ${order.id}</title>
            <style>
                body { font-family: 'Times New Roman', sans-serif; padding: 20px; color: #000; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
                .header p { margin: 5px 0; font-size: 14px; }
                .info-section { margin-bottom: 20px; display: flex; justify-content: space-between; }
                .box { border: 1px solid #000; padding: 10px; width: 48%; }
                .box h3 { margin-top: 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
                .order-details { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .order-details th, .order-details td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 14px; }
                .total-section { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; }
                .footer { text-align: center; margin-top: 40px; font-size: 12px; font-style: italic; }
                .qr-section { text-align: center; margin-top: 20px; border-top: 1px dashed #ccc; padding-top: 10px; }
                @media print { @page { margin: 0.5cm; } body { margin: 0; } .box { width: 45%; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>${storeName.toUpperCase()}</h1>
                <p>Phiếu Giao Hàng / Hóa Đơn</p>
                <p>Mã đơn: <strong>${order.id}</strong> | Ngày: ${new Date(order.timestamp).toLocaleDateString('vi-VN')}</p>
            </div>
            <div class="info-section">
                <div class="box">
                    <h3>NGƯỜI GỬI</h3>
                    <p><strong>${storeName}</strong></p>
                    <p>SĐT: ${storePhone}</p>
                    <p>Đ/C: ${storeAddress}</p>
                </div>
                <div class="box">
                    <h3>NGƯỜI NHẬN (Delivery To)</h3>
                    <p><strong>${order.shippingName || order.customerName}</strong></p>
                    <p>SĐT: <strong>${order.shippingPhone || order.customerContact}</strong></p>
                    <p>Đ/C: ${order.shippingAddress || order.customerAddress}</p>
                    ${order.note ? `<p style="margin-top:5px; font-style:italic;">Ghi chú: ${order.note}</p>` : ''}
                </div>
            </div>
            ${order.shippingName && order.shippingName !== order.customerName ? 
                `<p style="font-size:12px; margin-bottom:10px;">* Đơn hàng được đặt bởi tài khoản: ${order.customerName} (${order.customerContact})</p>` 
            : ''}
            <table class="order-details">
                <thead><tr><th>Sản phẩm</th><th>Phân loại</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                <tbody>
                    <tr>
                        <td>${order.productName}</td>
                        <td>${order.productSize ? `Size: ${order.productSize}` : ''} ${order.productColor ? ` | Màu: ${order.productColor}` : ''} ${!order.productSize && !order.productColor ? '-' : ''}</td>
                        <td>${order.quantity}</td>
                        <td>${new Intl.NumberFormat('vi-VN').format(subtotal / order.quantity)}đ</td>
                        <td>${new Intl.NumberFormat('vi-VN').format(subtotal)}đ</td>
                    </tr>
                </tbody>
            </table>
            <div class="total-section">
                <p>Tạm tính: ${new Intl.NumberFormat('vi-VN').format(subtotal)}đ</p>
                <p>Phí vận chuyển: ${shippingFee === 0 ? '0đ (Miễn phí)' : new Intl.NumberFormat('vi-VN').format(shippingFee) + 'đ'}</p>
                <p>Tổng thu (COD): ${order.paymentMethod === 'COD' ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice) : '0₫ (Đã chuyển khoản)'}</p>
                ${order.paymentMethod === 'BANK_TRANSFER' ? '<p style="font-size: 12px; font-weight: normal;">(Khách đã thanh toán qua Ngân hàng)</p>' : ''}
            </div>
            <div class="qr-section"><p>Quét mã để mua thêm sản phẩm này:</p><img src="${qrImageUrl}" alt="QR Code" width="100" height="100" /></div>
            <div class="footer"><p>Cảm ơn quý khách đã mua hàng!</p></div>
        </body>
        </html>
      `;
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
      <div className="space-y-6 animate-fade-in-up">
           <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
              <div className="relative">
                  <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input 
                      type="text" 
                      placeholder="Tìm mã đơn, tên KH..." 
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-64"
                  />
              </div>
              <select 
                  value={orderFilterStatus} 
                  onChange={(e) => setOrderFilterStatus(e.target.value)}
                  className="border rounded-md px-3 py-2"
              >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ xử lý</option>
                  <option value="CONFIRMED">Đã xác nhận</option>
                  <option value="SHIPPED">Đã giao hàng</option>
                  <option value="CANCELLED">Đã hủy</option>
              </select>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full text-sm text-left text-gray-500">
                  <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                      <tr>
                          <th className="px-4 py-3">Mã Đơn</th>
                          <th className="px-4 py-3">Khách hàng</th>
                          <th className="px-4 py-3">Sản phẩm</th>
                          <th className="px-4 py-3">Tổng tiền</th>
                          <th className="px-4 py-3">Thanh toán</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3 text-center">Thao tác</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                      {orders
                          .filter(order => 
                              (orderFilterStatus === 'all' || order.status === orderFilterStatus) &&
                              (order.id.toLowerCase().includes(orderSearch.toLowerCase()) || 
                               order.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                               order.shippingName?.toLowerCase().includes(orderSearch.toLowerCase()) // Search by recipient too
                              )
                          )
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .slice((orderCurrentPage - 1) * ordersPerPage, orderCurrentPage * ordersPerPage)
                          .map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-mono text-xs">{order.id}</td>
                              <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{order.shippingName || order.customerName}</div>
                                  <div className="text-xs text-gray-400">{order.shippingPhone || order.customerContact}</div>
                                  {order.shippingName !== order.customerName && (
                                      <div className="text-[10px] text-gray-400 italic mt-1">Đặt bởi: {order.customerName}</div>
                                  )}
                              </td>
                              <td className="px-4 py-3">
                                  <div>{order.productName}</div>
                                  <div className="text-xs text-gray-400">
                                    x{order.quantity}
                                    {order.productSize && ` | Size: ${order.productSize}`}
                                    {order.productColor && ` | Màu: ${order.productColor}`}
                                  </div>
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-800">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.totalPrice)}
                              </td>
                              <td className="px-4 py-3">
                                  {order.paymentMethod === 'BANK_TRANSFER' ? (
                                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 font-bold">Chuyển khoản</span>
                                  ) : (
                                      <span className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded border font-bold">COD</span>
                                  )}
                              </td>
                              <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-bold 
                                      ${order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                        order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' : 
                                        order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {order.status === 'PENDING' ? 'Chờ xử lý' : 
                                       order.status === 'CONFIRMED' ? 'Đã xác nhận' : 
                                       order.status === 'SHIPPED' ? 'Đã giao' : 'Đã hủy'}
                                  </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                     <div className="flex items-center justify-center gap-2">
                                        <button onClick={() => handlePrintOrder(order)} title="In hóa đơn" className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors">
                                            <PrinterIcon className="w-4 h-4" />
                                        </button>
                                        {order.status === 'PENDING' && (
                                            <button onClick={() => handleOrderStatusChange(order.id, 'CONFIRMED')} title="Xác nhận" className="p-2 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                                                <CheckIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {order.status === 'CONFIRMED' && (
                                            <button onClick={() => handleOrderStatusChange(order.id, 'SHIPPED')} title="Giao hàng" className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors">
                                                <TruckIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        {order.status !== 'CANCELLED' && order.status !== 'SHIPPED' && (
                                            <button onClick={() => handleOrderStatusChange(order.id, 'CANCELLED')} title="Hủy" className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                                                <XCircleIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                     </div>
                                </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
              <div className="p-4 border-t flex justify-between items-center">
                  <span className="text-sm text-gray-500">Trang {orderCurrentPage}</span>
                  <div className="flex gap-2">
                      <button disabled={orderCurrentPage === 1} onClick={() => setOrderCurrentPage(c => c - 1)} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">
                          <ChevronLeftIcon className="w-4 h-4"/>
                      </button>
                      <button onClick={() => setOrderCurrentPage(c => c + 1)} className="px-3 py-1 border rounded hover:bg-gray-100">
                          <ChevronRightIcon className="w-4 h-4"/>
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default OrderTab;
