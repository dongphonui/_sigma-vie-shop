
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { getDashboardMetrics, type DashboardData } from '../../utils/analytics';
import { getProducts } from '../../utils/productStorage';
import { getOrders } from '../../utils/orderStorage';
import { getTransactions } from '../../utils/inventoryStorage';
import { DollarSignIcon, ClipboardListIcon, PackageIcon, ActivityIcon } from '../Icons';

const DashboardTab: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    // Initial Load
    refreshDashboard();

    // Listen to updates from other tabs
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

          {/* Charts */}
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
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Tồn kho theo sản phẩm</h3>
                   <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dashboardData?.stockData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <RechartsTooltip />
                              <Bar dataKey="value" fill="#00695C" name="Số lượng" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default DashboardTab;
