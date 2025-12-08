
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
    quantity: number,
    paymentMethod: 'COD' | 'BANK_TRANSFER' = 'COD',
    shippingFee: number = 0,
    size?: string, // NEW Param
    color?: string // NEW Param
): { success: boolean; message: string; order?: Order } => {
    
    if (product.stock < quantity) {
        return { success: false, message: `Xin lỗi, chỉ còn lại ${product.stock} sản phẩm trong kho.` };
    }

    const pricePerUnit = parsePrice(product.price);
    const subtotal = pricePerUnit * quantity;
    const finalTotal = subtotal + shippingFee; 

    const newOrder: Order = {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerId: customer.id,
        customerName: customer.fullName,
        customerContact: customer.email || customer.phoneNumber || 'N/A',
        customerAddress: customer.address || 'Chưa cung cấp',
        productId: product.id,
        productName: product.name,
        productSize: size, 
        productColor: color, // Save Color
        quantity: quantity,
        totalPrice: finalTotal, 
        shippingFee: shippingFee,
        status: 'PENDING',
        timestamp: Date.now(),
        paymentMethod: paymentMethod
    };

    const stockUpdated = updateProductStock(product.id, -quantity);
    if (!stockUpdated) {
        return { success: false, message: 'Lỗi cập nhật tồn kho. Vui lòng thử lại.' };
    }

    const orders = getOrders();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newOrder, ...orders]));

    syncOrderToDB(newOrder);

    // Update Transaction Note
    const variantInfo = [];
    if(size) variantInfo.push(`Size: ${size}`);
    if(color) variantInfo.push(`Màu: ${color}`);
    const variantStr = variantInfo.length > 0 ? ` (${variantInfo.join(', ')})` : '';

    addTransaction({
        productId: product.id,
        productName: product.name + variantStr,
        type: 'EXPORT',
        quantity: quantity,
        note: `Đơn hàng trực tuyến từ ${customer.fullName} (${newOrder.id}) [${paymentMethod}]`
    });

    return { success: true, message: 'Đặt hàng thành công!', order: newOrder };
};

export const updateOrderStatus = (orderId: string, newStatus: Order['status']): void => {
    const orders = getOrders();
    const index = orders.findIndex(o => o.id === orderId);
    if (index !== -1) {
        const order = orders[index];
        const oldStatus = order.status;

        if (newStatus === 'CANCELLED' && oldStatus !== 'CANCELLED') {
            const pid = Number(order.productId);
            const qty = Number(order.quantity);

            const success = updateProductStock(pid, qty);
            
            if (success) {
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
