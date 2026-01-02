
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { getDashboardMetrics, type DashboardData } from '../../utils/analytics';
import { getProducts } from '../../utils/productStorage';
import { getOrders } from '../../utils/orderStorage';
import { DollarSignIcon, ClipboardListIcon, PackageIcon, ActivityIcon, ShieldCheckIcon } from '../Icons';

const DashboardTab: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    refreshDashboard();
    const handleUpdate = () => refreshDashboard();
    window.addEventListener('sigma_vie_orders_update', handleUpdate);
    window.addEventListener('sigma_vie_products_update', handleUpdate);
    return () => {
        window.removeEventListener('sigma_vie_orders_update', handleUpdate);
        window.removeEventListener('sigma_vie_products_update', handleUpdate);
    };
  }, []);

  const refreshDashboard = () => {
      const data = getDashboardMetrics();
      setDashboardData(data);
      const orders = getOrders();
      setOrderCount(orders.filter(o => o.status === 'PENDING').length);
      const products = getProducts();
      setProductCount(products.length);
  };

  return (
      <div className="space-y-6 animate-fade-in-up">
          {/* Status Bar */}
          <div className="bg-gradient-to-r from-[#00695C] to-[#004d40] p-4 rounded-lg shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                  <div>
                      <p className="font-bold text-sm">Hệ thống Sigma Vie đang trực tuyến</p>
                      <p className="text-[10px] text-teal-100 opacity-80">Đã đồng bộ với GitHub & Vercel Auto-Deployment</p>
                  </div>
              </div>
              <div className="flex gap-2">
                  <a 
                    href="https://vercel.com/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded text-xs font-bold transition-all border border-white/20 flex items-center gap-1"
                  >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 512 512"><path d="M256 32L20 464h472L256 32z"/></svg>
                      Kiểm tra Vercel Build
                  </a>
              </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Doanh thu hôm nay</p>
                          <p className="text-2xl font-bold text-gray-800">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardData?.totalRevenueToday || 0)}
                          </p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                          <DollarSignIcon className="w-6 h-6 text-blue-600" />
                      </div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Đơn hàng mới</p>
                          <p className="text-2xl font-bold text-gray-800">{orderCount}</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                          <ClipboardListIcon className="w-6 h-6 text-green-600" />
                      </div>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Tổng sản phẩm</p>
                          <p className="text-2xl font-bold text-gray-800">{productCount}</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-full">
                          <PackageIcon className="w-6 h-6 text-purple-600" />
                      </div>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-500 text-sm font-medium uppercase">Sắp hết hàng</p>
                          <p className="text-2xl font-bold text-gray-800">{dashboardData?.lowStockProducts.length || 0}</p>
                      </div>
                      <div className="bg-red-100 p-3 rounded-full">
                          <ActivityIcon className="w-6 h-6 text-red-600" />
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh số 7 ngày qua</h3>
                  <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dashboardData?.dailySales}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <RechartsTooltip formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)} />
                              <Area type="monotone" dataKey="revenue" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.2} name="Doanh thu" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Hướng dẫn đẩy code (Git)</h3>
                  <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-2 overflow-x-auto">
                      <p className="text-gray-500"># Kiểm tra nhánh hiện tại</p>
                      <p>git branch</p>
                      <p className="text-gray-500"># Thêm thay đổi & Commit</p>
                      <p>git add .</p>
                      <p>git commit -m "Cập nhật tính năng mới"</p>
                      <p className="text-gray-500"># Đẩy lên nhánh main để Vercel tự động deploy</p>
                      <p className="text-white font-bold">git push origin main</p>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded text-xs text-yellow-800">
                      <strong>Lưu ý:</strong> Nếu bạn dùng nhánh khác (ví dụ: <code className="bg-yellow-200 px-1">dev</code>), Vercel sẽ không cập nhật trang chủ mà chỉ tạo link xem trước (Preview). Hãy merge vào <code className="bg-yellow-200 px-1">main</code> để thấy thay đổi.
                  </div>
              </div>
          </div>
      </div>
  );
};

export default DashboardTab;
