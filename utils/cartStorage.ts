
import type { CartItem, Product } from '../types';
import { getCurrentCustomer } from './customerStorage';

// Hàm tạo Key động dựa trên User đang đăng nhập
const getStorageKey = (): string => {
    const currentUser = getCurrentCustomer();
    if (currentUser) {
        return `sigma_vie_cart_${currentUser.id}`;
    }
    return 'sigma_vie_cart_guest';
};

export const getCart = (): CartItem[] => {
  try {
    const key = getStorageKey();
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to parse cart", error);
    return [];
  }
};

const dispatchUpdateEvent = () => {
    window.dispatchEvent(new Event('sigma_vie_cart_update'));
};

const parsePrice = (priceStr: string): number => {
    return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
};

export const addToCart = (product: Product, quantity: number, size?: string, color?: string): void => {
  const key = getStorageKey();
  const cart = getCart();
  
  // Find item matching ID AND Size AND Color
  const existingItemIndex = cart.findIndex(item => 
      item.id === product.id && 
      item.selectedSize === size &&
      item.selectedColor === color
  );

  // Determine effective price
  let price = parsePrice(product.price);
  const now = Date.now();
  if (product.isFlashSale && product.salePrice && 
      (!product.flashSaleStartTime || now >= product.flashSaleStartTime) &&
      (!product.flashSaleEndTime || now <= product.flashSaleEndTime)) {
      price = parsePrice(product.salePrice);
  }

  if (existingItemIndex > -1) {
    // Check if adding exceeds stock
    const newQty = cart[existingItemIndex].quantity + quantity;
    if (newQty <= product.stock) {
        cart[existingItemIndex].quantity = newQty;
        cart[existingItemIndex].selectedPrice = price; 
    } else {
        // Cap at stock
        cart[existingItemIndex].quantity = product.stock;
    }
  } else {
    if (quantity <= product.stock) {
        cart.push({
            ...product,
            quantity,
            selectedPrice: price,
            selectedSize: size, // Store size
            selectedColor: color // Store color
        });
    }
  }

  localStorage.setItem(key, JSON.stringify(cart));
  dispatchUpdateEvent();
};

export const updateCartQuantity = (productId: number, newQuantity: number, size?: string, color?: string): void => {
  const key = getStorageKey();
  const cart = getCart();
  // Match ID + Size + Color
  const index = cart.findIndex(item => 
      item.id === productId && 
      item.selectedSize === size &&
      item.selectedColor === color
  );

  if (index > -1) {
      if (newQuantity <= 0) {
          cart.splice(index, 1);
      } else {
          const item = cart[index];
          if (newQuantity <= item.stock) {
              item.quantity = newQuantity;
          } else {
              item.quantity = item.stock;
          }
      }
      localStorage.setItem(key, JSON.stringify(cart));
      dispatchUpdateEvent();
  }
};

export const removeFromCart = (productId: number, size?: string, color?: string): void => {
  const key = getStorageKey();
  const cart = getCart();
  // Filter out the specific item variant
  const newCart = cart.filter(item => 
      !(item.id === productId && item.selectedSize === size && item.selectedColor === color)
  );
  localStorage.setItem(key, JSON.stringify(newCart));
  dispatchUpdateEvent();
};

export const clearCart = (): void => {
  const key = getStorageKey();
  localStorage.removeItem(key);
  dispatchUpdateEvent();
};
