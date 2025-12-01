
import { updateProductStock } from './productStorage';
import { addTransaction } from './inventoryStorage';
import { fetchOrdersFromDB, syncOrderToDB } from './apiClient';
import type { Order, Customer, Product } from '../types';

const STORAGE_KEY = 'sigma_vie_orders';
let hasLoadedFromDB = false;

export const getOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        fetchOrdersFromDB().then(dbOrders => {
            if (dbOrders && dbOrders.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbOrders));
                hasLoadedFromDB = true;
            }
        });
        hasLoadedFromDB = true;
    }
    
    return localData;
  } catch (error) {
    return [];
  }
};

export const getOrdersByCustomerId = (customerId: string): Order[] => {
    const orders = getOrders();
    return orders.filter(o => o.customerId === customerId);
};

const parsePrice = (priceStr: string): number => {
    return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
};

export const createOrder = (
    customer: Customer,
    product: Product,
    quantity: number
): { success: boolean; message: string; order?: Order } => {
    
    if (product.stock < quantity) {
        return { success: false, message: `Xin lỗi, chỉ còn lại ${product.stock} sản phẩm trong kho.` };
    }

    const pricePerUnit = parsePrice(product.price);
    const newOrder: Order = {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerId: customer.id,
        customerName: customer.fullName,
        customerContact: customer.email || customer.phoneNumber || 'N/A',
        customerAddress: customer.address || 'Chưa cung cấp',
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        totalPrice: pricePerUnit * quantity,
        status: 'PENDING',
        timestamp: Date.now()
    };

    const stockUpdated = updateProductStock(product.id, -quantity);
    if (!stockUpdated) {
        return { success: false, message: 'Lỗi cập nhật tồn kho. Vui lòng thử lại.' };
    }

    const orders = getOrders();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newOrder, ...orders]));

    // Sync to DB
    syncOrderToDB(newOrder);

    addTransaction({
        productId: product.id,
        productName: product.name,
        type: 'EXPORT',
        quantity: quantity,
        note: `Đơn hàng trực tuyến từ ${customer.fullName} (${newOrder.id})`
    });

    return { success: true, message: 'Đặt hàng thành công!', order: newOrder };
};

export const updateOrderStatus = (orderId: string, newStatus: Order['status']): void => {
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        const order = orders[index];
        const oldStatus = order.status;

        // LOGIC MỚI: HOÀN TRẢ KHO KHI HỦY ĐƠN
        // Chỉ hoàn trả nếu đơn hàng chưa từng bị hủy trước đó
        if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
            // Ép kiểu số nguyên để đảm bảo không cộng chuỗi
            const pid = Number(order.productId);
            const qty = Number(order.quantity);

            const success = updateProductStock(pid, qty);
            
            if (success) {
                // Ghi lại lịch sử giao dịch là NHẬP KHO (Hoàn trả)
                addTransaction({
                    productId: pid,
                    productName: order.productName,
                    type: 'IMPORT',
                    quantity: qty,
                    note: `Hoàn trả tồn kho do hủy đơn hàng ${order.id}`
                });
            }
        }

        orders[index].status = newStatus;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        
        syncOrderToDB(orders[index]);
    }
};
