
import { updateProductStock, getProducts } from './productStorage';
import { addTransaction } from './inventoryStorage';
import { fetchOrdersFromDB, syncOrderToDB } from './apiClient';
import type { Order, Customer, Product } from '../types';

const STORAGE_KEY = 'sigma_vie_orders';
let hasLoadedFromDB = false;

const dispatchOrderUpdate = () => {
    window.dispatchEvent(new Event('sigma_vie_orders_update'));
};

export const getOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData: Order[] = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        fetchOrdersFromDB().then(dbOrders => {
            if (dbOrders && Array.isArray(dbOrders)) {
                if (dbOrders.length === 0 && localData.length > 0) {
                    // Nếu server trống nhưng local có (có thể do reset server), không xóa local vội
                    // trừ khi người dùng chủ động reset. Ở đây ta giữ nguyên để sync ngược lên.
                    return;
                }
                processAndMergeOrders(localData, dbOrders);
            }
        }).catch(err => {
            console.error("Lỗi tải đơn hàng từ server:", err);
        });
    }
    
    return localData;
  } catch (error) {
    return [];
  }
};

const processAndMergeOrders = (localData: Order[], dbOrders: any[]) => {
    const serverIdSet = new Set(dbOrders.map((o: any) => String(o.id)));
    const unsavedLocalOrders = localData.filter(o => !serverIdSet.has(String(o.id)));
    
    // Nếu có đơn hàng local chưa có trên server, đẩy lên
    if (unsavedLocalOrders.length > 0 && dbOrders.length > 0) {
        unsavedLocalOrders.forEach(o => syncOrderToDB(o));
    }

    const mergedOrders = [...dbOrders, ...unsavedLocalOrders];
    mergedOrders.sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedOrders));
    dispatchOrderUpdate();
    return mergedOrders;
};

/**
 * Buộc tải lại đơn hàng từ server (Dùng khi đăng nhập thiết bị mới)
 */
export const forceReloadOrders = async (): Promise<Order[]> => {
    try {
        const dbOrders = await fetchOrdersFromDB();
        if (dbOrders && Array.isArray(dbOrders)) {
            // Thay thế hoàn toàn dữ liệu local bằng dữ liệu server để đảm bảo tính nhất quán
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbOrders));
            dispatchOrderUpdate();
            hasLoadedFromDB = true;
            return dbOrders;
        }
        return getOrders();
    } catch (e) {
        console.error("Lỗi force reload orders:", e);
        return getOrders();
    }
};

export const syncAllOrdersToServer = async (): Promise<boolean> => {
    try {
        const orders = getOrders();
        const promises = orders.map(o => syncOrderToDB(o));
        await Promise.all(promises);
        return true;
    } catch (e) {
        return false;
    }
};

export const getOrdersByCustomerId = (customerId: string): Order[] => {
    const orders = getOrders();
    // Chuyển đổi ID về string để so sánh chính xác
    return orders.filter(o => String(o.customerId) === String(customerId));
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
    size?: string,
    color?: string,
    shippingInfo?: {
        name: string;
        phone: string;
        address: string;
        note?: string;
    }
): { success: boolean; message: string; order?: Order } => {
    
    const latestProducts = getProducts();
    const latestProd = latestProducts.find(p => String(p.id) === String(product.id));
    
    if (!latestProd) {
        return { success: false, message: 'Sản phẩm không còn tồn tại trên hệ thống.' };
    }

    let stockAvailable = latestProd.stock;
    if (latestProd.variants && (size || color)) {
        const v = latestProd.variants.find(v => 
            (v.size === size || (!v.size && !size)) && 
            (v.color === color || (!v.color && !color))
        );
        stockAvailable = v ? v.stock : 0;
    }

    if (stockAvailable < quantity) {
        return { success: false, message: `Số lượng tồn kho không đủ (Chỉ còn ${stockAvailable}).` };
    }

    const pricePerUnit = parsePrice(product.price);
    const subtotal = pricePerUnit * quantity;
    const finalTotal = subtotal + shippingFee; 

    const newOrder: Order = {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerId: customer.id,
        customerName: customer.fullName,
        customerContact: customer.email || customer.phoneNumber || 'N/A',
        shippingName: shippingInfo?.name || customer.fullName,
        shippingPhone: shippingInfo?.phone || customer.phoneNumber || '',
        shippingAddress: shippingInfo?.address || customer.address || 'Chưa cung cấp',
        note: shippingInfo?.note || '',
        customerAddress: customer.address || 'Chưa cung cấp',
        productId: product.id,
        productName: product.name,
        productSize: size, 
        productColor: color,
        quantity: quantity,
        totalPrice: finalTotal, 
        shippingFee: shippingFee,
        status: 'PENDING',
        timestamp: Date.now(),
        paymentMethod: paymentMethod
    };

    const stockUpdated = updateProductStock(product.id, -quantity, size, color);
    if (!stockUpdated) {
        return { success: false, message: 'Lỗi cập nhật tồn kho biến thể.' };
    }

    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updatedOrders = [newOrder, ...orders];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    dispatchOrderUpdate();

    syncOrderToDB(newOrder);

    addTransaction({
        productId: product.id,
        productName: product.name,
        type: 'EXPORT',
        quantity: quantity,
        note: `Đơn hàng ${newOrder.id}`,
        selectedSize: size,
        selectedColor: color
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
            const success = updateProductStock(pid, qty, order.productSize, order.productColor);
            if (success) {
                addTransaction({
                    productId: pid,
                    productName: order.productName,
                    type: 'IMPORT',
                    quantity: qty,
                    note: `Hoàn trả tồn kho do hủy đơn hàng ${order.id}`,
                    selectedSize: order.productSize,
                    selectedColor: order.productColor
                });
            }
        }

        orders[index].status = newStatus;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
        dispatchOrderUpdate();
        syncOrderToDB(orders[index]);
    }
};
