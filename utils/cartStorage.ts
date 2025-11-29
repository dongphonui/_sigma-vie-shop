
import type { CartItem, Product } from '../types';

const STORAGE_KEY = 'sigma_vie_cart';

export const getCart = (): CartItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
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

export const addToCart = (product: Product, quantity: number): void => {
  const cart = getCart();
  const existingItemIndex = cart.findIndex(item => item.id === product.id);

  // Determine effective price (handle flash sale logic here or passed in)
  // For simplicity, we recalculate or assume the product passed has the correct context. 
  // Ideally, price is derived from product state.
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
        // Update price in case it changed (e.g. sale started/ended), though usually we lock price at add
        // For now, let's update it to current validity
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
            selectedPrice: price
        });
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  dispatchUpdateEvent();
};

export const updateCartQuantity = (productId: number, newQuantity: number): void => {
  const cart = getCart();
  const index = cart.findIndex(item => item.id === productId);

  if (index > -1) {
      if (newQuantity <= 0) {
          cart.splice(index, 1);
      } else {
          // Check stock limit (we need the product stock, which is in CartItem)
          const item = cart[index];
          if (newQuantity <= item.stock) {
              item.quantity = newQuantity;
          } else {
              item.quantity = item.stock; // Cap at max stock
          }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      dispatchUpdateEvent();
  }
};

export const removeFromCart = (productId: number): void => {
  const cart = getCart();
  const newCart = cart.filter(item => item.id !== productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newCart));
  dispatchUpdateEvent();
};

export const clearCart = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  dispatchUpdateEvent();
};
