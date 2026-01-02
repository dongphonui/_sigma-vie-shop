
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { getDashboardMetrics, type DashboardData } from '../../utils/analytics';
import { getProducts } from '../../utils/productStorage';
import { getOrders } from '../../utils/orderStorage';
import { 
    DollarSignIcon, ClipboardListIcon, PackageIcon, ActivityIcon, 
    TerminalIcon, AlertCircleIcon, CheckIcon, RefreshIcon 
} from '../Icons';

const DashboardTab: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [isApiKeyDetected, setIsApiKeyDetected] = useState(false);

  useEffect(() => {
    refreshDashboard();
    // Kiểm tra API Key (chỉ phía Client)
    setIsApiKeyDetected(!!process.env.API_KEY);

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
          {/* Diagnostic Status Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-gradient-to-r from-[#00695C] to-[#004d40] p-5 rounded-xl shadow-lg text-white flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-4">
                      <div className="relative">
                          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/20">
                             <ActivityIcon className="w-6 h-6 text-green-400" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#00695C] animate-pulse"></div>
                      </div>
                      <div>
                          <p className="font-bold text-lg">Hệ thống đang trực tuyến</p>
                          <p className="text-xs text-teal-100 opacity-80">Trình trạng: Ổn định. Đã kết nối Vercel Edge.</p>
                      </div>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                      <a 
                        href="https://vercel.com/dashboard" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-xs font-bold transition-all border border-white/20 flex items-center gap-2"
                      >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 512 512"><path d="M256 32L20 464h472L256 32z"/></svg>
                          Xem Build Logs
                      </a>
                      <button onClick={refreshDashboard} className="bg-teal-500/20 hover:bg-teal-500/40 p-2 rounded-lg transition-all border border-teal-500/30">
                          <RefreshIcon className="w-4 h-4" />
                      </button>
                  </div>
              </div>

              {/* API Key Health Check */}
              <div className={`p-5 rounded-xl shadow-md border flex items-center gap-4 ${isApiKeyDetected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200 animate-pulse'}`}>
                  <div className={`p-3 rounded-lg ${isApiKeyDetected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {isApiKeyDetected ? <CheckIcon className="w-6 h-6" /> : <AlertCircleIcon className="w-6 h-6" />}
                  </div>
                  <div>
                      <p className="font-bold text-sm text-gray-800">Cấu hình AI Gemini</p>
                      <p className={`text-xs font-medium ${isApiKeyDetected ? 'text-green-600' : 'text-red-600'}`}>
                          {isApiKeyDetected ? 'Đã nhận API Key' : 'Thiếu API Key trên Vercel!'}
                      </p>
                  </div>
              </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Doanh thu hôm nay</p>
                          <p className="text-2xl font-black text-gray-800">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dashboardData?.totalRevenueToday || 0)}
                          </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl">
                          <DollarSignIcon className="w-6 h-6 text-blue-600" />
                      </div>
                  </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Đơn hàng mới</p>
                          <p className="text-2xl font-black text-gray-800">{orderCount}</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl">
                          <ClipboardListIcon className="w-6 h-6 text-emerald-600" />
                      </div>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-violet-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Tổng sản phẩm</p>
                          <p className="text-2xl font-black text-gray-800">{productCount}</p>
                      </div>
                      <div className="bg-violet-50 p-3 rounded-xl">
                          <PackageIcon className="w-6 h-6 text-violet-600" />
                      </div>
                  </div>
              </div>
               <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-rose-500 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-center">
                      <div>
                          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Cảnh báo tồn kho</p>
                          <p className="text-2xl font-black text-gray-800">{dashboardData?.lowStockProducts.length || 0}</p>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-xl">
                          <ActivityIcon className="w-6 h-6 text-rose-600" />
                      </div>
                  </div>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales Chart */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-gray-800">Hiệu suất Doanh thu (7 ngày)</h3>
                      <div className="flex gap-2 text-[10px] font-bold">
                          <span className="flex items-center gap-1 text-[#D4AF37]"><div className="w-2 h-2 bg-[#D4AF37] rounded-full"></div> Doanh thu</span>
                      </div>
                  </div>
                  <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={dashboardData?.dailySales}>
                              <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                              <RechartsTooltip 
                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                                formatter={(value) => new Intl.NumberFormat('vi-VN').format(value as number)} 
                              />
                              <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Doanh thu" />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Troubleshooting & Git Guide */}
              <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                      <TerminalIcon className="w-5 h-5 text-[#00695C]" />
                      <h3 className="text-lg font-black text-gray-800">Tại sao không thấy Deploy?</h3>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-800 font-bold mb-1 uppercase tracking-tighter flex items-center gap-1">
                             <AlertCircleIcon className="w-3 h-3" /> Lưu ý quan trọng
                          </p>
                          <p className="text-xs text-amber-700 leading-relaxed">
                              Lệnh <code className="bg-amber-100 px-1 rounded font-mono">git commit</code> chỉ lưu ở máy bạn. 
                              Bạn <strong>PHẢI</strong> chạy lệnh <code className="bg-amber-100 px-1 rounded font-mono">git push</code> để đẩy code lên GitHub, từ đó Vercel mới nhận được và tự động Build.
                          </p>
                      </div>

                      <div className="space-y-2">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quy trình chuẩn:</p>
                          <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 space-y-3 overflow-x-auto shadow-inner">
                              <div>
                                  <p className="text-gray-500"># 1. Gom các thay đổi lại</p>
                                  <p>git add .</p>
                              </div>
                              <div>
                                  <p className="text-gray-500"># 2. Đặt tên cho bản cập nhật</p>
                                  <p>git commit -m "abc"</p>
                              </div>
                              <div className="pt-2 border-t border-gray-800">
                                  <p className="text-blue-400 font-bold"># 3. ĐẨY LÊN CLOUD (QUYẾT ĐỊNH DEPLOY)</p>
                                  <p className="text-white font-bold bg-white/10 px-2 py-1 rounded inline-block">git push origin main</p>
                              </div>
                          </div>
                      </div>

                      <div className="pt-4 border-t space-y-2">
                         <p className="text-xs font-bold text-gray-500 uppercase">Checklist kiểm tra lỗi:</p>
                         <ul className="text-xs text-gray-600 space-y-1.5">
                             <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Đã kết nối đúng Repo GitHub với Vercel chưa?</li>
                             <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Nhánh mặc định trên Vercel là <code className="bg-gray-100 px-1">main</code> hay <code className="bg-gray-100 px-1">master</code>?</li>
                             <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div> Có lỗi Build không? (Xem trong tab <span className="font-bold">Deployments</span> trên Vercel)</li>
                         </ul>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default DashboardTab;
