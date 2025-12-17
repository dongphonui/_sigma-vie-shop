
import { updateProductStock } from './productStorage';
import { addTransaction } from './inventoryStorage';
import { fetchOrdersFromDB, syncOrderToDB } from './apiClient';
import type { Order, Customer, Product } from '../types';

const STORAGE_KEY = 'sigma_vie_orders';
let hasLoadedFromDB = false;

// Helper to trigger UI update
const dispatchOrderUpdate = () => {
    window.dispatchEvent(new Event('sigma_vie_orders_update'));
};

export const getOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData: Order[] = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        // Background fetch (silent)
        fetchOrdersFromDB().then(dbOrders => {
            if (dbOrders && Array.isArray(dbOrders)) {
                processAndMergeOrders(localData, dbOrders);
            }
        }).catch(err => {
            console.error("Lỗi tải đơn hàng (Background):", err);
        });
    }
    
    return localData;
  } catch (error) {
    return [];
  }
};

// Hàm xử lý merge dữ liệu (Dùng chung)
const processAndMergeOrders = (localData: Order[], dbOrders: any[]) => {
    // 1. Tạo Set các ID đã có trên Server (Chuyển hết về string để so sánh an toàn)
    const serverIdSet = new Set(dbOrders.map((o: any) => String(o.id)));
    
    // 2. Tìm các đơn hàng chỉ có ở Local (Chưa được sync)
    const unsavedLocalOrders = localData.filter(o => !serverIdSet.has(String(o.id)));
    
    if (unsavedLocalOrders.length > 0) {
        console.log(`Phát hiện ${unsavedLocalOrders.length} đơn hàng chưa đồng bộ. Đang gửi lại...`);
        // Gửi ngầm lên server
        unsavedLocalOrders.forEach(o => syncOrderToDB(o));
    }

    // 3. Gộp lại: Dữ liệu Server là gốc (Source of Truth) + Dữ liệu Local chưa lưu
    // Nếu đơn hàng đã có trên Server, ta dùng dữ liệu từ Server để đảm bảo nhất quán
    const mergedOrders = [...dbOrders, ...unsavedLocalOrders];
    
    // 4. Sắp xếp theo thời gian mới nhất
    mergedOrders.sort((a, b) => b.timestamp - a.timestamp);

    // 5. Lưu ngược lại LocalStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedOrders));
    
    // 6. Báo cho UI cập nhật
    dispatchOrderUpdate();
    
    return mergedOrders;
};

// --- FORCE RELOAD & SYNC (Dùng cho MyOrdersPage) ---
export const forceReloadOrders = async (): Promise<Order[]> => {
    try {
        console.log("Đang đồng bộ đơn hàng 2 chiều...");
        
        // Bước 1: Lấy dữ liệu local hiện tại trước
        const stored = localStorage.getItem(STORAGE_KEY);
        const localData = stored ? JSON.parse(stored) : [];

        // Bước 2: Tải mới nhất từ Server
        const dbOrders = await fetchOrdersFromDB();
        
        if (dbOrders && Array.isArray(dbOrders)) {
            // Bước 3: Merge (Code merge sẽ tự động đẩy đơn local chưa có lên server)
            const merged = processAndMergeOrders(localData, dbOrders);
            hasLoadedFromDB = true;
            return merged;
        } else {
            console.warn("Không tải được dữ liệu từ Server hoặc Server trả về rỗng.");
            return localData;
        }
    } catch (e) {
        console.error("Lỗi force reload orders:", e);
        return getOrders(); // Fallback
    }
};

// Hàm đồng bộ thủ công (Gọi từ AdminPage hoặc nút Sync)
export const syncAllOrdersToServer = async (): Promise<boolean> => {
    try {
        const orders = getOrders(); // Lấy từ Local (đã merge)
        console.log("Đang đồng bộ thủ công", orders.length, "đơn hàng...");
        
        // Gửi từng đơn hàng lên server (Server dùng ON CONFLICT nên sẽ update nếu trùng)
        const promises = orders.map(o => syncOrderToDB(o));
        await Promise.all(promises);
        return true;
    } catch (e) {
        console.error("Lỗi đồng bộ đơn hàng:", e);
        return false;
    }
};

export const getOrdersByCustomerId = (customerId: string): Order[] => {
    const orders = getOrders();
    // Filter chính xác theo ID khách hàng
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
    size?: string, // NEW Param
    color?: string, // NEW Param
    shippingInfo?: { // NEW Param: Custom Shipping Info
        name: string;
        phone: string;
        address: string;
        note?: string;
    }
): { success: boolean; message: string; order?: Order } => {
    
    // Check stock for specific variant
    let stockAvailable = product.stock;
    if (product.variants && (size || color)) {
        const v = product.variants.find(v => 
            (v.size === size || (!v.size && !size)) && 
            (v.color === color || (!v.color && !color))
        );
        stockAvailable = v ? v.stock : 0;
    }

    if (stockAvailable < quantity) {
        return { success: false, message: `Xin lỗi, phân loại này chỉ còn lại ${stockAvailable} sản phẩm.` };
    }

    const pricePerUnit = parsePrice(product.price);
    const subtotal = pricePerUnit * quantity;
    const finalTotal = subtotal + shippingFee; 

    const newOrder: Order = {
        id: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerId: customer.id,
        customerName: customer.fullName, // Account Name
        customerContact: customer.email || customer.phoneNumber || 'N/A', // Account Contact
        
        // Use provided shipping info or fallback to customer info
        shippingName: shippingInfo?.name || customer.fullName,
        shippingPhone: shippingInfo?.phone || customer.phoneNumber || '',
        shippingAddress: shippingInfo?.address || customer.address || 'Chưa cung cấp',
        note: shippingInfo?.note || '',
        customerAddress: customer.address || 'Chưa cung cấp', // Legacy field backup

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

    // 1. Update Stock Local
    const stockUpdated = updateProductStock(product.id, -quantity, size, color);
    if (!stockUpdated) {
        return { success: false, message: 'Lỗi cập nhật tồn kho. Vui lòng thử lại.' };
    }

    // 2. Save Order Local
    const orders = getOrders(); // Lấy danh sách hiện tại
    const updatedOrders = [newOrder, ...orders];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedOrders));
    dispatchOrderUpdate(); // Update UI

    // 3. Sync to DB (Async)
    console.log("Sending order to DB:", newOrder);
    syncOrderToDB(newOrder).then(res => {
        if(res && res.success) {
            console.log("Order synced successfully");
        } else {
            console.error("Order sync failed", res);
        }
    });

    // 4. Update Inventory Transaction
    const variantInfo = [];
    if(size) variantInfo.push(`Size: ${size}`);
    if(color) variantInfo.push(`Màu: ${color}`);
    const variantStr = variantInfo.length > 0 ? ` (${variantInfo.join(', ')})` : '';

    addTransaction({
        productId: product.id,
        productName: product.name + variantStr,
        type: 'EXPORT',
        quantity: quantity,
        note: `Đơn hàng trực tuyến từ ${customer.fullName} (${newOrder.id}) [${paymentMethod}]`,
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

            // Refund stock
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
        dispatchOrderUpdate(); // Update UI
        
        syncOrderToDB(orders[index]);
    }
};
