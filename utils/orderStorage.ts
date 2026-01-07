
import { updateProductStock, getProducts } from './productStorage';
import { addTransaction } from './inventoryStorage';
import { fetchOrdersFromDB, syncOrderToDB } from './apiClient';
import type { Order, Customer, Product } from '../types';

const STORAGE_KEY = 'sigma_vie_orders';
let hasLoadedFromDB = false;

const dispatchOrderUpdate = () => {
    window.dispatchEvent(new Event('sigma_vie_orders_update'));
};

const parsePrice = (priceStr: string): number => {
    return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
};

export const getOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData: Order[] = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        fetchOrdersFromDB().then(dbOrders => {
            if (dbOrders && Array.isArray(dbOrders)) {
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
    
    if (unsavedLocalOrders.length > 0 && dbOrders.length > 0) {
        unsavedLocalOrders.forEach(o => syncOrderToDB(o));
    }

    const mergedOrders = [...dbOrders, ...unsavedLocalOrders];
    mergedOrders.sort((a, b) => b.timestamp - a.timestamp);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedOrders));
    dispatchOrderUpdate();
    return mergedOrders;
};

export const forceReloadOrders = async (): Promise<Order[]> => {
    hasLoadedFromDB = false;
    try {
        const dbOrders = await fetchOrdersFromDB();
        if (dbOrders && Array.isArray(dbOrders)) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dbOrders));
            hasLoadedFromDB = true;
            dispatchOrderUpdate();
            return dbOrders;
        }
    } catch (e) {
        console.error("Lỗi force reload orders:", e);
    }
    return getOrders();
};

export const clearOrderCache = () => {
    localStorage.removeItem(STORAGE_KEY);
    hasLoadedFromDB = false;
    dispatchOrderUpdate();
};

export const getOrdersByCustomerId = (customerId: string): Order[] => {
    const orders = getOrders();
    return orders.filter(o => String(o.customerId) === String(customerId));
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

    // Logic kiểm tra Flash Sale để lấy đơn giá chính xác nhất
    const now = Date.now();
    const isFlashSaleActive = latestProd.isFlashSale && 
                             latestProd.salePrice && 
                             (!latestProd.flashSaleStartTime || now >= latestProd.flashSaleStartTime) &&
                             (!latestProd.flashSaleEndTime || now <= latestProd.flashSaleEndTime);

    const pricePerUnit = isFlashSaleActive ? parsePrice(latestProd.salePrice!) : parsePrice(latestProd.price);
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
        productId: latestProd.id,
        productName: latestProd.name,
        productSize: size, 
        productColor: color,
        quantity: quantity,
        totalPrice: finalTotal, 
        shippingFee: shippingFee,
        status: 'PENDING',
        timestamp: Date.now(),
        paymentMethod: paymentMethod
    };

    const stockUpdated = updateProductStock(latestProd.id, -quantity, size, color);
    if (!stockUpdated) {
        return { success: false, message: 'Lỗi cập nhật tồn kho biến thể.' };
    }

    const orders = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updatedOrders = [newOrder, ...orders];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    dispatchOrderUpdate();

    syncOrderToDB(newOrder);

    addTransaction({
        productId: latestProd.id,
        productName: latestProd.name,
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
