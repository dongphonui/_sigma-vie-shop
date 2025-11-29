
import { getTransactions } from './inventoryStorage';
import { getProducts } from './productStorage';
import { getOrders } from './orderStorage';
import type { InventoryTransaction, Product } from '../types';

export interface ChartData {
  name: string;
  value: number;
  revenue?: number;
  full_name?: string;
}

export interface SalesDayDetail {
  date: string; // Display format dd/mm/yyyy
  rawDate: string; // Sortable format yyyy-mm-dd
  quantity: number;
  revenue: number;
}

export interface DashboardData {
  stockData: ChartData[];
  dailySales: ChartData[];
  monthlySales: ChartData[];
  quarterlySales: ChartData[];
  yearlySales: ChartData[];
  salesByProduct: ChartData[]; // Sales volume per product
  salesByDayList: SalesDayDetail[]; // Detailed daily sales list
  lowStockProducts: Product[];
  totalRevenueToday: number;
}

export const getDashboardMetrics = (): DashboardData => {
  const products = getProducts();
  const orders = getOrders().filter(o => o.status !== 'CANCELLED'); // Only valid orders
  
  // 1. Stock Data for Charts (From Products)
  const stockData = products.map(p => ({
    name: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name,
    value: p.stock,
    full_name: p.name
  }));

  // 2. Low Stock Warning (Less than 5)
  const lowStockProducts = products.filter(p => p.stock < 5);

  // --- SALES ANALYTICS (Based on Orders) ---

  const today = new Date();
  const dailyMap = new Map<string, { qty: number, rev: number }>();
  
  // Initialize last 7 days with 0
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    dailyMap.set(dateKey, { qty: 0, rev: 0 });
  }

  orders.forEach(order => {
    const d = new Date(order.timestamp);
    const dateKey = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    
    // For Chart (Last 7 days)
    if (dailyMap.has(dateKey)) {
      const current = dailyMap.get(dateKey)!;
      dailyMap.set(dateKey, { 
        qty: current.qty + order.quantity,
        rev: current.rev + order.totalPrice
      });
    }
  });

  const dailySales: ChartData[] = Array.from(dailyMap.entries()).map(([key, val]) => ({
    name: key,
    value: val.qty,
    revenue: val.rev
  }));

  // 4. Monthly Sales (Current Year)
  const monthlyData = new Array(12).fill(0);
  orders.forEach(order => {
    const d = new Date(order.timestamp);
    if (d.getFullYear() === today.getFullYear()) {
      monthlyData[d.getMonth()] += order.quantity;
    }
  });
  
  const monthlySales: ChartData[] = monthlyData.map((val, index) => ({
    name: `T${index + 1}`,
    value: val
  }));

  // 5. Quarterly Sales (Current Year)
  const quarterlyData = [0, 0, 0, 0];
  orders.forEach(order => {
      const d = new Date(order.timestamp);
      if (d.getFullYear() === today.getFullYear()) {
          const quarter = Math.floor(d.getMonth() / 3);
          quarterlyData[quarter] += order.quantity;
      }
  });

  const quarterlySales: ChartData[] = quarterlyData.map((val, index) => ({
      name: `Quý ${index + 1}`,
      value: val
  }));

  // 6. Yearly Sales (Last 5 years)
  const yearlyMap = new Map<number, number>();
  const currentYear = today.getFullYear();
  for(let i = currentYear - 4; i <= currentYear; i++) {
      yearlyMap.set(i, 0);
  }

  orders.forEach(order => {
      const year = new Date(order.timestamp).getFullYear();
      if (yearlyMap.has(year)) {
          yearlyMap.set(year, yearlyMap.get(year)! + order.quantity);
      }
  });

  const yearlySales: ChartData[] = Array.from(yearlyMap.entries()).map(([key, val]) => ({
      name: key.toString(),
      value: val
  }));

  // 7. Sales by Product (Total Revenue & Volume)
  const productSalesMap = new Map<string, number>();
  products.forEach(p => productSalesMap.set(p.name, 0)); // Init

  orders.forEach(order => {
     const current = productSalesMap.get(order.productName) || 0;
     productSalesMap.set(order.productName, current + order.quantity);
  });

  const salesByProduct: ChartData[] = Array.from(productSalesMap.entries())
    .map(([name, value]) => ({
        name: name.length > 20 ? name.substring(0, 20) + '...' : name,
        full_name: name,
        value: value
    }))
    .sort((a, b) => b.value - a.value);

  // 8. Sales by Day List (Detailed Table)
  const fullDailyMap = new Map<string, { qty: number, rev: number }>(); // Key: YYYY-MM-DD
  
  orders.forEach(order => {
      const d = new Date(order.timestamp);
      const rawDate = d.toISOString().split('T')[0];
      const current = fullDailyMap.get(rawDate) || { qty: 0, rev: 0 };
      
      fullDailyMap.set(rawDate, {
          qty: current.qty + order.quantity,
          rev: current.rev + order.totalPrice
      });
  });

  const salesByDayList: SalesDayDetail[] = Array.from(fullDailyMap.entries())
    .map(([rawDate, data]) => {
        const [y, m, d] = rawDate.split('-');
        return {
            rawDate,
            date: `${d}/${m}/${y}`,
            quantity: data.qty,
            revenue: data.rev
        };
    })
    .sort((a, b) => b.rawDate.localeCompare(a.rawDate));

  // Calculate Revenue Today specifically
  const todayKey = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const totalRevenueToday = dailyMap.get(todayKey)?.rev || 0;

  return {
    stockData,
    dailySales,
    monthlySales,
    quarterlySales,
    yearlySales,
    salesByProduct,
    salesByDayList,
    lowStockProducts,
    totalRevenueToday
  };
};
