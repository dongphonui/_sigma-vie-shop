
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { getProducts } from '../../utils/productStorage';
import { getTransactions } from '../../utils/inventoryStorage';
import { getCustomers } from '../../utils/customerStorage';
import { getOrders } from '../../utils/orderStorage';
import { DownloadIcon, PrinterIcon } from '../Icons';
import type { Product, InventoryTransaction, Customer, Order } from '../../types';

const ReportsTab: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'inventory' | 'customer_qty' | 'segmentation'>('inventory');
  
  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setProducts(getProducts());
    setTransactions(getTransactions());
    setCustomers(getCustomers());
    setOrders(getOrders());
  }, []);

  // --- REPORT 1: INVENTORY (Xuất/Nhập/Tồn) ---
  const inventoryReportData = useMemo(() => {
      // Map products
      return products.map(p => {
          // Filter transactions for this product
          const prodTrans = transactions.filter(t => String(t.productId) === String(p.id));
          
          const imported = prodTrans.filter(t => t.type === 'IMPORT').reduce((sum, t) => sum + t.quantity, 0);
          const exported = prodTrans.filter(t => t.type === 'EXPORT').reduce((sum, t) => sum + t.quantity, 0);
          
          // Current Stock is already in product object (Source of truth)
          // We can calculate "Initial Stock" relative to the recorded history if needed, 
          // but mostly Import/Export/Current is what's requested.
          
          return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              imported,
              exported,
              stock: p.stock
          };
      });
  }, [products, transactions]);

  // --- REPORT 2: CUSTOMER QUANTITY (Số lượng khách hàng) ---
  const customerGrowthData = useMemo(() => {
      const dataByMonth = new Map<string, number>();
      const today = new Date();
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
          dataByMonth.set(key, 0);
      }

      customers.forEach(c => {
          const d = new Date(c.createdAt);
          const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
          if (dataByMonth.has(key)) {
              dataByMonth.set(key, dataByMonth.get(key)! + 1);
          }
      });

      // Cumulative calculation? Or new per month? Request says "Quantity", usually implies total or growth.
      // Let's show "New Customers" and "Total Accumulative"
      let runningTotal = 0;
      // Pre-calculate total before the window
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      customers.forEach(c => {
          if (c.createdAt < sixMonthsAgo.getTime()) runningTotal++;
      });

      const chartData: any[] = [];
      dataByMonth.forEach((count, month) => {
          runningTotal += count;
          chartData.push({
              name: month,
              new: count,
              total: runningTotal
          });
      });
      return chartData;
  }, [customers]);

  // --- REPORT 3: CUSTOMER SEGMENTATION (Phân khúc) ---
  const segmentationData = useMemo(() => {
      const spendingByCustomer = new Map<string, number>();
      
      // Sum valid orders
      orders.forEach(o => {
          if (o.status !== 'CANCELLED') {
              const current = spendingByCustomer.get(o.customerId) || 0;
              spendingByCustomer.set(o.customerId, current + o.totalPrice);
          }
      });

      let regular = 0; // < 1M
      let potential = 0; // 1M - 5M
      let premium = 0; // > 5M

      // Count only registered customers or all order emails? 
      // Using `customers` list ensures we segment registered users. 
      // If we use `spendingByCustomer` keys, we include guests (if guests tracked by ID).
      
      // Let's iterate all known customer IDs in orders
      spendingByCustomer.forEach((total) => {
          if (total > 5000000) premium++;
          else if (total >= 1000000) potential++;
          else regular++;
      });

      // Add customers with 0 orders to Regular
      const activeCustomerIds = new Set(spendingByCustomer.keys());
      const inactiveCustomers = customers.filter(c => !activeCustomerIds.has(c.id)).length;
      regular += inactiveCustomers;

      return [
          { name: 'Phổ thông (<1tr)', value: regular, color: '#9CA3AF' }, // Gray
          { name: 'Tiềm năng (1-5tr)', value: potential, color: '#3B82F6' }, // Blue
          { name: 'Cao cấp (>5tr)', value: premium, color: '#D4AF37' }, // Gold
      ].filter(d => d.value > 0);
  }, [orders, customers]);

  // --- EXPORT FUNCTIONS ---
  const exportToCSV = (filename: string, rows: any[]) => {
      if (!rows || !rows.length) return;
      const separator = ',';
      const keys = Object.keys(rows[0]);
      const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
          return keys.map(k => {
            let cell = row[k] === null || row[k] === undefined ? '' : row[k];
            cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
            if (cell.search(/("|,|\n)/g) >= 0) {
              cell = `"${cell}"`;
            }
            return cell;
          }).join(separator);
        }).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
  };

  const handleExport = () => {
      const dateStr = new Date().toISOString().slice(0,10);
      if (activeReport === 'inventory') {
          exportToCSV(`BaoCao_TonKho_${dateStr}.csv`, inventoryReportData);
      } else if (activeReport === 'customer_qty') {
          exportToCSV(`BaoCao_KhachHang_SoLuong_${dateStr}.csv`, customerGrowthData);
      } else {
          exportToCSV(`BaoCao_PhanKhuc_KhachHang_${dateStr}.csv`, segmentationData);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in-up print:p-0">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
            <div className="flex bg-white rounded-lg p-1 shadow-sm border">
                <button 
                    onClick={() => setActiveReport('inventory')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReport === 'inventory' ? 'bg-[#D4AF37] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Xuất / Nhập / Tồn
                </button>
                <button 
                    onClick={() => setActiveReport('customer_qty')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReport === 'customer_qty' ? 'bg-[#D4AF37] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Số lượng Khách hàng
                </button>
                <button 
                    onClick={() => setActiveReport('segmentation')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReport === 'segmentation' ? 'bg-[#D4AF37] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    Phân khúc Khách hàng
                </button>
            </div>
            
            <div className="flex gap-2">
                <button onClick={handleExport} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium text-sm">
                    <DownloadIcon className="w-4 h-4" /> Xuất Excel
                </button>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 font-medium text-sm">
                    <PrinterIcon className="w-4 h-4" /> In Báo Cáo (PDF)
                </button>
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md print:shadow-none print:border-none">
            <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800 uppercase">
                    {activeReport === 'inventory' && 'Báo Cáo Xuất Nhập Tồn Kho'}
                    {activeReport === 'customer_qty' && 'Báo Cáo Tăng Trưởng Khách Hàng'}
                    {activeReport === 'segmentation' && 'Báo Cáo Phân Khúc Khách Hàng'}
                </h2>
                <p className="text-sm text-gray-500">Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</p>
            </div>

            {activeReport === 'inventory' && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-600 border">
                        <thead className="bg-gray-100 text-gray-800 font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 border">Mã SKU</th>
                                <th className="px-4 py-3 border">Tên Sản phẩm</th>
                                <th className="px-4 py-3 border text-right">Đã Nhập</th>
                                <th className="px-4 py-3 border text-right">Đã Xuất</th>
                                <th className="px-4 py-3 border text-right">Tồn Kho Hiện Tại</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventoryReportData.map((item, idx) => (
                                <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-4 py-2 border font-mono">{item.sku}</td>
                                    <td className="px-4 py-2 border">{item.name}</td>
                                    <td className="px-4 py-2 border text-right text-green-600 font-medium">+{item.imported}</td>
                                    <td className="px-4 py-2 border text-right text-orange-600 font-medium">-{item.exported}</td>
                                    <td className="px-4 py-2 border text-right font-bold text-[#00695C]">{item.stock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeReport === 'customer_qty' && (
                <div>
                    <div className="h-80 mb-8 print:h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={customerGrowthData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="new" name="Khách mới" stroke="#8884d8" strokeWidth={2} />
                                <Line type="monotone" dataKey="total" name="Tổng khách" stroke="#82ca9d" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    
                    <h4 className="font-bold text-gray-700 mb-2 mt-4">Chi tiết số liệu:</h4>
                    <table className="min-w-full text-sm text-center border">
                        <thead className="bg-gray-100 font-bold">
                            <tr>
                                <th className="px-4 py-2 border">Tháng</th>
                                <th className="px-4 py-2 border">Khách mới</th>
                                <th className="px-4 py-2 border">Tổng tích lũy</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerGrowthData.map((row) => (
                                <tr key={row.name} className="border-b">
                                    <td className="px-4 py-2 border">{row.name}</td>
                                    <td className="px-4 py-2 border">+{row.new}</td>
                                    <td className="px-4 py-2 border font-bold">{row.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeReport === 'segmentation' && (
                <div className="flex flex-col items-center">
                    <div className="h-80 w-full max-w-lg mb-6 print:h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={segmentationData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={true}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {segmentationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="w-full max-w-2xl">
                        <h4 className="font-bold text-gray-700 mb-2">Định nghĩa phân khúc:</h4>
                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-6">
                            <li><strong>Phổ thông:</strong> Tổng chi tiêu dưới 1.000.000đ (Hoặc chưa mua hàng).</li>
                            <li><strong>Tiềm năng (Silver):</strong> Tổng chi tiêu từ 1.000.000đ đến 5.000.000đ.</li>
                            <li><strong>Cao cấp (Gold/VIP):</strong> Tổng chi tiêu trên 5.000.000đ.</li>
                        </ul>

                        <table className="min-w-full text-sm text-center border">
                            <thead className="bg-gray-100 font-bold">
                                <tr>
                                    <th className="px-4 py-2 border">Phân khúc</th>
                                    <th className="px-4 py-2 border">Số lượng Khách hàng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {segmentationData.map((row) => (
                                    <tr key={row.name} className="border-b">
                                        <td className="px-4 py-2 border font-medium" style={{ color: row.color }}>{row.name}</td>
                                        <td className="px-4 py-2 border">{row.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
        
        {/* Print Styles */}
        <style>{`
            @media print {
                body * {
                    visibility: hidden;
                }
                .print\\:hidden {
                    display: none !important;
                }
                .print\\:p-0 {
                    padding: 0 !important;
                }
                .print\\:h-96 {
                    height: 400px !important;
                }
                .print\\:shadow-none {
                    box-shadow: none !important;
                }
                .print\\:border-none {
                    border: none !important;
                }
                
                /* Make the Report Container Visible */
                .bg-white.p-6.rounded-lg.shadow-md,
                .bg-white.p-6.rounded-lg.shadow-md * {
                    visibility: visible;
                }
                .bg-white.p-6.rounded-lg.shadow-md {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100%;
                }
            }
        `}</style>
    </div>
  );
};

export default ReportsTab;
